/** Compact, table-only README summary; complete metrics remain in JSON. */
const fmt = x => Number.isFinite(x) ? `${x.toFixed(2)}%` : 'N/A';

export function renderStockSummary(report) {
  const lines = [
    '| Sector | Model | Long solo MAPE ↓ | Long multi MAPE ↓ | Recent solo MAPE ↓ | Recent multi MAPE ↓ |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
  ];
  for (const group of report.groups) {
    for (const model of ['ridge', 'xgboost', 'lightgbm']) {
      if (!report.models.includes(model)) continue;
      const get = (period, mode) => {
        const strategies = period === 'long' ? group.longStrategies : group.strategies;
        const item = strategies.find(s => s.name === `${model}:${mode}`);
        if (!item) throw new Error(`Missing ${group.id}/${model}/${period}/${mode}`);
        return fmt(item.mapePct);
      };
      lines.push(`| ${group.label} | ${model} | ${get('long', 'target_only')} | ${get('long', 'multivariate')} | ${get('recent', 'target_only')} | ${get('recent', 'multivariate')} |`);
    }
  }
  return lines.join('\n');
}
