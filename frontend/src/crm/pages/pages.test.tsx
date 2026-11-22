import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { META, mockApi, renderApp, user } from "../../test-utils";
import type {
  ContactDetail,
  ContactRow,
  Dashboard as Figures,
  Deal,
  OrganizationDetail,
  OrganizationRow,
} from "../queries";
import { Contact } from "./Contact";
import { Contacts } from "./Contacts";
import { Dashboard } from "./Dashboard";
import { Deal as DealPage } from "./Deal";
import { Deals } from "./Deals";
import { Organization } from "./Organization";
import { Organizations } from "./Organizations";
import { Pipeline } from "./Pipeline";

const ORGANIZATIONS: OrganizationRow[] = [
  {
    id: 1,
    name: "Harbor & Pine",
    website: "https://harbor.example",
    industry: "Retail",
    notes: "Prefers calls",
    contact_count: 2,
    open_deal_count: 1,
    open_value: 36000,
    last_activity: "2026-10-12",
  },
  {
    id: 2,
    name: "Northwind",
    website: null,
    industry: "Logistics",
    notes: null,
    contact_count: 0,
    open_deal_count: 0,
    open_value: 0,
    last_activity: null,
  },
];

const CONTACTS: ContactRow[] = [
  {
    id: 11,
    name: "Sam Carter",
    email: "sam@harbor.example",
    phone: "555-0101",
    job_title: "Buyer",
    organization_id: 1,
    organization_name: "Harbor & Pine",
    status: "customer",
    last_activity: "2026-10-12",
  },
  {
    id: 12,
    name: "Ana Ruiz",
    email: null,
    phone: null,
    job_title: null,
    organization_id: null,
    organization_name: null,
    status: "lead",
    last_activity: null,
  },
];

function deal(fields: Partial<Deal> & Pick<Deal, "id" | "name" | "stage">): Deal {
  return {
    organization_id: 1,
    organization_name: "Harbor & Pine",
    main_contact_id: 11,
    main_contact_name: "Sam Carter",
    value: 10000,
    probability: 20,
    expected_revenue: 2000,
    close_date: "2099-01-15",
    position: 0,
    ...fields,
  };
}

// A close date long gone makes the open deal late on any day the tests run.
const LATE = deal({
  id: 5,
  name: "Annual support",
  stage: "proposal",
  value: 36000,
  probability: 40,
  close_date: "2020-01-01",
});
const WON = deal({ id: 6, name: "Pilot", stage: "won", value: 12000, probability: 100, close_date: "2020-02-01" });
const NEW = deal({
  id: 7,
  name: "Warehouse refit",
  stage: "new",
  organization_id: null,
  organization_name: null,
  main_contact_id: null,
  main_contact_name: null,
});
const DEALS = [LATE, WON, NEW];

const EMPTY_TIMELINE = { entries: [], total: 0 };

function timeline(kind: string, id: number) {
  return { [`GET /${kind}/${id}/timeline?limit=50&offset=0`]: EMPTY_TIMELINE };
}

