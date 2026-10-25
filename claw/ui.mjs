import {create, act as coreAct, step, observe as coreObserve, RULES} from './core.mjs';

const canvas=document.querySelector('#game'), ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const W=1280,H=920;
let state=create(), lastTime=null, previousPhase='', previousResult='', message='', messageUntil=0;
const plush=new Image();plush.src=new URL('./assets/plush.png',import.meta.url).href;
const plushVariants=new Map();
const plushFilters={pink:'hue-rotate(112deg) saturate(.65)',mini:'hue-rotate(326deg) saturate(.65)',gold:'hue-rotate(192deg) saturate(.65)'};
function preparePlush(){
  plushVariants.set('blue',plush);
  for(const[id,filter]of Object.entries(plushFilters)){
    const image=document.createElement('canvas');image.width=plush.naturalWidth;image.height=plush.naturalHeight;
    const painter=image.getContext('2d');painter.filter=filter;painter.drawImage(plush,0,0);plushVariants.set(id,image);
  }
  render();
}
const names={ready:'准备好了',down:'爪子下降中',close:'正在合爪',lift:'正在提起',carry:'送往出口',release:'出口松爪',return:'爪子返回中'};
const statuses={down:'下爪了，看看这次能不能抓稳。',close:'三只爪子合拢了。',lift:'正在往上提……',carry:'沿着轨道，送往出口。',release:'在出口松爪。',return:'爪子回来了，下一把可以重新瞄准。'};
const P=(x,y,z=0)=>({x:290+x*1.24-y*.4,y:480+y*.52-z*.92});
const floorPoint=(x,y)=>{const wy=(y-480)/.52;return{x:(x-290+wy*.4)/1.24,y:wy};};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

