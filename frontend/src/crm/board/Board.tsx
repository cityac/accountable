import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { flushSync } from "react-dom";

import { STAGES, columns as toColumns, type Move } from "../deals";
import type { Deal, Stage } from "../queries";
import { Column } from "./Column";
import { DealCardLifted } from "./DealCard";

const CARD_GAP = 8;
const SETTLE_LIMIT_MS = 200;
const NO_DEAL = "no-deal";

// Enter stays free to open the deal, because dnd-kit would otherwise pick up on it.
const KEYBOARD_CODES = { start: ["Space"], cancel: ["Escape"], end: ["Space"] };

/**
 * The column under the card, going by left and right only. A column's droppable
 * is as tall as all its cards, so distances that include height would favor
 * short columns over the long one the card is actually above.
 */
const columnUnderCard: CollisionDetection = ({ collisionRect, droppableRects, droppableContainers }) => {
  const middle = collisionRect.left + collisionRect.width / 2;
  let closest: (typeof droppableContainers)[number] | null = null;
  let closestDistance = Infinity;
  for (const container of droppableContainers) {
    const rect = droppableRects.get(container.id);
    if (!rect) continue;
    const distance = Math.abs(rect.left + rect.width / 2 - middle);
    if (distance < closestDistance) {
      closest = container;
      closestDistance = distance;
    }
  }
  return closest ? [{ id: closest.id, data: { droppableContainer: closest, value: closestDistance } }] : [];
};

/** Up and down only: nothing on the board scrolls sideways. */
const AUTO_SCROLL = { threshold: { x: 0, y: 0.2 }, acceleration: 14 };

type Slot = { id: number; top: number; height: number };
type Drop = { stage: Stage; beforeId: number | null; place: number };

/**
 * Measures once per column per drag, so moving the pointer never touches layout.
 * Offsets ignore transforms, so cards that have slid aside still measure where
 * they really are.
 */
function measureColumn(list: HTMLDivElement, skipId: number): Slot[] {
  const slots: Slot[] = [];
  for (const card of list.querySelectorAll<HTMLElement>("[data-deal-id]")) {
    const id = Number(card.dataset.dealId);
    if (id !== skipId) slots.push({ id, top: card.offsetTop, height: card.offsetHeight });
  }
  return slots;
}

/** A height in the column that drops a card at this place, well clear of any tie. */
function heightOfPlace(slots: Slot[], place: number): number {
  const middle = (slot: Slot) => slot.top + slot.height / 2;
  if (slots.length === 0) return 0;
  if (place <= 0) return slots[0].top;
  if (place >= slots.length) return slots[slots.length - 1].top + slots[slots.length - 1].height;
  return (middle(slots[place - 1]) + middle(slots[place])) / 2;
}

/** The first card whose middle is below y: the moved card goes just above it. */
function dropPoint(slots: Slot[], y: number): { beforeId: number | null; place: number } {
  let low = 0;
  let high = slots.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (slots[middle].top + slots[middle].height / 2 > y) high = middle;
    else low = middle + 1;
  }
  return { beforeId: slots[low]?.id ?? null, place: low };
}

/** Measured once per column per drag, then kept for the rest of it. */
function cachedSlots(cache: Map<Stage, Slot[]>, stage: Stage, list: HTMLDivElement, dealId: number): Slot[] {
  let measured = cache.get(stage);
  if (!measured) {
    measured = measureColumn(list, dealId);
    cache.set(stage, measured);
  }
  return measured;
}

/** The deal below this one in its column, or null at the bottom. */
function nextDealId(column: Deal[], dealId: number): number | null {
  return column[column.findIndex((deal) => deal.id === dealId) + 1]?.id ?? null;
}

/** One place up or down from the card now above the drop point. */
function steppedPlace(measured: Slot[], beforeId: number | null, down: boolean): number {
  const place = beforeId === null ? measured.length : measured.findIndex((slot) => slot.id === beforeId);
  return Math.max(0, Math.min(measured.length, place + (down ? 1 : -1)));
}

