import { chromium, devices } from 'playwright';
import { artifact, launchOptions } from './browser-runtime.mjs';

const browser=await chromium.launch(launchOptions());
const context=await browser.newContext({
  ...devices['Pixel 7'],
  viewport:{width:980,height:1800},
  screen:{width:412,height:915},
  isMobile:true,
  hasTouch:true,
});
const page=await context.newPage();
await page.goto(process.env.CODEX_WEBUI_TEST_URL||'http://127.0.0.1:8899',{waitUntil:'networkidle'});
const before=await page.evaluate(()=>({
  innerWidth,
  coarse:matchMedia('(pointer: coarse)').matches,
  mobileClass:document.documentElement.classList.contains('mobile-device'),
  sidebarX:document.querySelector('#sidebar').getBoundingClientRect().x,
  sidebarPosition:getComputedStyle(document.querySelector('#sidebar')).position,
  sidebarShadow:getComputedStyle(document.querySelector('#sidebar')).boxShadow,
}));
await page.click('#newTask');
const wide=await page.evaluate(()=>({hidden:document.body.classList.contains('sidebar-hidden'),position:getComputedStyle(document.querySelector('#sidebar')).position}));
await page.setViewportSize({width:500,height:900});
await page.click('#toggleSidebar');
await page.click('#newTask');
const narrow=await page.evaluate(()=>({open:document.querySelector('#sidebar').classList.contains('mobile-open'),position:getComputedStyle(document.querySelector('#sidebar')).position}));
console.log(JSON.stringify({before,wide,narrow},null,2));
await browser.close();
if(!before.coarse||before.mobileClass||wide.hidden||wide.position==='fixed'||narrow.open||narrow.position!=='fixed')process.exit(1);
