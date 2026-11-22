import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "../../components/Field";
import { FormDialog } from "../../components/FormDialog";
import { RecordPicker } from "../../components/RecordPicker";
import { todayIso } from "../../lib/dates";
import { STAGES, STAGE_NAMES, isOpen } from "../deals";
import {
  useContacts,
  useMeta,
  useOrganizations,
  useSaveDeal,
  type ContactDetail,
  type ContactRow,
  type Deal,
  type Meta,
  type OrganizationRow,
  type Stage,
} from "../queries";
import { ContactForm } from "./ContactForm";
import { OrganizationForm } from "./OrganizationForm";
import { link } from "./links";
import { showSaveError } from "./server-errors";
import { useCloseIfUnreadable } from "./useCloseIfUnreadable";

const VALUE_MESSAGE = "Enter a whole number of dollars, zero or more";
const PROBABILITY_MESSAGE = "Enter a whole number from 0 to 100";

const FUTURE_CLOSE = "A won or lost deal can't have a close date in the future";

/** A link that's set can't be cleared, but one left blank by a delete can stay blank. */
function dealSchema(record?: Deal) {
  return z
    .object({
      name: z.string().trim().min(1, "Enter a name"),
      organization_id: link(record !== undefined && record.organization_id === null, "Choose an organization"),
      main_contact_id: link(record !== undefined && record.main_contact_id === null, "Choose a main contact"),
      stage: z.enum(["new", "qualified", "proposal", "negotiation", "won", "lost"]),
      value: z
        .string()
        .transform((text) => text.replace(/[$,\s]/g, ""))
        .pipe(z.string().regex(/^\d+$/, VALUE_MESSAGE))
        .transform(Number),
      probability: z
        .string()
        .trim()
        .regex(/^\d+$/, PROBABILITY_MESSAGE)
        .transform(Number)
        .pipe(z.number().max(100, PROBABILITY_MESSAGE)),
      close_date: z.string().min(1, "Choose a close date"),
    })
    .refine((deal) => isOpen(deal.stage) || deal.close_date <= todayIso(), {
      path: ["close_date"],
      message: FUTURE_CLOSE,
    });
}

type Input = z.input<ReturnType<typeof dealSchema>>;
type Output = z.output<ReturnType<typeof dealSchema>>;

type Props = {
  record?: Deal;
  defaultStage?: Stage;
  defaultOrganizationId?: number;
  defaultContactId?: number;
  onClose: () => void;
  onSaved?: (saved: Deal) => void;
};

/** The form's starting values need these, and it only reads them once. */
export function DealForm(props: Props) {
  const meta = useMeta();
  const contacts = useContacts();
  const organizations = useOrganizations();
  useCloseIfUnreadable([meta, contacts, organizations], props.onClose);

  if (!meta.data || !contacts.data || !organizations.data) return null;
  return <LoadedDealForm {...props} meta={meta.data} contacts={contacts.data} organizations={organizations.data} />;
}

type Loaded = { meta: Meta; contacts: ContactRow[]; organizations: OrganizationRow[] };
type Adding = { kind: "organization" | "contact"; name: string };

function usualProbability(meta: Meta, stage: Stage) {
  return meta.stages.find((item) => item.key === stage)?.probability;
}

function startingOrganization({ record, defaultOrganizationId, defaultContactId, contacts }: Props & Loaded) {
  if (record) return record.organization_id;
  return defaultOrganizationId ?? contacts.find((contact) => contact.id === defaultContactId)?.organization_id ?? null;
}

function defaultValues(props: Props & Loaded): Input {
  const { record, defaultStage, defaultContactId, meta } = props;
  const stage = record?.stage ?? defaultStage ?? "new";
  return {
    name: record?.name ?? "",
    organization_id: startingOrganization(props),
    main_contact_id: record ? record.main_contact_id : (defaultContactId ?? null),
    stage,
    value: record ? String(record.value) : "",
    probability: String(record?.probability ?? usualProbability(meta, stage) ?? ""),
    close_date: record?.close_date ?? (isOpen(stage) ? "" : todayIso()),
  };
}

/** A link left blank by a delete shows as None. */
function placeholder(blank: boolean, choose: string) {
  return blank ? "None" : choose;
}

type Option = { id: number; name: string; hint: string | null };

function toOption(contact: ContactRow): Option {
  return { id: contact.id, name: contact.name, hint: contact.organization_name };
}

/** The chosen organization's contacts, plus the chosen contact even if they work elsewhere. */
function useContactOptions(contacts: ContactRow[], organizationId: number | null, contactId: number | null) {
  return useMemo(() => {
    const narrowed =
      organizationId === null ? contacts : contacts.filter((contact) => contact.organization_id === organizationId);
    const options = narrowed.map(toOption);
    const selected = contacts.find((contact) => contact.id === contactId);
    return selected && !options.some((option) => option.id === selected.id)
      ? [...options, toOption(selected)]
      : options;
  }, [contacts, organizationId, contactId]);
}

type FormTools = Pick<UseFormReturn<Input, unknown, Output>, "setValue" | "getValues" | "clearErrors">;

/** Moving to another stage brings its usual probability, and a close date on the way into or out of Won and Lost. */
function useStageChange(record: Deal | undefined, meta: Meta, startStage: Stage, form: FormTools) {
  const lastStage = useRef<Stage>(startStage);
  const lastOpenDate = useRef(record?.close_date ?? "");

  return (stage: Stage) => {
    const backToStart = record?.stage === stage;
    const probability = backToStart ? record.probability : usualProbability(meta, stage);
    if (probability !== undefined) form.setValue("probability", String(probability), { shouldValidate: true });

    // Moving between open stages leaves the date alone, along with anything typed into it.
    const leaving = lastStage.current;
    lastStage.current = stage;
    if (isOpen(leaving) && isOpen(stage)) return;
    if (isOpen(leaving)) lastOpenDate.current = form.getValues("close_date");
    const closed = backToStart ? record.close_date : todayIso();
    form.setValue("close_date", isOpen(stage) ? lastOpenDate.current : closed);
    form.clearErrors("close_date");
  };
}

