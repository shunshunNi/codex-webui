import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';
import { launchOptions } from './browser-runtime.mjs';
const browser=await chromium.launch(launchOptions());
try {
  const page=await browser.newPage({viewport:{width:900,height:750}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.CODEX_WEBUI_TEST_URL||'http://127.0.0.1:8899',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>globalThis.__codexWebuiDebug);
  await page.evaluate(()=>{
    const api=globalThis.__codexWebuiDebug;api.startNewTask();api.state.active={id:'compact-test',cwd:'/tmp'};
    for(let i=0;i<8;i++){
      api.notify('item/completed',{turnId:'compact-turn',item:{id:`thought-${i}`,type:'reasoning',summary:[]}});
      api.notify('item/completed',{turnId:'compact-turn',item:{id:`cmd-${i}`,type:'commandExecution',command:`echo ${i}`,aggregatedOutput:`result ${i}`,exitCode:0}});
    }
    api.notify('item/started',{turnId:'compact-turn',item:{id:'live',type:'commandExecution',command:'ssh example '+ 'long-command '.repeat(80)}});
  });
  assert.equal(await page.locator('[data-agent-activity-group]').count(),1);
  assert.equal(await page.locator('.activity-items.open').count(),0);
  assert.equal(await page.locator('#activityStatus').isVisible(),true);
  assert.match(await page.locator('#activityStatus code').textContent(),/ssh example/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#activityStatus').click();
  assert.equal(await page.locator('.activity-items.open').count(),1);
  assert.equal(await page.locator('.reasoning-activity:visible').count(),0);
  await page.locator('[data-item-id="cmd-0"]').click();
  assert.equal(await page.locator('[data-item-id="cmd-0"] + .activity-output').isVisible(),true);
  assert.match(await page.locator('[data-item-id="cmd-0"] + .activity-output').textContent(),/result 0/);
  await page.locator('.activity-summary').click();
  await page.evaluate(()=>globalThis.__codexWebuiDebug.notify('item/completed',{turnId:'compact-turn',item:{id:'live',type:'commandExecution',command:'ssh example',exitCode:0}}));
  assert.equal(await page.locator('#activityStatus').isVisible(),false);
  assert.equal(await page.locator('.activity-summary-copy').textContent(),'9 commands executed');
  assert.equal(await page.locator('.activity-items.open').count(),0);
  await page.evaluate(()=>globalThis.__codexWebuiDebug.notify('item/completed',{turnId:'compact-turn',item:{id:'failed',type:'commandExecution',command:'false',exitCode:1,status:'failed'}}));
  assert.equal(await page.locator('.activity-summary-copy').textContent(),'10 commands executed · 1 failed');
  await page.locator('.activity-summary').click();
  await page.evaluate(()=>globalThis.__codexWebuiDebug.notify('turn/completed',{turn:{id:'compact-turn',status:'completed'}}));
  assert.equal(await page.locator('.activity-items.open').count(),0);
  await page.setViewportSize({width:375,height:750});
  await page.evaluate(()=>globalThis.__codexWebuiDebug.notify('item/started',{turnId:'compact-turn',item:{id:'mobile',type:'commandExecution',command:'echo '+ 'x'.repeat(600)}}));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.evaluate(()=>globalThis.__codexWebuiDebug.startNewTask());
  assert.equal(await page.locator('#activityStatus').isVisible(),false);
  await page.evaluate(()=>{
    const api=globalThis.__codexWebuiDebug;api.state.active={id:'sequence-test',cwd:'/tmp'};
    const notify=(method,item)=>api.notify(method,{turnId:'sequence',item});
    notify('item/completed',{id:'reply-1',type:'agentMessage',phase:'commentary',text:'Before first commands'});
    notify('item/completed',{id:'first',type:'commandExecution',command:'echo first',exitCode:0});
    notify('item/completed',{id:'thought',type:'reasoning',summary:[]});
    notify('item/completed',{id:'first-next',type:'commandExecution',command:'echo still first',exitCode:0});
    notify('item/completed',{id:'reply-2',type:'agentMessage',phase:'commentary',text:'Before second commands'});
    notify('item/started',{id:'second',type:'commandExecution',command:'echo second'});
    // Late updates must keep the original item in its original group.
    notify('item/completed',{id:'first',type:'commandExecution',command:'echo first updated',exitCode:0});
  });
  assert.equal(await page.locator('[data-agent-activity-group]').count(),2);
  assert.deepEqual(await page.locator('.turn-event-stream').evaluate(el=>[...el.children].map(child=>child.hasAttribute('data-agent-activity-group')?'commands':child.textContent.trim())),['Before first commands','commands','Before second commands','commands']);
  assert.deepEqual(await page.locator('.activity-summary-copy').allTextContents(),['2 commands executed','1 command · Working']);
  assert.equal(await page.locator('#activityStatus code').textContent(),'echo second');
  await page.locator('#activityStatus').click();
  assert.equal(await page.locator('[data-agent-activity-group]').nth(0).locator('.activity-items').getAttribute('class'),'activity-items');
  assert.equal(await page.locator('[data-agent-activity-group]').nth(1).locator('.activity-items.open').count(),1);
  await page.locator('.activity-summary').first().click();
  await page.evaluate(()=>globalThis.__codexWebuiDebug.notify('turn/completed',{turn:{id:'sequence',status:'completed',items:[{id:'second',type:'commandExecution',command:'echo second',status:'completed',exitCode:0}]}}));
  assert.equal(await page.locator('.activity-items.open').count(),0);
  assert.deepEqual(errors,[]);
  console.log('Compact activity: grouping, live status, disclosure, errors, mobile, reset passed');
} finally {await browser.close()}
