/** Build a dependency-free GitHub Pages edition. The server source is untouched. */
import {cp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),out=path.join(root,'dist/pages');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await cp(path.join(root,'public/studio'),path.join(out,'studio'),{recursive:true});
await cp(path.join(root,'public/favicon.svg'),path.join(out,'favicon.svg'));
let html=await readFile(path.join(out,'studio/index.html'),'utf8');
html=html.replace('<head>','<head><meta name="veyra-storage" content="browser">');
await writeFile(path.join(out,'studio/index.html'),html);
await writeFile(path.join(out,'index.html'),html.replaceAll('../favicon.svg','./favicon.svg').replace('href="./style.css"','href="./studio/style.css"').replace('src="./app.js"','src="./studio/app.js"'));
await writeFile(path.join(out,'.nojekyll'),'');
let sha=process.env.VEYRA_BUILD_SHA;
if(!sha){try{sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{sha='local';}}
const files=[];
async function walk(dir){for(const f of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,f.name);if(f.isDirectory())await walk(full);else{const data=await readFile(full);files.push({path:path.relative(out,full).split(path.sep).join('/'),sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length});}}}
await walk(out);files.sort((a,b)=>a.path.localeCompare(b.path));
await writeFile(path.join(out,'build.json'),JSON.stringify({commit:sha,mode:'browser-local',files},null,2)+'\n');
console.log(`Built ${files.length} files in dist/pages for ${sha}`);
