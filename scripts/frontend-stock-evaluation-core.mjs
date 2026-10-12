/** Pure data/protocol utilities. No frontend model is reimplemented here. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const HORIZON = 16;
export const TRAIN_SIZE = 256;
export const MODEL_NAMES = Object.freeze(['xgboost', 'lightgbm', 'varma', 'chronos', 'ridge']);
export const OFFSETS = Object.freeze([32, 16]); // disjoint, completed 16-session blocks
export const ROLLING_ORIGINS = 32; // evaluate every completed next-day close in the latest 32 sessions

export function parseStockPanel(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift()?.split(',');
  if (!headers || headers[0] !== 'Date' || new Set(headers).size !== headers.length)
    throw new Error('Invalid stock panel header');
  const rows = lines.map((line, index) => {
    const cells = line.split(',');
    if (cells.length !== headers.length) throw new Error(`CSV width mismatch at ${index + 2}`);
    const row = { Date: cells[0] };
    if (!/^\d{4}-\d\d-\d\d$/.test(row.Date)) throw new Error(`Invalid date at row ${index + 2}`);
    for (let i = 1; i < headers.length; i++) {
      row[headers[i]] = cells[i] === '' ? null : Number(cells[i]);
      if (row[headers[i]] !== null && !Number.isFinite(row[headers[i]]))
        throw new Error(`Non-finite value at row ${index + 2}: ${headers[i]}`);
    }
    return row;
  });
  for (let i = 1; i < rows.length; i++)
    if (rows[i].Date <= rows[i-1].Date) throw new Error('Stock panel must have unique ascending dates');
  return { headers, rows };
}

export function validateGroups(config, headers) {
  if (!Array.isArray(config.groups) || config.groups.length !== 5)
    throw new Error('Require exactly five pre-registered stock groups');
  const ids = new Set();
  return config.groups.map(group => {
    if (typeof group.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(group.id) || ids.has(group.id))
      throw new Error(`Duplicate/invalid group ${group.id}`);
    ids.add(group.id);
    // Use every predeclared domestic sector peer; do not choose peers by scores.
    // Foreign market factors have ambiguous same-session release times and are
    // intentionally excluded until a timestamped / availability-aware feed exists.
    const peers = [...new Set(group.factors.filter(f =>
      f !== group.target && !f.startsWith('^') && !f.includes('=')))];
    if (!headers.includes(group.target) || !peers.length ||
        peers.some(peer=>!headers.includes(peer)))
      throw new Error(`Missing required target or domestic sector peers for ${group.id}`);
    return { id: group.id, label: group.label, target: group.target, peers };
  });
}

export function getCases(rows, {target, peers}, horizon = HORIZON, trainSize = TRAIN_SIZE) {
  if (!Number.isInteger(horizon) || horizon <= 0) throw new Error('Bad horizon');
  if (rows.length < trainSize + OFFSETS[0]) throw new Error('Insufficient history for disjoint holdouts');
  // Fail if relevant prices are absent rather than silently filling them.
  for (const r of rows) for (const symbol of [target, ...peers]) {
    if (!Number.isFinite(r[symbol]) || r[symbol] <= 0)
      throw new Error(`Missing price in ${symbol} at ${r.Date}`);
  }
  return OFFSETS.map(offset => {
    const end = rows.length - offset + horizon;
    const origin = rows.length - offset;
    const history = rows.slice(origin - trainSize, origin).map(r => ({
      Date:r.Date, [target]:r[target], ...Object.fromEntries(peers.map(peer=>[peer,r[peer]]))
    }));
    const actual = rows.slice(origin, end).map(r => ({date:r.Date, value:r[target]}));
    if (history.length !== trainSize || actual.length !== horizon) throw new Error('Incomplete evaluation window');
    return { window: offset === 16 ? 'recent' : 'previous', originDate:history.at(-1).Date,
      from:actual[0].date, through:actual.at(-1).date,
      initialClose:history.at(-1)[target], history, actual };
  });
}

/** Walk forward one business session at a time, using the REAL observed close of
 * every input series through the immediately preceding session. This does not
 * continue peers synthetically, unlike a 16-step recursive forecast. */