type ColumnsProps = {
  columns: Record<Stage, Deal[]>;
  today: string;
  draggingId: number | null;
  draggingStage: Stage | null;
  landedId: number | null;
  landedStage: Stage | null;
  drop: Drop | null;
  step: number;
  onAdd: (stage: Stage) => void;
  listRef: (stage: Stage, element: HTMLDivElement | null) => void;
};

/** Sits inside DndContext, because useDraggable needs the sensors it provides. */
function Columns({
  columns,
  today,
  draggingId,
  draggingStage,
  landedId,
  landedStage,
  drop,
  step,
  onAdd,
  listRef,
}: ColumnsProps) {
  // One draggable for the whole board, pointed at a card as it's picked up. A hook
  // per card would make every card re-render each time the drag crosses a column,
  // which took 160ms at 500 deals.
  const [armedId, setArmedId] = useState<number | null>(null);
  const { listeners, setNodeRef } = useDraggable({ id: armedId ?? NO_DEAL, disabled: armedId === null });
  const listenersRef = useRef(listeners);
  // flushSync in arm() commits before the listeners are read, layout effects included.
  useLayoutEffect(() => {
    listenersRef.current = listeners;
  });

  // Kept stable, so handing them to every card doesn't redraw the memoized cards.
  const arm = useCallback(
    (card: HTMLElement) => {
      flushSync(() => setArmedId(Number(card.dataset.dealId)));
      setNodeRef(card);
    },
    [setNodeRef],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      arm(event.currentTarget);
      listenersRef.current?.onPointerDown?.(event);
    },
    [arm],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (!KEYBOARD_CODES.start.includes(event.code)) return;
      arm(event.currentTarget);
      listenersRef.current?.onKeyDown?.(event);
    },
    [arm],
  );

  return (
    <div
      data-dragging={draggingId !== null}
      className="grid min-h-0 flex-1 grid-cols-[repeat(6,minmax(0,1fr))] gap-2 px-5 pb-4"
    >
      {STAGES.map((stage) => (
        <Column
          key={stage}
          stage={stage}
          deals={columns[stage]}
          today={today}
          draggingId={draggingStage === stage ? draggingId : null}
          landedId={landedStage === stage ? landedId : null}
          place={drop?.stage === stage ? drop.place : null}
          step={draggingStage === stage || drop?.stage === stage ? step : 0}
          onAdd={onAdd}
          listRef={listRef}
          onCardPointerDown={handlePointerDown}
          onCardKeyDown={handleKeyDown}
        />
      ))}
    </div>
  );
}

type Props = {
  deals: Deal[];
  today: string;
  onMove: (move: Move) => void;
  onAdd: (stage: Stage) => void;
};

