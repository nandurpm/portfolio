import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [360, 768, 1366])
  test(`salary history and PF transfers ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("https://*.supabase.co/**", (r) => r.abort());
    await page.goto("/tests/browser/harness.html");
    await expect(
      page.getByRole("heading", { name: "Monthly snapshot", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Start with one small step" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Manage salary & PF", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Salary & PF", exact: true }),
    ).toBeVisible();
    for (const [date, salary, pf] of [
      ["2026-11-01", "1500", "100"],
      ["2026-12-01", "1800", "150"],
    ]) {
      await page
        .getByRole("button", { name: "Add salary change", exact: true })
        .click();
      const form = page.getByRole("form", {
        name: "Salary change",
        exact: true,
      });
      await form.getByLabel("Effective date").fill(date!);
      await form
        .getByLabel("Updated monthly take-home salary (₹)")
        .fill(salary!);
      await form.getByLabel("Monthly PF contribution reference (₹)").fill(pf!);
      await form
        .getByRole("button", { name: "Save salary change", exact: true })
        .click();
      if (date === "2026-11-01")
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Continue", exact: true })
          .click();
      await expect(form).toHaveCount(0);
    }
    await expect(
      page.getByRole("button", { name: /Edit salary change/ }),
    ).toHaveCount(3);
    await page
      .getByRole("button", {
        name: "Record PF contribution or claim",
        exact: true,
      })
      .click();
    const form = page.getByRole("form", { name: "PF transfer", exact: true });
    await form.getByLabel("Date", { exact: true }).fill("2026-11-01");
    await form.getByLabel("Amount (₹)", { exact: true }).fill("1000");
    await form
      .getByRole("button", { name: "Save PF transfer", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Continue", exact: true })
      .click();
    await expect(form).toHaveCount(0);
    await page
      .getByRole("button", {
        name: "Record PF contribution or claim",
        exact: true,
      })
      .click();
    await form.getByLabel("Transfer type").selectOption("claim");
    await form.getByLabel("Date", { exact: true }).fill("2026-11-02");
    await form.getByLabel("Amount (₹)", { exact: true }).fill("1100");
    await form
      .getByRole("button", { name: "Save PF transfer", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("exceed");
    await form.getByLabel("Amount (₹)", { exact: true }).fill("200");
    await form
      .getByRole("button", { name: "Save PF transfer", exact: true })
      .click();
    await expect(form).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Edit PF record/ }),
    ).toHaveCount(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    ).toBe(true);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(axe.violations).toEqual([]);
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    const darkAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(darkAxe.violations).toEqual([]);
    await page.screenshot({
      path: `test-results/employment-${width}.png`,
      fullPage: true,
    });
  });
