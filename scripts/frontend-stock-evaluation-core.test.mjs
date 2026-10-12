import test from 'node:test';
import assert from 'node:assert/strict';
import {HORIZON,TRAIN_SIZE,MODEL_NAMES,ROLLING_ORIGINS, parseStockPanel,validateGroups,getCases,getRollingCases,
  scoreForecast,makeResults,makeDirectComparison,updateReadme,rollingAggregate,renderGroupChart,renderHorizonErrorChart} from './frontend-stock-evaluation-core.mjs';

assert.deepEqual(MODEL_NAMES, ['xgboost','lightgbm','varma','chronos','ridge']);

const groups = Array.from({length:5},(_,i)=>({id:`g${i}`,label:`Group ${i}`,target:`T${i}`,factors:[`P${i}`,`Q${i}`]}));
const config={groups};
const header=['Date',...groups.flatMap(g=>[g.target,...g.factors])];
const lines=[header.join(',')];
const start=Date.UTC(2024,0,1);
for(let i=0;i<TRAIN_SIZE+40;i++) {
  const date=new Date(start+i*86400000).toISOString().slice(0,10);
  lines.push([date,...groups.flatMap((_,g)=>[100+g+i,200+g+i,300+g+i])].join(','));
}
const panel=parseStockPanel(lines.join('\n'));

test('pre-registered groups only, and both complete 16-step holdouts',()=>{
  const validated=validateGroups(config,panel.headers);
  assert.equal(validated.length,5);
  assert.deepEqual(validateGroups({groups:groups.map(g=>({...g,
    factors:[...g.factors,'^N225','JPY=X']}))},panel.headers),validated);
  for(const g of validated){
    const [previous,recent]=getCases(panel.rows,g);
    assert.equal(previous.actual.length,HORIZON);
    assert.equal(recent.actual.length,HORIZON);
    assert.equal(previous.history.length,TRAIN_SIZE);
    assert.equal(recent.history.length,TRAIN_SIZE);
    assert.ok(previous.actual.at(-1).date<recent.actual[0].date);
    assert.equal(previous.originDate,previous.history.at(-1).Date);
    assert.ok(!previous.history.some(r=>previous.actual.some(a=>r.Date===a.date)));
    assert.ok(!recent.history.some(r=>recent.actual.some(a=>r.Date===a.date)));
    assert.equal(recent.initialClose,recent.history.at(-1)[g.target]);
    const rolling = getRollingCases(panel.rows,g);
    assert.equal(rolling.length,ROLLING_ORIGINS);
    assert.equal(rolling.at(-1).actual[0].date,panel.rows.at(-1).Date);
    for (const origin of rolling){
      assert.equal(origin.history.length,TRAIN_SIZE);
      assert.equal(origin.actual.length,1);
      assert.ok(origin.originDate<origin.actual[0].date);
      assert.equal(origin.history.at(-1).Date,origin.originDate);
      assert.deepEqual(Object.keys(origin.history.at(-1)),['Date',g.target,...g.peers]);
    }
    // A 16-step last-close baseline repeats ONLY the origin close; it never
    // reads the actual preceding day of each held-out future step.
    const baseline=scoreForecast(recent.actual.map(()=>recent.initialClose),recent.actual,recent.initialClose);
    assert.deepEqual(baseline.points.map(p=>p.predicted),Array(16).fill(recent.initialClose));
    assert.deepEqual(Object.keys(recent.history[0]),['Date',g.target,...g.peers]);
    assert.equal(g.peers.length,2);
  }
});

test('reject holes, unsorted dates, missing group columns, mismatched output length',()=>{
  const rows=panel.rows.map(r=>({...r}));rows.at(-1).T0=null;
  assert.throws(()=>getCases(rows,validateGroups(config,panel.headers)[0]),/Missing price/);
  assert.throws(()=>getRollingCases(rows,validateGroups(config,panel.headers)[0]),/Missing price/);
  assert.throws(()=>getRollingCases(panel.rows,validateGroups(config,panel.headers)[0],500),/Insufficient history/);
  assert.throws(()=>parseStockPanel('Date,X\n2024-01-02,1\n2024-01-01,2'),/ascending/);
  assert.throws(()=>validateGroups(config,['Date']),/Missing required/);
  assert.throws(()=>validateGroups({groups:[{...groups[0],id:'../escape'},...groups.slice(1)]},panel.headers),/invalid group/);
  assert.throws(()=>scoreForecast([3],[{date:'2025-01-01',value:3},{date:'2025-01-02',value:4}],2),/length/);
});