describe("Organizations", () => {
  it("lists every organization, and search narrows the list", async () => {
    mockApi({ "GET /organizations": ORGANIZATIONS });
    renderApp(<Organizations />);
    expect(await screen.findByRole("link", { name: "Harbor & Pine" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Northwind" })).toBeTruthy();

    await user().type(screen.getByRole("searchbox"), "north");
    await waitFor(() => expect(screen.queryByRole("link", { name: "Harbor & Pine" })).toBeNull());
    expect(screen.getByRole("link", { name: "Northwind" })).toBeTruthy();
  });

  it("opens the form to add one", async () => {
    mockApi({ "GET /organizations": ORGANIZATIONS });
    renderApp(<Organizations />);
    await user().click(await screen.findByRole("button", { name: "Add organization" }));
    expect(await screen.findByRole("dialog", { name: "Add organization" })).toBeTruthy();
  });

  it("asks before deleting a row", async () => {
    mockApi({ "GET /organizations": ORGANIZATIONS, "GET /organizations/2/delete-impact": { contacts: 0, deals: 0 } });
    renderApp(<Organizations />);
    await user().click(await screen.findByRole("button", { name: "Delete Northwind" }));
    expect((await screen.findByRole("alertdialog")).textContent).toContain("Northwind");
  });
});

describe("Contacts", () => {
  it("filters by status, with a count for each", async () => {
    mockApi({ "GET /contacts": CONTACTS });
    renderApp(<Contacts />);
    const filters = await screen.findByRole("group", { name: "Filter by status" });
    await waitFor(() => expect(within(filters).getByRole("button", { name: /All/ }).textContent).toContain("2"));

    await user().click(within(filters).getByRole("button", { name: /Lead/ }));
    await waitFor(() => expect(screen.queryByRole("link", { name: "Sam Carter" })).toBeNull());
    expect(screen.getByRole("link", { name: "Ana Ruiz" })).toBeTruthy();
  });

  it("shows a blank organization as None", async () => {
    mockApi({ "GET /contacts": CONTACTS });
    renderApp(<Contacts />);
    const row = (await screen.findByRole("link", { name: "Ana Ruiz" })).closest("tr")!;
    expect(row.textContent).toContain("None");
  });

  it("opens the edit form from a row", async () => {
    mockApi({ "GET /contacts": CONTACTS, "GET /organizations": ORGANIZATIONS });
    renderApp(<Contacts />);
    await user().click(await screen.findByRole("button", { name: "Edit Sam Carter" }));
    expect(await screen.findByRole("dialog", { name: "Edit contact" })).toBeTruthy();
  });
});

describe("Deals", () => {
  it("marks a late deal in the table", async () => {
    mockApi({ "GET /deals": DEALS });
    renderApp(<Deals />);
    const row = (await screen.findByRole("link", { name: "Annual support" })).closest("tr")!;
    expect(row.textContent).toContain("Late");
    expect((await screen.findByRole("link", { name: "Pilot" })).closest("tr")!.textContent).not.toContain("Late");
  });

  it("shows only won deals when the address asks, with a way back to every stage", async () => {
    mockApi({ "GET /deals": DEALS });
    renderApp(<Deals />, { at: "/deals?stage=won", route: "/deals" });
    expect(await screen.findByRole("link", { name: "Pilot" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Annual support" })).toBeNull();

    await user().click(screen.getByRole("button", { name: /every stage/i }));
    expect(await screen.findByRole("link", { name: "Annual support" })).toBeTruthy();
  });

  it("opens the forms to add, edit and delete", async () => {
    mockApi({
      "GET /deals": DEALS,
      "GET /meta": META,
      "GET /contacts": CONTACTS,
      "GET /organizations": ORGANIZATIONS,
      "GET /deals/7/delete-impact": { activities: 0, stage_changes: 0, won: false, value: 10000 },
    });
    renderApp(<Deals />);
    await user().click(await screen.findByRole("button", { name: "Add deal" }));
    expect(await screen.findByRole("dialog", { name: "Add deal" })).toBeTruthy();
    await user().click(screen.getByRole("button", { name: "Cancel" }));

    await user().click(screen.getByRole("button", { name: "Edit Pilot" }));
    expect(await screen.findByRole("dialog", { name: "Edit deal" })).toBeTruthy();
    await user().click(screen.getByRole("button", { name: "Cancel" }));

    await user().click(screen.getByRole("button", { name: "Delete Warehouse refit" }));
    expect((await screen.findByRole("alertdialog")).textContent).toContain("Warehouse refit");
  });
});

const ORGANIZATION: OrganizationDetail = {
  ...ORGANIZATIONS[0],
  contacts: [{ id: 11, name: "Sam Carter", job_title: "Buyer", status: "customer" }],
  deals: [{ id: 5, name: "Annual support", stage: "proposal", value: 36000, close_date: "2020-01-01" }],
};

const CONTACT: ContactDetail = {
  ...CONTACTS[0],
  deals: [{ id: 5, name: "Annual support", stage: "proposal", value: 36000, close_date: "2020-01-01" }],
};

describe("record pages", () => {
  it("an organization shows its details, contacts and deals", async () => {
    mockApi({ "GET /organizations/1": ORGANIZATION, ...timeline("organizations", 1) });
    renderApp(<Organization />, { at: "/organizations/1", route: "/organizations/:id" });
    expect(await screen.findByRole("heading", { name: "Harbor & Pine" })).toBeTruthy();
    expect(screen.getByText("Prefers calls")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Sam Carter/ }).getAttribute("href")).toBe("/contacts/11");
    expect(screen.getByRole("link", { name: /Annual support/ }).getAttribute("href")).toBe("/deals/5");
  });

  it("a contact shows their organization and deals", async () => {
    mockApi({ "GET /contacts/11": CONTACT, ...timeline("contacts", 11) });
    renderApp(<Contact />, { at: "/contacts/11", route: "/contacts/:id" });
    expect(await screen.findByRole("heading", { name: "Sam Carter" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Harbor & Pine" }).getAttribute("href")).toBe("/organizations/1");
    expect(screen.getByRole("link", { name: /Annual support/ }).getAttribute("href")).toBe("/deals/5");
  });

  it("a late deal says so, with its expected revenue", async () => {
    mockApi({ "GET /deals/5": LATE, ...timeline("deals", 5) });
    renderApp(<DealPage />, { at: "/deals/5", route: "/deals/:id" });
    expect(await screen.findByRole("heading", { name: "Annual support" })).toBeTruthy();
    expect(screen.getByText("Late")).toBeTruthy();
    expect(screen.getByText("Expected revenue")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sam Carter" }).getAttribute("href")).toBe("/contacts/11");
  });

  it("a deal with blank links shows None for both", async () => {
    mockApi({ "GET /deals/7": NEW, ...timeline("deals", 7) });
    renderApp(<DealPage />, { at: "/deals/7", route: "/deals/:id" });
    expect(await screen.findByRole("heading", { name: "Warehouse refit" })).toBeTruthy();
    expect(screen.getAllByText("None")).toHaveLength(2);
  });

  it.each([
    ["deal", <DealPage key="deal" />, "/deals/:id", "/deals/99"],
    ["contact", <Contact key="contact" />, "/contacts/:id", "/contacts/99"],
    ["organization", <Organization key="organization" />, "/organizations/:id", "/organizations/99"],
  ])("a %s that no longer exists says so", async (word, page, route, at) => {
    mockApi({});
    renderApp(page, { at, route });
    expect(await screen.findByText(`This ${word} no longer exists`)).toBeTruthy();
  });

  it.each([
    ["deal", <DealPage key="deal" />, "/deals/:id"],
    ["contact", <Contact key="contact" />, "/contacts/:id"],
    ["organization", <Organization key="organization" />, "/organizations/:id"],
  ])("an address that couldn't be a %s says it no longer exists", async (word, page, route) => {
    mockApi({});
    renderApp(page, { at: route.replace(":id", "abc"), route });
    expect(await screen.findByText(`This ${word} no longer exists`)).toBeTruthy();
  });

  it("opens edit and delete from the page header", async () => {
    mockApi({
      "GET /organizations/1": ORGANIZATION,
      "GET /organizations/1/delete-impact": { contacts: 1, deals: 1 },
      ...timeline("organizations", 1),
    });
    renderApp(<Organization />, { at: "/organizations/1", route: "/organizations/:id" });
    await user().click(await screen.findByRole("button", { name: "Edit" }));
    expect(await screen.findByRole("dialog", { name: "Edit organization" })).toBeTruthy();
    await user().click(screen.getByRole("button", { name: "Cancel" }));
    await user().click(screen.getByRole("button", { name: "Delete" }));
    expect((await screen.findByRole("alertdialog")).textContent).toContain("Harbor & Pine");
  });
});

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
  month: `2026-${String(index + 1).padStart(2, "0")}`,
  label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][index],
  revenue: (index + 1) * 1000,
  deals: index % 3,
}));

const FIGURES: Figures = {
  today: "2099-12-31",
  overdue_follow_ups: 1,
  late_deals: 2,
  revenue_this_month: 12000,
  revenue_last_month: 11000,
  deals_won_this_month: 2,
  deals_won_last_month: 1,
  open_pipeline: 46000,
  open_deals: 2,
  expected_revenue: 16400,
  expected_share: 36,
  months: MONTHS,
  band: [
    { stage: "new", value: 10000, count: 1 },
    { stage: "qualified", value: 0, count: 0 },
    { stage: "proposal", value: 36000, count: 1 },
    { stage: "negotiation", value: 0, count: 0 },
  ],
  funnel: [
    { stage: "new", value: 58000, carried: null },
    { stage: "qualified", value: 48000, carried: 83 },
    { stage: "proposal", value: 48000, carried: 100 },
    { stage: "negotiation", value: 12000, carried: 25 },
    { stage: "won", value: 12000, carried: 100 },
  ],
  follow_ups: {
    overdue: 1,
    upcoming: 1,
    items: [
      {
        id: 21,
        description: "Send revised quote",
        follow_up_date: "2020-03-01",
        overdue: true,
        about: { kind: "deal", id: 5, name: "Annual support" },
      },
      {
        id: 22,
        description: "Check in",
        follow_up_date: "2099-01-01",
        overdue: false,
        about: { kind: "contact", id: 11, name: "Sam Carter" },
      },
    ],
  },
  recent: [
    {
      kind: "stage_change",
      id: 31,
      at: "2026-10-30T15:20:00Z",
      type: null,
      description: "Moved from Proposal to Negotiation",
      follow_up_date: null,
      follow_up_done: false,
      about: { kind: "deal", id: 5, name: "Annual support" },
    },
    {
      kind: "activity",
      id: 32,
      at: "2026-10-29T10:00:00Z",
      type: "call",
      description: "Talked through pricing",
      follow_up_date: null,
      follow_up_done: false,
      about: { kind: "contact", id: 11, name: "Sam Carter" },
    },
  ],
};

const EMPTY_FIGURES: Figures = {
  ...FIGURES,
  overdue_follow_ups: 0,
  late_deals: 0,
  revenue_this_month: 0,
  revenue_last_month: 0,
  deals_won_this_month: 0,
  deals_won_last_month: 0,
  open_pipeline: 0,
  open_deals: 0,
  expected_revenue: 0,
  expected_share: 0,
  months: MONTHS.map((month) => ({ ...month, revenue: 0, deals: 0 })),
  band: FIGURES.band.map((stage) => ({ ...stage, value: 0, count: 0 })),
  funnel: FIGURES.funnel.map((stage) => ({ ...stage, value: 0, carried: null })),
  follow_ups: { overdue: 0, upcoming: 0, items: [] },
  recent: [],
};

describe("Dashboard", () => {
  // jsdom lays nothing out, so the charts are told they have room to draw.
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(private readonly report: ResizeObserverCallback) {}
        observe() {
          const entry = { contentRect: { width: 800, height: 300 } } as ResizeObserverEntry;
          this.report([entry], this as unknown as ResizeObserver);
        }
        unobserve() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sums up what needs doing, and shows the figures, charts and lists", async () => {
    mockApi({ "GET /dashboard": FIGURES });
    renderApp(<Dashboard />);
    expect(await screen.findByText("1 follow-up overdue and 2 deals running late.")).toBeTruthy();
    expect(screen.getByTestId("revenue-this-month").textContent).toContain("$12,000");

    const followUps = screen.getByRole("region", { name: "Follow-ups" });
    expect(within(followUps).getByText("Overdue")).toBeTruthy();
    expect(within(followUps).getByRole("link", { name: "Annual support" }).getAttribute("href")).toBe("/deals/5");

    const recent = screen.getByRole("region", { name: "Recent activity" });
    expect(within(recent).getByText("Moved from Proposal to Negotiation")).toBeTruthy();

    expect(screen.getByRole("region", { name: "Sales funnel" }).textContent).toContain("Negotiation");
    expect(screen.getByRole("region", { name: "Deals won" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open pipeline/ }).getAttribute("href")).toBe("/pipeline");
  });

  it("ticks a follow-up done", async () => {
    const calls = mockApi({
      "GET /dashboard": FIGURES,
      "PATCH /activities/21": { id: 21, follow_up_done: true },
    });
    renderApp(<Dashboard />);
    await user().click(await screen.findByRole("checkbox", { name: "Mark Send revised quote done" }));
    await waitFor(() =>
      expect(calls).toContainEqual({ method: "PATCH", path: "/activities/21", body: { follow_up_done: true } }),
    );
  });

  it("has a designed empty state for each chart and list", async () => {
    mockApi({ "GET /dashboard": EMPTY_FIGURES });
    renderApp(<Dashboard />);
    expect(await screen.findByText("No follow-ups overdue and no deals running late.")).toBeTruthy();
    expect(screen.getByText("Revenue will show here once you've won a deal.")).toBeTruthy();
    expect(screen.getByText("Wins will show here month by month.")).toBeTruthy();
    expect(screen.getByText("Deals will show here once you've added some.")).toBeTruthy();
    expect(screen.getByText("No follow-ups due.")).toBeTruthy();
    expect(screen.getByText("Nothing has happened yet.")).toBeTruthy();
  });
});

describe("Pipeline", () => {
  it("shows a column per stage, with the board's open totals", async () => {
    mockApi({ "GET /deals": DEALS });
    renderApp(<Pipeline />);
    expect((await screen.findByTestId("board-value")).textContent).toContain("$46,000");
    for (const stage of ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]) {
      expect(screen.getByRole("region", { name: stage })).toBeTruthy();
    }
    const proposal = screen.getByRole("region", { name: "Proposal" });
    expect(within(proposal).getByTestId("deal-card").textContent).toContain("Annual support");
    expect(within(proposal).getByTestId("deal-card").textContent).toContain("Late");
  });

  it("opens the form at a column's stage", async () => {
    mockApi({ "GET /deals": DEALS, "GET /meta": META, "GET /contacts": CONTACTS, "GET /organizations": ORGANIZATIONS });
    renderApp(<Pipeline />);
    const won = await screen.findByRole("region", { name: "Won" });
    await user().click(within(won).getByRole("button", { name: /Add deal/ }));
    expect(((await screen.findByRole("combobox", { name: "Stage" })) as HTMLSelectElement).value).toBe("won");
  });

  it("says when there are no deals yet", async () => {
    mockApi({ "GET /deals": [] });
    renderApp(<Pipeline />);
    expect(await screen.findByText("No deals yet. Add the first one.")).toBeTruthy();
  });
});
