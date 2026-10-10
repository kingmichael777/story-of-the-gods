/* Real browser regression checks. Run with a local HTTP server; see README. */
const {chromium} = require('playwright');
const {PNG} = require('pngjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const url = process.argv[2] || 'http://127.0.0.1:4187/lab/one-above/';
const out = path.resolve(process.argv[3] || '.head-qa/interaction');
fs.mkdirSync(out,{recursive:true});
const report = {url,checks:[],performance:[]};
const check = (name,ok=true) => {assert(ok,name);report.checks.push(name);console.log("PASS",name);};
const wait = ms=>new Promise(r=>setTimeout(r,ms));
async function capture(locator,options={}) {
  const bytes=Buffer.from((await locator.evaluate(el=>el.toDataURL('image/png'))).split(',')[1],'base64');
  if(options.path)fs.writeFileSync(options.path,bytes);
  return bytes;
}
function difference(a,b,region=[0,0,1,1]) {
  const p=PNG.sync.read(a),q=PNG.sync.read(b);assert.equal(p.width,q.width);assert.equal(p.height,q.height);
  let changed=0,total=0;
  for(let y=Math.floor(region[1]*p.height);y<Math.floor(region[3]*p.height);y++)
    for(let x=Math.floor(region[0]*p.width);x<Math.floor(region[2]*p.width);x++){
      const i=(y*p.width+x)*4;total++;
      if(Math.abs(p.data[i]-q.data[i])+Math.abs(p.data[i+1]-q.data[i+1])+Math.abs(p.data[i+2]-q.data[i+2])>9)changed++;
    }
  return {changed,total,fraction:changed/total};
}
(async()=>{
  const server=process.argv[2]?null:spawn('python3',['-m','http.server','4187','--bind','127.0.0.1','--directory',path.resolve(__dirname,'../dist')],{stdio:'ignore'});
  if(server){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await wait(80);}}
  const browser=await chromium.launch({headless:true,executablePath:process.env.WEBDEV_CHROMIUM_PATH || undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  report.browser=browser.version();
  try {
    for(const renderer of (process.env.RIG_RENDERERS || 'webgl,canvas2d').split(',')){
      const context=await browser.newContext({viewport:{width:1440,height:1100}});
      if(renderer==='canvas2d')await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...rest){return kind==='webgl'?null:original.call(this,kind,...rest);};});
      const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400 && r.url().startsWith(new URL(url).origin))errors.push(`${r.status()} ${r.url()}`);});
      await page.goto(url);await page.waitForSelector('#stage.ready');
      const stage=page.locator('#stage'),portrait=page.locator('#portrait');
      check(`${renderer}: requested renderer active`,await stage.getAttribute('data-renderer')===renderer);
      check(`${renderer}: no video`,await page.locator('video').count()===0);
      for(const id of ['breathe','auto-blink','move-head']) await page.locator('#'+id).uncheck();
      await page.getByRole('button',{name:'Look center',exact:true}).click();await wait(850);
      const neutral=await capture(portrait);
      await page.getByRole('button',{name:'Look right',exact:true}).click();await wait(850);
      const eyesRight=await capture(portrait);
      check(`${renderer}: eyes respond with head locked`,(await stage.getAttribute('data-aim'))==='0.000,0.000' && Number((await stage.getAttribute('data-gaze')).split(',')[0])>.95);
      check(`${renderer}: gaze changes eye pixels`,difference(neutral,eyesRight,[.2,.23,.8,.34]).changed>8);
      check(`${renderer}: gaze leaves chest pixels fixed`,difference(neutral,eyesRight,[0,.7,1,1]).changed===0);
      await page.locator('#move-head').check();await page.locator('#move-eyes').uncheck();await wait(850);
      const headRight=await capture(portrait,{path:path.join(out,`${renderer}-head-right.png`)});
      check(`${renderer}: head rotates independently`,Number((await stage.getAttribute('data-aim')).split(',')[0])>.95 && (await stage.getAttribute('data-gaze'))==='0.000,0.000');
      check(`${renderer}: head visibly deforms`,difference(eyesRight,headRight,[.15,.05,.85,.6]).fraction>.1);
      await page.locator('#move-head').uncheck();await page.getByRole('button',{name:'Look center',exact:true}).click();await wait(1000);
      const rest=await capture(portrait);
      await page.locator('#breathe').check();await wait(2750);
      const inhaled=await capture(portrait,{path:path.join(out,`${renderer}-inhale.png`)});
      check(`${renderer}: breath changes chest pixels`,difference(rest,inhaled,[0,.65,1,.99]).changed>100);
      check(`${renderer}: breath leaves head pixels fixed`,difference(rest,inhaled,[0,0,1,.6]).changed===0);
      await page.locator('#breathe').uncheck();await wait(1000);
      const open=await capture(portrait);
      await page.locator('#blink').click();
      await page.waitForFunction(()=>Number(document.querySelector('#stage').dataset.blink)>.88);
      const closed=await capture(portrait,{path:path.join(out,`${renderer}-blink.png`)});
      check(`${renderer}: blink changes eye pixels`,difference(open,closed,[.2,.23,.8,.34]).changed>10);
      await wait(400);check(`${renderer}: blink reopens`,Number(await stage.getAttribute('data-blink'))<.01);
      await page.locator('#breathe').check();
      await wait(1000);await page.locator('#pause').click();
      const frozen=await capture(portrait),frames=await stage.getAttribute('data-frames');await wait(700);
      check(`${renderer}: pause stops rendering`,frames===await stage.getAttribute('data-frames'));
      check(`${renderer}: paused pixels remain fixed`,difference(frozen,await capture(portrait)).changed===0);
      await page.locator('#pause').click();
      await page.locator('#move-head').check();await page.locator('#move-eyes').check();
      const box=await stage.boundingBox();await page.mouse.move(box.x+box.width*.85,box.y+box.height*.23);await wait(700);
      check(`${renderer}: mouse follows`,Number((await stage.getAttribute('data-aim')).split(',')[0])>.5);
      await page.mouse.move(1,1);await stage.focus();await page.keyboard.press('Home');await wait(650);await page.keyboard.press('ArrowLeft');await wait(650);
      check(`${renderer}: keyboard follows`,Number((await stage.getAttribute('data-aim')).split(',')[0])<-.2);
      await page.locator('#pause').click();await page.locator('#mesh').click();await page.screenshot({path:path.join(out,`${renderer}-rig-desktop.png`),fullPage:true});await page.locator('#mesh').click();await page.locator('#pause').click();
      await page.getByRole('button',{name:'Look center',exact:true}).click();await wait(600);await page.locator('#pause').click();await page.screenshot({path:path.join(out,`${renderer}-desktop.png`),fullPage:true});await page.locator('#pause').click();
      const perf=await page.evaluate(async()=>{
        const el=document.querySelector('#stage'),start=performance.now(),before=Number(el.dataset.frames);const intervals=[];let last=start;
        await new Promise(done=>{function sample(t){intervals.push(t-last);last=t;if(t-start<2500)requestAnimationFrame(sample);else done();}requestAnimationFrame(sample);});
        intervals.sort((a,b)=>a-b);return {renderedFrames:Number(el.dataset.frames)-before,elapsedMs:performance.now()-start,rafP95Ms:intervals[Math.floor(intervals.length*.95)],cpuDraw:document.querySelector('#render-info').textContent};
      });report.performance.push({renderer,...perf});
      await page.setViewportSize({width:390,height:844});await page.locator('.technical summary').click();await page.locator('footer').scrollIntoViewIfNeeded();await wait(250);
      const offFrames=await stage.getAttribute('data-frames');await wait(700);
      check(`${renderer}: offscreen stops rendering`,offFrames===await stage.getAttribute('data-frames'));
      await stage.scrollIntoViewIfNeeded();await wait(250);check(`${renderer}: onscreen resumes`,offFrames!==await stage.getAttribute('data-frames'));
      await page.emulateMedia({reducedMotion:'reduce'});await wait(100);
      const reduceFrames=await stage.getAttribute('data-frames');await wait(500);check(`${renderer}: preference change stops motion`,reduceFrames===await stage.getAttribute('data-frames'));
      check(`${renderer}: no errors`,errors.length===0);await context.close();
    }
    const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const p=await mobile.newPage();p.setDefaultTimeout(10000);await p.goto(url);await p.waitForSelector('#stage.ready');
    await p.locator('#stage').scrollIntoViewIfNeeded();
    const rect=await p.locator('#stage').boundingBox(),cdp=await mobile.newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+rect.width*.25,y:rect.y+rect.height*.5}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+rect.width*.9,y:rect.y+rect.height*.3}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(850);
    check('native emulated touch drag controls head',Number((await p.locator('#stage').getAttribute('data-aim')).split(',')[0])>.7);
    await p.locator('#pause').click();await p.screenshot({path:path.join(out,'phone-touch.png'),fullPage:true});
    check('phone no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await mobile.close();
    const reduced=await browser.newContext({reducedMotion:'reduce'}),rp=await reduced.newPage();
    await rp.goto(url);await rp.waitForSelector('#stage.ready');let rf=await rp.locator('#stage').getAttribute('data-frames');await wait(500);
    check('reduced motion starts static',rf===await rp.locator('#stage').getAttribute('data-frames') && await rp.locator('#pause').getAttribute('aria-pressed')==='true');
    check('paused portrait permits native vertical scroll',await rp.locator('#stage').evaluate(el=>getComputedStyle(el).touchAction)==='pan-y');
    await rp.locator('#pause').click();await wait(700);check('explicit reduced motion opt-in works',rf!==await rp.locator('#stage').getAttribute('data-frames'));await reduced.close();
    const nojs=await browser.newContext({javaScriptEnabled:false}),np=await nojs.newPage();await np.goto(url);
    check('no-JS original artwork is visible',await np.locator('#fallback').isVisible());await nojs.close();
    const broken=await browser.newContext(),bp=await broken.newPage();await bp.route('**/rig-data.json',r=>r.abort());await bp.goto(url);await bp.waitForFunction(()=>document.querySelector('#status').textContent.includes('Static portrait'));
    check('asset error returns original artwork',await bp.locator('#fallback').isVisible());await broken.close();
  } finally {await browser.close();server?.kill();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
