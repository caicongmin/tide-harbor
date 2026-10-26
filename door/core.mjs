// Original small pressure-plate puzzle. Deterministic rules, no LLM player/backend.
export const RULES = Object.freeze({plateX:340, plateHalf:74, threshold:2, whaleWeight:2, boxWeight:1, doorX:900, speed:210, goalX:1240});
export function createGame(){
  return {x:340, direction:0, door:1, time:0, bumps:0, blocked:false, won:false,
    boxes:[{id:'A',x:145,onPlate:false},{id:'B',x:235,onPlate:false}],held:null,events:[]};
}
export function weight(s){return (Math.abs(s.x-RULES.plateX)<=RULES.plateHalf?RULES.whaleWeight:0)+s.boxes.filter(b=>b.onPlate&&s.held!==b.id).length*RULES.boxWeight;}
export function move(s,d){s.direction=Math.sign(d);}
export function pick(s,id){if(!s.boxes.some(b=>b.id===id)||s.held)return false;s.held=id;s.events.push({kind:'pick',id,t:s.time});return true;}
export function place(s,id,x){
  if(s.held!==id||!Number.isFinite(x))return false;
  const b=s.boxes.find(b=>b.id===id);b.x=Math.max(95,Math.min(790,x));b.onPlate=Math.abs(b.x-RULES.plateX)<RULES.plateHalf;
  if(b.onPlate)b.x=RULES.plateX;
  s.held=null;s.events.push({kind:'place',id,x:b.x,onPlate:b.onPlate,t:s.time});return true;
}
export function step(s,dt){
  dt=Math.max(0,Math.min(dt,.05));s.time+=dt;
  const wantsOpen=weight(s)>=RULES.threshold;
  // A safety sensor holds the door up while the fish is directly beneath it.
  const underDoor=Math.abs(s.x-RULES.doorX)<90;
  const target=wantsOpen||underDoor?1:0;
  s.door+=Math.max(-dt*2.4,Math.min(dt*2.4,target-s.door));
  const next=Math.max(110,Math.min(1330,s.x+s.direction*RULES.speed*dt));
  const collision=s.door<.92&&s.x<810&&next>=810;
  if(collision){s.x=809.9;if(!s.blocked){s.bumps++;s.events.push({kind:'door_blocked',t:s.time});}s.blocked=true;}
  else {s.x=next;s.blocked=s.direction>=0&&s.x>=809&&s.x<811&&s.door<.92;}
  if(s.x>RULES.goalX&&!s.won){s.won=true;s.events.push({kind:'arrived',t:s.time});}
}
export function observe(s){return {x:s.x,door:s.door,pressure:weight(s),required:RULES.threshold,won:s.won,bumps:s.bumps,blocked:s.blocked,boxes:s.boxes.map(b=>({...b})),held:s.held,events:s.events.map(e=>({...e}))};}
