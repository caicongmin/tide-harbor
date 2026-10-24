// Optional contributor check. The HTTPS origin below is INTERCEPTED in an isolated
// browser; it is not a deployed site or a replacement for the DSH GUI.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import Tide from './core.mjs';
import Exchange from './exchange.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_IMPORT||'playwright');
const here=path.dirname(fileURLToPath(import.meta.url)),out=path.resolve(process.env.HARBOR_EVIDENCE||path.join(here,'test-output'));
await fs.mkdir(out,{recursive:true});const html=await fs.readFile(path.join(here,'index.html'),'utf8');
const browser=await chromium.launch({headless:true}),checks=[],errors=[],external=[];
async function context(options={}){const c=await browser.newContext(options);await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('https://harbor.test/'))return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});if(/^(file:|blob:|data:)/.test(u))return r.continue();external.push(u);return r.abort();});c.on('page',p=>{p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});});return c;}
async function ready(p){await p.waitForFunction(()=>window.__tideReady===true);}
const state=p=>p.evaluate(()=>window.harbor.exportSave());
const obs=p=>p.evaluate(()=>window.harbor.observe());
const cell=(p,x,y)=>p.locator(`[data-cell="${x},${y}"]`).click();
async function build(p,kind,x,y){await p.locator(`[data-kind="${kind}"]`).click();await cell(p,x,y);assert(await p.locator('#confirm-build').isEnabled(),await p.locator('#preview').textContent());await p.locator('#confirm-build').click();}
async function note(p,signature,intent,invitation){await p.locator('#signature').fill(signature);await p.locator('#intent').fill(intent);await p.locator('#invitation').fill(invitation);await p.locator('#note-it').click();}
try{
  const c=await context(),p=await c.newPage();await p.goto('https://harbor.test/');await ready(p);
  await p.locator('#intro-intent').fill('让来访者避开门前，沿花走');await p.locator('#start').click();
  assert.equal((await obs(p)).intent,'让来访者避开门前，沿花走');assert.match(await p.locator('#intent-banner').textContent(),/沿花走/);
  checks.push('Opening intention is a real free action and appears during play, not only at ending');
  await cell(p,0,1);await p.locator('#gather-selected').click();
  for(const a of [['house',1,3],['bench',2,2],['garden',2,1],['chime',1,2]])await build(p,...a);
  await note(p,'大肥鱼','让来访者避开门前，沿花走','你会保留这间挡路的小屋吗？留一处自己的改变就好。');
  await p.locator('#rename').fill('绕花的小门前');await p.locator('#name-it').click();await p.locator('#end-day').click();
  await cell(p,2,1);await p.locator('[data-style="moss"]').click();await cell(p,2,2);await p.locator('[data-style="rose"]').click();
  const original=await state(p),originalObs=await obs(p);assert.equal(originalObs.guests.filter(g=>g.arrived).length,1);assert.equal(originalObs.guests.find(g=>g.id==='gardener').arrived,true);assert.match(originalObs.style.title,/夜色改绘/);assert.equal(originalObs.buildings.find(b=>b.type==='house').x,1);
  assert.deepEqual(originalObs.guests.find(g=>g.id==='gardener').route,[[0,3],[0,2],[1,2],[2,2]]);
  checks.push('Main genuinely builds one-visitor flower-side harbor via DOM clicks; real route bypasses house and night paint changes layout');
  await p.screenshot({path:path.join(out,'01-main-harbor.png'),fullPage:true});await fs.writeFile(path.join(out,'main-save.json'),JSON.stringify(original,null,2));
  await p.locator('.postcard summary').click();await p.locator('#make-share').click();
  const code=await p.locator('#share-code').inputValue(),link=await p.locator('#share-link').inputValue(),comment=await p.locator('#share-comment').inputValue();
  assert.deepEqual(Tide.save(Exchange.decode(code)),original);assert.equal(Exchange.extract(comment),code);assert.equal(new URL(link).origin,'https://harbor.test');
  await fs.writeFile(path.join(out,'main-share.json'),JSON.stringify({code,comment,codeLength:code.length,linkLength:link.length,notice:'Test URL is an intercepted isolated origin, NOT a live deployment.'},null,2));
  checks.push('Actual share controls produce matching legal replay, comment material and data-bearing HTTPS link');
  const next=await context(),q=await next.newPage();await q.goto(link);await ready(q);assert.equal((await obs(q)).access,'visit');assert.deepEqual(await state(q),original);assert(await q.locator('#end-day').isDisabled());assert(await q.locator('#signature').isDisabled());
  const denied=await q.evaluate(()=>window.harbor.act({type:'rename',name:'不该改原作'}));assert.equal(denied.ok,false);assert.equal(denied.readOnly,true);assert.deepEqual(await state(q),original);
  checks.push('Fresh recipient sees original in readonly visiting mode; both UI and ordinary API reject accidental edits');
  await q.locator('#adopt').click();assert.equal((await obs(q)).access,'own');assert.equal((await obs(q)).signature,'');assert.equal((await obs(q)).lineage[0].signature,'大肥鱼');assert.deepEqual((await obs(q)).stock,originalObs.stock);
  await note(q,'接力试摆者','把歇脚处换到另一侧','留下一条你愿意走的路。');await cell(q,2,2);await q.locator('#recycle-selected').click();await build(q,'bench',1,1);await q.locator('#end-day').click();
  const child=await state(q),childObs=await obs(q);assert(childObs.buildings.some(b=>b.type==='bench'&&b.x===1&&b.y===1));assert.equal(childObs.guests.find(g=>g.id==='gardener').arrived,true);assert.match(childObs.style.title,/歇脚处/);assert(!childObs.style.facts.some(f=>f.tag==='夜色里的改色'));
  checks.push('Recipient explicitly adopts, gets no fresh resources, leaves new signature and moves rest stop; inherited night paints are not credited to new player');
  await q.reload();await ready(q);assert.equal((await obs(q)).access,'own');assert.deepEqual(await state(q),child);assert.equal(await q.locator('[data-cell]').count(),49);
  checks.push('Owned handoff URL reload restores exact child and 49 controls');
  assert.deepEqual(await state(p),original);await p.goto(link);await ready(p);await p.locator('#adopt').click();await p.locator('#back-own').click();await ready(p);await p.waitForFunction(()=>window.harbor?.observe().access==='own'&&window.harbor.observe().name==='绕花的小门前');assert.deepEqual(await state(p),original);
  checks.push('Same browser main harbor, original visitor and handoff copy stay isolated; returning home preserves original');
  await q.screenshot({path:path.join(out,'02-handoff.png'),fullPage:true});await fs.writeFile(path.join(out,'child-save.json'),JSON.stringify(child,null,2));
  await q.locator('#export-html').click({trial:true});const dlPromise=q.waitForEvent('download');await q.locator('#export-html').click();const dl=await dlPromise,backup=path.join(out,'handoff.html');await dl.saveAs(backup);
  const offline=await context(),f=await offline.newPage();await f.goto(pathToFileURL(backup).href);await ready(f);assert.deepEqual(await state(f),child);await f.locator('.postcard summary').click();await f.locator('#make-share').click();assert.equal(await f.locator('#share-link').inputValue(),'');assert.match(await f.locator('#share-status').textContent(),/不分享本机路径/);
  checks.push('Actual exported standalone reopens exact handoff; offline share does not leak file:// path');
  await q.locator('#reopen').click();assert.equal((await obs(q)).phase,'day');await q.locator('#end-day').click();assert.equal((await obs(q)).phase,'night');
  checks.push('Readonly-to-adopt control transitions allow normal end/reopen cycle, not just a compiled UI');
  if(await p.locator('#welcome').isVisible())await p.locator('#start').click();
  const beforeBad=await state(p);await p.locator('.visit-input summary').click();await p.locator('#visit-code').fill('https://untrusted.invalid/not-a-game-code');await p.locator('#visit-code-open').click();assert.deepEqual(await state(p),beforeBad);assert.match(await p.locator('#message').textContent(),/未离开/);
  checks.push('Bad pasted input stays local and leaves current harbor unchanged');
  await p.locator('#visit-code').fill(comment);await p.locator('#visit-code-open').click();await p.waitForFunction(()=>window.harbor?.observe().access==='visit');assert.deepEqual(await state(p),original);
  checks.push('Pasting actual complete comment material opens readonly harbor without external navigation');
  const hostile=await context(),h=await hostile.newPage();await h.goto('https://harbor.test/');await ready(h);await h.locator('#start').click();await note(h,'<b>访客</b>','<img src="https://evil.invalid/x" onerror="window.pwned=1">','<script>window.pwned=2</script>');await h.locator('.postcard summary').click();await h.locator('#make-share').click();const evilLink=await h.locator('#share-link').inputValue();await h.goto(evilLink);await ready(h);assert.equal(await h.evaluate(()=>window.pwned),undefined);assert.equal(await h.locator('#visit-banner img,#visit-banner script').count(),0);assert.match(await h.locator('#visit-note').textContent(),/<img/);
  checks.push('Untrusted signatures/notes survive as literal text, do not inject HTML or fetch external resources');
  const mobile=await context({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),m=await mobile.newPage();await m.goto(link);await ready(m);await m.locator('#adopt').tap();await m.reload();await ready(m);assert.equal((await obs(m)).access,'own');assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await m.screenshot({path:path.join(out,'03-mobile.png'),fullPage:true});
  checks.push('390x844 touch adoption and reload work without horizontal overflow (emulation, not hardware)');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await fs.writeFile(path.join(out,'browser-verification.json'),JSON.stringify({passed:true,checks,errors,external,notice:'Isolated intercepted HTTPS test, not deployed Pages. Main source and receiver handoff use ordinary UI, no state setters. Other-agent/human enjoyment not inferred.'},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,errors,external},null,2));
}catch(e){await fs.writeFile(path.join(out,'browser-failure.json'),JSON.stringify({passed:false,checks,error:String(e.stack||e),errors,external},null,2));throw e;}finally{await browser.close();}
