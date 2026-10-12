#!/usr/bin/env node
/** Daily, fixed-universe, symmetric solo-vs-multivariate market benchmark. */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parsePanel, fitRidge, mae, scoreBars, datasetUntil, featureVector,
  forecastClose, simulateBuyHold } from './stock-multivariate-core.mjs';
import { validateFixedGroups, updateGroupHistory } from './stock-fixed-groups.mjs';
import { predictWasm } from './stock-multivariate-wasm.mjs';
import { asOfFrame, predictionKey, compatibleCache } from './stock-evaluation-cache.mjs';
import { DEFAULT_EVALUATION_WINDOWS } from './stock-evaluation-windows.mjs';
import { renderStockSummary } from './stock-readme-summary.mjs';

function options(args) {
  const opt = {panel:'data/stocks/multivariate.csv', meta:'data/stocks/multivariate.meta.json',
    config:'config/stock-evaluation-groups.json', output:'reports/stocks/multivariate.json',
    history:'reports/stocks/group-history.json', cache:'reports/stocks/forecast-cache.json',
    readme:'README.md', sample:'data/sample_data.csv',publicSample:'frontend/app/public/sample_data.csv',
    ...DEFAULT_EVALUATION_WINDOWS,models:'ridge,xgboost,lightgbm'};
  for(let i=0;i<args.length;i++){
    if(!args[i].startsWith('--')||i===args.length-1)throw new Error(`Invalid argument ${args[i]}`);
    const key=args[i++].slice(2);
    if(!(key in opt))throw new Error(`Unknown option ${key}`);
    opt[key]=['recent','long','window'].includes(key)?Number(args[i]):args[i];
  }
  if(!Number.isInteger(opt.recent)||opt.recent<5||!Number.isInteger(opt.long)||opt.long<opt.recent||
     !Number.isInteger(opt.window)||opt.window<120||opt.window>1000)throw new Error('Invalid evaluation windows');
  opt.models=opt.models.split(',');
  if(new Set(opt.models).size!==opt.models.length || opt.models.some(m=>!['ridge','xgboost','lightgbm'].includes(m)))
    throw new Error('Invalid models');
  return opt;
}
function verified(path,expected){
  const raw=readFileSync(resolve(path));
  if(createHash('sha256').update(raw).digest('hex')!==expected)throw new Error(`SHA-256 mismatch: ${path}`);
  return raw.toString('utf8');
}
function opensFromCSV(csv,meta,rows){
  const lines=csv.trim().split(/\r?\n/).map(x=>x.split(','));
  if(lines[0][0]!=='Date'||lines[0].length!==meta.targets.length+1||
    meta.targets.some((t,i)=>lines[0][i+1]!==`${t}_Open`))throw new Error('Invalid opening-price header');
  const byDate=new Map(lines.slice(1).map(c=>[c[0],c]));
  const out=Object.fromEntries(meta.targets.map(t=>[t,[]]));
  for(const row of rows){
    const c=byDate.get(row.date);
    if(!c||c.length!==lines[0].length)throw new Error(`Missing opening prices at ${row.date}`);
    meta.targets.forEach((target,i)=>{
      const open=Number(c[i+1]);
      if(!Number.isFinite(open)||open<=0)throw new Error(`Invalid opening price ${target} ${row.date}`);
      out[target].push({date:row.date,open,close:row.prices[target]});
    });
  }
  return out;
}
const params={initialCash:1_000_000,lotSize:100,feeBps:5,slippageBps:5,thresholdBps:20};
const algorithms=['ridge','xgboost','lightgbm'];
const mean=x=>x.reduce((a,b)=>a+b,0)/x.length;
function score(bars,ohlc){
  const trading=scoreBars(bars,ohlc,params);
  return {maeJpy:mae(bars),mapePct:100*mean(bars.map(r=>Math.abs(r.predicted-r.close)/r.close)),
    pnlJpy:trading.profitJpy,returnPct:trading.returnPct,trades:trading.tradeCount,
    winRatePct:trading.winRatePct,directionAccuracyPct:trading.directionAccuracyPct,
    maxDrawdownPct:trading.maxDrawdownPct,equityCurve:trading.equityCurve,details:trading.details};
}
function relativeImprovement(solo,multi){
  return solo.mapePct>0 ? 100*(1-multi.mapePct/solo.mapePct):null;
}
function getStrategy(group,name,period='recent'){
  const set=period==='long'?group.longStrategies:group.strategies;
  const strategy=set.find(s=>s.name===name);
  if(!strategy)throw new Error(`Missing ${name}/${period}/${group.id}`);
  return strategy;
}
function safeFactorValue(rows,i,symbol,foreign){
  const previous=rows[i-1].date;
  const cutoff=foreign.has(symbol)?new Date(Date.parse(`${previous}T00:00:00Z`)-86400000).toISOString().slice(0,10):previous;
  for(let j=i-1;j>=0;j--)if(rows[j].date<=cutoff&&rows[j].prices[symbol]!=null)return rows[j].prices[symbol];
  return null;
}
function browserSample(rows,meta,group){
  const foreign=new Set(meta.foreign_symbols);
  const header=['Date','Close',...group.factors.map(f=>`${f.replace(/[^a-zA-Z0-9]/g,'_')}_known`)];
  const lines=[header.join(',')];
  for(let i=1;i<rows.length;i++){
    const extra=group.factors.map(f=>safeFactorValue(rows,i,f,foreign));
    if(extra.some(v=>v===null))continue;
    lines.push([rows[i].date,rows[i].prices[group.target],...extra].join(','));
  }
  if(lines.length<101)throw new Error('Insufficient correctly lagged demo observations');
  return lines.join('\n')+'\n';
}
function atomicJson(path,value){
  mkdirSync(dirname(resolve(path)),{recursive:true});
  const temporary=`${resolve(path)}.${process.pid}.tmp`;
  writeFileSync(temporary,JSON.stringify(value,null,2)+'\n');
  renameSync(temporary,resolve(path));
}
function engineFingerprint(configBytes){
  const parts=[configBytes,Buffer.from(JSON.stringify(params)),
    ...['scripts/run-stock-multivariate.mjs','scripts/stock-multivariate-core.mjs',
        'scripts/stock-multivariate-wasm.mjs','scripts/stock-evaluation-cache.mjs',
        'scripts/stock-evaluation-windows.mjs',
        'scripts/stock-trading-core.mjs','frontend/app/package-lock.json'].map(p=>existsSync(resolve(p))?readFileSync(resolve(p)):Buffer.from('missing:'+p))];
  return createHash('sha256').update(Buffer.concat(parts)).digest('hex');
}
function markdown(report) {
  return renderStockSummary(report);
}
async function main(){
  const opt=options(process.argv.slice(2));
  const meta=JSON.parse(readFileSync(resolve(opt.meta),'utf8'));
  const rows=parsePanel(verified(opt.panel,meta.panel_sha256),meta);
  if(rows.length!==meta.sessions||rows.at(-1).date!==meta.last_date)throw new Error('Panel metadata mismatch');
  if(rows.length<opt.window+opt.long+1)throw new Error(`Need at least ${opt.window+opt.long+1} market sessions for a ${opt.long}-session holdout`);
  const configBytes=readFileSync(resolve(opt.config)),config=JSON.parse(configBytes.toString('utf8'));
  const groups=validateFixedGroups(config,meta,rows);
  const opens=opensFromCSV(verified(resolve(dirname(opt.panel),meta.opens_file),meta.opens_sha256),meta,rows);
  const engineHash=engineFingerprint(configBytes),groupConfigSha256=createHash('sha256').update(configBytes).digest('hex');
  const cached=existsSync(resolve(opt.cache))?JSON.parse(readFileSync(resolve(opt.cache),'utf8')):null;
  const oldCache=compatibleCache(cached,engineHash);
  const newCache={...oldCache,entries:{}};
  let reused=0,computed=0;
  const longStart=rows.length-opt.long,recentStart=rows.length-opt.recent;
  const runKinds=[...opt.models];
  const assessments=[];
  for(const group of groups){
    const forecasts=new Map();
    const target=group.target;
    for(const kind of runKinds){
      for(const variant of ['target_only','multivariate']){
        const factors=variant==='target_only'?[]:group.factors;
        const name=`${kind}:${variant}`,bars=[];
        for(let i=longStart;i<rows.length;i++){
          const frame=asOfFrame(rows,i,opt.window);
          const key=predictionKey(frame,group,factors,kind,engineHash,meta.foreign_symbols);
          let bps=oldCache.entries[key];
          let wasComputed=false;
          if(typeof bps==='number'&&Number.isFinite(bps)){reused++;}
          else {
            const index=frame.length-1;
            const {X,y}=datasetUntil(frame,index,target,factors,meta.foreign_symbols);
            const features=featureVector(frame,index,target,factors,meta.foreign_symbols);
            bps=kind==='ridge'?fitRidge(X,y)(features):await predictWasm(kind,X,y,features);
            if(!Number.isFinite(bps))throw new Error(`Nonfinite result from ${group.id}/${name}/${rows[i].date}`);
            computed++;wasComputed=true;
            console.error(`${group.id}/${name}: ${i-longStart+1}/${opt.long} [reused:${reused}, fitted:${computed}]`);
          }
          newCache.entries[key]=bps;
          const previousClose=rows[i-1].prices[target];
          bars.push({date:rows[i].date,previousClose,close:rows[i].prices[target],predicted:forecastClose(previousClose,bps)});
          // It is safe to checkpoint computed predictions before all benchmarks finish;
          // README/official reports are only written after a complete successful run.
          if(wasComputed && computed%25===0)atomicJson(opt.cache,newCache);
        }
        forecasts.set(name,bars);
      }
    }
    const lastClose=rows.slice(longStart).map((r,j)=>({date:r.date,
      previousClose:rows[longStart+j-1].prices[target],predicted:rows[longStart+j-1].prices[target],close:r.prices[target]}));
    forecasts.set('last_close',lastClose);
    const longStrategies=[],strategies=[];
    for(const [name,bars] of forecasts){
      const factors=name.endsWith('multivariate')?group.factors:[];
      longStrategies.push({name,factors,...score(bars,opens[target])});
      strategies.push({name,factors,...score(bars.slice(-opt.recent),opens[target])});
    }
    const holding=opens[target].slice(recentStart).map((r,j)=>({...r,previousClose:rows[recentStart+j-1].prices[target]}));
    const longHolding=opens[target].slice(longStart).map((r,j)=>({...r,previousClose:rows[longStart+j-1].prices[target]}));
    assessments.push({...group,longStrategies,strategies,buyAndHold:simulateBuyHold(holding,params),
      longBuyAndHold:simulateBuyHold(longHolding,params)});
  }
  const result={protocol:'fixed-groups-symmetric-solo-multi-rolling-training-window-long-and-recent',
    evaluatedAtUtc:new Date().toISOString(),source:meta.source,latestMarketDate:meta.last_date,
    groupConfigSha256,panelSha256:meta.panel_sha256,opensSha256:meta.opens_sha256,
    trainingWindow:opt.window,models:opt.models,
    recentTest:{from:rows[recentStart].date,to:rows.at(-1).date,days:opt.recent},
    longTest:{from:rows[longStart].date,to:rows.at(-1).date,days:opt.long},
    test:{from:rows[recentStart].date,to:rows.at(-1).date,days:opt.recent},
    groups:assessments,parameters:params,cacheStats:{reused,computed,engineHash},
    limitations:['No dynamic target/group selection; comparisons pre-registered',
      'Rolling evaluations on historical vendor snapshots are not prospective signals',
      'Long and recent windows overlap; they are not independent tests',
      'Fees, slippage are simulated; excludes taxes dividends market impact',
      'Cash balances apply individually to each group and each evaluation window']};
  const historyPath=resolve(opt.history);
  const historical=existsSync(historyPath)?JSON.parse(readFileSync(historyPath,'utf8')):{version:1,records:[]};
  const newHistory=updateGroupHistory(historical,{marketDate:meta.last_date,configSha256:groupConfigSha256,
    test:result.recentTest,longTest:result.longTest,groups:assessments.map(g=>({
      id:g.id,target:g.target,
      models:Object.fromEntries(runKinds.map(kind=>{
        const shortSolo=getStrategy(g,`${kind}:target_only`),shortMulti=getStrategy(g,`${kind}:multivariate`);
        const longSolo=getStrategy(g,`${kind}:target_only`,'long'),longMulti=getStrategy(g,`${kind}:multivariate`,'long');
        return [kind,{recent:{soloMAPE:shortSolo.mapePct,multiMAPE:shortMulti.mapePct,
          improvementPct:relativeImprovement(shortSolo,shortMulti),soloPnlJpy:shortSolo.pnlJpy,multiPnlJpy:shortMulti.pnlJpy},
          long:{soloMAPE:longSolo.mapePct,multiMAPE:longMulti.mapePct,
          improvementPct:relativeImprovement(longSolo,longMulti),soloPnlJpy:longSolo.pnlJpy,multiPnlJpy:longMulti.pnlJpy}}];
      }))})),
  });
  const readmePath=resolve(opt.readme),original=readFileSync(readmePath,'utf8');
  const begin='<!-- STOCK_MULTIVARIATE:START -->',end='<!-- STOCK_MULTIVARIATE:END -->';
  if(original.split(begin).length!==2||original.split(end).length!==2||original.indexOf(end)<=original.indexOf(begin))
    throw new Error('Missing/duplicated README stock report markers');
  const updated=original.slice(0,original.indexOf(begin)+begin.length)+'\n'+markdown(result)+'\n'+original.slice(original.indexOf(end));
  const sample=browserSample(rows,meta,groups[0]);
  // Official outputs are generated only after all group/model evaluations succeed.
  atomicJson(opt.output,result);
  atomicJson(opt.history,newHistory);
  atomicJson(opt.cache,newCache);
  for(const destination of [opt.sample,opt.publicSample]){
    mkdirSync(dirname(resolve(destination)),{recursive:true});writeFileSync(resolve(destination),sample);
  }
  if(original!==updated)writeFileSync(readmePath,updated);
  console.log(`Evaluated ${groups.length} FIXED groups × ${opt.models.length} algorithms × solo/multi; recent ${opt.recent}, long ${opt.long} sessions; cached ${reused}, computed ${computed}.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
