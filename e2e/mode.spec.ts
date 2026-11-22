import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { addLinkedDeal, column, resetToSampleData } from "./helpers";

test.beforeAll(resetToSampleData);

const SECTIONS = ["/", "/organizations", "/contacts", "/deals", "/pipeline"];

const LIGHT_PAGE = "rgb(240, 244, 245)";
const DARK_PAGE = "rgb(4, 35, 46)";
const BLACK = "rgb(0, 0, 0)";
const MIDNIGHT = "rgb(7, 59, 76)";
const SEA_MIST = "rgb(205, 216, 219)";

function toggle(page: Page, name: "Switch to dark mode" | "Switch to light mode") {
  return page.getByRole("banner").getByRole("button", { name });
}

function css(locator: Locator, property: string) {
  return locator.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
}

function modeAttribute(page: Page) {
  return page.evaluate(() => document.documentElement.getAttribute("data-mode"));
}

async function openDark(page: Page, path: string) {
  await page.goto(path);
  await toggle(page, "Switch to dark mode").click();
  await expect(toggle(page, "Switch to light mode")).toBeVisible();
}

test("a fresh browser opens in light mode", async ({ page }) => {
  await page.goto("/");
  expect(await modeAttribute(page)).toBeNull();
  expect(await css(page.locator("body"), "background-color")).toBe(LIGHT_PAGE);
});

test("the toggle is in the top bar on every section and on a record page", async ({ page, request }) => {
  const { deal } = await addLinkedDeal(request, "Toggle on its page");
  for (const path of [...SECTIONS, `/deals/${deal.id}`]) {
    await page.goto(path);
    await expect(toggle(page, "Switch to dark mode"), path).toBeVisible();
  }
});

test("the toggle turns the page and panels dark, and says it will switch back", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".panel").first()).toBeVisible();
  await toggle(page, "Switch to dark mode").click();

  expect(await css(page.locator("body"), "background-color")).toBe(DARK_PAGE);
  expect(await css(page.locator(".panel").first(), "background-color")).toBe(BLACK);
  await expect(toggle(page, "Switch to light mode")).toHaveAttribute("title", "Switch to light mode");
});

test("the choice survives a reload, and is set before the app starts", async ({ page }) => {
  await openDark(page, "/deals");
  await page.reload();
  await expect(toggle(page, "Switch to light mode")).toBeVisible();
  expect(await css(page.locator("body"), "background-color")).toBe(DARK_PAGE);

  // With the app's code held back, only index.html's own script can have set the mode.
  await page.route("**/src/main.tsx", (route) => route.fulfill({ contentType: "text/javascript", body: "" }));
  await page.reload();
  expect(await page.locator("#root").innerHTML()).toBe("");
  expect(await modeAttribute(page)).toBe("dark");
  await page.unroute("**/src/main.tsx");

  await page.reload();
  await toggle(page, "Switch to light mode").click();
  await page.reload();
  await expect(toggle(page, "Switch to dark mode")).toBeVisible();
  expect(await modeAttribute(page)).toBeNull();
});

test("in dark mode, dialogs, pickers, tooltips and messages are dark too", async ({ page, request }) => {
  const { deal } = await addLinkedDeal(request, "Dark dialog");
  await openDark(page, `/deals/${deal.id}`);

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog");
  expect(await css(dialog, "background-color")).toBe(BLACK);
  const backdrop = dialog.locator("..");
  const [darkBackdrop, lightBackdrop] = await backdrop.evaluate((element) => {
    const color = () => getComputedStyle(element).backgroundColor;
    const dark = color();
    document.documentElement.removeAttribute("data-mode");
    const light = color();
    document.documentElement.setAttribute("data-mode", "dark");
    return [dark, light];
  });
  expect(darkBackdrop).not.toBe(lightBackdrop);

  await dialog.getByRole("combobox", { name: "Organization" }).click();
  const picker = page.getByRole("dialog").last();
  await expect(picker.getByRole("option").first()).toBeVisible();
  expect(await css(picker, "background-color")).toBe(BLACK);
  await page.keyboard.press("Escape");

  await dialog.getByRole("button", { name: "Save deal" }).click();
  const message = page.locator("[data-sonner-toast]").filter({ hasText: "Deal saved." });
  await expect(message).toBeVisible();
  expect(await css(message, "background-color")).toBe(BLACK);
  expect(await css(message, "color")).toBe(SEA_MIST);

  await page.goto("/");
  const chart = page.getByRole("region", { name: "Revenue won" });
  await expect(chart.locator(".recharts-surface")).toBeVisible();
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
  const tip = page.getByTestId("chart-tooltip");
  await expect(tip).toBeVisible();
  expect(await css(tip, "background-color")).toBe(BLACK);
});

test("in dark mode, text on colored fills stays Midnight, and Won is filled in Sea Mist", async ({ page }) => {
  await openDark(page, "/pipeline");
  const pill = page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Pipeline" });
  expect(await css(pill, "color")).toBe(MIDNIGHT);

  const wonHeader = column(page, "won").locator(":scope > div").first();
  expect(await css(wonHeader, "background-color")).toBe(SEA_MIST);
  expect(await css(wonHeader, "color")).toBe(MIDNIGHT);

  await page.goto("/deals");
  const qualified = page.locator("tbody").getByText("Qualified", { exact: true }).first();
  await expect(qualified).toBeVisible();
  expect(await css(qualified, "color")).toBe(MIDNIGHT);
});

test("with storage blocked, the toggle still works and logs no error", async ({ page }) => {
  await page.addInitScript(() => {
    const blocked = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    Storage.prototype.getItem = blocked;
    Storage.prototype.setItem = blocked;
  });
  await page.goto("/");
  await toggle(page, "Switch to dark mode").click();
  expect(await modeAttribute(page)).toBe("dark");
  expect(await css(page.locator("body"), "background-color")).toBe(DARK_PAGE);
  await toggle(page, "Switch to light mode").click();
  expect(await modeAttribute(page)).toBeNull();
});