export function Board({ deals, today, onMove, onAdd }: Props) {
  const columns = useMemo(() => toColumns(deals), [deals]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [landedId, setLandedId] = useState<number | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [step, setStep] = useState(0);

  const dropRef = useRef<Drop | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lists = useRef(new Map<Stage, HTMLDivElement>());
  const slots = useRef(new Map<Stage, Slot[]>());

  const listRef = useCallback((stage: Stage, element: HTMLDivElement | null) => {
    if (element) lists.current.set(stage, element);
    else lists.current.delete(stage);
  }, []);

  const columnsRef = useRef(columns);
  useLayoutEffect(() => {
    columnsRef.current = columns;
  });

  /**
   * Up and down step between the places in a column, rather than by a fixed
   * distance, so one press always moves one place, however long the column is.
   * Left and right step one column across, staying at the same height.
   */
  const stepByPlace = useCallback<KeyboardCoordinateGetter>((event, { active, currentCoordinates, context }) => {
    const { collisionRect } = context;
    if (!collisionRect) return undefined;
    const { x, y } = currentCoordinates;

    if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      event.preventDefault();
      const across = collisionRect.width + CARD_GAP;
      return { x: x + (event.code === "ArrowRight" ? across : -across), y };
    }
    if (event.code !== "ArrowUp" && event.code !== "ArrowDown") return undefined;
    event.preventDefault();

    const dealId = active as number;
    const start = STAGES.find((stage) => columnsRef.current[stage].some((deal) => deal.id === dealId));
    const stage = dropRef.current?.stage ?? start;
    const list = stage ? lists.current.get(stage) : undefined;
    if (!stage || !list) return undefined;

    const measured = cachedSlots(slots.current, stage, list, dealId);
    const beforeId = dropRef.current ? dropRef.current.beforeId : nextDealId(columnsRef.current[stage], dealId);
    const target = steppedPlace(measured, beforeId, event.code === "ArrowDown");

    const middle = collisionRect.top + collisionRect.height / 2;
    const now = middle - list.getBoundingClientRect().top + list.scrollTop;
    return { x, y: y + heightOfPlace(measured, target) - now };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Smooth scrolling would still be moving when the next arrow press measures the column.
    useSensor(KeyboardSensor, {
      coordinateGetter: stepByPlace,
      keyboardCodes: KEYBOARD_CODES,
      scrollBehavior: "auto",
    }),
  );

  const setDropState = useCallback((next: Drop | null) => {
    const current = dropRef.current;
    if (current?.stage === next?.stage && current?.beforeId === next?.beforeId) return;
    dropRef.current = next;
    setDrop(next);
  }, []);

  const finish = useCallback(() => {
    setDraggingId(null);
    setDropState(null);
    slots.current.clear();
  }, [setDropState]);

  const settle = useCallback(() => {
    if (settleTimer.current === null) return;
    clearTimeout(settleTimer.current);
    settleTimer.current = null;
    finish();
  }, [finish]);

  function handleDragStart({ active }: DragStartEvent) {
    settle();
    setDraggingId(active.id as number);
    slots.current.clear();
  }

  function findDrop({ active, over }: Pick<DragMoveEvent, "active" | "over">): Drop | null {
    const list = over ? lists.current.get(over.id as Stage) : undefined;
    const rect = active.rect.current.translated;
    if (!over || !list || !rect) return null;
    setStep(rect.height + CARD_GAP);
    const stage = over.id as Stage;
    const measured = cachedSlots(slots.current, stage, list, active.id as number);
    const y = rect.top + rect.height / 2 - list.getBoundingClientRect().top + list.scrollTop;
    return { stage, ...dropPoint(measured, y) };
  }

  function handleDragMove(event: DragMoveEvent) {
    setDropState(findDrop(event));
  }

  function handleDragEnd(event: DragEndEvent) {
    // Worked out again here, because a quick flick can end before the last move
    // has been reported.
    const target = findDrop(event) ?? dropRef.current;
    const dealId = event.active.id as number;
    const deal = deals.find((item) => item.id === dealId);
    if (!target || !deal) return finish();

    if (deal.stage === target.stage && nextDealId(columns[deal.stage], dealId) === target.beforeId) return finish();

    // The gap stays open until the new order arrives, a tick later. Closing it now
    // would show the card back in its old place for a frame.
    settleTimer.current = setTimeout(settle, SETTLE_LIMIT_MS);
    onMove({ dealId, stage: target.stage, beforeDealId: target.beforeId });
    setLandedId(dealId);
  }

  // A new order of deals means the move has landed.
  useLayoutEffect(settle, [deals, settle]);

  useEffect(() => {
    if (landedId === null) return;
    const timer = setTimeout(() => setLandedId(null), 400);
    return () => clearTimeout(timer);
  }, [landedId]);

  const activeDeal = draggingId === null ? undefined : deals.find((deal) => deal.id === draggingId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={columnUnderCard}
      autoScroll={AUTO_SCROLL}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={finish}
    >
      <p id="board-instructions" className="sr-only">
        Press Space to pick up a deal, use the arrow keys to move it, and press Space to drop it. Press Enter to open
        it.
      </p>
      <Columns
        columns={columns}
        today={today}
        draggingId={draggingId}
        draggingStage={activeDeal?.stage ?? null}
        landedId={landedId}
        landedStage={deals.find((deal) => deal.id === landedId)?.stage ?? null}
        drop={drop}
        step={step}
        onAdd={onAdd}
        listRef={listRef}
      />
      <DragOverlay dropAnimation={null}>{activeDeal && <DealCardLifted deal={activeDeal} today={today} />}</DragOverlay>
    </DndContext>
  );
}