export function getRollingCases(rows, {target, peers}, count = ROLLING_ORIGINS,
    trainSize = TRAIN_SIZE) {
  if (!Number.isInteger(count) || count < 2 || !Number.isInteger(trainSize) || trainSize < 32)
    throw new Error('Invalid rolling evaluation parameters');
  if (rows.length < trainSize + count)
    throw new Error('Insufficient history for rolling evaluation');
  const symbols = [target, ...peers];
  for (const row of rows) for (const symbol of symbols)
    if (!Number.isFinite(row[symbol]) || row[symbol] <= 0)
      throw new Error(`Missing price in ${symbol} at ${row.Date}`);
  return Array.from({length:count}, (_,i)=>{
    const origin = rows.length-count+i;
    const source = rows.slice(origin-trainSize,origin);
    const history = source.map(r=>({Date:r.Date, [target]:r[target],
      ...Object.fromEntries(peers.map(peer=>[peer,r[peer]]))}));
    return {window:'rolling_1step',originDate:source.at(-1).Date,
      history,initialClose:source.at(-1)[target],
      actual:[{date:rows[origin].Date,value:rows[origin][target]}]};
  });
}

export function scoreForecast(predictions, actual, originPrice) {
  if (!Array.isArray(predictions) || predictions.length !== actual.length || !actual.length)
    throw new Error(`Unexpected forecast length: ${predictions?.length}`);
  let abs=0, ape=0, signed=0;
  const points = predictions.map((pred, i) => {
    const value = Number(pred);
    const truth = Number(actual[i].value);
    if (!Number.isFinite(value) || !Number.isFinite(truth) || truth <= 0)
      throw new Error(`Invalid prediction/actual at ${i}`);
    abs += Math.abs(value-truth);
    ape += Math.abs(value-truth)/truth;
    // Direction relative to the *same* known origin close for all horizons.
    signed += Math.sign(value-originPrice) === Math.sign(truth-originPrice) ? 1 : 0;
    return {date:actual[i].date, actual:truth, predicted:value};
  });
  const count = actual.length;
  // Per-horizon errors distinguish the 1-step forecast from recursive drift.
  return {mae:abs/count, mapePct:100*ape/count, directionHitPct:100*signed/count,
    step1ApePct:100*Math.abs(points[0].predicted-points[0].actual)/points[0].actual,
    step16ApePct:100*Math.abs(points.at(-1).predicted-points.at(-1).actual)/points.at(-1).actual,
    points};
}

