import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import Exchange from './exchange.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const read=n=>fs.readFile(path.join(here,n),'utf8');
const core=(await read('core.mjs')).replace(/export default Tide;\s*$/,'');
const exchange=(await read('exchange.mjs')).replace(/^import Tide from '\.\/core\.mjs';\s*$/m,'').replace(/export default Exchange;\s*$/,'');
const style=await read('style.css'),game=core+'\n'+exchange+'\n'+await read('ui.js');
const html=(await read('shell.html')).replace('/*__STYLE__*/',()=>style).replace('/*__GAME__*/',()=>game);
await fs.writeFile(path.join(here,'index.html'),html);
await fs.mkdir(path.join(here,'site'),{recursive:true});
for(const name of ['nine','eleven']){const code=(await read('outbox/demo-'+name+'.tide3')).trim();Exchange.decode(code);const data=JSON.stringify({code,home:'./index.html'}).replaceAll('<','\\u003c');await fs.writeFile(path.join(here,'site',name+'.html'),html.replace('<script id="harbor-featured" type="application/json">null</script>',()=>'<script id="harbor-featured" type="application/json">'+data+'</script>'));}
console.log(JSON.stringify({built:path.join(here,'index.html'),bytes:Buffer.byteLength(html),staticVisits:['site/nine.html','site/eleven.html']}));
