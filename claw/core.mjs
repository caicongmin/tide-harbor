// A free, deterministic claw toy. No money, chance table, account or model calls.
export const RULES=Object.freeze({width:620,depth:340,height:330,gravity:620,gripStrength:1.4,exit:{x:68,y:290},version:1});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function create(){return{version:1,time:0,phase:'ready',age:0,attempts:0,caught:[],history:[],last:null,claw:{x:310,y:170,z:330,open:1,held:null},toys:[{id:'blue',name:'大肥鱼抱枕',x:220,y:155,z:0,r:44,weight:.86,color:'#5cc8fc',vx:0,vz:0,roll:0},{id:'pink',name:'莓莓鱼',x:378,y:243,z:0,r:48,weight:1.1,color:'#f7a6cf',vx:0,vz:0,roll:0},{id:'mini',name:'小小鱼',x:486,y:113,z:0,r:32,weight:.58,color:'#8ee7d9',vx:0,vz:0,roll:0},{id:'gold',name:'金灿灿鱼',x:270,y:290,z:0,r:36,weight:.76,color:'#ffdb75',vx:0,vz:0,roll:0}],cycle:null};}
export function act(s,a){
  if(!a||typeof a!=='object')return{ok:false,error:'行动必须是对象'};
  if(s.phase!=='ready')return{ok:false,error:'爪子还在运动；等这一把结束再瞄准'};
  if(a.type==='aim'){
    if(!Number.isFinite(a.x)||!Number.isFinite(a.y)||a.x<110||a.x>570||a.y<45||a.y>305)return{ok:false,error:'瞄准范围：x 110—570，y 45—305'};
    s.claw.x=a.x;s.claw.y=a.y;s.history.push({type:'aim',x:a.x,y:a.y});return{ok:true};
  }
  if(a.type!=='drop')return{ok:false,error:'行动支持 aim(x,y) 或 drop'};
  if(s.toys.every(t=>t.caught))return{ok:false,error:'这一盘都抓到了，可重新摆一盘'};
  s.attempts++;s.phase='down';s.age=0;s.claw.open=1;s.last=null;
  const target=candidates(s)[0]?.t;
  s.cycle={x:s.claw.x,y:s.claw.y,picked:null,grip:0,holdAge:0,slipped:false,contactHeight:target?target.r*2.28/.92+10:50};s.history.push({type:'drop',x:s.claw.x,y:s.claw.y});return{ok:true};
}
function phase(s,name){s.phase=name;s.age=0;}
function candidates(s){const c=s.claw;return s.toys.filter(t=>!t.caught&&t.z<2).map(t=>({t,e:Math.hypot((c.x-t.x)/t.r,(c.y-t.y)/(t.r*.82))})).filter(x=>x.e<.98).sort((a,b)=>a.e-b.e);}
function contact(s){
  const c=s.claw,targets=candidates(s);if(!targets.length)return;
  const{t,e}=targets[0];c.held=t.id;s.cycle.picked=t.id;
  s.cycle.grip=RULES.gripStrength*(1-e*e)/t.weight;s.cycle.offsetX=t.x-c.x;s.cycle.offsetY=t.y-c.y;
}
function detach(s,t){
  s.claw.held=null;s.cycle.slipped=true;t.vx=(s.cycle.offsetX>=0?1:-1)*24;t.vz=0;
  t.roll=(s.cycle.offsetX>=0?1:-1)*.16;
}
export function step(s,seconds){
  if(!Number.isFinite(seconds)||seconds<0||seconds>10)throw Error('step范围0—10秒，不允许跳状态');
  let left=seconds;while(left>1e-9){const dt=Math.min(1/120,left);tick(s,dt);left-=dt;}return s;
}
function tick(s,dt){
  s.time+=dt;s.age+=dt;const c=s.claw,q=s.cycle;
  for(const t of s.toys){if(t.caught||c.held===t.id)continue;if(t.z>0||t.vz){t.vz-=RULES.gravity*dt;t.z=Math.max(0,t.z+t.vz*dt);if(!t.exiting)t.x=clamp(t.x+t.vx*dt,115,565);t.roll+=t.vx*dt*.012;if(t.z===0){t.vz=0;t.vx=0;if(t.exiting){t.caught=true;s.caught.push(t.id);}}}else t.roll*=Math.exp(-dt*4);}
  if(s.phase==='ready')return;
  const held=()=>s.toys.find(t=>t.id===c.held);
  if(s.phase==='down'){c.z=330-(330-q.contactHeight)*clamp(s.age/.85,0,1);if(s.age>=.85){c.z=q.contactHeight;phase(s,'close');}}
  else if(s.phase==='close'){c.open=1-clamp(s.age/.35,0,1);if(s.age>=.35){contact(s);phase(s,'lift');}}
  else if(s.phase==='lift'){
    c.z=q.contactHeight+(330-q.contactHeight)*clamp(s.age/1.25,0,1);const t=held();if(t){t.z=Math.max(0,c.z-q.contactHeight);t.x=c.x+q.offsetX;t.y=c.y+q.offsetY;q.holdAge+=dt;t.roll=(q.offsetX/t.r)*.4*Math.sin(s.age*8);if(q.grip<1&&q.holdAge>.18+q.grip*.9)detach(s,t);}
    if(s.age>=1.25){c.z=330;q.carryX=c.x;q.carryY=c.y;phase(s,'carry');}
  }else if(s.phase==='carry'){
    const raw=clamp(s.age/1.15,0,1),k=raw*raw*(3-2*raw);c.x=q.carryX+(RULES.exit.x-q.carryX)*k;c.y=q.carryY+(RULES.exit.y-q.carryY)*k;
    const t=held();if(t){t.x=c.x+q.offsetX*.2;t.y=c.y+q.offsetY*.2;t.z=330-q.contactHeight;t.roll=Math.sin(s.age*10)*.08;}
    if(s.age>=1.15)phase(s,'release');
  }else if(s.phase==='release'){
    c.open=clamp(s.age/.35,0,1);const t=held();if(t&&s.age>.12){c.held=null;t.exiting=true;t.vx=0;t.vz=0;t.x=RULES.exit.x;t.y=RULES.exit.y;}
    if(s.age>(q.picked&&!q.slipped?1.15:.55)){s.last={attempt:s.attempts,result:q.picked?(q.slipped?'slipped':'caught'):'miss',toyId:q.picked,grip:q.grip,message:q.picked?(q.slipped?'夹偏了，提升时滑了下来':'抓到了！下一只你来选'):'空爪：先对准娃娃的影子'};s.history.push({type:'result',...s.last});phase(s,'return');}
  }else if(s.phase==='return'){
    const k=clamp(s.age/.6,0,1);c.x=RULES.exit.x+(q.x-RULES.exit.x)*k;c.y=RULES.exit.y+(q.y-RULES.exit.y)*k;
    if(s.age>=.6){c.x=q.x;c.y=q.y;c.z=330;c.open=1;phase(s,'ready');}
  }
}
export function observe(s){return{game:'whale-claw',rules:RULES,phase:s.phase,attempts:s.attempts,caught:[...s.caught],claw:{...s.claw},toys:s.toys.filter(t=>!t.caught).map(t=>({id:t.id,name:t.name,x:t.x,y:t.y,radius:t.r,weight:t.weight})),last:s.last&&{...s.last},note:'同样夹力，无暗箱随机松爪；夹点离重心越远越易滑。先aim，再drop，等一把完成。免费玩具，没有现实货币或奖品。'};}
