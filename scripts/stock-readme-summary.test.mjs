import test from 'node:test';
import assert from 'node:assert/strict';
import { renderStockSummary } from './stock-readme-summary.mjs';

test('legacy daily stock report is one compact, valid six-column MAPE table', () => {
  const strategies = (a, b) => [
    { name: 'ridge:target_only', mapePct: a },
    { name: 'ridge:multivariate', mapePct: b },
  ];
  const report = {
    models: ['ridge'],
    groups: [{id:'demo', label:'Demo', strategies: strategies(1.6, 1.5),
      longStrategies: strategies(2.4, 2.2)}],
  };
  const output = renderStockSummary(report);
  const rows = output.split('\n');
  assert.equal(rows.length, 3);
  assert.match(rows[2], /\| Demo \| ridge \| 2.40% \| 2.20% \| 1.60% \| 1.50% \|/);
  for (const row of rows) assert.equal(row.split('|').length, 8);
  assert.doesNotMatch(output, /paper trading|P\/L|drawdown|history snapshots/i);
  assert.throws(() => renderStockSummary({...report, groups:[{...report.groups[0],longStrategies:[]}]}), /Missing/);
});