function LoadedDealForm(props: Props & Loaded) {
  const { record, onClose, onSaved, meta, contacts, organizations } = props;
  const save = useSaveDeal(record?.id);
  const [adding, setAdding] = useState<Adding | null>(null);
  const [defaults] = useState(() => defaultValues(props));

  const {
    register,
    handleSubmit,
    control,
    setError,
    getValues,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<Input, unknown, Output>({ resolver: zodResolver(dealSchema(record)), defaultValues: defaults });

  const organizationId = useWatch({ control, name: "organization_id" });
  const contactId = useWatch({ control, name: "main_contact_id" });
  const contactOptions = useContactOptions(contacts, organizationId, contactId);
  const changeStage = useStageChange(record, meta, defaults.stage, { setValue, getValues, clearErrors });

  function chooseOrganization(id: number) {
    setValue("organization_id", id);
    clearErrors("organization_id");
  }

  /** Choosing a contact first fills in their organization. */
  function selectContact(id: number, contactOrganization: number | null | undefined) {
    setValue("main_contact_id", id);
    clearErrors("main_contact_id");
    if (organizationId === null && contactOrganization) chooseOrganization(contactOrganization);
  }

  function chooseContact(id: number) {
    selectContact(id, contacts.find((item) => item.id === id)?.organization_id);
  }

  async function submit(values: Output) {
    try {
      const saved = await save.mutateAsync(values);
      toast.success("Deal saved.");
      onSaved?.(saved);
      onClose();
    } catch (error) {
      showSaveError(error, { setError, getValues });
    }
  }

  return (
    <FormDialog
      title={record ? "Edit deal" : "Add deal"}
      submitLabel="Save deal"
      pending={save.isPending}
      onClose={onClose}
      onSubmit={handleSubmit(submit)}
    >
      <Field label="Name" htmlFor="deal-name" error={errors.name?.message}>
        <input id="deal-name" className="input" aria-invalid={!!errors.name} {...register("name")} />
      </Field>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Organization" htmlFor="deal-organization" error={errors.organization_id?.message}>
          <Controller
            control={control}
            name="organization_id"
            render={({ field }) => (
              <RecordPicker
                id="deal-organization"
                label="Organization"
                noun="organization"
                value={field.value}
                options={organizations}
                placeholder={placeholder(record?.organization_id === null, "Choose an organization")}
                invalid={!!errors.organization_id}
                onChange={(id) => {
                  field.onChange(id);
                  clearErrors("organization_id");
                }}
                onAdd={(name) => setAdding({ kind: "organization", name })}
              />
            )}
          />
        </Field>
        <Field label="Main contact" htmlFor="deal-contact" error={errors.main_contact_id?.message}>
          <RecordPicker
            id="deal-contact"
            label="Main contact"
            noun="contact"
            value={contactId}
            options={contactOptions}
            placeholder={placeholder(record?.main_contact_id === null, "Choose a main contact")}
            invalid={!!errors.main_contact_id}
            onChange={chooseContact}
            onAdd={(name) => setAdding({ kind: "contact", name })}
          />
        </Field>
        <Field label="Stage" htmlFor="deal-stage" error={errors.stage?.message}>
          <select
            id="deal-stage"
            className="input"
            {...register("stage", { onChange: (event) => changeStage(event.target.value as Stage) })}
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_NAMES[stage]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Value" htmlFor="deal-value" error={errors.value?.message}>
          <input
            id="deal-value"
            inputMode="numeric"
            className="input num"
            aria-invalid={!!errors.value}
            {...register("value")}
          />
        </Field>
        <Field label="Probability" htmlFor="deal-probability" error={errors.probability?.message}>
          <input
            id="deal-probability"
            inputMode="numeric"
            className="input num"
            aria-invalid={!!errors.probability}
            {...register("probability")}
          />
        </Field>
        <Field label="Close date" htmlFor="deal-close-date" error={errors.close_date?.message}>
          <input
            id="deal-close-date"
            type="date"
            className="input num"
            aria-invalid={!!errors.close_date}
            {...register("close_date")}
          />
        </Field>
      </div>
      <AddRecord
        adding={adding}
        organizationId={organizationId}
        onClose={() => setAdding(null)}
        onOrganization={chooseOrganization}
        onContact={(saved) => selectContact(saved.id, saved.organization_id)}
      />
    </FormDialog>
  );
}

/** The second dialog that adds a missing organization or contact, then selects it. */
function AddRecord({
  adding,
  organizationId,
  onClose,
  onOrganization,
  onContact,
}: {
  adding: Adding | null;
  organizationId: number | null;
  onClose: () => void;
  onOrganization: (id: number) => void;
  onContact: (saved: ContactDetail) => void;
}) {
  if (adding?.kind === "organization") {
    return (
      <OrganizationForm defaultName={adding.name} onClose={onClose} onSaved={(saved) => onOrganization(saved.id)} />
    );
  }
  if (adding?.kind === "contact") {
    return (
      <ContactForm
        defaultName={adding.name}
        defaultOrganizationId={organizationId}
        onClose={onClose}
        onSaved={onContact}
      />
    );
  }
  return null;
}
