#!/usr/bin/env node
/**
 * Evaluate the actual Vite browser modules, NOT a second ML implementation.
 * Run inside the dedicated Playwright container with the local app up.
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseStockPanel, validateGroups, getCases, scoreForecast,
  makeResults, updateReadme, atomicText, MODEL_NAMES, ROLLING_ORIGINS,
  getRollingCases, renderGroupChart, renderHorizonErrorChart } from './frontend-stock-evaluation-core.mjs';

const APP_URL=process.env.EVAL_APP_URL || 'http://frontend:5173/client_side_time_series_forecast/';
const ROOT=process.env.EVAL_REPO_ROOT || '/repo';
const path=p=>resolve(ROOT,p);
const panel=parseStockPanel(readFileSync(path('data/stocks/multivariate.csv'),'utf8'));
const config=JSON.parse(readFileSync(path('config/stock-evaluation-groups.json'),'utf8'));
const groups=validateGroups(config,panel.headers);
const cases=groups.flatMap(g=>getCases(panel.rows,g).map(test=>({ ...test,group:g })));
const rollingCases=groups.flatMap(g=>getRollingCases(panel.rows,g).map(test=>({ ...test,group:g })));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let page;
const results=[];
const rollingResults=[];
try {
  page=await browser.newPage();
  page.setDefaultTimeout(120000);
  page.on('pageerror',e=>console.error('Browser page error:',e.message));
  // Explicitly require the actual frontend to load before importing its public functions.
  for(let i=0;i<20;i++){
    try {
      const resp=await page.goto(APP_URL,{waitUntil:'domcontentloaded',timeout:15000});
      if(!resp?.ok())throw new Error(`status ${resp?.status()}`);
      await page.getByText('Client-Side Time-Series Forecast',{exact:true}).first().waitFor({timeout:10000});
      break;
    }catch(err){if(i===19)throw err;await new Promise(r=>setTimeout(r,1500));}
  }
  // A fresh origin per completed market session. We never include the target
  // observation or any peer observation from the day being forecast.
  for(const test of [...cases,...rollingCases]){
    const {group,window,originDate,actual,initialClose,history}=test;
    const baseline=scoreForecast(actual.map(()=>initialClose),actual,initialClose);
    for(const model of MODEL_NAMES){
      console.log(`${group.id}/${window}/${model}: origin ${originDate}`);
      // Same real browser API as the React app; horizon 1 skips speculative
      // future peer continuation without inventing a separate ML engine.
      const evaluation=page.evaluate(async ({history,target,peers,model,horizon})=>{
        const base='/client_side_time_series_forecast/src/';
        const core=await import(/* @vite-ignore */ base+'core.ts');
        const loaded=await core.loadFromCSV([
          ['Date',target,...peers].join(','),
          ...history.map(r=>[r.Date,r[target],...peers.map(p=>r[p])].join(','))
        ].join('\n'));
        const forecasts=await (async()=>{
          if(model==='chronos'){
            const chronos=await import(/* @vite-ignore */ base+'chronos.ts');
            return {points:(await chronos.forecastChronosNext16(loaded,target)).points.slice(0,horizon)};
          }
          if(model==='ridge'){
            const ridge=await import(/* @vite-ignore */ base+'ridge.ts');
            const trained=ridge.trainRidgeModel(loaded,target);
            return {points:core.forecastNextN(loaded,target,trained,horizon)};
          }
          if(model==='varma'){
            const varma=await import(/* @vite-ignore */ base+'varma.ts');
            const trained=varma.trainVarmaModel(loaded);
            return {points:varma.forecastVarmaNextN(loaded,target,trained,horizon)};
          }
          const trained=model==='lightgbm'
            ?await (await import(/* @vite-ignore */ base+'lightgbm.ts')).trainLightGBMModel(loaded,target)
            :await core.trainModel(loaded,target);
          try{return {points:core.forecastNextN(loaded,target,trained,horizon)};}
          finally{if(typeof trained?.dispose==='function')await trained.dispose();}
        })();
        return {predicted:forecasts.points.map(p=>p.value)};
      },{history,target:group.target,peers:group.peers,model,horizon:actual.length});
      let kill;
      const deadline=new Promise((_,reject)=>{kill=setTimeout(()=>reject(
        new Error(`Timeout evaluating ${group.id}/${window}/${model}`)),360000);});
      let forecasts;
      try{forecasts=await Promise.race([evaluation,deadline]);}
      finally{clearTimeout(kill);}
      const metrics=scoreForecast(forecasts.predicted,actual,initialClose);
      const entry={group:group.id,window,model,originDate,
        from:actual[0].date,through:actual.at(-1).date,initialClose,
        metrics,baseline};
      (window==='rolling_1step'?rollingResults:results).push(entry);
    }
  }
} finally {
  await browser.close();
}
// All five app models must pass on every registered case. Do not publish partial/failed numbers.
const report=makeResults({panel,config,results,rollingResults,rollingCount:ROLLING_ORIGINS,
  generatedAt:new Date().toISOString()});
const readme=readFileSync(path('README.md'),'utf8');
const directPath=path('reports/stocks/direct-comparison.json');
const direct=existsSync(directPath) ? JSON.parse(readFileSync(directPath,'utf8')) : null;
// Stale sidecars are suppressed automatically when daily data change.
const newReadme=updateReadme(readme,report,direct);
// Pre-render all charts before publishing anything: a failed or incomplete
// evaluation must never replace the previously published README.
const charts=[...groups.map(g=>({path:`reports/stocks/charts/${g.id}-recent.svg`,
  content:renderGroupChart(report,g.id)})),
  {path:'reports/stocks/charts/horizon-error.svg',content:renderHorizonErrorChart(report)}];
// Only publish after full evaluation and successful README/graph rendering.
for(const chart of charts)atomicText(path(chart.path),chart.content);
atomicText(path('reports/stocks/frontend-evaluation.json'),JSON.stringify(report,null,2)+'\n');
atomicText(path('README.md'),newReadme);
console.log(`Published browser benchmark: ${results.length} multi-step and ${rollingResults.length} rolling one-step model/group/origin results`);
