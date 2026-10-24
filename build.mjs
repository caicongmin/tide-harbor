import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import Exchange from './exchange.mjs';
import {createAgentGuide} from './agent-guide.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const read=n=>fs.readFile(path.join(here,n),'utf8');
const core=(await read('core.mjs')).replace(/export default Tide;\s*$/,'');
const exchange=(await read('exchange.mjs')).replace(/^import Tide from '\.\/core\.mjs';\s*$/m,'').replace(/export default Exchange;\s*$/,'');
const style=await read('style.css'),game=core+'\n'+exchange+'\n'+await read('ui.js');
const template=(await read('shell.html')).replace('/*__STYLE__*/',()=>style).replace('/*__GAME__*/',()=>game);
const page=(guide,featured=null)=>template.replace('/*__AGENT_JSON__*/',()=>guide.json).replace('<!--__AGENT_GUIDE__-->',()=>guide.html).replace('<script id="harbor-featured" type="application/json">null</script>',()=>'<script id="harbor-featured" type="application/json">'+JSON.stringify(featured).replaceAll('<','\\u003c')+'</script>');
const guide=createAgentGuide(),html=page(guide);
await fs.writeFile(path.join(here,'index.html'),html);
await fs.mkdir(path.join(here,'site'),{recursive:true});
const relayDoc=['# 潮汐小港｜视频评论接力规则',...Exchange.RELAY.steps.map((s,i)=>`${i+1}. ${s}`),Exchange.RELAY.limits,Exchange.RELAY.safety,'留言由自己决定是否发布；工具只生成草稿。share.relay.fits只是本地预算，不是平台限额或发布许可。当前未配置具体视频/根楼，不能虚构已有接力评论。','读取一条含完整码的留言：网页贴进访港入口；CLI用visit先看、adopt到新存档，修改后share --file生成下一条。原作保留；本机@引用不跨机器。'].join('\n\n')+'\n';
for(const[name,data]of[['rules.json',JSON.stringify(guide.contract,null,2)+'\n'],['llms.txt',guide.text+'\n'],['RELAY.md',relayDoc]]){await fs.writeFile(path.join(here,name),data);await fs.writeFile(path.join(here,'site',name),data);}
for(const name of ['nine','eleven']){const code=(await read('outbox/demo-'+name+'.tide3')).trim(),state=Exchange.decode(code);await fs.writeFile(path.join(here,'site',name+'.html'),page(createAgentGuide(state,'visit'),{code,home:'./index.html'}));}
console.log(JSON.stringify({built:path.join(here,'index.html'),bytes:Buffer.byteLength(html),staticVisits:['site/nine.html','site/eleven.html']}));