test('metrics and last-close directional scoring',()=>{
  const actual=[{date:'2026-10-07',value:110},{date:'2026-10-08',value:90}];
  const m=scoreForecast([105,95],actual,100);
  assert.equal(m.mae,5);
  assert.equal(m.directionHitPct,100);
  assert.ok(m.mapePct>0);
  assert.ok(m.step1ApePct>0);
  assert.ok(m.step16ApePct>0);
  assert.equal(scoreForecast([100,100],actual,100).directionHitPct,0);
});

test('README, rolling aggregate, charts and report validation are deterministic',()=>{
  const evaluated=[],rolling=[];
  for(const g of validateGroups(config,panel.headers)){
    for(const c of getCases(panel.rows,g))for(const model of MODEL_NAMES){
      const predicted=c.actual.map(p=>p.value);
      evaluated.push({group:g.id,window:c.window,model,originDate:c.originDate,
        initialClose:c.initialClose,metrics:scoreForecast(predicted,c.actual,c.initialClose),
        baseline:scoreForecast(c.actual.map(()=>c.initialClose),c.actual,c.initialClose)});
    }
    for(const c of getRollingCases(panel.rows,g))for(const model of MODEL_NAMES){
      const predicted=c.actual.map(p=>p.value);
      rolling.push({group:g.id,window:c.window,model,originDate:c.originDate,
        initialClose:c.initialClose,metrics:scoreForecast(predicted,c.actual,c.initialClose),
        baseline:scoreForecast(c.actual.map(()=>c.initialClose),c.actual,c.initialClose)});
    }
  }
  const args={panel,config,results:evaluated,rollingResults:rolling,generatedAt:'2026-10-11T12:00:00.000Z'};
  const report=makeResults(args);
  assert.equal(report.results.length,50);
  assert.equal(report.rollingResults.length,800);
  assert.equal(report.modelNames.at(-1),'ridge');
  const baseline='# Header\n\n## multivariate stock benchmark\n\n<!-- STOCK_MULTIVARIATE:START -->\nlegacy\n<!-- STOCK_MULTIVARIATE:END -->\n';
  const updated=updateReadme(baseline,report);
  assert.match(updated,/Stock results — browser benchmark/);
  assert.doesNotMatch(updated,/65%|seasonal blend/i);
  const frontendSection = updated.split('<!-- FRONTEND_STOCK_EVALUATION:START -->')[1]
    .split('<!-- FRONTEND_STOCK_EVALUATION:END -->')[0];
  assert.match(frontendSection, /\| Sector \| Model \| Previous 16-step MAPE/);
  assert.match(frontendSection, /\| Group 0 \| ridge \|/);
  assert.match(frontendSection, /\| Group 0 \| last_close \|/);
  assert.doesNotMatch(frontendSection, /!\[|###|\*\*Method:|Seasonal|wins against/i);
  const tableRows = frontendSection.split('\n').filter(line => line.startsWith('|'));
  assert.equal(tableRows.length, 2 + 5 * 6);
  for (const row of tableRows)
    assert.equal(row.split('|').length, 7, `Invalid five-column Markdown table: ${row}`);
  assert.match(updated,/Legacy separate-engine stock benchmark/);
  assert.equal(updated,updateReadme(updated,report));
  const stats=rollingAggregate(report,'g0','ridge');
  assert.equal(stats.mapePct,0);
  assert.equal(stats.directionHitPct,100);
  assert.ok(stats.baselineMapePct>0);
  for(const svg of [renderGroupChart(report,'g0'),renderHorizonErrorChart(report)]){
    assert.match(svg,/^<svg/);
    assert.match(svg,/<\/svg>/);
    assert.match(svg,/polyline/);
  }
  assert.throws(()=>makeResults({...args,results:evaluated.slice(1)}),/Missing evaluation/);
  assert.throws(()=>makeResults({...args,rollingResults:rolling.slice(1)}),/Missing rolling/);
  assert.throws(()=>makeResults({...args,results:evaluated.map((r,i)=>i===0?{...r,seasonalMetrics:null}:r)}),/Obsolete seasonal metrics/);
  assert.throws(()=>makeResults({...args,rollingResults:rolling.map((r,i)=>i===0?{...r,originDate:'2020-01-01'}:r)}),/Missing\/duplicate rolling/);
  assert.throws(()=>makeResults({...args,rollingResults:rolling.map((r,i)=>i===0?{...r,
    metrics:{...r.metrics,points:[{...r.metrics.points[0],date:'2099-01-01'}]}}:r)}),/Misaligned rolling/);
  assert.throws(()=>makeResults({...args,results:evaluated.map((r,i)=>i===0?{...r,
    metrics:{...r.metrics,points:[{...r.metrics.points[0],date:'2099-01-01'},...r.metrics.points.slice(1)]}}:r)}),/Misaligned multi-step/);
});

test('each 1-step origin sees only already observed prices; future mutations do not alter its inputs',()=>{
  const g=validateGroups(config,panel.headers)[0];
  const cases=getRollingCases(panel.rows,g);
  const targetCase=cases[0];
  const rows=panel.rows.map(r=>({...r}));
  const targetIndex=rows.findIndex(r=>r.Date===targetCase.actual[0].date);
  rows[targetIndex][g.target]*=1.5;
  rows[targetIndex][g.peers[0]]*=1.5;
  const changed=getRollingCases(rows,g)[0];
  assert.deepEqual(targetCase.history,changed.history);
  assert.notDeepEqual(targetCase.actual,changed.actual);
});

test('matched Direct price / cumulative log-return comparison is complete and table remains compact',()=>{
  const baseResults=[],rollingResults=[];
  const directResults=[];
  for(const g of validateGroups(config,panel.headers)){
    for(const c of getCases(panel.rows,g)) {
      for(const model of MODEL_NAMES) {
        baseResults.push({group:g.id,window:c.window,model,
          originDate:c.originDate,initialClose:c.initialClose,
          metrics:scoreForecast(c.actual.map(p=>p.value),c.actual,c.initialClose),
          baseline:scoreForecast(c.actual.map(()=>c.initialClose),c.actual,c.initialClose)});
      }
      for(const model of ['xgboost','lightgbm','ridge'])for(const targetMode of ['price','log_return']) {
        directResults.push({group:g.id,window:c.window,model,targetMode,
          originDate:c.originDate,initialClose:c.initialClose,
          metrics:scoreForecast(c.actual.map(p=>p.value),c.actual,c.initialClose)});
      }
    }
    for(const c of getRollingCases(panel.rows,g))for(const model of MODEL_NAMES) {
      rollingResults.push({group:g.id,window:c.window,model,
        originDate:c.originDate,initialClose:c.initialClose,
        metrics:scoreForecast(c.actual.map(p=>p.value),c.actual,c.initialClose),
        baseline:scoreForecast(c.actual.map(()=>c.initialClose),c.actual,c.initialClose)});
    }
  }
  const base=makeResults({panel,config,results:baseResults,rollingResults,
    generatedAt:'2026-10-12T00:00:00Z'});
  const arg={panel,config,standardReport:base,results:directResults,
    generatedAt:'2026-10-12T00:00:00Z'};
  const direct=makeDirectComparison(arg);
  assert.equal(direct.results.length,60);
  const updated=updateReadme('# Project\n\n## multivariate stock benchmark\n',base,direct);
  assert.match(updated,/Direct 16-step comparison/);
  assert.match(updated,/Direct log-return MAPE/);
  assert.equal(updated,updateReadme(updated,base,direct));
  const directTable=updated.split('### Direct 16-step comparison')[1]
    .split('<!-- FRONTEND_STOCK_EVALUATION:END -->')[0];
  const lines=directTable.split('\n').filter(x=>x.startsWith('|'));
  assert.equal(lines.length,5);
  for(const line of lines)assert.equal(line.split('|').length,7);
  assert.doesNotMatch(updated,/!\[|paper trading|drawdown/i);
  const changed={...direct, dataSha256:'stale'};
  assert.doesNotMatch(updateReadme(updated,base,changed),/Direct 16-step comparison/);
  assert.throws(()=>makeDirectComparison({...arg,results:directResults.slice(1)}),/Incomplete/);
  assert.throws(()=>makeDirectComparison({...arg,results:directResults.map((r,i)=>i===0?{...r,originDate:'2000-01-01'}:r)}),/Misaligned/);
  assert.throws(()=>makeDirectComparison({...arg,results:directResults.map((r,i)=>i===1?{...r,targetMode:'price'}:r)}),/Missing\/duplicate/);
  assert.throws(()=>makeDirectComparison({...arg,standardReport:{...base,dataSha256:'different'}}),/changed/);
});
