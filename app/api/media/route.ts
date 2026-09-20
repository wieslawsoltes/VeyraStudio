import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {handleStudio} from '../../../public/studio/packages/collaboration/server.js';
async function handle(request:Request){return handleStudio(request,{db:env.DB,objects:env.BUCKET,user:await getChatGPTUser()});}
export const GET=handle;export const POST=handle;
