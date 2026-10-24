// Portable game data only. No network, account, evaluator model, or automatic posting.
import Tide from './core.mjs';
const Exchange=(()=>{
  const PREFIX='TIDE3.',MAX=16000,MAX_BYTES=12000,MAX_ACTIONS=200;
  const pack=a=>{switch(a.type){case'build':return['b',a.kind,...a.at];case'gather':return['g',a.target];case'recycle':return['r',...a.at];case'paint':return['p',...a.at,a.style];case'rename':return['n',a.name];case'end_day':return['e'];case'reopen':return['o'];case'note':return['w',a.signature,a.intent,a.invitation];case'inherit':return['i'];default:throw Error('未知行动不能分享。');}};
  function unpack(a){
    if(!Array.isArray(a))throw Error('成果行动格式错误。');
    const lengths={b:4,g:2,r:3,p:4,n:2,e:1,o:1,w:4,i:1};if(!Object.hasOwn(lengths,a[0])||a.length!==lengths[a[0]])throw Error('成果行动长度/类型错误。');
    switch(a[0]){case'b':return{type:'build',kind:a[1],at:a.slice(2)};case'g':return{type:'gather',target:a[1]};case'r':return{type:'recycle',at:a.slice(1)};case'p':return{type:'paint',at:a.slice(1,3),style:a[3]};case'n':return{type:'rename',name:a[1]};case'e':return{type:'end_day'};case'o':return{type:'reopen'};case'w':return{type:'note',signature:a[1],intent:a[2],invitation:a[3]};case'i':return{type:'inherit'};}
  }
  function encode(s){
    const valid=Tide.fromSave(Tide.save(s));if(valid.history.length>MAX_ACTIONS)throw Error('评论分享至多200动作；更长作品请下载JSON/独立HTML，不截断历史。');
    const bytes=new TextEncoder().encode(JSON.stringify({v:1,a:valid.history.map(pack)}));if(bytes.length>MAX_BYTES)throw Error('便笺/历史过长，请下载JSON分享。');
    const code=PREFIX+btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');if(code.length>MAX)throw Error('成果码过长。');return code;
  }
  function decode(input){
    if(typeof input!=='string'||input.length>MAX)throw Error('成果码应为不超过16000字的文本。');const code=input.trim();if(!code.startsWith(PREFIX)||!/^[A-Za-z0-9_-]+$/.test(code.slice(PREFIX.length)))throw Error('成果码应以TIDE3.开头，只接受游戏数据，不打开外部网址。');
    const raw=atob(code.slice(PREFIX.length).replaceAll('-','+').replaceAll('_','/'));if(raw.length>MAX_BYTES)throw Error('成果数据过大。');const d=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,c=>c.charCodeAt(0))));
    if(!d||d.v!==1||Object.keys(d).some(k=>!['v','a'].includes(k))||!Array.isArray(d.a)||d.a.length>MAX_ACTIONS)throw Error('不是支持的成果数据。');return Tide.fromSave({format:'tide-harbor',version:1,actions:d.a.map(unpack)});
  }
  function card(s){const o=Tide.observe(s);return{workId:o.workId,workIdMeaning:o.workIdMeaning,name:o.name,signature:o.signature||'未署名',intent:o.intent,invitation:o.invitation,scene:o.scene,style:o.style,lineage:o.lineage,actions:o.actionCount};}
  function extract(input){if(typeof input!=='string'||input.length>20000)throw Error('粘贴内容过长。');const matches=[...new Set(input.match(/TIDE3\.[A-Za-z0-9_-]+/g)||[])];if(matches.length!==1)throw Error('请粘贴一份TIDE3.成果码；不会访问粘贴内容里的任何网址。');return matches[0];}
  function comment(s){const c=card(s);return`潮汐小港｜${c.name} · ${c.signature}（玩家自填）\n本局：${c.style.title}\n${c.invitation?'留给下一位：'+c.invitation:'欢迎看一眼，也可以接手留下一处小变化。'}\n成果码：${encode(s)}`;}
  function link(s,base){const u=new URL(base);if(!['http:','https:'].includes(u.protocol))return null;u.username='';u.password='';u.search='';u.hash=new URLSearchParams({harbor:encode(s)}).toString();return u.href;}
  return {encode,decode,card,comment,link,extract,MAX_ACTIONS};
})();
export default Exchange;
