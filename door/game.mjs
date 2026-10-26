import {RULES as R,createGame,weight,move,pick,place,step,observe} from './core.mjs';
const c=document.querySelector('#game'),g=c.getContext('2d');let s=createGame(),last=null,drag=null,px=0,py=0;
const font='"WenQuanYi Zen Hei", "Noto Sans CJK SC", sans-serif';
function round(x,y,w,h,r,fill,stroke){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=3;g.stroke();}}
function text(t,x,y,size=24,color='#24465d',align='left'){g.fillStyle=color;g.font=`700 ${size}px ${font}`;g.textAlign=align;g.fillText(t,x,y);}
function ellipse(x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();}
function boxPosition(b){let i=s.boxes.filter(x=>x.onPlate&&x.id!==s.held).findIndex(x=>x.id===b.id);return {x:b.x,y:b.onPlate?576-i*72:580};}
function draw(){
  const bg=g.createLinearGradient(0,0,0,810);bg.addColorStop(0,'#f8f5e9');bg.addColorStop(1,'#e4eeed');g.fillStyle=bg;g.fillRect(0,0,1440,810);
  // A small workshop diorama, with large causal objects rather than a report board.
  ellipse(1270,180,150,150,'#e1eee8');ellipse(150,260,220,210,'#eff1e6');
  text('大肥鱼与自动门',60,67,31);text('原创小关卡 · 作者实机操作',1380,64,20,'#66818c','right');
  round(60,94,525,57,17,'#fffdf7');text('踩住才开，松开就关。',83,132,27);
  text('目标：去右边的小屋',1344,132,25,'#546f79','right');
  round(60,633,1320,44,16,'#acc6c5');round(60,625,1320,18,8,'#d4e2d9');
  // Visible cable from the plate to the gate, lights express real rule state.
  const w=weight(s),on=w>=R.threshold;g.lineWidth=8;g.strokeStyle=on?'#46a68e':'#9aafb3';g.beginPath();g.moveTo(340,681);g.lineTo(900,681);g.lineTo(900,630);g.stroke();
  round(253,610,174,22,7,on?'#f0b742':'#d48f68');
  for(let i=0;i<2;i++){round(280+i*67,649,50,15,5,w>i?'#48a68e':'#c6d2cd');}
  round(250,725,185,46,14,'#fffdf7');text(`重量 ${w} / 2`,342,757,27,on?'#248574':'#ad6947','center');
  // Gate housing and leaf have a continuous physical opening, never teleport the fish.
  round(842,180,116,452,18,'#345b69');round(857,205,86,420,6,'#bed0c9');
  g.save();g.beginPath();g.rect(855,202,90,422);g.clip();
  round(860,210-s.door*415,80,420,5,'#efb85b','#946b39');
  g.strokeStyle='#ca9646';g.lineWidth=4;for(let y=240;y<620;y+=50){g.beginPath();g.moveTo(866,y-s.door*415);g.lineTo(934,y-s.door*415);g.stroke();}g.restore();
  ellipse(900,164,16,16,on?'#44b698':'#df7859');text(s.door>.92?'门开着':'门关了',900,724,27,on?'#248574':'#ad6947','center');
  // Destination is visible from the outset.
  round(1158,357,190,268,18,'#f1e0bd');g.fillStyle='#a7c7c3';g.beginPath();g.moveTo(1124,365);g.lineTo(1253,264);g.lineTo(1380,365);g.closePath();g.fill();round(1222,456,68,169,18,'#3f6370');round(1183,397,42,44,9,'#fffaf0');text('回家',1254,428,27,'#52696d','center');
  for(const b of s.boxes){if(b.id===s.held)continue;const p=boxPosition(b);drawBox(p.x,p.y,b.id);}
  if(s.held)drawBox(px,py,s.held,true);
  // Original drawn mascot; facial changes depend on actual collision / success.
  const x=s.x,y=565;ellipse(x,626,80,11,'#738f8a33');
  g.save();g.translate(x,y);const facing=s.direction<0?-1:1;g.scale(facing,1);
  g.fillStyle='#429ed3';g.beginPath();g.moveTo(-62,-15);g.quadraticCurveTo(-118,-62,-117,-15);g.quadraticCurveTo(-120,25,-66,18);g.closePath();g.fill();
  ellipse(0,0,83,61,'#4da8db');ellipse(17,27,61,30,'#fff4df');ellipse(-22,22,17,9,'#2b8fc5');ellipse(53,8,12,6,'#f1aa9d');
  if(s.blocked){g.strokeStyle='#24455e';g.lineWidth=4;g.beginPath();g.moveTo(36,-21);g.lineTo(45,-13);g.lineTo(35,-5);g.stroke();}
  else {ellipse(42,-13,8,12,'#24455e');ellipse(44,-17,2.5,4,'#ffffff');}
  g.strokeStyle='#24455e';g.lineWidth=3;g.beginPath();g.arc(65,16,6,0,Math.PI);g.stroke();g.restore();
  if(s.blocked){round(x-110,416,218,55,17,'#fffdf7');text('刚才不是开了吗？',x,452,23,'#955c46','center');}
  if(s.won){round(520,237,375,110,24,'#fffdf2','#a8cbb8');text('这次真的过去了！',708,282,31,'#237b70','center');text('箱子留下，鱼可以走。',708,321,23,'#54756f','center');}
  text('拖箱子 → 放到踩板',137,715,21,'#6b7d81','center');
  text('鱼＝2　　每箱＝1',640,757,24,'#5e777f','center');
}
function drawBox(x,y,id,held=false){ellipse(x,y+36,40,8,'#6d827c22');round(x-34,y-34,68,68,9,held?'#f5d897':'#e7bd76','#a37b49');g.strokeStyle='#c59756';g.lineWidth=3;g.beginPath();g.moveTo(x-24,y-24);g.lineTo(x+24,y+24);g.moveTo(x+24,y-24);g.lineTo(x-24,y+24);g.stroke();round(x-15,y-16,30,31,7,'#fff1d2');text('1',x,y+7,25,'#94683e','center');}
function position(e){const b=c.getBoundingClientRect();return {x:(e.clientX-b.left)*1440/b.width,y:(e.clientY-b.top)*810/b.height};}
c.addEventListener('pointerdown',e=>{const p=position(e);for(const b of [...s.boxes].reverse()){const q=boxPosition(b);if(Math.abs(p.x-q.x)<40&&Math.abs(p.y-q.y)<40&&pick(s,b.id)){drag=b.id;px=p.x;py=p.y;c.setPointerCapture(e.pointerId);draw();break;}}});
c.addEventListener('pointermove',e=>{if(drag){const p=position(e);px=p.x;py=p.y;draw();}});
function drop(e){if(!drag)return;const p=position(e);place(s,drag,p.x);drag=null;draw();}
c.addEventListener('pointerup',drop);c.addEventListener('pointercancel',e=>{if(drag){place(s,drag,s.boxes.find(b=>b.id===drag).x);drag=null;}});
for(const [id,d] of [['left',-1],['right',1]]){const b=document.getElementById(id);b.addEventListener('pointerdown',e=>{move(s,d);b.setPointerCapture(e.pointerId);e.preventDefault();});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>move(s,0));}
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(s,e.key==='ArrowLeft'?-1:1);}});addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key))move(s,0);});addEventListener('blur',()=>move(s,0));
document.querySelector('#reset').onclick=()=>{s=createGame();last=null;drag=null;draw();};
window.pressureDoor=Object.freeze({observe:()=>observe(s),rules:R});
function loop(t){if(last!==null)step(s,(t-last)/1000);last=t;draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);draw();
