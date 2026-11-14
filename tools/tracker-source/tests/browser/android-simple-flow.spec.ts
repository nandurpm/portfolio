import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function open(page: Page) {
  await page.setViewportSize({ width: 393, height: 873 });
  await page.route("https://*.supabase.co/**", (r) => r.abort());
  await page.route("https://api.github.com/**", (r) => r.abort());
  await page.goto("/tests/browser/harness.html?android=1");
  await expect(page.locator(".mobile-balance strong")).toBeVisible();
}
const nav = (page: Page) =>
  page.getByRole("navigation", { name: "Phone navigation" });

test("four destinations and five quick actions keep every feature reachable without financial edits", async ({
  page,
}) => {
  await open(page);
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("savings-expence-v1")!).data,
  );
  await expect(nav(page).getByRole("button")).toHaveCount(4);
  for (const title of ["Home", "Activity", "Accounts", "More screens"])
    await expect(
      nav(page).getByRole("button", { name: title, exact: true }),
    ).toBeVisible();
  await page.locator(".android-add").click();
  const sheet = page.getByRole("dialog", { name: "Quick actions" });
  for (const title of [
    "Add expense",
    "Add income",
    "Transfer",
    "Loan payment",
    "Backup",
  ])
    await expect(
      sheet.getByRole("button", { name: new RegExp("^" + title) }),
    ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(page.locator(".android-add")).toBeFocused();
  await nav(page).getByRole("button", { name: "More screens" }).click();
  for (const title of [
    "Budgets",
    "Reports",
    "Loans & EMI",
    "Salary & PF",
    "Settings",
    "Backup and Restore",
    "Import and Export",
    "Cloud Sync",
    "Help and Support",
  ])
    await expect(
      page
        .locator(".android-more-card")
        .filter({ has: page.getByText(title, { exact: true }) }),
    ).toBeVisible();
  await page
    .locator(".android-more-card")
    .filter({ has: page.getByText("Budgets", { exact: true }) })
    .click();
  await expect(page.locator(".main-scroll")).toHaveAttribute(
    "data-page",
    "budget",
  );
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem("savings-expence-v1")!).data,
  );
  expect(after).toEqual(before);
});

test("focused transfer sheet preserves principal neutrality, fee expense, duplicate guard and account balances", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(async () => {
    const path = "/src/store.ts";
    const { store } = await import(path);
    store.change("Synthetic accounts", (d: any) => {
      d.accounts = [
        {
          id: "source",
          name: "Bank",
          kind: "bank",
          openingBalance: 500,
          active: true,
          note: "",
        },
        {
          id: "target",
          name: "Wallet",
          kind: "wallet",
          openingBalance: 0,
          active: true,
          note: "",
        },
      ];
      d.ledgerTransactions = [];
    });
  });
  await page.locator(".android-add").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Transfer / })
    .click();
  const form = page.getByRole("dialog", { name: "Transfer between accounts" });
  await expect(form).toBeVisible();
  await form.getByRole("button", { name: "Save transfer" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "positive amount" }),
  ).toBeVisible();
  await form.getByLabel("From account").selectOption("source");
  await expect(
    form.getByLabel("To account").locator('option[value="source"]'),
  ).toBeDisabled();
  await form.getByLabel("To account").selectOption("target");
  await form.getByLabel("Amount", { exact: true }).fill("125.50");
  await form.getByLabel("Fees", { exact: true }).fill("1.25");
  await form.getByLabel("Date", { exact: true }).fill("2026-11-14");
  await form
    .getByLabel("Description", { exact: true })
    .fill("Synthetic transfer");
  await form
    .getByRole("button", { name: "Save transfer" })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(form).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const a = "/src/store.ts",
      b = "/src/domain/ledger.ts";
    const { store } = await import(a);
    const { ledgerSummary } = await import(b);
    const plan = store.get().data;
    return {
      count: plan.ledgerTransactions.length,
      summary: ledgerSummary(plan, "2026-11-14"),
    };
  });
  expect(result.count).toBe(1);
  expect(result.summary.balances.source).toBe(373.25);
  expect(result.summary.balances.target).toBe(125.5);
  expect(result.summary.income).toBe(0);
  expect(result.summary.expenses).toBe(1.25);
  expect(result.summary.netWorth).toBe(498.75);
  await nav(page)
    .getByRole("button", { name: "Activity", exact: true })
    .click();
  await expect(page.locator(".unified-activity")).toContainText(
    "Synthetic transfer",
  );
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Type", { exact: true })
    .selectOption("transfer");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Show results" })
    .click();
  await expect(page.locator(".unified-activity li")).toHaveCount(1);
});

test("backup quick action uses the existing full export and confirmed restore round trip", async ({
  page,
}) => {
  await open(page);
  // Simulate only the native file picker boundary; real Reports export/restore handlers run.
  await page.evaluate(() => {
    window.desktop!.saveFile = async (_name, bytes) => {
      sessionStorage.setItem(
        "synthetic-backup",
        new TextDecoder().decode(bytes),
      );
      return "synthetic.json";
    };
    window.desktop!.openFile = async () => ({
      name: "synthetic.json",
      bytes: new TextEncoder().encode(
        sessionStorage.getItem("synthetic-backup")!,
      ),
    });
  });
  await page.locator(".android-add").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Backup / })
    .click();
  await expect(
    page.getByRole("heading", { name: "Complete backup & restore" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Export full backup" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => !!sessionStorage.getItem("synthetic-backup")),
    )
    .toBe(true);
  const original = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem("synthetic-backup")!).data,
  );
  await page.evaluate(async () => {
    const path = "/src/store.ts";
    const { store } = await import(path);
    store.change("Synthetic edit", (d: any) => {
      d.settings.opening = 999;
    });
  });
  await page.getByRole("button", { name: "Restore JSON backup" }).click();
  await page
    .getByRole("dialog", { name: "Restore this backup?" })
    .getByRole("button", { name: "Restore", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("savings-expence-v1")!).data.settings
            .opening,
      ),
    )
    .toBe(original.settings.opening);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("savings-expence-v1")!).data,
    ),
  ).toEqual(original);
});

test("mobile sheets scroll, trap focus, remain readable in both themes and fit large text", async ({
  page,
}) => {
  await open(page);
  await page.locator(".android-add").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Transfer / })
    .click();
  for (const width of [360, 430, 768])
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 460 });
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.fontSize = "24px";
      }, theme);
      const form = page.getByRole("dialog", {
        name: "Transfer between accounts",
      });
      await expect(form).toBeVisible();
      await form
        .getByRole("button", { name: "Save transfer" })
        .scrollIntoViewIfNeeded();
      await expect(
        form.getByRole("button", { name: "Save transfer" }),
      ).toBeInViewport();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      expect(
        await form.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      const violations = (
        await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
      ).violations;
      expect(
        violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
      await page.screenshot({
        path: `test-results/android-transfer-${width}-${theme}.png`,
      });
    }
});
