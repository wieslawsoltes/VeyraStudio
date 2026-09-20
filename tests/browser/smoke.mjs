import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
let server,base=process.env.VEYRA_TEST_URL;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.avif':'image/avif','.opus':'audio/ogg','.json':'application/json'};
if(!base){server=http.createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!name.startsWith('/VeyraStudio/')){res.writeHead(404);res.end();return;}name=name.slice(13)||'index.html';if(name.includes('..'))throw Error('Unsafe path');const data=await readFile(path.join('dist/pages',name));res.writeHead(200,{'Content-Type':types[path.extname(name)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/VeyraStudio/`;}
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE||undefined,args:['--no-sandbox','--disable-gpu','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],badRequests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(/\/api\/(studio|media)|signin-with-chatgpt/.test(r.url()))badRequests.push(r.url());});
const report={base,checks:[]};const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
try{
 await mkdir('artifacts',{recursive:true});
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.veyra?.renderer.frames>0);
 await page.evaluate(()=>window.veyra.library.preload(window.veyra.store.project));
 check('sample image and 24-second score decode',await page.evaluate(()=>{const l=window.veyra.library;return l.entries.get('coast-01')?.element.naturalWidth>0&&l.entries.get('ambient')?.element.duration>23;}));
 check('six editable sample clips',await page.locator('.timeline-clip').count()===6);
 for(const name of ['media','cut','edit','fusion','color','audio','deliver','edit']){await page.locator(`[data-page="${name}"]`).click();check('workspace '+name,await page.locator('#workspace').evaluate((e,n)=>e.classList.contains(n),name));}
 await page.keyboard.press('Control+b');check('split clip',await page.locator('.timeline-clip').count()===7);await page.keyboard.press('Control+z');check('undo split',await page.locator('.timeline-clip').count()===6);
 await page.keyboard.press('m');check('marker command',await page.evaluate(()=>window.veyra.store.project.markers.length===3));
 await page.evaluate(async()=>{const v=window.veyra;await v.sync.create();v.store.transact('Test rename',p=>p.name='Pages validation');await v.sync.save();});
 const projectId=await page.evaluate(()=>window.veyra.sync.id);
 const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDioAAAAASUVORK5CYII=','base64');
 await page.locator('#file-input').setInputFiles({name:'persistence.png',mimeType:'image/png',buffer:image});
 await page.waitForFunction(()=>window.veyra.store.project.media.some(m=>m.name==='persistence.png'));
 await page.evaluate(()=>window.veyra.sync.save());
 const mediaId=await page.evaluate(()=>window.veyra.store.project.media.find(m=>m.name==='persistence.png').id);
 check('media saved as durable local reference',await page.evaluate(id=>window.veyra.store.project.media.find(m=>m.id===id).url.startsWith('veyra-local:'),mediaId));
 const reopened=await context.newPage();await reopened.goto(base);await reopened.waitForFunction(()=>window.veyra);
 await reopened.evaluate(async id=>{await window.veyra.sync.open(id);await window.veyra.library.preload(window.veyra.store.project);},projectId);
 check('second tab restores project and media',await reopened.evaluate(id=>window.veyra.store.project.name==='Pages validation'&&window.veyra.library.entries.get(id)?.element.naturalWidth===1,mediaId));
 await reopened.evaluate(async()=>{const v=window.veyra;v.store.addMarker(3,'Other tab');await v.sync.save();});
 await page.evaluate(()=>window.veyra.sync.poll());check('cross-tab revision synchronization',await page.evaluate(()=>window.veyra.store.project.markers.some(m=>m.label==='Other tab')));
 await reopened.close();await page.bringToFront();
 await page.screenshot({path:'artifacts/editor-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/editor-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
 const exported=await page.evaluate(async()=>{
  const v=window.veyra,{renderVideo,recordingFormats}=await import(new URL('./studio/packages/renderer/index.js',location.href));
  const p=structuredClone(v.store.project);p.clips=p.clips.filter(c=>c.start===0);p.clips.forEach(c=>{c.duration=1.25;c.fadeOut=0;});p.nodes=[];p.media=p.media.filter(m=>p.clips.some(c=>c.mediaId===m.id));v.store.replace(p);
  const format=recordingFormats().find(f=>f.includes('vp8'))||recordingFormats()[0];if(!format)throw Error('No video encoder available');
  const out=await renderVideo(v.playback,{width:320,height:180,fps:24,mimeType:format,bitrate:400000});
  const video=document.createElement('video');video.muted=true;video.src=URL.createObjectURL(out.blob);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Export decode timeout')),15000);video.onloadeddata=()=>{clearTimeout(timer);resolve();};video.onerror=()=>reject(Error('Export decode failed'));});
  const c=document.createElement('canvas');c.width=320;c.height=180;const x=c.getContext('2d');x.drawImage(video,0,0);const px=x.getImageData(0,0,320,180).data;const sum=px.reduce((a,b,i)=>a+(i%4===3?0:b),0);
  const recording=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(out.blob);});
  const result={bytes:out.blob.size,width:video.videoWidth,height:video.videoHeight,pixelSum:sum,format:out.blob.type,rendererMode:v.renderer.mode,frames:v.renderer.frames,recording,decodedFrame:c.toDataURL('image/png')};URL.revokeObjectURL(video.src);v.sync.dirty=false;v.sync.dispose();return result;
 });
 await writeFile('artifacts/export.webm',Buffer.from(exported.recording.split(',')[1],'base64'));
 await writeFile('artifacts/export-frame.png',Buffer.from(exported.decodedFrame.split(',')[1],'base64'));
 delete exported.recording;delete exported.decodedFrame;report.export=exported;console.log('Export diagnostics:',JSON.stringify(exported));
 check('actual video recording and decode',exported.bytes>1000&&exported.width===320&&exported.height===180&&exported.pixelSum>200000);
 check('no JavaScript page errors',errors.length===0);check('no server API requests on Pages',badRequests.length===0);
 console.log(JSON.stringify(report,null,2));
}finally{report.errors=errors;report.badRequests=badRequests;await writeFile('artifacts/browser-report.json',JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(r=>server.close(r));}