function path(points){ctx.beginPath();points.forEach((p,i)=>(i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)));ctx.closePath();}
function polygon(points,fill,stroke,width=1){path(points);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function round(x,y,w,h,r,fill,stroke,width=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}}
function ellipse(x,y,rx,ry,fill,stroke,width=1){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function line(a,b,stroke,width=1){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
function text(value,x,y,size=18,color='#789baa',align='left',weight='500'){ctx.font=`${weight} ${size}px "PingFang SC","Microsoft YaHei",sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(value,x,y);}

function cabinetBack(){
  ctx.save();
  const shadow=ctx.createRadialGradient(646,804,30,646,804,480);shadow.addColorStop(0,'#638ea326');shadow.addColorStop(1,'#638ea300');ellipse(646,804,510,57,shadow);
  // Cream top, full-depth glass cabinet, then the actual world floor.
  const a=P(0,0),b=P(620,0),c=P(620,340),d=P(0,340),at=P(0,0,450),bt=P(620,0,450),ct=P(620,340,450),dt=P(0,340,450);
  const back=ctx.createLinearGradient(0,120,0,550);back.addColorStop(0,'#e9f8fc');back.addColorStop(1,'#fbfcf3');
  polygon([at,bt,b,a],back,'#c4dce6',3);
  polygon([bt,ct,c,b],'#e9f4f7a6','#c9e1e8',3);
  const wallLine='#d0e5eb7a';for(let x=65;x<620;x+=90)line(P(x,0,0),P(x,0,365),wallLine,1);
  // Quiet decorative wall dots, no fabricated game content.
  for(let x=100;x<620;x+=80)for(let z=80;z<345;z+=70){const p=P(x,0,z);ellipse(p.x,p.y,2.5,2.5,'#b9dce862');}
  const floor=ctx.createLinearGradient(0,460,0,680);floor.addColorStop(0,'#fefcf0');floor.addColorStop(1,'#edf5f4');polygon([a,b,c,d],floor,'#bdd4da',3);
  for(let x=0;x<=620;x+=62)line(P(x,0),P(x,340),'#dbe7e266',1);
  for(let y=0;y<=340;y+=68)line(P(0,y),P(620,y),'#dbe7e266',1);
  polygon([at,bt,ct,dt],'#fffef4e6','#c7e0e8',3);
  line(P(0,70,370),P(620,70,370),'#c1d9e4',9);line(P(0,70,373),P(620,70,373),'#faffff',3);
  line(P(310,0,372),P(310,340,372),'#c6dce5',7);
  text('W H A L E   C A T C H E R',640,109,19,'#7da9bd','center','650');
  round(475,122,330,7,4,'#99d8e4');
  // Rear pillars establish depth without hiding the play field.
  line(at,a,'#a7cbda',15);line(at,a,'#f4fcff',6);line(bt,b,'#aacddd',15);line(bt,b,'#f7fdff',6);
  ctx.restore();
}

function exit(){
  const {x,y}=RULES.exit;const corners=[P(x-42,y-44,1),P(x+44,y-44,1),P(x+44,y+36,1),P(x-42,y+36,1)];
  polygon(corners,'#7795a2','#a7c2cd',5);const center=P(x,y);ellipse(center.x,center.y,41,15,'#3e6273');ellipse(center.x,center.y-2,33,10,'#284c61');
  const p=P(x,y+40);text('出口',p.x,p.y+24,15,'#6e99a9','center');
}

function target(){
  const c=state.claw,p=P(c.x,c.y,1),busy=state.phase!=='ready';
  ctx.save();ctx.strokeStyle=busy?'#a4b9bf':'#57abc5';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.beginPath();ctx.ellipse(p.x,p.y,35,15,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  line({x:p.x-47,y:p.y},{x:p.x+47,y:p.y},busy?'#9fb9c480':'#6bb5ce',2);line({x:p.x,y:p.y-25},{x:p.x,y:p.y+25},busy?'#9fb9c480':'#6bb5ce',2);ellipse(p.x,p.y,3,3,'#569dba');
  if(!busy){const top=P(c.x,c.y,300);ctx.setLineDash([3,9]);line({x:p.x,y:p.y-26},{x:top.x,y:top.y+50},'#7ab5c140',1.5);}
  ctx.restore();
}

function toyShadow(t){
  const p=P(t.x,t.y),h=clamp(t.z/280,0,1);ctx.save();ctx.globalAlpha=.17*(1-h*.65);ctx.filter=`blur(${2+h*7}px)`;ellipse(p.x,p.y+2,t.r*1.17*(1+h*.4),t.r*.32*(1+h*.4),'#537c8e');ctx.restore();
  if(state.claw.held===t.id){line({x:p.x-9,y:p.y},{x:p.x+9,y:p.y},'#8caab355',1);line({x:p.x,y:p.y-5},{x:p.x,y:p.y+5},'#8caab355',1);}
}

function drawPlush(t,x,y,size,rotation=0){
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
  if(plush.complete&&plush.naturalWidth){
    ctx.drawImage(plushVariants.get(t.id)||plush,-size*.53,-size*1.02,size*1.1,size*1.1);
  }else{ellipse(0,-size*.3,size*.43,size*.39,t.color,'#ffffff',3);ellipse(-size*.13,-size*.35,3,4,'#3a6280');ellipse(size*.13,-size*.35,3,4,'#3a6280');}
  ctx.restore();
}

function toy(t){const p=P(t.x,t.y,t.z);drawPlush(t,p.x,p.y,t.r*2.28,t.roll||0);}

function claw(back=false){
  const c=state.claw,p=P(c.x,c.y,c.z),top=P(c.x,c.y,369);ctx.save();ctx.lineCap='round';
  const held=state.toys.find(t=>t.id===c.held);
  const closingRadius=state.phase==='close'&&state.cycle?.contactHeight>50?(state.cycle.contactHeight-10)*.92/2.28:0;
  const closedSpread=held?held.r*.8:closingRadius?closingRadius*.8:15;
  const spread=closedSpread+c.open*27;
  function finger(direction,offset,shade){
    const sx=p.x+direction*13,sy=p.y+offset+10;
    const mx=p.x+direction*spread,my=p.y+42+offset;
    const ex=p.x+direction*(spread-5),ey=p.y+72+offset;
    ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(mx,my);ctx.lineTo(ex,ey);ctx.lineWidth=9;ctx.strokeStyle='#6c93a8';ctx.stroke();ctx.lineWidth=5;ctx.strokeStyle=shade;ctx.stroke();ellipse(mx,my,3.5,3.5,'#f7ffff');
  }
  if(back){
    line(top,p,'#7d9dab',7);line({x:top.x+1,y:top.y},{x:p.x+1,y:p.y},'#eefaff',2);
    round(top.x-26,top.y-14,52,21,8,'#f9ffff','#a8c6d7',3);ellipse(top.x,top.y+6,19,6,'#c3dce7');
    // The third finger lies behind the plush, rather than over its face.
    finger(0,-9,'#95b3c4');
  }else{
    // Two side fingers close to the actual toy radius; no fake toy movement.
    finger(-1,1,'#abc9d9');finger(1,5,'#e4f4fc');
    const chrome=ctx.createLinearGradient(p.x-25,0,p.x+25,0);chrome.addColorStop(0,'#87aec3');chrome.addColorStop(.42,'#f4fdff');chrome.addColorStop(.72,'#c1dce9');chrome.addColorStop(1,'#8eb6cd');
    round(p.x-25,p.y-6,50,27,10,chrome,'#83aac0',2);ellipse(p.x,p.y-4,24,7,'#e8f8ff','#b7d7e6',2);ellipse(p.x,p.y+9,5,5,'#6bd2d0');
  }
  ctx.restore();
}

function cabinetFront(){
  const d=P(0,340),c=P(620,340),dt=P(0,340,450),ct=P(620,340,450);
  // Base and a clearly separate collection hatch. The glass remains transparent.
  const base=ctx.createLinearGradient(0,650,0,805);base.addColorStop(0,'#fffcf1');base.addColorStop(1,'#e8f0eb');
  polygon([d,c,{x:c.x,y:801},{x:d.x,y:801}],base,'#b9d1d9',3);
  polygon([c,P(620,0),{x:P(620,0).x,y:624},{x:c.x,y:801}],'#c4dfE9','#abcbd8',3);
  round(d.x+34,687,245,84,17,'#d3e5e8','#c3d9dc',3);round(d.x+47,698,219,58,12,'#6f95a5');round(d.x+55,705,203,43,9,'#365d72');
  text('出 货 口',d.x+157,790,13,'#84a0a8','center');
  text('FREE TO PLAY',d.x+376,718,13,'#89aab4','left','650');text('不投币，只抱鱼',d.x+376,752,19,'#668f9f');
  ellipse(c.x-58,735,16,16,'#f4d4a1','#e6c48e',3);ellipse(c.x-58,732,8,8,'#fff1cf');
  line(dt,d,'#a9cddd',18);line({x:dt.x-2,y:dt.y},{x:d.x-2,y:d.y},'#f2fdff',7);line(ct,c,'#a9cddd',18);line({x:ct.x-2,y:ct.y},{x:c.x-2,y:c.y},'#f2fdff',7);
  line(dt,ct,'#aacddd',16);line({x:dt.x,y:dt.y-3},{x:ct.x,y:ct.y-3},'#f5fdff',5);
  line(d,c,'#aacbd7',12);line({x:d.x,y:d.y-3},{x:c.x,y:c.y-3},'#f8fffb',4);
  // Subtle narrow reflections, not a white panel over the toys.
  polygon([{x:dt.x+35,y:dt.y+30},{x:dt.x+53,y:dt.y+30},{x:dt.x+53,y:d.y-35},{x:dt.x+35,y:d.y-35}],'#ffffff23');
  line({x:ct.x-30,y:ct.y+30},{x:ct.x-30,y:c.y-35},'#ffffff30',4);
  round(d.x+32,802,70,22,8,'#a8c5ce');round(c.x-102,802,70,22,8,'#a8c5ce');
}

function render(){
  ctx.clearRect(0,0,W,H);
  cabinetBack();exit();target();
  const toys=state.toys.filter(t=>!t.caught).sort((a,b)=>a.y-b.y);
  for(const t of toys)toyShadow(t);
  claw(true);
  for(const t of toys)toy(t);
  claw(false);cabinetFront();
}

function refreshUI(force=false){
  const busy=state.phase!=='ready',all=state.caught.length===state.toys.length;
  $('aim-x').textContent=Math.round(state.claw.x);$('aim-y').textContent=Math.round(state.claw.y);
  $('attempt-count').textContent=state.attempts;$('caught-count').textContent=state.caught.length;
  $('drop').disabled=busy||all;$('reset').disabled=busy;$('machine-status').textContent=names[state.phase]||state.phase;
  $('drop-label').textContent=all?'这一盘，全带回家了':busy?'爪子正在运动':'下爪，试试看';
  const result=state.last?`${state.last.attempt}:${state.last.result}`:'';
  if(force||previousPhase!==state.phase||previousResult!==result){
    const msg=state.last?.message||(busy?statuses[state.phase]:'先点地板，给这一爪选个位置。');
    $('live-message').textContent=msg;$('live-message').dataset.result=state.last?.result||'';
    previousPhase=state.phase;previousResult=result;
  }
  if(message&&performance.now()<messageUntil)$('live-message').textContent=message;
  else if(message){message='';previousPhase='';}
  const signature=state.caught.join('|');
  if(force||$('collection').dataset.signature!==signature){
    $('collection').dataset.signature=signature;$('collection').replaceChildren(...state.toys.map(t=>{const slot=document.createElement('div');slot.className='collection-slot'+(t.caught?' is-caught':'');slot.setAttribute('aria-label',t.caught?`已抓到${t.name}`:`${t.name}还在机内`);slot.title=t.name;
      if(t.caught){const image=document.createElement('img');image.src=plush.src;image.alt=t.name;image.style.filter=plushFilters[t.id]||'none';slot.append(image);}else{slot.textContent='·';}return slot;}));
  }
}

function act(action){const result=coreAct(state,action);if(!result.ok){message=result.error;messageUntil=performance.now()+2200;}else{message='';}refreshUI(true);return result;}
function reset(){state=create();previousPhase='';previousResult='';message='';lastTime=null;refreshUI(true);render();return structuredClone(coreObserve(state));}
window.whaleClaw=Object.freeze({observe:()=>structuredClone(coreObserve(state)),act,reset});

canvas.addEventListener('pointerdown',event=>{
  event.preventDefault();canvas.focus({preventScroll:true});
  if(state.phase!=='ready'){message='爪子还在运动，等这一把结束再瞄准。';messageUntil=performance.now()+1800;return;}
  const bounds=canvas.getBoundingClientRect(),x=(event.clientX-bounds.left)*W/bounds.width,y=(event.clientY-bounds.top)*H/bounds.height;
  const point=floorPoint(x,y);if(point.x<0||point.x>620||point.y<0||point.y>340){message='点机器里的地板，准星会跟着你。';messageUntil=performance.now()+1800;return;}
  act({type:'aim',x:clamp(point.x,110,570),y:clamp(point.y,45,305)});
});
$('drop').addEventListener('click',()=>act({type:'drop'}));$('reset').addEventListener('click',reset);
document.addEventListener('keydown',event=>{
  if(event.altKey||event.metaKey||event.ctrlKey||event.target.closest('input,textarea,select,summary'))return;
  const moves={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};
  if(moves[event.code]){event.preventDefault();if(state.phase!=='ready')return;const[dx,dy]=moves[event.code];act({type:'aim',x:clamp(state.claw.x+dx,110,570),y:clamp(state.claw.y+dy,45,305)});}
  else if(event.code==='Space'&&!event.target.closest('button')){event.preventDefault();if(!event.repeat)act({type:'drop'});}
});

function resize(){const ratio=Math.min(devicePixelRatio||1,3);canvas.width=W*ratio;canvas.height=H*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);render();}
window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{lastTime=null;});
function frame(time){if(lastTime!==null)step(state,Math.min(Math.max(0,(time-lastTime)/1000),.05));lastTime=time;render();refreshUI();requestAnimationFrame(frame);}
plush.addEventListener('load',preparePlush);resize();refreshUI(true);requestAnimationFrame(frame);
