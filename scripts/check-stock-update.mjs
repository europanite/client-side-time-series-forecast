#!/usr/bin/env node
/** Daily post-close data-change gate for the seven-model browser benchmark.
 * No exchange calendar: observe actual panel updates instead of guessing sessions.
 * The fingerprint covers only the 272-session input/holdout used by this study.
 */
import {appendFileSync, existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {parseStockPanel} from './frontend-stock-evaluation-core.mjs';
import {fingerprintAllModelInput, ALL_MODEL_PROTOCOL} from './all-model-evaluation-core.mjs';

const PREVIOUS_MODEL_PROTOCOL = 'real-browser-recent-16step-all-six-v1';

const ROOT=resolve(import.meta.dirname,'..');

export function tokyoDate(now=new Date()) {
  return new Intl.DateTimeFormat('en-CA',{
    timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit'
  }).format(now);
}

/** Return run=true only for a first evaluation, new closes, revised relevant
 * historical closes, or an explicitly forced manual evaluation.
 * A missing new close on weekends, holidays or feed-delayed days is a SKIP.
 */
export function decideStockUpdate({latestDate,metaLatestDate,report,windowHash,nowDay,force=false}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(latestDate ?? '') || metaLatestDate !== latestDate)
    throw new Error(`Inconsistent stock panel dates: CSV=${latestDate}, metadata=${metaLatestDate}`);
  if (latestDate > nowDay)
    throw new Error(`Future-dated stock panel: ${latestDate} > JST ${nowDay}`);
  if (!/^[0-9a-f]{64}$/.test(windowHash)) throw new Error('Invalid benchmark input SHA256');
  if (!report) return {run:true, reason:'No previously published all-model report'};
  if (![ALL_MODEL_PROTOCOL, PREVIOUS_MODEL_PROTOCOL].includes(report.protocol) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(report.latestMarketDate ?? ''))
    throw new Error('Invalid previous all-model report; investigate or run with force');
  if (report.latestMarketDate > latestDate)
    throw new Error(`Stock feed regressed from published ${report.latestMarketDate} to ${latestDate}`);
  if (force) return {run:true, reason:'Explicit manual force requested'};
  if (report.protocol !== ALL_MODEL_PROTOCOL)
    return {run:true, reason:`Benchmark model-suite upgrade: ${report.protocol} -> ${ALL_MODEL_PROTOCOL}`};
  if (report.latestMarketDate < latestDate)
    return {run:true, reason:`New closing-price session: ${report.latestMarketDate} -> ${latestDate}`};
  // Older reports predate this field. The unchanged session must not trigger an
  // expensive run just because a provider's 3y history window shifted.
  if (!report.evaluationWindowSha256)
    return {run:false, reason:'Market date unchanged (previous report predates window fingerprint)'};
  if (report.evaluationWindowSha256 !== windowHash)
    return {run:true, reason:'Past benchmark-window closing prices were revised'};
  return {run:false, reason:'No new or revised closes in the evaluation window'};
}

function output(name,value) {
  const line=`${name}=${value}\n`;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT,line);
  process.stdout.write(line);
}

export function main() {
  const panelText=readFileSync(resolve(ROOT,'data/stocks/multivariate.csv'),'utf8');
  const panel=parseStockPanel(panelText);
  const meta=JSON.parse(readFileSync(resolve(ROOT,'data/stocks/multivariate.meta.json'),'utf8'));
  // The backend writes panel bytes and metadata independently. Reject torn reads.
  const fileSha=createHash('sha256').update(panelText).digest('hex');
  if (meta.panel_sha256 !== fileSha)
    throw new Error('Stock panel SHA256 does not match collector metadata');
  const config=JSON.parse(readFileSync(resolve(ROOT,'config/stock-evaluation-groups.json'),'utf8'));
  const windowHash=fingerprintAllModelInput(panel,config);
  const reportPath=resolve(ROOT,'reports/stocks/all-models.json');
  const report=existsSync(reportPath)?JSON.parse(readFileSync(reportPath,'utf8')):null;
  const latestDate=panel.rows.at(-1)?.Date;
  const result=decideStockUpdate({latestDate,metaLatestDate:meta.last_date,
    report,windowHash,nowDay:tokyoDate(),
    force:process.env.GITHUB_EVENT_NAME==='workflow_dispatch' && process.env.FORCE_EVALUATION==='true'});
  console.log(`[stock-update] ${latestDate}: ${result.reason}`);
  output('run',result.run?'true':'false');
  output('latest_date',latestDate);
  output('input_sha256',windowHash);
  output('reason',result.reason);
  // Keep intentional skips visible on the Actions run Summary without
  // misreporting them as benchmark successes or failures.
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
      '### Daily seven-model stock evaluation',
      `- Last complete stock session: ${latestDate}`,
      `- Previously published session: ${report?.latestMarketDate ?? 'none'}`,
      `- Decision: **${result.run ? 'EVALUATE' : 'SKIP'}**`,
      `- Reason: ${result.reason}`,
      ''
    ].join('\n')+'\n');
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {main();} catch(err) {console.error(err);process.exitCode=1;}
}
