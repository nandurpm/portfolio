// Launch-only upgrade rehearsal. Does not run the installer or touch the owner's profile.
import { _electron } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { financialFixture } from '../tests/fixtures/financial.ts';
import { commit } from '../src/domain/history.ts';
import { saveOriginalPayment } from '../src/domain/installments.ts';
import { cloudPlan } from '../src/cloud/model.ts';

const [previous, current, output = 'test-results/native-upgrade.json'] = process.argv.slice(2);
if (!previous || !current) throw Error('Pass previous and current executable paths.');
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'tracker-upgrade-rehearsal-'));
let fixture = financialFixture();
fixture.data.settings.tray = false;
fixture.data.settings.autoStart = false;
Object.keys(fixture.data.settings.reminders).forEach(k => { fixture.data.settings.reminders[k] = false; });
fixture = commit(fixture, 'Synthetic paid December installment', p =>
  saveOriginalPayment(p, 'row-1', '2026-11-10', 100, '__unallocated'));
fixture = JSON.parse(JSON.stringify(fixture));
await fs.writeFile(path.join(profile, 'plan.json'), JSON.stringify(fixture));
const launches = [];
for (const executablePath of [previous, current]) {
  const app = await _electron.launch({ executablePath: path.resolve(executablePath),
    env: { ...process.env, TRACKER_USER_DATA: profile }, timeout: 30000 });
  try {
    const page = await app.firstWindow();
    await page.locator('.splash').waitFor({ state: 'detached' });
    try {
      await page.locator('.cloud-gate, .fatal, h1').waitFor();
    } catch (error) {
      const state = { title: await page.title(), url: page.url(), text: (await page.locator('body').innerText()).slice(0, 500) };
      throw Error(`Release did not reach a ready screen: ${JSON.stringify(state)}`, { cause: error });
    }
    if (await page.locator('.fatal').count())
      throw Error(`Release startup failed: ${await page.locator('.fatal').innerText()}`);
    if (await page.getByRole('heading', { name: 'Monthly snapshot', exact: true }).count())
      await page.getByRole('button', { name: 'Add expense', exact: true }).waitFor();
    const version = await app.evaluate(({app}) => ({ version: app.getVersion(),
      electron: process.versions.electron, node: process.versions.node }));
    await page.screenshot({ path: output.replace(/\.json$/, `-${version.version}.png`) });
    launches.push(version);
  } finally { await app.close(); }
  const saved = JSON.parse(await fs.readFile(path.join(profile, 'plan.json'), 'utf8'));
  assert.deepEqual(cloudPlan(saved.data), cloudPlan(fixture.data));
  assert.deepEqual(saved.audit, fixture.audit);
  assert.deepEqual(saved.undo, fixture.undo);
}
const result = { passed: true, kind: 'same disposable profile, executable launch rehearsal; not installer upgrade',
  launches, financialPlanUnchanged: true, receiptIdsAndDatesPreserved: true,
  auditHistoryPreserved: true, productionProfileTouched: false };
await fs.writeFile(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
