/** Device-local persistence adapter. No network or account impersonation. */
import {clone,uid,validateProject} from '../core/index.js';
import {Collaboration} from './index.js';
const fail=(message,status=400,data={})=>Object.assign(new Error(message),{status,data});
const localURL=/^veyra-local:[a-zA-Z0-9_-]+$/;
export function sanitizeMedia(project,{assetBase='/studio/assets/',browser=false}={}){
 const p=clone(validateProject(project));
 for(const m of p.media){
  const safe=u=>typeof u==='string'&&(u.startsWith(assetBase)&&!u.includes('..')&&!/[?#\\]/.test(u)||browser&&localURL.test(u));
  if(m.type!=='title'&&!safe(m.url)){m.url='';m.needsRelink=true;}
  if(m.thumbnail&&!safe(m.thumbnail)&&!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(m.thumbnail))delete m.thumbnail;
 }
 return p;
}
export class MemoryStorage {
 constructor(){this.tables={projects:new Map(),media:new Map()};}
 async get(table,id){return clone(this.tables[table].get(id));}
 async list(table){return [...this.tables[table].values()].map(clone);}
 async put(table,value){this.tables[table].set(value.id,clone(value));return clone(value);}
 async update(table,id,fn){const value=fn(clone(this.tables[table].get(id)));this.tables[table].set(id,clone(value));return clone(value);}
 close(){}
}
/** Each compare-and-swap is a single IndexedDB read/write transaction across tabs. */
export class IndexedDBStorage {
 constructor(name='veyra-studio'){this.name=name;this.ready=null;}
 open(){return this.ready??=new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(fail('IndexedDB is unavailable. Download your project before closing this tab.'));return;}
  const req=indexedDB.open(this.name,1);
  req.onupgradeneeded=()=>{for(const name of ['projects','media'])if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name,{keyPath:'id'});};
  req.onerror=()=>{this.ready=null;reject(req.error);};
  req.onblocked=()=>{this.ready=null;reject(fail('Storage upgrade blocked by another tab. Close other Veyra tabs and reload.'));};
  req.onsuccess=()=>{req.result.onversionchange=()=>{req.result.close();this.ready=null;};resolve(req.result);};
 });}
 async transaction(table,mode,operation){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction(table,mode);let value,error;tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(error||tx.error||fail('Storage operation failed'));try{operation(tx.objectStore(table),v=>value=v,e=>{error=e;tx.abort();});}catch(e){error=e;tx.abort();}});}
 get(table,id){return this.transaction(table,'readonly',(s,done)=>{s.get(id).onsuccess=e=>done(e.target.result);});}
 list(table){return this.transaction(table,'readonly',(s,done)=>{s.getAll().onsuccess=e=>done(e.target.result);});}
 put(table,value){return this.transaction(table,'readwrite',(s,done)=>{s.put(value);done(value);});}
 update(table,id,fn){return this.transaction(table,'readwrite',(s,done,abort)=>{s.get(id).onsuccess=e=>{try{const v=fn(e.target.result);s.put(v);done(v);}catch(error){abort(error);}};});}
 async close(){(await this.ready)?.close();this.ready=null;}
}
export class BrowserDatabase {
 constructor({storage=new IndexedDBStorage(),assetBase='/studio/assets/'}={}){this.storage=storage;this.assetBase=assetBase;this.urls=new Map();}
 clean(p){return sanitizeMedia(p,{assetBase:this.assetBase,browser:true});}
 response(row){return {project:clone(row.project),revision:row.revision,comments:clone(row.comments||[]),members:[{user_id:'local-owner',name:'Local editor',role:'owner',last_seen:Date.now()}],role:'owner',user:{name:'Local editor'}};}
 async request(body,query=''){
  const id=body?.id||new URLSearchParams(query.replace(/^\?/,'' )).get('id');
  if(!body){if(!id){const rows=await this.storage.list('projects');return {user:{name:'Local editor'},projects:rows.sort((a,b)=>b.updated_at-a.updated_at).map(r=>({id:r.id,name:r.project.name,updated_at:r.updated_at,role:'owner'}))};}const r=await this.storage.get('projects',id);if(!r)throw fail('Local project not found',404);return this.response(r);}
  if(body.action==='create'){const project=this.clean(body.project);project.id=uid();const row={id:project.id,project,revision:1,comments:[],updated_at:Date.now()};await this.storage.put('projects',row);return this.response(row);}
  if(body.action==='save'){const project=this.clean(body.project);if(project.id!==id)throw fail('Project ID mismatch');const row=await this.storage.update('projects',id,old=>{if(!old)throw fail('Local project not found',404);if(old.revision!==body.revision)throw fail('Project changed in another tab',409,this.response(old));return {...old,project,revision:old.revision+1,updated_at:Date.now()};});return this.response(row);}
  if(body.action==='comment'){const text=String(body.text||'').trim();if(!text||text.length>4000||!Number.isFinite(body.time)||body.time<0)throw fail('Invalid review note');const row=await this.storage.update('projects',id,old=>{if(!old)throw fail('Local project not found',404);return {...old,comments:[...(old.comments||[]),{id:uid(),name:'Local editor',body:text,time:Math.round(body.time*1000),created_at:Date.now()}],updated_at:Date.now()};});return this.response(row);}
  throw fail('Online sharing requires the server-backed edition. This workspace stays on this device.');
 }
 async storeMedia(projectId,file){if(!(file instanceof Blob)||file.size>100*1024*1024)throw fail('Media must be a file smaller than 100 MB');if(!await this.storage.get('projects',projectId))throw fail('Save the project before importing media',404);const id=uid();await this.storage.put('media',{id,projectId,blob:file});return 'veyra-local:'+id;}
 async resolveURL(url){if(!localURL.test(url||''))return url;if(this.urls.has(url))return this.urls.get(url);const row=await this.storage.get('media',url.slice(12));if(!row?.blob)throw fail('Local media is missing. Relink the original file.',404);const result=URL.createObjectURL(row.blob);this.urls.set(url,result);return result;}
 dispose(){for(const url of this.urls.values())URL.revokeObjectURL(url);this.urls.clear();this.storage.close();}
}
export class BrowserCollaboration extends Collaboration {
 constructor(store,database){super(store);this.database=database;this.setStatus('Local draft · Save project');}
 request(body,query=''){return this.database.request(body,query);}
 async uploadPending(){const projectId=this.id;for(const [id,file]of this.pendingMedia){if(!this.store.project.media.some(m=>m.id===id)){this.pendingMedia.delete(id);continue;}const url=await this.database.storeMedia(projectId,file);if(this.id!==projectId)throw fail('Project changed during media save');if(this.pendingMedia.get(id)!==file)continue;const current=this.store.project.media.find(m=>m.id===id);if(current){current.url=url;delete current.needsRelink;}this.pendingMedia.delete(id);}}
 setStatus(text){super.setStatus(text==='Synced with team'?'Synced with local tabs':text==='All changes saved'?'Saved on this device':text);}
}
