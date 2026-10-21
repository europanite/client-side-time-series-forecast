import test from 'node:test';
import assert from 'node:assert/strict';
import { TRAIN_SIZE, HORIZON, parseStockPanel } from './frontend-stock-evaluation-core.mjs';
import { ALL_MODEL_NAMES, ALL_MODEL_PROTOCOL, REPORT_START, REPORT_END,
  allModelCases, makeAllModelReport, renderAllModelMarkdown, updateAllModelReadme
} from './all-model-evaluation-core.mjs';

const groups=Array.from({length:5},(_,i)=>({id:`group${i}`,label:`Sector ${i}`,target:`T${i}`,factors:[`P${i}`,`Q${i}`]}));
const config={groups};
const header=['Date',...groups.flatMap(g=>[g.target,...g.factors])];
const rows=[header.join(',')];
for (let i=0;i<TRAIN_SIZE+32;i++) {
  const day=new Date(Date.UTC(2025,0,1)+86400000*i).toISOString().slice(0,10);
  rows.push([day,...groups.flatMap((_,g)=>[100+i+g,120+i+g,140+i+g])].join(','));
}
const panel=parseStockPanel(rows.join('\n'));
const cases=allModelCases(panel,config);
const stamp='2026-10-13T00:00:00.000Z';
const sha='a'.repeat(64);
const predictions=cases.flatMap(({group,holdout})=>ALL_MODEL_NAMES.map(model=>({
  group:group.id,model,originDate:holdout.originDate,window:'recent',
  predicted:holdout.actual.map(p=>p.value+1),elapsedMs:1000,
})));
const args={panel,config,predictions,generatedAt:stamp,sourceSha256:sha};

test('all 7 actual frontend model identifiers appear in the matched matrix',()=>{
  assert.deepEqual(ALL_MODEL_NAMES,['xgboost','xgboost_bag2','lightgbm','ridge','varma','chronos','timesfm']);
  assert.equal(cases.length,5);
  assert.ok(cases.every(({holdout})=>holdout.history.length===256&&holdout.actual.length===16));
  assert.equal(predictions.length,35);
  const report=makeAllModelReport(args);
  assert.equal(report.protocol,ALL_MODEL_PROTOCOL);
  assert.equal(report.results.length,35);
  assert.equal(report.results.filter(r=>r.model==='xgboost_bag2').length,5);
  assert.equal(report.results.filter(r=>r.model==='timesfm').length,5);
  assert.ok(report.results.every(r=>r.metrics.rmse>0 && r.metrics.smapePct>0));
  assert.deepEqual(new Set(report.results.map(r=>r.from)),new Set([cases[0].holdout.from]));
  const md=renderAllModelMarkdown(report);
  assert.match(md,/\| timesfm \|/);
  assert.match(md,/\| xgboost_bag2 \|/);
  assert.match(md,/\| chronos \|/);
  assert.match(md,/\| varma \|/);
  assert.match(md,/\| last_close \|/);
  assert.match(md,/Direct price/);
  const lines=md.split('\n').filter(s=>s.startsWith('|'));
  assert.equal(lines.length,10); // header, separator, seven models, last_close
  for(const line of lines) assert.equal(line.split('|').length,10);
});

test('README update is idempotent and keeps unrelated daily sections byte-for-byte',()=>{
  const report=makeAllModelReport(args);
  const readme='# Heading\n\n## Forecasting Approach\n\n<!-- FRONTEND_STOCK_EVALUATION:START -->\nexisting results\n<!-- FRONTEND_STOCK_EVALUATION:END -->\n';
  const updated=updateAllModelReadme(readme,report);
  assert.equal(updated,updateAllModelReadme(updated,report));
  assert.ok(updated.indexOf(REPORT_START)<updated.indexOf(REPORT_END));
  assert.match(updated,/existing results/);
  assert.equal(updated.split('existing results').length,2);
  assert.equal(updated.split(REPORT_START).length,2);
  assert.throws(()=>updateAllModelReadme(readme+REPORT_START,report),/Malformed/);
  assert.throws(()=>updateAllModelReadme(readme+REPORT_END,report),/Malformed/);
});

test('no publication from incomplete, stale, duplicate or malformed forecasts',()=>{
  assert.throws(()=>makeAllModelReport({...args,predictions:predictions.slice(1)}),/Incomplete/);
  assert.throws(()=>makeAllModelReport({...args,predictions:predictions.map((p,i)=>i===0?predictions[1]:p)}),/Missing\/duplicate/);
  assert.throws(()=>makeAllModelReport({...args,predictions:predictions.map((p,i)=>i===0?{...p,originDate:'2000-01-01'}:p)}),/Wrong origin/);
  assert.throws(()=>makeAllModelReport({...args,predictions:predictions.map((p,i)=>i===0?{...p,predicted:[NaN,...p.predicted.slice(1)]}:p)}),/Invalid 16-step/);
  assert.throws(()=>makeAllModelReport({...args,predictions:predictions.map((p,i)=>i===0?{...p,predicted:p.predicted.slice(1)}:p)}),/Invalid 16-step/);
  assert.throws(()=>makeAllModelReport({...args,sourceSha256:'unknown'}),/SHA256/);
});

test('holdout truth mutation changes metrics but never historical inputs',()=>{
  const original=cases[0];
  const changedRows=panel.rows.map(r=>({...r}));
  const i=changedRows.findIndex(r=>r.Date===original.holdout.actual[0].date);
  changedRows[i][original.group.target]+=10;
  const newPanel={...panel,rows:changedRows};
  const newCase=allModelCases(newPanel,config)[0];
  assert.deepEqual(original.holdout.history,newCase.holdout.history);
  assert.notDeepEqual(original.holdout.actual,newCase.holdout.actual);
});
