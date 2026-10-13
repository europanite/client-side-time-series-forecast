/** Protocol, validation and README rendering for the on-demand, six-model study.
 * Inference lives in the actual Vite frontend, never in this module. */
import { createHash } from 'node:crypto';
import { getCases, validateGroups, scoreForecast, HORIZON, TRAIN_SIZE } from './frontend-stock-evaluation-core.mjs';

export const ALL_MODEL_NAMES = Object.freeze([
  'xgboost', 'lightgbm', 'ridge', 'varma', 'chronos', 'timesfm',
]);
export const ALL_MODEL_PROTOCOL = 'real-browser-recent-16step-all-six-v1';
export const REPORT_START = '<!-- ALL_MODEL_EVALUATION:START -->';
export const REPORT_END = '<!-- ALL_MODEL_EVALUATION:END -->';

export function allModelCases(panel, config) {
  const groups = validateGroups(config, panel.headers);
  return groups.map(group => ({ group, holdout: getCases(panel.rows, group).find(c => c.window === 'recent') }));
}

/** Stable across 3y provider-window shifts and changes to unused macro series.
 * Uses exactly the last (256 + 16) sessions and all evaluation targets/peers.
 */
export function fingerprintAllModelInput(panel, config) {
  const groups=validateGroups(config,panel.headers);
  const columns=[...new Set(groups.flatMap(g=>[g.target,...g.peers]))].sort();
  const tail=panel.rows.slice(-(TRAIN_SIZE+HORIZON));
  if(tail.length!==TRAIN_SIZE+HORIZON) throw new Error('Insufficient benchmark window');
  const rows=tail.map(row=>[row.Date,...columns.map(column=>{
    const value=row[column];
    if(!Number.isFinite(value) || value<=0)
      throw new Error(`Invalid benchmark input ${column} at ${row.Date}`);
    return value;
  })]);
  return createHash('sha256').update(JSON.stringify({columns,rows})).digest('hex');
}

function extraMetrics(predictions, actual) {
  let squares = 0, sape = 0;
  for (let i = 0; i < actual.length; i++) {
    const p = Number(predictions[i]), a = actual[i].value;
    const d = p - a;
    squares += d * d;
    const denom = Math.abs(p) + Math.abs(a);
    if (denom !== 0) sape += 200 * Math.abs(d) / denom;
  }
  return { rmse: Math.sqrt(squares / actual.length), smapePct: sape / actual.length };
}

/** Fail closed. NEVER publish a partial or cross-dataset table. */
export function makeAllModelReport({ panel, config, predictions, generatedAt, sourceSha256 }) {
  const cases = allModelCases(panel, config);
  const expected = cases.length * ALL_MODEL_NAMES.length;
  if (!Array.isArray(predictions) || predictions.length !== expected)
    throw new Error(`Incomplete all-model evaluation: ${predictions?.length}/${expected}`);
  if (!Number.isFinite(Date.parse(generatedAt))) throw new Error('Invalid generatedAt timestamp');
  if (!/^[0-9a-f]{64}$/.test(sourceSha256)) throw new Error('Source SHA256 is required');
  const entries = [];
  for (const {group, holdout} of cases) {
    if (!holdout || holdout.actual.length !== HORIZON) throw new Error(`Missing holdout ${group.id}`);
    const origin = holdout.initialClose;
    const baseline = scoreForecast(holdout.actual.map(() => origin), holdout.actual, origin);
    for (const model of ALL_MODEL_NAMES) {
      const matches = predictions.filter(r => r.group === group.id && r.model === model);
      if (matches.length !== 1) throw new Error(`Missing/duplicate ${group.id}/${model}`);
      const item = matches[0];
      if (item.originDate !== holdout.originDate || item.window !== 'recent')
        throw new Error(`Wrong origin/window for ${group.id}/${model}`);
      if (!Array.isArray(item.predicted) || item.predicted.length !== HORIZON ||
          item.predicted.some(v => !Number.isFinite(v)))
        throw new Error(`Invalid 16-step predictions for ${group.id}/${model}`);
      if (!Number.isFinite(item.elapsedMs) || item.elapsedMs < 0)
        throw new Error(`Invalid elapsedMs for ${group.id}/${model}`);
      const scored = scoreForecast(item.predicted, holdout.actual, origin);
      entries.push({group:group.id, model, window:'recent', originDate:holdout.originDate,
        from:holdout.actual[0].date, through:holdout.actual.at(-1).date,
        elapsedMs:item.elapsedMs,
        metrics:{...scored, ...extraMetrics(item.predicted, holdout.actual)},
        baseline:{...baseline, ...extraMetrics(holdout.actual.map(() => origin), holdout.actual)}});
    }
  }
  return {
    protocol:ALL_MODEL_PROTOCOL,
    generatedAtUtc:generatedAt,
    latestMarketDate:panel.rows.at(-1).Date,
    dataSha256:createHash('sha256').update(JSON.stringify(panel.rows)).digest('hex'),
    evaluationWindowSha256:fingerprintAllModelInput(panel,config),
    sourceSha256,
    trainSize:TRAIN_SIZE, horizon:HORIZON,
    models:[...ALL_MODEL_NAMES],
    groups:cases.map(({group}) => ({id:group.id,label:group.label,target:group.target,peers:group.peers})),
    results:entries,
    notes:[
      'All six methods were invoked through the real Vite frontend in Chromium.',
      'Same target and the same 16 observed holdout closes in every sector; 256 past observations at each origin.',
      'XGBoost, LightGBM and Ridge use the UI default Direct price strategy (16 independently fitted horizon models).',
      'VARMA uses joint recursive multi-series forecasting. Chronos-2 and TimesFM 2.5 use pretrained target-only zero-shot inference.',
      'TimesFM downloads its ONNX model on first invocation; elapsedMs includes initialization when cold.',
      'Retrospective evaluation with downloaded, possibly revised market data; not a live trading record.',
    ],
  };
}

