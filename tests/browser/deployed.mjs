import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base=process.env.VEYRA_TEST_URL;
if(!base)throw Error('Set VEYRA_TEST_URL to the deployed Pages URL');
let manifest;
for(let i=0;i<12;i++){
 try{const r=await fetch(new URL('build.json?verify='+Date.now(),base));assert.equal(r.status,200);manifest=await r.json();if(process.env.VEYRA_BUILD_SHA)assert.equal(manifest.commit,process.env.VEYRA_BUILD_SHA);break;}catch(e){if(i===11)throw e;await new Promise(r=>setTimeout(r,5000));}
}
for(const f of manifest.files){const r=await fetch(new URL(f.path+'?verify='+manifest.commit,base));assert.equal(r.status,200,f.path);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,f.bytes,f.path);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256,f.path);}
console.log('Verified live commit',manifest.commit,'and',manifest.files.length,'file hashes');
