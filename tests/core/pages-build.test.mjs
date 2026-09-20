import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
test('Pages build has a browser adapter and exact static integrity manifest',async()=>{execFileSync(process.execPath,['scripts/build-pages.mjs'],{env:{...process.env,VEYRA_BUILD_SHA:'test-commit'}});const html=await readFile('dist/pages/index.html','utf8');assert.match(html,/name="veyra-storage" content="browser"/);assert.match(html,/src="\.\/studio\/app.js"/);assert.doesNotMatch(html,/(?:href|src)="\//);const manifest=JSON.parse(await readFile('dist/pages/build.json','utf8'));assert.equal(manifest.commit,'test-commit');for(const f of manifest.files){const b=await readFile('dist/pages/'+f.path);assert.equal(b.length,f.bytes,f.path);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256,f.path);}await stat('dist/pages/studio/packages/collaboration/browser.js');});
