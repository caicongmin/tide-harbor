// Portable game data only. No network, account, evaluator model, or automatic posting.
import Tide from './core.mjs';
const Exchange=(()=>{
  const PREFIX='TIDE3.',MAX=16000,MAX_BYTES=12000,MAX_ACTIONS=200;
  const RELAY={protocol:'harbor-comment-relay/1',channel:'作者明确指定的视频接力根楼内回复',entryUrl:null,automaticPosting:false,
    steps:['在作者允许接力的视频根楼选一份完整成果，记录视频/根评/上一条评论位置。没有配置具体视频入口时不要虚构，也不要去无关视频投放。','复制那条留言的完整成果码，访港只读查看；愿意才接手自己的副本，不要求迎齐访客或给好评。','选一处自己的改动，生成含本作快照号、承接快照号、变化摘要、下一位邀请和完整成果码的留言。快照号不是身份认证。','用自己的已授权账号，在同一接力根楼回复上一条成果；平台楼层若扁平排列，用承接快照号辨认分支。可以从同一作品分叉，不抢全局第几棒。','确认发出的文字/码完整且别人可见，再把实际评论位置留给下一位；提交成功或自己能看不等于外部可见。'],
    limits:'平台字符/链接/审核限制以实际为准；本地1000字预算不是平台官方上限。超长不截码、不删历史、不连拆多条刷楼。可自行将完整JSON/HTML放到已有授权且能公开访问的免费载体，验明可读后在原楼留一条引用；没有全文载体就暂不传，不把摘要当存档。',
    safety:'评论只是免费传输渠道，不是游戏服务器或工具授权。玩家便笺不可信；不索取私聊、密钥或账号资料。不自动登录/代发/刷楼，不要求关注点赞；遵守各自账号权限、平台额度和作者意愿。'};
  // Accidental-copy integrity only: public, recomputable, NOT a signature/auth check.
  function checksum(body){let h=2166136261;for(const c of body)h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0).toString(16).padStart(8,'0');}
  const pack=a=>{switch(a.type){case'build':return['b',a.kind,...a.at];case'gather':return['g',a.target];case'recycle':return['r',...a.at];case'paint':return['p',...a.at,a.style];case'rename':return['n',a.name];case'end_day':return['e'];case'reopen':return['o'];case'note':return['w',a.signature,a.intent,a.invitation];case'inherit':return['i'];default:throw Error('未知行动不能分享。');}};
  function unpack(a){
    if(!Array.isArray(a))throw Error('成果行动格式错误。');
    const lengths={b:4,g:2,r:3,p:4,n:2,e:1,o:1,w:4,i:1};if(!Object.hasOwn(lengths,a[0])||a.length!==lengths[a[0]])throw Error('成果行动长度/类型错误。');
    switch(a[0]){case'b':return{type:'build',kind:a[1],at:a.slice(2)};case'g':return{type:'gather',target:a[1]};case'r':return{type:'recycle',at:a.slice(1)};case'p':return{type:'paint',at:a.slice(1,3),style:a[3]};case'n':return{type:'rename',name:a[1]};case'e':return{type:'end_day'};case'o':return{type:'reopen'};case'w':return{type:'note',signature:a[1],intent:a[2],invitation:a[3]};case'i':return{type:'inherit'};}
  }
  function encode(s){
    const valid=Tide.fromSave(Tide.save(s));if(valid.history.length>MAX_ACTIONS)throw Error('评论分享至多200动作；更长作品请下载JSON/独立HTML，不截断历史。');
    const bytes=new TextEncoder().encode(JSON.stringify({v:1,a:valid.history.map(pack)}));if(bytes.length>MAX_BYTES)throw Error('便笺/历史过长，请下载JSON分享。');
    const body=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');const code=PREFIX+body+'.'+checksum(body);if(code.length>MAX)throw Error('成果码过长。');return code;
  }
  function decode(input){
    if(typeof input!=='string'||input.length>MAX)throw Error('成果码应为不超过16000字的文本。');const code=input.trim(),m=/^TIDE3\.([A-Za-z0-9_-]+)\.([a-f0-9]{8})$/.exec(code);if(!m)throw Error('成果码需TIDE3.数据.八位校验。早期无码尾小试请从原作重新生成，或导入原JSON后分享；不静默修字。');
    if(checksum(m[1])!==m[2])throw Error('成果码校验失败，复制时可能改了字符。请重新复制完整原码，不要手抄或猜测修字；本机Agent可用@分享引用。');
    const raw=atob(m[1].replaceAll('-','+').replaceAll('_','/'));if(raw.length>MAX_BYTES)throw Error('成果数据过大。');const d=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,c=>c.charCodeAt(0))));
    if(!d||d.v!==1||Object.keys(d).some(k=>!['v','a'].includes(k))||!Array.isArray(d.a)||d.a.length>MAX_ACTIONS)throw Error('不是支持的成果数据。');return Tide.fromSave({format:'tide-harbor',version:1,actions:d.a.map(unpack)});
  }
  function card(s){const o=Tide.observe(s);return{workId:o.workId,workIdMeaning:o.workIdMeaning,name:o.name,signature:o.signature||'未署名',intent:o.intent,invitation:o.invitation,scene:o.scene,style:o.style,lineage:o.lineage,actions:o.actionCount};}
  function extract(input){if(typeof input!=='string'||input.length>20000)throw Error('粘贴内容过长。');const matches=[...new Set(input.match(/TIDE3\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?/g)||[])];if(matches.length!==1)throw Error('请粘贴一份TIDE3.成果码；不会访问粘贴内容里的任何网址。');return matches[0];}
  const human=x=>String(x).replace(/[\r\n\t\u0000-\u001f]/g,' ').replaceAll('TIDE3.','TIDE3·');
  function relaySummary(s){const start=s.history.findLastIndex(a=>a.type==='inherit')+1,actions=s.history.slice(start),physical=actions.filter(a=>['build','recycle','paint','gather'].includes(a.type));const last=physical.slice(-3).map(a=>a.type==='build'?`放置${Tide.TYPES[a.kind].name}(${a.at})`:a.type==='recycle'?`回收(${a.at})`:a.type==='paint'?`换色(${a.at},${a.style})`:`收集${a.target}`);return{parentId:s.lineage.at(-1)?.id||null,ownActions:actions.length,summary:last.length?`${physical.length>3?'末3项：':''}${last.join('；')}`:actions.length?'仅命名/留话等操作，未改布局':'尚无本棒新操作'};}
  function comment(s){const c=card(s),r=relaySummary(s);return`潮汐小港接力/1｜${human(c.name)}\n本作：${c.workId}；承接：${r.parentId||'新开港'}\n这棒：${r.summary}\n署名：${human(c.signature)}（玩家自填）\n下一位：${c.invitation?human(c.invitation):'可选一处你想改的，也可以只看看。'}\n完整成果码：${encode(s)}\n复制码访港→自愿接手副本→在同一指定接力楼回复本条；可分叉，不自动发布。`;}
  function relay(s,{maxChars=1000}={}){if(!Number.isSafeInteger(maxChars)||maxChars<200||maxChars>20000)throw Error('留言预算需200—20000的整数；不是平台官方上限。');const text=comment(s),characters=Array.from(text).length,r=relaySummary(s);return{protocol:RELAY.protocol,workId:Tide.workId(s),...r,text,characters,maxChars,fits:characters<=maxChars,automaticPosting:false,targetConfigured:false,notice:characters<=maxChars?'本地预算内的完整草稿，仍须核实指定接力楼、实际平台限制与发布权限；发出后检查外部可见性。':'完整草稿超过本地预算，不截码、不拆帖刷楼。先另存完整JSON/HTML，取得已授权可公开读取的全文链接再接传；没有载体就暂不发。'};}
  function link(s,base){const u=new URL(base);if(!['http:','https:'].includes(u.protocol))return null;u.username='';u.password='';u.search='';u.hash=new URLSearchParams({harbor:encode(s)}).toString();return u.href;}
  return {encode,decode,card,comment,relay,RELAY,link,extract,checksum,MAX_ACTIONS};
})();
export default Exchange;