/** Validate every origin and model before any on-disk publication. */
export function makeResults({panel, config, results, rollingResults, generatedAt,
    rollingCount=ROLLING_ORIGINS}) {
  const groups = validateGroups(config, panel.headers);
  const expected = groups.length * OFFSETS.length * MODEL_NAMES.length;
  if (results.length !== expected) throw new Error(`Missing evaluation results: ${results.length}/${expected}`);
  const rollingExpected = groups.length * rollingCount * MODEL_NAMES.length;
  if (!Array.isArray(rollingResults) || rollingResults.length !== rollingExpected)
    throw new Error(`Missing rolling results: ${rollingResults?.length}/${rollingExpected}`);
  const checkMetrics=(r)=>{
    if (Object.prototype.hasOwnProperty.call(r, 'seasonalMetrics'))
      throw new Error(`Obsolete seasonal metrics are not accepted for ${r.group}/${r.model}`);
    for (const metrics of [r.metrics,r.baseline]) {
      if (![metrics.mapePct,metrics.mae,metrics.step1ApePct,metrics.step16ApePct,
            metrics.directionHitPct].every(Number.isFinite))
        throw new Error('Non-finite evaluation metrics');
      if (!Array.isArray(metrics.points) || !metrics.points.length ||
          metrics.points.some(p=>![p.actual,p.predicted].every(Number.isFinite)))
        throw new Error('Bad forecast points');
    }
  };
  for (const g of groups) {
    const windows = getCases(panel.rows,g);
    const roll = getRollingCases(panel.rows,g,rollingCount);
    for (const model of MODEL_NAMES) {
      for (const test of windows) {
        const matches=results.filter(r=>r.group===g.id && r.model===model && r.window===test.window);
        if (matches.length!==1) throw new Error(`Missing/duplicate ${g.id}/${test.window}/${model}`);
        const r=matches[0]; checkMetrics(r);
        if (r.originDate!==test.originDate || r.initialClose!==test.initialClose ||
            r.baseline.points.length!==HORIZON ||
            r.baseline.points.some((p,i)=>p.date!==test.actual[i].date ||
              p.actual!==test.actual[i].value || p.predicted!==test.initialClose) ||
            r.metrics.points.length!==HORIZON ||
            r.metrics.points.some((p,i)=>p.date!==test.actual[i].date || p.actual!==test.actual[i].value))
          throw new Error(`Misaligned multi-step forecast ${g.id}/${model}/${test.window}`);
      }
      for (const test of roll) {
        const matches=rollingResults.filter(r=>r.group===g.id && r.model===model && r.originDate===test.originDate);
        if (matches.length!==1) throw new Error(`Missing/duplicate rolling ${g.id}/${model}/${test.originDate}`);
        const r=matches[0];checkMetrics(r);
        if (r.window!=='rolling_1step' || r.metrics.points.length!==1 ||
            r.metrics.points[0].date!==test.actual[0].date ||
            r.metrics.points[0].actual!==test.actual[0].value || r.initialClose!==test.initialClose ||
            r.baseline.points.length!==1 || r.baseline.points[0].date!==test.actual[0].date ||
            r.baseline.points[0].predicted!==test.initialClose ||
            r.baseline.points[0].actual!==test.actual[0].value)
          throw new Error(`Misaligned rolling forecast ${g.id}/${model}/${test.originDate}`);
      }
    }
  }
  return {protocol:'real-browser-frontend-functions-v6-no-seasonal-blend-rolling',
    generatedAtUtc:generatedAt,latestMarketDate:panel.rows.at(-1).Date,
    horizon:HORIZON,trainSize:TRAIN_SIZE,rollingOrigins:rollingCount,
    modelNames:[...MODEL_NAMES],groupDefinitions:groups,
    dataSha256:createHash('sha256').update(JSON.stringify(panel.rows)).digest('hex'),
    results,rollingResults,
    notes:[
      'Actual Vite/Chromium frontend prediction functions; no second ML implementation.',
      'Every rolling one-day origin uses 256 prior REAL closes of target and domestic peers; never uses future or synthetic peer prices.',
      'Two fixed non-overlapping 16-session multi-step holdouts also reported. Rolling origins overlap these same dates, not independent tests.',
      'The 16-step UI roll-out fills unavailable future domestic peers with seasonal continuation; error may differ from 1-step accuracy.',
      'Recursive tree/linear model forecasts are unmodified; no fixed seasonal blend is applied.',
      'Metrics derive from historical retrieved market bars, NOT timestamped live forecasts. No trading claims.'
    ]};
}

export function rollingAggregate(report, groupId, model) {
  const rows=report.rollingResults.filter(r=>r.group===groupId && r.model===model);
  if(rows.length!==report.rollingOrigins) throw new Error(`Incomplete rolling series ${groupId}/${model}`);
  const avg=(extract)=>rows.reduce((sum,r)=>sum+extract(r),0)/rows.length;
  return {mapePct:avg(r=>r.metrics.mapePct),
    directionHitPct:avg(r=>r.metrics.directionHitPct),
    baselineMapePct:avg(r=>r.baseline.mapePct)};
}

