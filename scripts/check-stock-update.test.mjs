import test from 'node:test';
import assert from 'node:assert/strict';
import {decideStockUpdate,tokyoDate} from './check-stock-update.mjs';
import {fingerprintAllModelInput,makeAllModelReport,ALL_MODEL_PROTOCOL} from './all-model-evaluation-core.mjs';
import {parseStockPanel} from './frontend-stock-evaluation-core.mjs';
import {readFileSync} from 'node:fs';

const hashA='a'.repeat(64), hashB='b'.repeat(64);
const base={latestDate:'2026-10-13',metaLatestDate:'2026-10-13',nowDay:'2026-10-13',windowHash:hashA};
const report={protocol:ALL_MODEL_PROTOCOL, latestMarketDate:'2026-10-13',evaluationWindowSha256:hashA};
test('Tokyo date is independent of UTC date',()=>{
  assert.equal(tokyoDate(new Date('2026-10-12T16:00:00Z')),'2026-10-13');
});
test('New session runs once, even if it lands after a weekend or market closure',()=>{
  assert.equal(decideStockUpdate({...base,report:{...report,latestMarketDate:'2026-10-09'}}).run,true);
  assert.equal(decideStockUpdate({...base,report}).run,false);
  assert.equal(decideStockUpdate({...base,report:null}).run,true);
});
test('Revisions to real benchmark inputs run; history window churn does not',()=>{
  assert.equal(decideStockUpdate({...base,report,windowHash:hashB}).run,true);
  assert.equal(decideStockUpdate({...base,report:{...report,evaluationWindowSha256:undefined}}).run,false);
});
test('Migrates the existing six-model report even when closing prices are unchanged',()=>{
  const older={...report,protocol:'real-browser-recent-16step-all-six-v1'};
  const decision=decideStockUpdate({...base,report:older});
  assert.equal(decision.run,true);
  assert.match(decision.reason,/upgrade/);
  assert.throws(()=>decideStockUpdate({...base,report:{...report,protocol:'invalid'}}),/Invalid previous/);
});
test('Stale data skips; inconsistencies and regressions fail',()=>{
  assert.equal(decideStockUpdate({...base,nowDay:'2026-10-14',report}).run,false);
  assert.throws(()=>decideStockUpdate({...base,metaLatestDate:'2026-10-09',report}),/Inconsistent/);
  assert.throws(()=>decideStockUpdate({...base,nowDay:'2026-10-12',report}),/Future-dated/);
  assert.throws(()=>decideStockUpdate({...base,latestDate:'2026-10-09',metaLatestDate:'2026-10-09',report}),/regressed/);
  assert.equal(decideStockUpdate({...base,report,force:true}).run,true);
});
test('Input fingerprint ignores unused columns and older rolling source window',()=>{
  const panel=parseStockPanel(readFileSync(new URL('../data/stocks/multivariate.csv',import.meta.url),'utf8'));
  const config=JSON.parse(readFileSync(new URL('../config/stock-evaluation-groups.json',import.meta.url),'utf8'));
  const original=fingerprintAllModelInput(panel,config);
  assert.match(original,/^[0-9a-f]{64}$/);
  const unused={...panel,rows:panel.rows.map(row=>({...row,'^GSPC':99999}))};
  assert.equal(fingerprintAllModelInput(unused,config),original);
  const short={...panel,rows:panel.rows.slice(-272)};
  assert.equal(fingerprintAllModelInput(short,config),original);
  const changed={...panel,rows:[...panel.rows]};
  changed.rows[changed.rows.length-1]={...changed.rows.at(-1),'7203.T':changed.rows.at(-1)['7203.T']+1};
  assert.notEqual(fingerprintAllModelInput(changed,config),original);
});
