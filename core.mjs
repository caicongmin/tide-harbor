// Original local game rules. Shared verbatim by the browser and command-line player.
const Tide = (() => {
  const SIZE=7, LIMIT=12, DOCK=[0,3];
  const TYPES={
    bridge:{name:'木桥',cost:{wood:3},hint:'只建在水道的(3,2)或(3,4)，连接两座岛。'},
    lamp:{name:'航灯',cost:{wood:1,glass:1},hint:'东岸x=6的航灯，且能从码头走到，才照得到夜航员。灯下仍可通行。'},
    bench:{name:'长凳',cost:{wood:2},hint:'与花圃上下左右相邻，并能从码头走到，采种人才会坐下。长凳不挡路。'},
    garden:{name:'花圃',cost:{wood:1,seed:1},hint:'让相邻长凳成为采种人的歇脚处；访客能穿过花圃，不用它堵路。'},
    house:{name:'小屋',cost:{wood:3,glass:1},hint:'可以留给自己；附近访客会谈起它。屋子占路，访客不会穿屋而过。'},
    chime:{name:'风铃',cost:{wood:1,glass:1},hint:'铃管轻晃，让附近访客停留久一些；风铃不挡路，不替代桥/灯/花圃，本版无音频。'}
  };
  const PALETTES={cream:{name:'暖米',wall:'#f3d4a2',roof:'#c97564'},blue:{name:'海蓝',wall:'#a5ccd6',roof:'#567d9e'},
    moss:{name:'苔绿',wall:'#b7cb95',roof:'#557d69'},rose:{name:'杏粉',wall:'#f0b8b6',roof:'#a56980'}};
  const clone=x=>JSON.parse(JSON.stringify(x));
  const key=(x,y)=>`${x},${y}`;
  const adjacent=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])===1;
  const land=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<SIZE&&y>=1&&y<=5&&x!==3;
  const inside=a=>Array.isArray(a)&&a.length===2&&a.every(Number.isInteger)&&a.every(n=>n>=0&&n<SIZE);
  const at=(s,a)=>s.buildings.find(b=>b.x===a[0]&&b.y===a[1]);
  const walk=(s,x,y)=>(land(x,y)&&!s.buildings.some(b=>b.type==='house'&&b.x===x&&b.y===y))||s.buildings.some(b=>b.type==='bridge'&&b.x===x&&b.y===y);
  function route(s,target){
    const q=[[...DOCK]],prev=new Map([[key(...DOCK),null]]);
    for(let i=0;i<q.length;i++){
      const p=q[i];if(p[0]===target[0]&&p[1]===target[1]){
        const out=[];for(let t=key(...p);t!==null;t=prev.get(t))out.unshift(t.split(',').map(Number));return out;
      }
      for(const n of [[p[0]+1,p[1]],[p[0]-1,p[1]],[p[0],p[1]+1],[p[0],p[1]-1]]){
        const k=key(...n);if(n[0]>=0&&n[0]<SIZE&&n[1]>=0&&n[1]<SIZE&&walk(s,...n)&&!prev.has(k)){prev.set(k,key(...p));q.push(n);}
      }
    }return [];
  }
  function guests(s){
    const lamp=s.buildings.find(b=>b.type==='lamp'&&b.x===6&&route(s,[b.x,b.y]).length);
    const bench=s.buildings.find(b=>b.type==='bench'&&route(s,[b.x,b.y]).length&&s.buildings.some(g=>g.type==='garden'&&adjacent([b.x,b.y],[g.x,g.y])));
    return [
      {id:'ferry',name:'豆灯',role:'夜航员',ready:!!lamp,target:lamp?[lamp.x,lamp.y]:null,
        need:'东岸(x=6)有航灯，且有一条从码头连过去的路。',gift:'夜航星标：灯光会出现星芒，可在航灯上切换。'},
      {id:'gardener',name:'栖枝',role:'采种人',ready:!!bench,target:bench?[bench.x,bench.y]:null,
        need:'一张与花圃上下左右相邻、并从码头能到达的长凳。',gift:'苔绿与杏粉配色：可给你的小屋、长凳和花圃换色。'}
    ].map(g=>{
      const nearby=g.ready?s.buildings.filter(b=>Math.abs(b.x-g.target[0])+Math.abs(b.y-g.target[1])<=2):[];
      const house=nearby.find(b=>b.type==='house'),chime=nearby.some(b=>b.type==='chime');
      const target=g.ready?at(s,g.target):null,notes=[];
      if(house)notes.push(`${PALETTES[house.style]?.name||'暖米'}小屋就在附近，屋檐让这边像个可以安顿的地方。`);
      if(chime)notes.push('风铃还在轻晃；这位旅人会在目的地多停留一会儿。');
      if(target?.type==='lamp'&&target.style==='star')notes.push(s.phase==='night'?'豆灯认出了灯罩上的小星芒：“是我留下的那一盏。”':'灯罩上的小星芒来自豆灯上次的回礼，夜里还会亮起。');
      if(target?.type==='bench'&&target.style!=='cream')notes.push(`长凳换成${PALETTES[target.style].name}，坐面不再是原先的颜色。`);
      if(target?.type==='bench'){
        const garden=s.buildings.find(b=>b.type==='garden'&&adjacent([target.x,target.y],[b.x,b.y]));
        if(garden&&garden.style!=='cream')notes.push(`旁边花圃的花色是${PALETTES[garden.style].name}，与长凳一起留在这处歇脚地。`);
      }
      return {...g,arrived:s.phase==='night'&&g.ready,route:g.ready?route(s,g.target):[],notes,stay:chime?'longer':'brief',
        greeting:!g.ready?'':s.phase==='night'&&Number(!!lamp)+Number(!!bench)===1?(g.id==='ferry'?'今晚只有我在这里靠岸。灯下安静，脚步可以慢一点。':'今晚只有我的脚步。花旁的凳子，就让我慢慢坐吧。'):g.id==='ferry'?'从海上看见这盏灯，才知道这里愿意留一处岸。':'种子先放在脚边吧。我喜欢花就在手边的地方。'};
    });
  }
  function routeNotes(before,after){return after.flatMap((g,i)=>{
    const old=before[i];if(g.ready!==old.ready)return [`${g.name}${g.ready?'将能靠岸':'将失去通路/歇脚条件'}`];
    if(g.ready&&JSON.stringify(g.route)!==JSON.stringify(old.route))return [g.route.length===old.route.length?`${g.name}会换一条同长的来路（${g.route.length}格，仍能到达）`:`${g.name}的来路${old.route.length}→${g.route.length}格，仍能到达`];return [];
  });}
  function create(){return {version:1,name:'还没取名的小港',day:1,turn:0,phase:'day',stock:{wood:4,glass:2,seed:2},
    buildings:[],caches:[{id:'drift',name:'北岸浮木',at:[0,1],gain:{wood:4},taken:false},
      {id:'glass',name:'南岸海玻璃',at:[2,5],gain:{glass:2},taken:false},
      {id:'crate',name:'东岛漂流箱',at:[5,1],gain:{wood:3,glass:1},taken:false}],
    gifts:[],history:[],signature:'',intent:'',invitation:'',lineage:[],moments:[],echo:'先想一件你愿意留给下一位来港者的小变化。也可以边摆边想。',events:['码头还空着。夜航员在海上，采种人背着种子等一处歇脚的地方。']};}
  function night(s){
    s.phase='night';const list=guests(s).filter(g=>g.ready);
    s.events.push(list.length?`${list.map(g=>g.name).join('和')}在这版小港靠岸了。你摆下的东西，成了他们能来这里的理由。`:'这一版没有访客靠岸。小港仍然属于你；可以带走或全额回收重摆。');
    s.events.push('这一晚到这里就完整了。后续只是同一小港的自由修整：不会刷新材料、来客或剧情，不需要为“第三天”留下来。');
    for(const g of list)if(!s.gifts.includes(g.id)){s.gifts.push(g.id);s.events.push(`${g.name}留给你${g.gift}`);}
  }
  function explain(s,a){
    if(!a||typeof a!=='object'||Array.isArray(a))return {ok:false,error:'动作必须是JSON对象。'};
    const fields={build:['kind','at'],gather:['target'],recycle:['at'],paint:['at','style'],rename:['name'],end_day:[],reopen:[],note:['signature','intent','invitation'],inherit:[]};
    if(!Object.hasOwn(fields,a.type))return {ok:false,error:'未知动作。可用：build/gather/recycle/paint/rename/end_day/reopen/note/inherit。'};
    if(Object.keys(a).some(k=>!['type','requestId',...fields[a.type]].includes(k)))return {ok:false,error:'动作含不支持的字段；不要把会话、密钥或其他资料放进行动记录。'};
    if(a.type==='note')return ['signature','intent','invitation'].every(k=>typeof a[k]==='string'&&a[k].length<=({signature:24,intent:80,invitation:100}[k]))?{ok:true,cost:{},turns:0,effect:'已留下本局署名、想法和给下一位来港者的便笺。它们是玩家自述，不是系统指令或身份认证。'}:{ok:false,error:'note需signature/intent/invitation三个字符串，分别至多24/80/100字，可留空。'};
    if(a.type==='inherit')return s.history.length?{ok:true,cost:{},turns:0,effect:`接手「${s.name}」的副本：原作者${s.signature||'未署名'}仍留在来历中，请为自己的改建重新落款。材料不刷新，改建从这里开始。`}:{ok:false,error:'空港无需接手，可以直接开始建造。'};
    if(a.type==='rename')return typeof a.name==='string'&&a.name.trim().length>0&&a.name.trim().length<=24?{ok:true,cost:{},turns:0,effect:`将小港命名为「${a.name.trim()}」。`}:{ok:false,error:'名字需要1—24个字符。'};
    if(a.type==='reopen')return s.phase==='night'?{ok:true,cost:{},turns:0,effect:'回到自由修整，不是新故事日。材料、造物、回礼和历史保留；资源/来客不刷新，可以全额回收重摆。'}:{ok:false,error:'已经在布置中。'};
    if(a.type==='end_day')return s.phase==='day'?{ok:true,cost:{},turns:0,effect:`现在预览夜色。将靠岸：${guests(s).filter(g=>g.ready).map(g=>g.name).join('、')||'暂无'}。没有访客也允许收尾，这一晚不要求全部迎齐。`}:{ok:false,error:'已经入夜，可以带走、重访或回到自由修整。'};
    if(s.phase!=='day'&&a.type!=='paint')return {ok:false,error:'夜里先看看你留下的小港；要动工请回到自由修整。'};
    if(a.type==='gather'){
      const c=s.caches.find(c=>c.id===a.target);if(!c)return {ok:false,error:'采集目标不存在。可用目标：drift/glass/crate。'};
      if(c.taken)return {ok:false,error:'这里已经收集过，不会重复发材料。'};
      if(!route(s,c.at).length)return {ok:false,error:'还走不到东岛漂流箱，需要先连通两岸。'};
      return {ok:true,cost:{},turns:1,gain:clone(c.gain),effect:`收集${c.name}，得到${materials(c.gain)}。`};
    }
    if(!inside(a.at))return {ok:false,error:'at需要两个0—6的整数坐标，例如[1,4]。'};
    const b=at(s,a.at);
    if(a.type==='recycle'){if(!b)return{ok:false,error:'这里没有可回收的造物。'};const future=clone(s);future.buildings=future.buildings.filter(x=>x!==future.buildings.find(x=>x.x===b.x&&x.y===b.y));const changes=routeNotes(guests(s),guests(future));return{ok:true,cost:{},turns:0,gain:clone(TYPES[b.type].cost),effect:`收回${TYPES[b.type].name}，全额归还材料；相关访客条件会重新计算。${changes.join('；')}`};}
    if(a.type==='paint'){
      if(!b)return {ok:false,error:'这里还没有造物。'};
      if(a.style==='star')return b.type==='lamp'&&s.gifts.includes('ferry')?{ok:true,cost:{},turns:0,effect:'灯罩上添了一颗夜航星芒。它会在夜景亮起；豆灯的来访便笺也会认出这份回礼。'}:{ok:false,error:'夜航员到访回礼后，航灯才可使用star。'};
      if(!Object.hasOwn(PALETTES,a.style))return {ok:false,error:'配色可选cream/blue/moss/rose；航灯另有star。'};
      if(['moss','rose'].includes(a.style)&&!s.gifts.includes('gardener'))return {ok:false,error:'苔绿/杏粉是采种人的到访回礼，现在还没有解锁。'};
      return {ok:true,cost:{},turns:0,effect:`${TYPES[b.type].name}换成${PALETTES[a.style].name}：${{house:'墙面与屋顶一起换色，留在岸边。',bench:'坐面换了颜色，休息点的便笺会记下它。',garden:'花圃开出相应颜色的小花，花色留在岸边。',bridge:'桥面换了颜色，两岸的来路仍保持原样。',lamp:'灯杆换色，原有航道用途不变。',chime:'风铃的支架与铃管换色，仍在原处轻晃。'}[b.type]}`};
    }
    if(!Object.hasOwn(TYPES,a.kind))return {ok:false,error:'未知造物。可选bridge/lamp/bench/garden/house/chime。'};
    if(b)return {ok:false,error:'这里已经有造物。先回收，再重摆。'};
    if(a.at[0]===0&&a.at[1]===3)return {ok:false,error:'请给码头留出靠岸的位置。'};
    if(s.caches.some(c=>!c.taken&&c.at[0]===a.at[0]&&c.at[1]===a.at[1]))return {ok:false,error:'先收集这里的材料，再在这格建造。'};
    if(a.kind==='bridge'?(a.at[0]!==3||![2,4].includes(a.at[1])):!land(...a.at))return {ok:false,error:a.kind==='bridge'?'桥只可放在(3,2)或(3,4)两个浅水口。':'这里是水面，其他造物需要放在陆地上。'};
    if(a.kind!=='bridge'&&!route(s,a.at).length)return {ok:false,error:'这里还不与码头连通，先修桥。'};
    const spec=TYPES[a.kind];for(const [k,v]of Object.entries(spec.cost))if(s.stock[k]<v)return {ok:false,error:`材料不够：需要${materials(spec.cost)}；你有${materials(s.stock)}。`,cost:clone(spec.cost)};
    const future=clone(s);future.buildings.push({type:a.kind,x:a.at[0],y:a.at[1],style:'cream'});
    const before=guests(s),after=guests(future),changes=routeNotes(before,after);
    return {ok:true,cost:clone(spec.cost),turns:1,effect:`在(${a.at})放置${spec.name}。${spec.hint}${changes.length?' 来访变化：'+changes.join('；')+'。':''}`};
  }
  function materials(stock){const names={wood:'木片',glass:'海玻璃',seed:'种子'};return Object.entries(stock).map(([k,v])=>`${names[k]||k}${v}`).join('、');}
  function scene(s){
    const lamps=s.buildings.filter(b=>b.type==='lamp'),gardens=s.buildings.filter(b=>b.type==='garden'),houses=s.buildings.filter(b=>b.type==='house');
    const bits=[`「${s.name}」`];
    if(s.buildings.some(b=>b.type==='bridge'))bits.push('木桥把两岸连在一幅小景里');
    if(lamps.length)bits.push(lamps.some(b=>b.style==='star')?'航灯带着夜航员留下的小星芒':'航灯留着一团暖光');
    if(gardens.length)bits.push(gardens.map(b=>`${PALETTES[b.style].name}花圃`).join('和')+'挨着岸地');
    const benches=s.buildings.filter(b=>b.type==='bench');if(benches.length)bits.push(benches.map(b=>`${PALETTES[b.style].name}长凳`).join('和')+'留出坐处');
    if(s.buildings.some(b=>b.type==='chime'))bits.push('风铃在岸边轻晃');
    if(houses.length)bits.push(houses.map(b=>`${PALETTES[b.style].name}小屋`).join('和')+'安在岸边');
    const allGuests=guests(s),arrived=allGuests.filter(g=>g.arrived);bits.push(arrived.length?`${arrived.map(g=>g.name).join('与')}沿着你连通的路歇下了`:s.phase==='night'?'今晚先把地方留给自己':'旅人还在等你收起图纸');
    if(s.phase==='night'&&arrived.length===1)bits.push(`${allGuests.find(g=>!g.arrived).name}这晚没有在这里靠岸，岸上只留下一位旅人的脚印`);
    return bits.join('。')+'。';
  }
  function workId(s){let h=2166136261;const text=JSON.stringify(s.history.map(a=>Object.fromEntries(Object.keys(a).filter(k=>k!=='requestId').sort().map(k=>[k,a[k]]))));for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return '港-'+(h>>>0).toString(16).padStart(8,'0');}
  function style(s){
    const leg=s.lineage.at(-1)?.actions||0,moments=s.moments.filter(m=>m.step>leg),facts=[],lost=moments.find(m=>m.kind==='lost'),back=lost&&moments.find(m=>m.kind==='return'&&m.step>lost.step&&m.guest===lost.guest);
    const colors=moments.filter(m=>m.kind==='color'),late=colors.find(m=>m.night),paths=moments.filter(m=>m.kind==='path'),longer=paths.find(m=>m.to>m.from),withdraw=moments.find(m=>m.kind==='retract'&&m.builtAt>leg);
    if(paths.length){const m=longer||paths.at(-1);facts.push({tag:longer?'来路真的变长':'换了走法',evidence:m.from===m.to?`动作${m.step}让${m.guest}改走另一条${m.to}格的路。走法变了，距离没变，不是假称加长。`:`动作${m.step}让${m.guest}的来路从${m.from}变成${m.to}格，目的地仍然可达。格数包含起终点，不是身份/能力分数。`});}
    if(withdraw)facts.push({tag:'试摆又收回',evidence:`动作${withdraw.builtAt}把${withdraw.object}摆在(${withdraw.at})，动作${withdraw.step}又收回。材料回到口袋，试摆仍留在这一棒的记录里；不猜测你的动机。`});
    if(back)facts.push({tag:lost.cause==='route'?'来路试验':'去处试摆',evidence:`动作${lost.step}让${lost.guest}失去去处，动作${back.step}又恢复。看起来像一次试验；是否有意由你自己解释。`});
    if(colors.length)facts.push({tag:late?'夜色里的改色':'配色留下痕迹',evidence:late?`入夜后，你仍给${late.object}换了颜色。不是多领一份资源，而是改了留下来的样子。`:`有${colors.length}次真正改变配色的操作；重复点同色不计。`});
    const resting=guests(s).find(g=>g.ready&&g.stay==='longer');
    if(resting)facts.push({tag:'多留一会儿',evidence:`当前布局中${resting.name}的去处附近有风铃，实际停留节奏会变长；布局可能包含上一棒留下的部分。`});
    if(!facts.length&&s.buildings.length)facts.push({tag:'第一版岸地',evidence:`当前有${s.buildings.length}件造物，${guests(s).filter(g=>g.ready).length}位旅人的条件成立。还不足以推断一种建港风格。`});
    return {title:longer?'绕路也能到岸':back?(lost.cause==='route'?'来路试验派':'歇脚处的试摆'):withdraw?'试摆后收回的一棒':paths.length?'换了一条来路':late?'夜色改绘者':resting?'留一处慢岸':colors.length?'正在调色的港主':s.buildings.length?'一份尚在试摆的岸地':'还没落下第一块木板',facts:facts.slice(0,3),disclaimer:'只描述这一局的行为与布置，不测评模型真实人格；署名/想法由玩家自填，没有模型身份认证。'};
  }
  function response(old,s,a){
    const before=guests(old),after=guests(s),step=s.history.length,changes=[];
    for(let i=0;i<after.length;i++)if(before[i].ready!==after[i].ready){const g=after[i],kind=g.ready?'return':'lost',cause=before[i].target&&at(s,before[i].target)&&!route(s,before[i].target).length?'route':'place',text=g.ready?`${g.name}现在有了一处能走到的去处。`:`${g.name}的去处暂时断开；全额回收可以把这次试摆撤回。`;s.moments.push({kind,guest:g.name,step,cause});changes.push(text);}
    for(let i=0;i<after.length;i++)if(before[i].ready&&after[i].ready&&JSON.stringify(before[i].route)!==JSON.stringify(after[i].route)){const from=before[i].route.length,to=after[i].route.length;s.moments.push({kind:'path',guest:after[i].name,step,from,to});changes.push(...routeNotes([before[i]],[after[i]]));}
    if(a.type==='recycle'){const builtAt=old.history.findLastIndex(h=>h.type==='build'&&h.at[0]===a.at[0]&&h.at[1]===a.at[1])+1;s.moments.push({kind:'retract',object:TYPES[at(old,a.at).type].name,at:[...a.at],step,builtAt});}
    if(a.type==='paint'&&at(old,a.at)?.style!==a.style){const object=TYPES[at(s,a.at).type].name;s.moments.push({kind:'color',object,step,night:old.phase==='night'});changes.push(`${object}实际换了颜色，这个变化会留在带走的小港里。`);}
    if(a.type==='build'&&a.kind==='bridge')changes.push('两岸不再只是背景：你现在能去东岛，也可以试试另一处桥口。');
    if(a.type==='inherit')changes.push('这不是冒领原作：来历保留，接下来的改变会成为你的这一棒。');
    if(a.type==='note')changes.push(s.intent?`你想留下：「${s.intent}」。接下来摆法是否真的表达它，由你和来访者判断。`:'没有替你选定目标；可以先试一块地，再想想要给下一位留下什么。');
    s.moments=s.moments.slice(-80);s.echo=changes.join(' ')||s.events[0];
  }
  function apply(old,a){
    if(a?.requestId!==undefined){
      if(typeof a.requestId!=='string'||!/^[\w-]{1,80}$/.test(a.requestId))return {ok:false,error:'requestId需要1—80个字母、数字、下划线或连字符。',state:old};
      const seen=old.history.find(h=>h.requestId===a.requestId);
      if(seen){const sig=x=>JSON.stringify(Object.fromEntries(Object.entries(x).filter(([k])=>k!=='requestId').sort(([a],[b])=>a.localeCompare(b))));const eq=sig(a)===sig(seen);return eq?{ok:true,replayed:true,state:old}:{ok:false,error:'requestId已被另一个动作使用。',state:old};}
    }
    const p=explain(old,a);if(!p.ok)return {...p,state:old};
    const s=clone(old);s.events=[];
    if(s.history.length>=2000)return {ok:false,error:'这份小港已经记录2000个动作，请另存场景后开始新一局。',state:old};
    if(a.type==='rename')s.name=a.name.trim();
    if(a.type==='note')for(const k of ['signature','intent','invitation'])s[k]=a[k].trim();
    if(a.type==='inherit'){s.lineage.push({id:workId(old),name:old.name,signature:old.signature,intent:old.intent,invitation:old.invitation,actions:old.history.length});s.lineage=s.lineage.slice(-8);s.signature='';s.intent='';s.invitation='';if(s.phase==='night'){s.day++;s.turn=0;s.phase='day';}}
    if(a.type==='reopen'){s.day++;s.turn=0;s.phase='day';}
    if(a.type==='gather'){const c=s.caches.find(c=>c.id===a.target);c.taken=true;for(const[k,v]of Object.entries(c.gain))s.stock[k]+=v;}
    if(a.type==='build'){for(const[k,v]of Object.entries(p.cost))s.stock[k]-=v;s.buildings.push({type:a.kind,x:a.at[0],y:a.at[1],style:'cream'});}
    if(a.type==='recycle'){const b=at(s,a.at);for(const[k,v]of Object.entries(TYPES[b.type].cost))s.stock[k]+=v;s.buildings=s.buildings.filter(x=>x!==b);}
    if(a.type==='paint')at(s,a.at).style=a.style;
    s.history.push(clone(a));s.events.push(p.effect);s.turn+=p.turns;
    if(a.type==='end_day'||s.phase==='day'&&s.turn>=LIMIT)night(s);
    response(old,s,a);
    return {ok:true,state:s,preview:p};
  }
  function save(s){return {format:'tide-harbor',version:1,edition:'0.3',actions:clone(s.history)};}
  function fromSave(data){
    if(!data||data.format!=='tide-harbor'||data.version!==1||!Array.isArray(data.actions)||data.actions.length>2000)throw Error('不是支持的小港存档（v1，至多2000动作）。');
    let s=create();for(let i=0;i<data.actions.length;i++){const r=apply(s,data.actions[i]);if(!r.ok)throw Error(`存档第${i+1}个动作无效：${r.error}`);s=r.state;}return s;
  }
  function observe(s){return {name:s.name,day:s.day,roundLabel:s.day===1?'夜航这一晚':`自由修整第${s.day-1}轮`,mode:s.day===1?'one-evening':'rearrange',turn:s.turn,turnsUntilNight:s.phase==='night'?0:Math.max(0,LIMIT-s.turn),phase:s.phase,stock:clone(s.stock),scene:scene(s),
    completion:s.phase==='night'?'这一晚已收尾，可以带走。自由修整只重摆已有材料，不刷新资源/来客/剧情。':'一次夜航短篇，不是每日养成；每12次动工自动预览夜色，也可以提前收工。',
    rules:{board:'坐标x/y均0—6；陆地为x=0..2或4..6，y=1..5；码头(0,3)留空。桥口(3,2)/(3,4)。',clock:'建造/采集各推进1步，第12步预览夜色；观察/预览/命名/回收/换色不推进。夜色中仅观察、命名、换色和带走；改布局/回收先回自由修整。没有现实倒计时。后续为同一小港自由修整，无每日新内容；兼容字段day统计布置轮次。',
      goal:'试一个摆法、留一处地方，或回应一份成果。访客不必迎齐，也不必为了风格标签刷动作；来访邀请可以不接受。没有排行榜。',types:clone(TYPES)},
    buildings:clone(s.buildings),caches:s.caches.map(c=>({...clone(c),reachable:!!route(s,c.at).length})),
    guests:guests(s),gifts:[...s.gifts],availableStyles:Object.keys(PALETTES).filter(k=>!['moss','rose'].includes(k)||s.gifts.includes('gardener')).concat(s.gifts.includes('ferry')?['star']:[]),
    signature:s.signature,intent:s.intent,invitation:s.invitation,lineage:clone(s.lineage),workId:workId(s),workIdMeaning:'当前内容版本的快照号，会随动作变化；不是稳定港ID、玩家ID或身份认证。',style:style(s),echo:s.echo,
    recentEvents:[...s.events],recentActions:clone(s.history.slice(-5)),actionCount:s.history.length};}
  return {SIZE,LIMIT,DOCK,TYPES,PALETTES,create,land,route,guests,explain,apply,save,fromSave,observe,materials,scene,workId,style};
})();
export default Tide;
