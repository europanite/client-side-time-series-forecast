#!/usr/bin/env node
/** Daily (or manually triggered), matched 16-step comparison of ALL eight browser algorithms.
 * Unlike the historical recursive benchmark, this intentionally does NOT run 32 rolling
 * origins: repeating an ~1GB model hundreds of times is unnecessarily costly.
 */
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseStockPanel, atomicText } from './frontend-stock-evaluation-core.mjs';
import { allModelCases, ALL_MODEL_NAMES, makeAllModelReport, updateAllModelReadme } from './all-model-evaluation-core.mjs';

const ROOT = process.env.EVAL_REPO_ROOT || '/repo';
const APP_URL = process.env.EVAL_APP_URL || 'http://frontend:5173/client-side-time-series-forecast/';
const file = p => resolve(ROOT, p);
const panel = parseStockPanel(readFileSync(file('data/stocks/multivariate.csv'), 'utf8'));
const config = JSON.parse(readFileSync(file('config/stock-evaluation-groups.json'), 'utf8'));
const cases = allModelCases(panel, config);
// Covers inference modules and shared training/feature logic. Report should
// identify the exact local source, including uncommitted benchmark changes.
const sources = [
  'frontend/app/src/core.ts', 'frontend/app/src/api.ts',
  'frontend/app/src/xgb.ts', 'frontend/app/src/xgb-bagging.ts',
  'frontend/app/src/lightgbm-bagging.ts',
  'frontend/app/src/lightgbm.ts', 'frontend/app/src/ridge.ts',
  'frontend/app/src/varma.ts', 'frontend/app/src/chronos.ts',
  'frontend/app/src/timesfm.ts', 'frontend/app/src/timesfm-data.ts',
  'frontend/app/src/forecast-strategies.ts',
  'scripts/benchmark-all-models-browser.mjs', 'scripts/all-model-evaluation-core.mjs',
];
const fingerprint = createHash('sha256');
for(const source of sources) fingerprint.update(source).update('\0').update(readFileSync(file(source)));
const sourceSha256 = fingerprint.digest('hex');

const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox', '--disable-dev-shm-usage'
]});
const predictions=[];
try {
  const page=await browser.newPage();
  page.setDefaultTimeout(120_000);
  page.on('pageerror',e=>console.error(`Browser exception: ${e.message}`));
  page.on('console',msg=>{
    if(msg.type()==='log' && msg.text().startsWith('[all-model-eval]'))
      console.error(msg.text());
  });
  for(let attempt=1;attempt<=20;attempt++) {
    try {
      const resp=await page.goto(APP_URL,{waitUntil:'domcontentloaded',timeout:15_000});
      if(!resp?.ok()) throw new Error(`HTTP ${resp?.status()}`);
      await page.getByText('Client-Side Time-Series Forecast',{exact:true}).first().waitFor({timeout:10_000});
      break;
    } catch(err) {
      if(attempt===20) throw err;
      await new Promise(resolve=>setTimeout(resolve,1500));
    }
  }

  for (const {group,holdout} of cases) {
    for (const model of ALL_MODEL_NAMES) {
      console.error(`Evaluating ${group.id}/recent/${model}: origin ${holdout.originDate}`);
      // Import the SAME modules as App.tsx; no duplicate forecasting algorithm.
      // A single page keeps the pretrained sessions warm after their first load.
      const result=await page.evaluate(async ({history,target,peers,model,horizon})=>{
        const src='/client-side-time-series-forecast/src/';
        const core=await import(/* @vite-ignore */ src+'core.ts');
        const loaded=await core.loadFromCSV([
          ['Date',target,...peers].join(','),
          ...history.map(row=>[row.Date,row[target],...peers.map(p=>row[p])].join(',')),
        ].join('\n'));
        const started=performance.now();
        let points;
        if (model==='chronos') {
          const mod=await import(/* @vite-ignore */ src+'chronos.ts');
          points=(await mod.forecastChronosNext16(loaded,target)).points;
        } else if (model==='timesfm') {
          const mod=await import(/* @vite-ignore */ src+'timesfm.ts');
          points=(await mod.forecastTimesFMNext16(loaded,target,undefined,
            message=>console.log(`[all-model-eval] ${message}`))).points;
        } else if (model==='varma') {
          const mod=await import(/* @vite-ignore */ src+'varma.ts');
          const trained=mod.trainVarmaModel(loaded);
          points=mod.forecastVarmaNextN(loaded,target,trained,horizon);
        } else {
          const direct=await import(/* @vite-ignore */ src+'forecast-strategies.ts');
          const trained=await direct.trainDirectForecast(loaded,target,model,horizon,undefined,'price');
          try {points=direct.forecastDirectNextN(loaded,target,trained,horizon);}
          finally {trained.dispose();}
        }
        return {predicted:points.map(p=>p.value),elapsedMs:performance.now()-started};
      },{history:holdout.history,target:group.target,peers:group.peers,model,horizon:holdout.actual.length});
      predictions.push({group:group.id,model,window:'recent',originDate:holdout.originDate,...result});
      console.error(`  completed in ${(result.elapsedMs/1000).toFixed(1)}s`);
    }
  }
} finally {
  await browser.close();
}

// All 5*6 actual forecasts must complete. No partial README/JSON on failure.
const report=makeAllModelReport({panel,config,predictions,
  generatedAt:new Date().toISOString(), sourceSha256});
const updated=updateAllModelReadme(readFileSync(file('README.md'),'utf8'),report);
const output=JSON.stringify(report,null,2)+'\n';
// Publication order: validate/render entirely before writing; README last.
atomicText(file('reports/stocks/all-models.json'),output);
atomicText(file('README.md'),updated);
console.log(`Published ${report.results.length} evaluated cases across ${report.groups.length} groups and ${report.models.length} algorithms.`);
