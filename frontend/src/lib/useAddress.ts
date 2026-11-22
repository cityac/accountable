import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { useSearchParams } from "react-router";

export type AddressChange = (next: URLSearchParams) => void;

/**
 * The address's settings, with changes that build on each other.
 *
 * setSearchParams starts from the last render, so a change made before the page
 * has redrawn would undo the one before it. This keeps the newest address to
 * start from instead, and the address itself still has the last word.
 */
export function useAddress() {
  const [params, setParams] = useSearchParams();
  const latest = useRef(params);
  const sent = useRef(new Set<string>());
  const outside = useRef({ changes: 0, listeners: new Set<() => void>() });

  useLayoutEffect(() => {
    const text = params.toString();
    if (sent.current.has(text)) {
      // One of ours has landed, perhaps an older one, so the newest stays as it is.
      if (text === latest.current.toString()) sent.current.clear();
      return;
    }
    // Back, forward or a link.
    sent.current.clear();
    latest.current = params;
    outside.current.changes += 1;
    outside.current.listeners.forEach((listener) => listener());
  }, [params]);

  const subscribe = useCallback((listener: () => void) => {
    const { listeners } = outside.current;
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);
  /** Counts changes that came from somewhere other than update(): back, forward or a link. */
  const outsideChanges = useSyncExternalStore(subscribe, () => outside.current.changes);

  function update(change: AddressChange) {
    const next = new URLSearchParams(latest.current);
    change(next);
    latest.current = next;
    sent.current.add(next.toString());
    setParams(next, { replace: true });
  }

  return { params, latest, update, outsideChanges };
}
