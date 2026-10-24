/* global document, innerWidth */
import { _electron } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const executablePath = process.argv[2];
if (!executablePath) throw Error('Pass the built Windows executable.');
const userData = await fs.mkdtemp(path.join(os.tmpdir(), 'tracker-release-qa-'));
let app;
try {
  app = await _electron.launch({
    executablePath,
    env: { ...process.env, TRACKER_USER_DATA: userData },
    timeout: 30000,
  });
  const page = await app.firstWindow();
  await page.locator('.splash').waitFor({ state: 'detached' });
  const minimum = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].getMinimumSize(),
  );
  const widths = [];
  for (const width of [800, 900, 1024, 1100, 1366]) {
    await app.evaluate(
      ({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setSize(width, 768),
      width,
    );
    await page.getByRole('button', { name: 'Add Expense', exact: true }).waitFor();
    widths.push({
      width,
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    });
  }
  const saved = JSON.parse(await fs.readFile(path.join(userData, 'plan.json'), 'utf8'));
  const result = {
    minimum,
    widths,
    freshEntries: saved.data.entries.length,
    freshSalary: saved.data.settings.salary31,
    freshOpening: saved.data.settings.opening,
  };
  if (
    minimum[0] !== 800 ||
    result.freshEntries ||
    result.freshSalary ||
    result.freshOpening ||
    widths.some((w) => w.overflow)
  )
    throw Error(JSON.stringify(result));
  if (process.argv[3]) await fs.writeFile(process.argv[3], JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  if (app) await app.close();
}
