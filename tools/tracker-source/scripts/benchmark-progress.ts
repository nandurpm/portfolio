import assert from 'node:assert/strict';
import { financialFixture } from '../tests/fixtures/financial';
import { addMonths } from '../src/domain/dates';
import { progress } from '../src/domain/calculate';

// Synthetic in-memory records only. No device, persistence, network or user data.
for (const months of [12, 120, 288]) {
  const p = financialFixture().data;
  p.settings.planEnd = addMonths(p.settings.planStart, months - 1);
  const cutoff = p.settings.planEnd + '-01';
  p.entries = Array.from({ length: 1000 }, (_, i) => ({
    id: 'benchmark-' + i, date: addMonths(p.settings.planStart, i % months) + '-01',
    categoryId: i % 2 ? 'bill' : 'salary', amount: 10, payment: 'Bank',
    description: 'Synthetic benchmark', notes: '',
  }));
  progress(p, cutoff); // Warm the same code path before collecting samples.
  const samples = [];
  for (let run = 0; run < 3; run++) {
    const start = performance.now();
    const rows = progress(p, cutoff);
    samples.push(performance.now() - start);
    assert.equal(rows.length, months);
    assert.equal(rows.at(-1)!.recordedCash, 500);
  }
  samples.sort((a, b) => a - b);
  console.log(JSON.stringify({ scope: 'synthetic-server-not-device', months, entries: 1000,
    medianMs: Math.round(samples[1]!), samplesMs: samples.map(ms => Math.round(ms)) }));
}