// XML is deliberately self-contained for GitHub's sanitized SVG preview.
const xmlEscape = value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const SERIES_COLORS = ['#1976d2','#ef6c00','#7b1fa2','#00897b','#c62828','#455a64','#202020'];
export function renderSvgChart({title,dates,lines,yLabel='Close (JPY)'}) {
  if(!Array.isArray(dates)||dates.length<2||dates.length>64||!Array.isArray(lines)||!lines.length)
    throw new Error('Invalid SVG chart dimensions');
  const width=1000,height=440,L=83,R=27,T=68,B=95;
  const valid=[];
  for(const series of lines){
    if(series.values.length!==dates.length || series.values.some(v=>!Number.isFinite(v)))
      throw new Error(`Invalid chart series ${series.name}`);
    valid.push(...series.values);
  }
  const lo=Math.min(...valid),hi=Math.max(...valid),pad=Math.max((hi-lo)*0.07,Math.abs(hi)*0.002,0.01);
  const min=lo-pad,max=hi+pad;
  const x=i=>L+i*(width-L-R)/(dates.length-1);
  const y=v=>T+(max-v)*(height-T-B)/(max-min);
  const f=v=>Number(v).toFixed(1);
  const parts=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${xmlEscape(title)}">`,
    '<rect width="100%" height="100%" fill="white"/>',
    `<text x="${L}" y="29" font-family="sans-serif" font-size="20" font-weight="bold" fill="#222">${xmlEscape(title)}</text>`,
    `<text x="${L}" y="51" font-family="sans-serif" font-size="12" fill="#555">${xmlEscape(yLabel)} — chronological market sessions</text>`];
  for(let i=0;i<=4;i++){
    const val=min+(max-min)*i/4,Y=y(val);
    parts.push(`<line x1="${L}" y1="${f(Y)}" x2="${width-R}" y2="${f(Y)}" stroke="#e6e6e6"/>`,
      `<text x="${L-11}" y="${f(Y+4)}" text-anchor="end" font-size="11" font-family="sans-serif" fill="#555">${f(val)}</text>`);
  }
  dates.forEach((d,i)=>{if(i%3===0||i===dates.length-1){
    parts.push(`<text x="${f(x(i))}" y="${height-B+20}" text-anchor="middle" font-size="11" font-family="sans-serif" fill="#555">${xmlEscape(d.slice(5))}</text>`);
  }});
  lines.forEach((series,i)=>{
    const color=SERIES_COLORS[i%SERIES_COLORS.length];
    const points=series.values.map((v,j)=>`${f(x(j))},${f(y(v))}`).join(' ');
    parts.push(`<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${i===0?3:1.8}" ${series.dashed?'stroke-dasharray="6 4"':''}/>`);
  });
  lines.forEach((series,i)=>{
    const col=i%4,row=Math.floor(i/4),X=L+col*230,Y=height-48+row*22;
    parts.push(`<line x1="${X}" y1="${Y}" x2="${X+21}" y2="${Y}" stroke="${SERIES_COLORS[i%SERIES_COLORS.length]}" stroke-width="3"/>`,
      `<text x="${X+29}" y="${Y+4}" font-size="12" font-family="sans-serif" fill="#222">${xmlEscape(series.name)}</text>`);
  });
  return parts.join('\n')+'\n</svg>\n';
}

export function renderGroupChart(report, groupId) {
  const get=model=>report.results.find(r=>r.group===groupId && r.window==='recent' && r.model===model);
  const initial=get(report.modelNames[0]);
  if(!initial)throw new Error(`Missing chart group ${groupId}`);
  const dates=initial.metrics.points.map(p=>p.date);
  const lines=[{name:'Actual',values:initial.metrics.points.map(p=>p.actual)},
    ...report.modelNames.map(model=>({name:model,values:get(model).metrics.points.map(p=>p.predicted)})),
    {name:'Last close',values:initial.baseline.points.map(p=>p.predicted),dashed:true}];
  const group=report.groupDefinitions.find(g=>g.id===groupId);
  return renderSvgChart({title:`${group.label}: recent 16-session forecast vs actual`,dates,lines});
}