const fmtPct = v => Number.isFinite(v) ? `${v.toFixed(2)}%` : 'N/A';
/** Compact table: all methods have exactly the same target, dates and horizon. */
export function renderAllModelMarkdown(report) {
  if (report?.protocol !== ALL_MODEL_PROTOCOL ||
      JSON.stringify(report.models) !== JSON.stringify(ALL_MODEL_NAMES) ||
      report.results?.length !== report.groups?.length * ALL_MODEL_NAMES.length ||
      report.groups?.length !== 5) throw new Error('Incomplete all-model report for README');
  const lines = [
    `### All six models — matched browser holdout (through ${report.latestMarketDate})`,
    '',
    'Each sector uses 256 historical closes to predict the same next 16 sessions. Lower MAPE is better.',
    'The three supervised models use **Direct price** (the browser default); VARMA uses joint recursive forecasting;',
    'Chronos-2 and TimesFM 2.5 use the selected target series only. Each is run in Chromium, not reimplemented in Node.',
    '',
    '| Model | '+report.groups.map(g => `${g.label} MAPE ↓`).join(' | ')+' | Mean MAPE ↓ | Mean sMAPE ↓ |',
    '| --- | '+report.groups.map(()=>'---:').join(' | ')+' | ---: | ---: |',
  ];
  for (const model of [...ALL_MODEL_NAMES, 'last_close']) {
    const entries=report.groups.map(g => {
      const row=report.results.filter(r=>r.group===g.id && r.model===(model==='last_close'?ALL_MODEL_NAMES[0]:model));
      if(row.length!==1) throw new Error(`Missing rendered result ${g.id}/${model}`);
      return model==='last_close'?row[0].baseline:row[0].metrics;
    });
    const mean=key=>entries.reduce((s,r)=>s+r[key],0)/entries.length;
    lines.push(`| ${model} | ${entries.map(r=>fmtPct(r.mapePct)).join(' | ')} | ${fmtPct(mean('mapePct'))} | ${fmtPct(mean('smapePct'))} |`);
  }
  lines.push('',
    `Protocol: \`${report.protocol}\`; input SHA256: \`${report.dataSha256.slice(0,12)}…\`; source SHA256: \`${report.sourceSha256.slice(0,12)}…\`.`,
    'Scores are retrospective and depend on the evaluated snapshot, not a live prediction audit.',
    '[Method and reproduction](docs/ALL_MODEL_EVALUATION.md). Full MAE/RMSE, predictions and elapsed times: [`reports/stocks/all-models.json`](reports/stocks/all-models.json).',
    '');
  return lines.join('\n');
}

/** Insert/replace only our own section. Never touch the other daily benchmark sections. */
export function updateAllModelReadme(readme, report) {
  const block=`${REPORT_START}\n${renderAllModelMarkdown(report)}${REPORT_END}`;
  const starts=readme.split(REPORT_START).length-1;
  const ends=readme.split(REPORT_END).length-1;
  if (starts !== ends || starts > 1) throw new Error('Malformed all-model README section markers');
  if (starts === 1) {
    const first=readme.indexOf(REPORT_START),last=readme.indexOf(REPORT_END);
    if (first>last) throw new Error('Reversed all-model README markers');
    return readme.slice(0,first)+block+readme.slice(last+REPORT_END.length);
  }
  const anchor='## Forecasting Approach';
  if (!readme.includes(anchor)) throw new Error('Cannot find README insertion anchor');
  return readme.replace(anchor, `${block}\n\n${anchor}`);
}
