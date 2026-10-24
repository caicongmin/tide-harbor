(() => {
  const $=id=>document.getElementById(id), esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let embedded;try{embedded=JSON.parse($('harbor-seed').textContent);}catch{}
  const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0).toString(16);};
  const params=new URLSearchParams(location.hash.slice(1)),receivedCode=params.get('harbor');
  let storageKey='tide-harbor-v3'+(embedded?'-backup-'+hash(JSON.stringify(embedded)):'-main'),viewing=false,received=null,entryError='',noteDirty=false;
  let state=Tide.create(),kind=null,cell=[1,4],started=false,frame=0,layout,gridStamp='';
  const arrivals=new Map(),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let restored=false;
  if(receivedCode!==null){
    viewing=true;try{state=Exchange.decode(receivedCode);received={id:Tide.workId(state),name:state.name,signature:state.signature,intent:state.intent,invitation:state.invitation};storageKey='tide-harbor-v3-own-'+hash(receivedCode);
      if(params.get('mode')==='own'){const data=JSON.parse(localStorage.getItem(storageKey));if(data){const own=Tide.fromSave(data);if(own.lineage.some(x=>x.id===received.id)){state=own;viewing=false;}}}
    }catch(e){entryError='未打开这份成果：'+e.message;}
  }else{
    try{const data=JSON.parse(localStorage.getItem(storageKey));if(data){state=Tide.fromSave(data);restored=true;}}catch(e){entryError='本地修改未载入：'+e.message;}
    if(!restored&&embedded)try{state=Tide.fromSave(embedded);}catch(e){entryError='页面内存档未载入：'+e.message;}
  }
  const resume=state.history.length>0;
  $('resume-note').textContent=resume?'已经留有一座小港，按按钮继续。':'';
  if(resume)$('start').textContent='回到我的小港 →';
  const canvas=$('scene'),ctx=canvas.getContext('2d');
  const glyph={bridge:'╪',lamp:'♧',bench:'⌑',garden:'✿',house:'⌂',chime:'♩'};
  function persist(){try{localStorage.setItem(storageKey,JSON.stringify(Tide.save(state)));}catch{$('message').textContent='浏览器未允许本地保存，请用“保存存档”下载。';}}
  function act(a){if(viewing){const r={ok:false,readOnly:true,error:'正在观光，不修改原作。要回应请先点击“接手一份副本”。'};$('message').textContent=r.error;return r;}const r=Tide.apply(state,a);if(!r.ok){$('message').textContent=r.error;return r;}state=r.state;persist();$('message').textContent='';for(const id of ['share-code','share-comment','share-link'])$(id).value='';render();return r;}
  function select(p){cell=p;render();}
  function button(text,fn){const b=document.createElement('button');b.textContent=text;b.addEventListener('click',fn);return b;}
  let book=$('harbor-book');if(!book){book=document.createElement('section');book.id='harbor-book';book.className='harbor-book';}
  book.append(document.querySelector('.postcard'),document.querySelector('.intention'));document.querySelector('.world-wrap').append(book);
  let shareNav=$('show-postcard');if(!shareNav){shareNav=document.createElement('button');shareNav.id='show-postcard';shareNav.textContent='成果 / 邀请';document.querySelector('header nav').append(shareNav);}
  shareNav.onclick=()=>{document.querySelector('.postcard details').open=true;book.scrollIntoView({block:'start'});};
  $('cells').replaceChildren();$('palette').replaceChildren();$('cell-select').replaceChildren();
  for(let y=0;y<7;y++)for(let x=0;x<7;x++){
    const b=document.createElement('button');b.className='cell';b.dataset.cell=`${x},${y}`;b.setAttribute('aria-label',`格(${x},${y}) ${Tide.land(x,y)?'陆地':'水面'}`);b.innerHTML=`<span>${x},${y}</span>`;b.onclick=()=>select([x,y]);$('cells').append(b);
    const o=document.createElement('option');o.value=`${x},${y}`;o.textContent=`(${x},${y}) ${Tide.land(x,y)?'陆地':'水面'}`;$('cell-select').append(o);
  }
  $('cell-select').onchange=e=>select(e.target.value.split(',').map(Number));
  for(const[k,spec]of Object.entries(Tide.TYPES)){
    const b=button('',()=>{kind=k;render();});b.dataset.kind=k;b.innerHTML=`<span class="glyph">${glyph[k]}</span><span>${spec.name}</span><small>${esc(Tide.materials(spec.cost))}</small>`;$('palette').append(b);
  }
  function render(){
    const obs=Tide.observe(state),night=state.phase==='night';document.body.classList.toggle('night',night);
    $('harbor-name').textContent=state.name;document.title=state.name+' · 潮汐小港';
    document.body.classList.toggle('visiting',viewing);
    $('visit-banner').hidden=receivedCode===null;$('visit-title').textContent=received?(viewing?'正在看':'正在接手')+'「'+received.name+'」 · '+(received.signature||'未署名'):'成果未能打开';
    $('visit-note').textContent=entryError||[received?.intent&&'原作想留下：'+received.intent,received?.invitation&&'上一位的邀请：'+received.invitation].filter(Boolean).join(' ');
    $('adopt').hidden=!viewing;$('adopt').disabled=!received||!state.history.length;
    $('intent-banner').textContent=state.intent?'这一棒想留下：'+state.intent:'还没有预设的正确港口。你可以边试边决定想给下一位留下什么。';
    $('echo').textContent=obs.echo;
    if(!noteDirty)for(const k of ['signature','intent','invitation'])$(k).value=state[k];
    $('style-title').textContent=obs.style.title;$('style-facts').replaceChildren(...obs.style.facts.map(f=>{const li=document.createElement('li');li.textContent=f.tag+'：'+f.evidence;return li;}));
    $('lineage').replaceChildren(...state.lineage.map(l=>{const p=document.createElement('p');p.textContent=`承接「${l.name}」 · ${l.signature||'未署名'}（玩家自填） · 来自快照${l.id}；接手时已有${l.actions}条行动（含更早继承）。便笺：${l.invitation||'未留'}。`;return p;}));
    $('phase').textContent=`${state.day===1?'夜航这一晚':'自由修整'} · ${night?'灯火留岸':'布置中'}`;
    $('turns').textContent=night?'已经入夜':`再${12-state.turn}步入夜`;
    $('stock').innerHTML=Object.entries(state.stock).map(([k,v])=>`<div><b>${v}</b><span>${{wood:'木片',glass:'海玻璃',seed:'种子'}[k]}</span></div>`).join('');
    $('guests').innerHTML=obs.guests.map(g=>`<article class="guest ${g.id}"><div class="avatar">${g.id==='ferry'?'◒':'❧'}</div><div><h3>${g.name}<span>${g.role}</span></h3><p>${g.need}</p><span class="${g.ready?'ready':'waiting'}">${g.arrived?'已靠岸 · 看看地图上TA的去处':g.ready?'已经准备好，可以收工迎客':'还在等一处合适的地方'}</span>${g.arrived?`<p>“${esc(g.greeting)}”</p>`:''}${g.arrived&&g.notes.length?`<details class="guest-notes"><summary>岸边有${g.notes.length}处小变化</summary><ul>${g.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></details>`:''}${state.gifts.includes(g.id)?`<p>回礼已留下：${g.id==='ferry'?'夜航星标':'苔绿 / 杏粉配色'}</p>`:''}</div></article>`).join('');
    $('events').replaceChildren(...state.events.map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));
    $('cell-select').value=cell.join(',');
    const obj=state.buildings.find(b=>b.x===cell[0]&&b.y===cell[1]);const cache=state.caches.find(c=>!c.taken&&c.at.join(',')===cell.join(','));
    $('cell-info').textContent=obj?Tide.TYPES[obj.type].name+' · '+(obj.style==='star'?'夜航星标':Tide.PALETTES[obj.style].name):cache?cache.name+' · '+Tide.materials(cache.gain):cell.join(',')==='0,3'?'旧码头，留给靠岸的船':Tide.land(...cell)?'一格空地，等你决定放什么':'水道；只有两个浅水口可以架桥';
    $('cell-actions').replaceChildren();
    if(cache){const p=Tide.explain(state,{type:'gather',target:cache.id}),b=button('收集材料',()=>act({type:'gather',target:cache.id}));b.id='gather-selected';b.disabled=!p.ok;if(!p.ok){b.title=p.error;$('cell-info').textContent+=' · '+p.error;}$('cell-actions').append(b);}
    if(obj){const b=button('全额回收',()=>act({type:'recycle',at:cell}));b.id='recycle-selected';b.disabled=night;if(night){b.title='夜里可换色；要改布局/回收请先自由修整';$('cell-info').textContent+=' · 夜里可换色，回收先自由修整';}$('cell-actions').append(b);
      for(const style of obs.availableStyles.filter(k=>k!=='star'||obj.type==='lamp')){const b=button(style==='star'?'星标':Tide.PALETTES[style].name,()=>act({type:'paint',at:cell,style}));b.dataset.style=style;b.classList.toggle('active',obj.style===style);$('cell-actions').append(b);}}
    const preview=kind?Tide.explain(state,{type:'build',kind,at:cell}):null;
    $('preview').classList.toggle('bad',!!preview&&!preview.ok);
    $('preview').textContent=preview?(preview.ok?`${preview.effect} 消耗${Tide.materials(preview.cost)}，推进1步。`:preview.error):'图纸还收在口袋里。选择一种造物和位置，先看成本与用途，再确认。';
    $('confirm-build').disabled=!preview?.ok;$('confirm-build').textContent=kind?'确认放置'+Tide.TYPES[kind].name:'确认放置';
    document.querySelectorAll('[data-kind]').forEach(b=>b.classList.toggle('active',b.dataset.kind===kind));
    document.querySelectorAll('[data-cell]').forEach(b=>b.classList.toggle('selected',b.dataset.cell===cell.join(',')));
    $('end-day').disabled=night;$('reopen').disabled=!night;$('night-card').hidden=!night;
    if(night){const arrived=obs.guests.filter(g=>g.arrived);$('night-title').textContent=arrived.length?`${arrived.map(g=>g.name).join('与')}，在这里歇下`:'这一次，先把地方留给自己';
      $('night-text').textContent=obs.scene+' 这一晚已收尾，可以带走。自由修整只重摆已有材料，不刷新资源、来客或剧情。';}
    $('world-caption').textContent=night?(obs.guests.find(g=>g.id==='ferry')?.arrived?'有人沿着你留下的路，来到灯下。':obs.guests.find(g=>g.id==='gardener')?.arrived?'有人沿着你留下的路，坐到花边。':'今晚，海陪你坐一会儿。'):'海是慢的，你也不用急。';
    if(viewing)for(const el of document.querySelectorAll('#confirm-build,#end-day,#reopen,#name-it,#note-it,#signature,#intent,#invitation,#rename,#cell-actions button'))el.disabled=true;
    else for(const id of ['name-it','note-it','signature','intent','invitation','rename'])$(id).disabled=false;
    draw(performance.now());
  }
  $('confirm-build').onclick=()=>{if(kind)act({type:'build',kind,at:cell});};
  $('cancel-build').onclick=()=>{kind=null;render();};
  $('grid-toggle').onclick=()=>$('world').classList.toggle('show-grid');
  $('name-it').onclick=()=>act({type:'rename',name:$('rename').value});
  $('rename').onkeydown=e=>{if(e.key==='Enter')$('name-it').click();};
  $('end-day').onclick=()=>{kind=null;act({type:'end_day'});};$('reopen').onclick=()=>act({type:'reopen'});
  $('start').onclick=()=>{started=true;$('welcome').hidden=true;if(!state.history.length&&$('intro-intent').value.trim())act({type:'note',signature:'',intent:$('intro-intent').value,invitation:''});render();};
  for(const k of ['signature','intent','invitation'])$(k).oninput=()=>{noteDirty=true;};
  $('note-it').onclick=()=>{noteDirty=false;act({type:'note',signature:$('signature').value,intent:$('intent').value,invitation:$('invitation').value});};
  $('adopt').onclick=()=>{try{
    if(!viewing||!received)throw Error('这不是可接手的成果。');
    const stored=localStorage.getItem(storageKey);let next;
    if(stored){next=Tide.fromSave(JSON.parse(stored));if(!next.lineage.some(l=>l.id===received.id))throw Error('已有另一份本地数据，为免覆盖，未接手。');}
    else{const r=Tide.apply(state,{type:'inherit'});if(!r.ok)throw Error(r.error);next=r.state;}
    state=next;viewing=false;noteDirty=false;persist();const u=new URL(location.href);u.hash=new URLSearchParams({harbor:receivedCode,mode:'own'}).toString();history.replaceState(null,'',u);render();$('message').textContent='现在修改的是你的副本。请重新落款；原作与上一位便笺仍在来历中。';
  }catch(e){$('message').textContent='未覆盖任何作品：'+e.message;}};
  $('back-own').onclick=()=>{const u=new URL(location.href);u.hash='';location.href=u.href;};
  $('make-share').onclick=()=>{try{$('share-code').value=Exchange.encode(state);$('share-comment').value=Exchange.comment(state);$('share-link').value=Exchange.link(state,location.href)||'';$('share-status').textContent=$('share-link').value?'分享前请检查署名与便笺，确认对方可访问这个网页；素材不会自动发出。':'当前是离线文件，不分享本机路径。请复制成果码；有公开网页后再生成链接。';}catch(e){$('share-status').textContent='尚未生成：'+e.message;}};
  async function copy(id){const text=$(id).value;if(!text){$('message').textContent='请先生成成果素材。';return;}try{await navigator.clipboard.writeText(text);$('message').textContent='已复制；由你决定是否发布，不会自动发评论。';}catch{$(id).focus();$(id).select();$('message').textContent='浏览器未允许自动复制，已选中文本，请手动复制。';}}
  $('copy-code').onclick=()=>copy('share-code');$('copy-comment').onclick=()=>copy('share-comment');
  $('visit-code-open').onclick=()=>{try{const code=Exchange.extract($('visit-code').value);Exchange.decode(code);const u=new URL(location.href);u.hash=new URLSearchParams({harbor:code}).toString();location.href=u.href;}catch(e){$('message').textContent='未离开当前小港：'+e.message;}};
  addEventListener('hashchange',()=>location.reload());
  $('new-game').onclick=()=>{if(receivedCode!==null){$('back-own').click();return;}if(!confirm('开始一座新小港？请先保存当前小港；此页的本地存档会被替换。'))return;state=Tide.create();noteDirty=false;kind=null;persist();render();};
  function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  const filename=()=>state.name.replace(/[^\p{L}\p{N}_-]/gu,'_').slice(0,30)||'潮汐小港';
  $('save-json').onclick=()=>download(JSON.stringify(Tide.save(state),null,2),filename()+'.json','application/json');
  function exportHTML(){const copy=document.documentElement.cloneNode(true);copy.querySelector('#harbor-seed').textContent=JSON.stringify(Tide.save(state)).replaceAll('<','\\u003c');copy.querySelector('#welcome').hidden=true;download('<!doctype html>\n'+copy.outerHTML,filename()+'.html','text/html');$('message').textContent='已带走整座可打开的小港页面，不需要服务器。';}
  $('export-html').onclick=exportHTML;$('take-away').onclick=exportHTML;
  $('import').onclick=()=>{$('file-input').value='';$('file-input').click();};
  $('file-input').onchange=async e=>{try{if(viewing)throw Error('请先回到自己的港，再导入存档。');const f=e.target.files[0];if(!f)return;if(f.size>500000)throw Error('存档超过500KB。');const next=Tide.fromSave(JSON.parse(await f.text()));if(!confirm('导入将替换此页当前的小港。已经保存好原小港了吗？'))return;state=next;noteDirty=false;kind=null;started=true;$('welcome').hidden=true;persist();render();}catch(e){$('message').textContent='没有改动小港：'+e.message;}};
  function geom(){const w=$('world').clientWidth,h=$('world').clientHeight;const tw=Math.min(90,w/8.6),th=tw*.47;return {w,h,tw,th,ox:w/2,oy:Math.max(25,(h-th*7)/2-8)};}
  function pos(x,y,z=0){const l=layout;return [l.ox+(x-y)*l.tw/2,l.oy+(x+y)*l.th/2-z];}
  function poly(points,color,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
  function diamond(x,y,z,color){const p=pos(x,y,z),w=layout.tw/2,h=layout.th/2;poly([[p[0],p[1]-h],[p[0]+w,p[1]],[p[0],p[1]+h],[p[0]-w,p[1]]],color);}
  function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  function line(points,color,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();}
  function block(x,y,width,height,color,side){const p=pos(x,y,10),w=width,h=width*.48;poly([[p[0]-w,p[1]-height],[p[0],p[1]-height+h],[p[0],p[1]+h],[p[0]-w,p[1]]],side);poly([[p[0],p[1]-height+h],[p[0]+w,p[1]-height],[p[0]+w,p[1]],[p[0],p[1]+h]],color);poly([[p[0]-w,p[1]-height],[p[0],p[1]-height-h],[p[0]+w,p[1]-height],[p[0],p[1]-height+h]],color);}
  function building(b,t,ghost=false){
    const p=pos(b.x,b.y,12),k=layout.tw/75,P=Tide.PALETTES[b.style]||Tide.PALETTES.cream,night=state.phase==='night';ctx.save();if(ghost)ctx.globalAlpha=.45;
    ellipse(p[0],p[1]+4,19*k,8*k,'#233e3b25');
    if(b.type==='bridge'){diamond(b.x,b.y,12,b.style==='cream'?'#ac9064':P.wall);for(let i=-3;i<=3;i++)line([[p[0]+i*5*k-14*k,p[1]-7*k],[p[0]+i*5*k+14*k,p[1]+7*k]],'#dcc99a',2*k);line([[p[0]-29*k,p[1]-13*k],[p[0]+24*k,p[1]+13*k]],'#715e43',3*k);}
    if(b.type==='house'){block(b.x,b.y,22*k,32*k,P.wall,'#cfb889');poly([[p[0]-29*k,p[1]-34*k],[p[0]-2*k,p[1]-62*k],[p[0]+27*k,p[1]-35*k],[p[0],p[1]-20*k]],P.roof);poly([[p[0]-29*k,p[1]-34*k],[p[0]-2*k,p[1]-62*k],[p[0]-22*k,p[1]-49*k],[p[0]-39*k,p[1]-28*k]],'#ac6860');ctx.fillStyle=night?'#ffdf91':'#6b9b9b';ctx.fillRect(p[0]+4*k,p[1]-22*k,8*k,11*k);line([[p[0]-12*k,p[1]-18*k],[p[0]-12*k,p[1]+1*k]],'#a27f65',8*k);}
    if(b.type==='lamp'){const pole=['cream','star'].includes(b.style)?'#847153':P.roof;line([[p[0],p[1]],[p[0],p[1]-49*k]],pole,4*k);line([[p[0],p[1]-49*k],[p[0]+12*k,p[1]-49*k]],pole,3*k);if(night){const gr=ctx.createRadialGradient(p[0]+11*k,p[1]-40*k,1,p[0]+11*k,p[1]-40*k,48*k);gr.addColorStop(0,'#ffda8ba0');gr.addColorStop(1,'#ffda8b00');ctx.fillStyle=gr;ctx.fillRect(p[0]-45*k,p[1]-98*k,110*k,110*k);}ctx.fillStyle=night?'#ffe7ac':'#dcc590';ctx.fillRect(p[0]+6*k,p[1]-48*k,12*k,16*k);line([[p[0]+4*k,p[1]-49*k],[p[0]+20*k,p[1]-49*k]],'#74745e',3*k);if(b.style==='star'){ctx.fillStyle='#fff2b6';ctx.font=`${18*k}px serif`;ctx.fillText('✦',p[0]+4*k,p[1]-60*k);}}
    if(b.type==='bench'){block(b.x,b.y,21*k,7*k,P.wall,'#9f986e');line([[p[0]-22*k,p[1]-13*k],[p[0]+15*k,p[1]+3*k]],'#a88d5b',5*k);line([[p[0]-23*k,p[1]-15*k],[p[0]-23*k,p[1]-27*k],[p[0]+14*k,p[1]-11*k],[p[0]+14*k,p[1]+1*k]],'#a88d5b',3*k);}
    if(b.type==='garden'){const flowers={cream:['#f1d697','#d8e0ad'],blue:['#9fc9e2','#d7e7ed'],moss:['#a6c18b','#e0e6a6'],rose:['#e2a3aa','#f5cdd0']}[b.style];diamond(b.x,b.y,14,'#7b8e69');for(let i=0;i<9;i++){const dx=((i*17)%31-15)*k,dy=((i*11)%17-8)*k;line([[p[0]+dx,p[1]+dy],[p[0]+dx,p[1]+dy-10*k]],'#5b895d',2*k);ellipse(p[0]+dx,p[1]+dy-11*k,3.5*k,3*k,flowers[i%2]);}}
    if(b.type==='chime'){line([[p[0]-13*k,p[1]+2*k],[p[0]-13*k,p[1]-45*k],[p[0]+13*k,p[1]-45*k]],b.style==='cream'?'#988264':P.roof,3*k);for(let i=0;i<3;i++){const dx=Math.sin(t/900+i)*2*k;line([[p[0]+i*7*k,p[1]-43*k],[p[0]+i*7*k+dx,p[1]-(20+i*4)*k]],b.style==='cream'?'#a6b9a0':P.wall,2*k);}ellipse(p[0]+7*k,p[1]-45*k,13*k,3*k,'#8eaa93');}
    ctx.restore();
  }
  function critter(g,t){
    const path=g.route;if(!path.length)return;const nearbyChime=state.buildings.some(b=>b.type==='chime'&&Math.abs(b.x-g.target[0])+Math.abs(b.y-g.target[1])<=2);
    const signature=JSON.stringify(path);if(arrivals.get(g.id)?.signature!==signature)arrivals.set(g.id,{signature,since:t});
    // A queued RAF timestamp can precede a synchronous render(performance.now()).
    const cycle=nearbyChime?23000:15000,progress=(Math.max(0,t-arrivals.get(g.id).since)%cycle)/cycle;
    const travel=reducedMotion?1:progress<.3?progress/.3:progress<.65?1:progress<.95?1-(progress-.65)/.3:0;
    const f=travel*(path.length-1),i=Math.floor(f),a=path[i],b=path[Math.min(path.length-1,i+1)],u=f-i;
    const p=pos(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,15+Math.sin(t/260)*1.5),k=layout.tw/75;
    ellipse(p[0],p[1]+7*k,10*k,4*k,'#203b382d');line([[p[0]-4*k,p[1]+4*k],[p[0]-5*k,p[1]+9*k]],'#78695a',2*k);line([[p[0]+4*k,p[1]+4*k],[p[0]+5*k,p[1]+9*k]],'#78695a',2*k);
    ellipse(p[0],p[1]-3*k,9*k,12*k,g.id==='ferry'?'#ddbb81':'#b3caa2');ellipse(p[0],p[1]-14*k,9*k,8*k,'#f5e8c9');
    poly([[p[0]-12*k,p[1]-17*k],[p[0],p[1]-29*k],[p[0]+12*k,p[1]-17*k]],g.id==='ferry'?'#728b8d':'#859d73');
    ellipse(p[0]-3*k,p[1]-14*k,1.1*k,1.3*k,'#3b5552');ellipse(p[0]+3*k,p[1]-14*k,1.1*k,1.3*k,'#3b5552');
    ctx.font=`${Math.max(10,11*k)}px sans-serif`;ctx.fillStyle=state.phase==='night'?'#eff3da':'#3c6261';ctx.textAlign='center';ctx.fillText(g.name,p[0],p[1]-35*k);
  }
  function draw(t){
    layout=geom();const{w,h,tw,th}=layout,dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const night=state.phase==='night';
    for(let y=0;y<7;y++)for(let x=0;x<7;x++)if(!Tide.land(x,y)){const p=pos(x,y);diamond(x,y,0,night?'#447582':'#94c6bf');if((x+y)%2===0)line([[p[0]-tw*.2+Math.sin(t/1400+x)*3,p[1]],[p[0]+tw*.15,p[1]]],night?'#83adb54a':'#daeee380',1);}
    for(let sum=0;sum<=12;sum++)for(let x=0;x<7;x++){const y=sum-x;if(y<0||y>6)continue;const p=pos(x,y);
      if(Tide.land(x,y)){const d=9;poly([[p[0]-tw/2,p[1]],[p[0],p[1]+th/2],[p[0]+tw/2,p[1]],[p[0]+tw/2,p[1]+d],[p[0],p[1]+th/2+d],[p[0]-tw/2,p[1]+d]],night?'#657969':'#a9ae85');diamond(x,y,7,night?(x%2?'#829778':'#8fa180'):(x%2?'#bdcda2':'#c9d4ac'));
        if(!state.buildings.some(b=>b.x===x&&b.y===y)){const px=p[0]+Math.sin(x*12+y*8)*tw*.24,py=p[1]+Math.cos(x*4-y*9)*th*.2;ellipse(px,py-8,tw*.05,tw*.025,night?'#98ab7d':'#9eaf7a');}}
      if(x===0&&y===3){diamond(x,y,13,'#b89868');line([[p[0]-tw*.3,p[1]-5],[p[0]+tw*.3,p[1]+th*.25]],'#e8d5a5',3);}
      const cache=state.caches.find(c=>!c.taken&&c.at[0]===x&&c.at[1]===y);if(cache){if(cache.id==='glass'){for(let j=0;j<5;j++)ellipse(p[0]+(j-2)*5,p[1]-12+(j%2)*4,3,2,'#86bcb2');}else block(x,y,tw*.17,tw*.16,'#c7ae7e','#a98d62');}
      const b=state.buildings.find(b=>b.x===x&&b.y===y);if(b)building(b,t);
    }
    if(kind&&Tide.explain(state,{type:'build',kind,at:cell}).ok)building({type:kind,x:cell[0],y:cell[1],style:'cream'},t,true);
    const visiting=Tide.guests(state).filter(g=>g.arrived);for(const id of arrivals.keys())if(!visiting.some(g=>g.id===id))arrivals.delete(id);
    for(const g of visiting)critter(g,t);
    const boat=pos(6.5,2.3),bob=Math.sin(t/1100)*2;poly([[boat[0]-17,boat[1]+bob],[boat[0]+19,boat[1]+bob],[boat[0]+10,boat[1]+10+bob],[boat[0]-11,boat[1]+10+bob]],night?'#a9b3a2':'#c2aa7a');line([[boat[0],boat[1]+bob],[boat[0],boat[1]-29+bob]],'#8c856b',2);poly([[boat[0]+1,boat[1]-27+bob],[boat[0]+1,boat[1]-7+bob],[boat[0]+16,boat[1]-9+bob]],night?'#d3d8b9':'#f6ecd0');
    if(gridStamp!==w+'x'+h){document.querySelectorAll('[data-cell]').forEach(b=>{const[x,y]=b.dataset.cell.split(',').map(Number),p=pos(x,y,7);Object.assign(b.style,{left:(p[0]-tw/2)+'px',top:(p[1]-th/2)+'px',width:tw+'px',height:th+'px'});});gridStamp=w+'x'+h;}
    frame++;window.__tideReady=true;
  }
  window.harbor={observe:()=>({...Tide.observe(state),access:viewing?'visit':'own'}),preview:a=>Tide.explain(state,a),act:a=>act(a),exportSave:()=>Tide.save(state),share:()=>({code:Exchange.encode(state),card:Exchange.card(state),comment:Exchange.comment(state)})};
  render();if(embedded||receivedCode!==null){started=true;$('welcome').hidden=true;}if(entryError)$('message').textContent=entryError;
  function animate(t){draw(t);requestAnimationFrame(animate);}requestAnimationFrame(animate);
})();