export function renderHorizonErrorChart(report) {
  const rows=report.results.filter(r=>r.window==='recent');
  const dates=Array.from({length:HORIZON},(_,i)=>`step ${i+1}`);
  const err=(p)=>100*Math.abs(p.predicted-p.actual)/p.actual;
  const lines=[...report.modelNames.map(model=>({name:model,
      values:Array.from({length:HORIZON},(_,i)=>{
        const subsets=rows.filter(r=>r.model===model);
        return subsets.reduce((sum,r)=>sum+err(r.metrics.points[i]),0)/subsets.length;
      })})),
    {name:'Last close',dashed:true,values:Array.from({length:HORIZON},(_,i)=>{
      const subsets=rows.filter(r=>r.model===report.modelNames[0]);
      return subsets.reduce((sum,r)=>sum+err(r.baseline.points[i]),0)/subsets.length;
    })}];
  // Use plain 1..16 labels and do not disguise the 5-group mean as uncertainty bounds.
  return renderSvgChart({title:'Mean APE by forecast horizon (5 sectors)',
    dates:dates.map((_,i)=>`step ${i+1}`),lines,yLabel:'Mean absolute percentage error (%)'});
}

const fmt = x => Number.isFinite(x) ? `${x.toFixed(2)}%` : 'N/A';
export function renderMarkdown(report) {
  const lines = [
    `## Stock results — browser benchmark (through ${report.latestMarketDate})`,
    '',
    '| Sector | Model | Previous 16-step MAPE ↓ | Recent 16-step MAPE ↓ | Rolling 1-step MAPE ↓ |',
    '| --- | --- | ---: | ---: | ---: |',
  ];
  for (const group of report.groupDefinitions) {
    for (const model of [...report.modelNames, 'last_close']) {
      const get = window => report.results.find(r =>
        r.group === group.id && r.window === window && r.model === report.modelNames[0]);
      const own = window => report.results.find(r =>
        r.group === group.id && r.window === window && r.model === model);
      const previous = model === 'last_close' ? get('previous').baseline : own('previous').metrics;
      const recent = model === 'last_close' ? get('recent').baseline : own('recent').metrics;
      const rolling = rollingAggregate(report, group.id,
        model === 'last_close' ? report.modelNames[0] : model);
      const rollingMape = model === 'last_close' ? rolling.baselineMapePct : rolling.mapePct;
      lines.push(`| ${group.label} | ${model} | ${fmt(previous.mapePct)} | ${fmt(recent.mapePct)} | ${fmt(rollingMape)} |`);
    }
  }
  return lines.join('\n') + '\n';
}

export function updateReadme(text, report) {
  const begin='<!-- FRONTEND_STOCK_EVALUATION:START -->';
  const end='<!-- FRONTEND_STOCK_EVALUATION:END -->';
  const insertion=`${begin}\n${renderMarkdown(report)}${end}`;
  if(text.includes(begin) !== text.includes(end)) throw new Error('Incomplete README markers');
  if(text.includes(begin)) {
    const start=text.indexOf(begin), stop=text.indexOf(end);
    if(stop <= start || text.indexOf(begin, start+1)!==-1 || text.indexOf(end,stop+1)!==-1)
      throw new Error('Duplicate/reordered README markers');
    return text.slice(0,start)+insertion+text.slice(stop+end.length);
  }
  const anchor='## multivariate stock benchmark';
  if(!text.includes(anchor)) throw new Error('Expected README anchor missing');
  return text.replace(anchor, `${insertion}\n\n${anchor.replace('## multivariate stock benchmark','## Legacy separate-engine stock benchmark')}`);
}

export function atomicText(path, value) {
  const abs=resolve(path); mkdirSync(dirname(abs),{recursive:true});
  if(existsSync(abs) && readFileSync(abs,'utf8')===value) return;
  const tmp=`${abs}.${process.pid}.tmp`;
  try {writeFileSync(tmp,value);renameSync(tmp,abs);} catch(e){try {unlinkSync(tmp);}catch{} throw e;}
}
