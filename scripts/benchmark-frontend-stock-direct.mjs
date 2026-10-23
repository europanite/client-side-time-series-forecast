#!/usr/bin/env node
/** Real frontend Direct 16-step price vs cumulative log-return benchmark.
 * Requires a full and matching standard benchmark JSON first. Heavy: each
 * supervised regressor fits 16 independent horizon models per evaluation.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseStockPanel,validateGroups,getCases,scoreForecast,
  makeDirectComparison,updateReadme,atomicText,DIRECT_MODELS,DIRECT_TARGET_MODES
} from './frontend-stock-evaluation-core.mjs';
const ROOT=process.env.EVAL_REPO_ROOT||'/repo';
const APP_URL=process.env.EVAL_APP_URL||'http://frontend:5173/client-side-time-series-forecast-ai/';

const at=p=>resolve(ROOT,p);
const panel=parseStockPanel(readFileSync(at('data/stocks/multivariate.csv'),'utf8'));
const config=JSON.parse(readFileSync(at('config/stock-evaluation-groups.json'),'utf8'));
const standard=JSON.parse(readFileSync(at('reports/stocks/frontend-evaluation.json'),'utf8'));
const groups=validateGroups(config,panel.headers);
const results=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  const page=await browser.newPage();
  page.setDefaultTimeout(120000);
  page.on('pageerror',e=>console.error('Browser page error:',e.message));
  for(let i=0;i<20;i++){
    try{
      const response=await page.goto(APP_URL,{waitUntil:'domcontentloaded',timeout:15000});
      if(!response?.ok())throw new Error(`HTTP ${response?.status()}`);
      await page.getByText('Client-Side Time-Series Forecast AI',{exact:true}).first().waitFor({timeout:10000});
      break;
    }catch(err){if(i===19)throw err;await new Promise(resolve=>setTimeout(resolve,1500));}
  }
  for(const group of groups)for(const holdout of getCases(panel.rows,group)){
    const {history,actual,initialClose,window,originDate}=holdout;
    for(const model of DIRECT_MODELS)for(const targetMode of DIRECT_TARGET_MODES){
      console.log(`${group.id}/${window}/${model}/direct_${targetMode}: origin ${originDate}`);
      const task=page.evaluate(async({history,target,peers,model,targetMode,horizon})=>{
        const base='/client-side-time-series-forecast-ai/src/';

        const core=await import(/* @vite-ignore */ base+'core.ts');
        const direct=await import(/* @vite-ignore */ base+'forecast-strategies.ts');
        const loaded=await core.loadFromCSV([
          ['Date',target,...peers].join(','),
          ...history.map(row=>[row.Date,row[target],...peers.map(peer=>row[peer])].join(','))
        ].join('\n'));
        const trained=await direct.trainDirectForecast(loaded,target,model,horizon,undefined,targetMode);
        try {
          return direct.forecastDirectNextN(loaded,target,trained,horizon).map(point=>point.value);
        } finally {trained.dispose();}
      },{history,target:group.target,peers:group.peers,model,targetMode,horizon:actual.length});
      let timer;
      try{
        const predicted=await Promise.race([task,new Promise((_,reject)=>{
          timer=setTimeout(()=>reject(new Error(`Direct benchmark timeout ${group.id}/${model}/${targetMode}`)),900000);
        })]);
        const metrics=scoreForecast(predicted,actual,initialClose);
        results.push({group:group.id,window,model,targetMode,originDate,initialClose,metrics});
      }finally{clearTimeout(timer);}
    }
  }
}finally{await browser.close();}
const report=makeDirectComparison({panel,config,standardReport:standard,
  results,generatedAt:new Date().toISOString()});
// Generate everything before writing; incomplete comparisons are never published.
const updated=updateReadme(readFileSync(at('README.md'),'utf8'),standard,report);
atomicText(at('reports/stocks/direct-comparison.json'),JSON.stringify(report,null,2)+'\n');
atomicText(at('README.md'),updated);
console.log(`Published ${results.length} matched Direct 16-step comparisons; no synthetic data`);
