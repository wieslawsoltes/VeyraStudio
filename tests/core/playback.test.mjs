import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Playback} from '../../public/studio/packages/renderer/index.js';

test('play at zero tolerates a queued frame timestamp older than performance.now', async()=>{
 const original=globalThis.requestAnimationFrame,frames=[];
 globalThis.requestAnimationFrame=callback=>frames.push(callback);
 const store=new EventTarget();store.project={fps:24,clips:[{start:0,duration:2}]};
 const library={async initAudio(){},pause(){},syncAudio(){}};
 const renderer={render(){}};
 let playback;
 try{
  playback=new Playback(store,renderer,library);playback.seek(0);await playback.play();
  const started=playback.last;
  frames.shift()(started-2);
  assert.equal(playback.time,0);
  assert.equal(playback.playing,true,'an earlier timestamp must not trigger start-of-timeline pause');
  assert.equal(playback.last,started,'clock must remain monotonic');
  frames.shift()(started+100);
  assert.ok(Math.abs(playback.time-.1)<1e-9);
  assert.equal(playback.playing,true);
  frames.shift()(started+2100);
  assert.equal(playback.time,2);
  assert.equal(playback.playing,false);
 }finally{playback?.dispose();globalThis.requestAnimationFrame=original;}
});

test('reverse playback still stops cleanly at the beginning',async()=>{
 const original=globalThis.requestAnimationFrame,frames=[];
 globalThis.requestAnimationFrame=callback=>frames.push(callback);
 const store=new EventTarget();store.project={fps:24,clips:[{start:0,duration:2}]};
 let playback;
 try{
  playback=new Playback(store,{render(){}},{async initAudio(){},pause(){},syncAudio(){}});
  playback.seek(.5);playback.rate=-1;await playback.play();
  frames.shift()(playback.last+1000);
  assert.equal(playback.time,0);assert.equal(playback.playing,false);
 }finally{playback?.dispose();globalThis.requestAnimationFrame=original;}
});
