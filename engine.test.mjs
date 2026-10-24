import test from 'node:test';
import assert from 'node:assert/strict';
import Tide from './core.mjs';
function run(s,a){const r=Tide.apply(s,a);assert.equal(r.ok,true,r.error);return r.state;}
test('预览与非法位置不扣材料、不记动作',()=>{
  const s=Tide.create(),before=JSON.stringify(s);
  assert.equal(Tide.explain(s,{type:'build',kind:'lamp',at:[6,2]}).ok,false);
  assert.equal(Tide.apply(s,{type:'build',kind:'bridge',at:[3,3]}).ok,false);
  assert.equal(JSON.stringify(s),before);
  assert.equal(Tide.apply(s,{type:'build',kind:'toString',at:[1,4]}).ok,false);
});
test('跨岛资源需合法桥，重复收集不重复领奖',()=>{
  let s=Tide.create();assert.equal(Tide.apply(s,{type:'gather',target:'crate'}).ok,false);
  s=run(s,{type:'build',kind:'bridge',at:[3,4]});
  s=run(s,{type:'gather',target:'crate'});assert.equal(s.stock.wood,4);assert.equal(s.stock.glass,3);
  assert.equal(Tide.apply(s,{type:'gather',target:'crate'}).ok,false);
});
test('到访取决于位置/相邻/连通，而非只造过',()=>{
  let s=Tide.create();s=run(s,{type:'gather',target:'drift'});
  s=run(s,{type:'build',kind:'lamp',at:[2,1]});assert.equal(Tide.guests(s)[0].ready,false);
  s=run(s,{type:'build',kind:'garden',at:[1,4]});
  s=run(s,{type:'build',kind:'bench',at:[1,3]});assert.equal(Tide.guests(s)[1].ready,true);
  s=run(s,{type:'end_day'});assert.deepEqual(s.gifts,['gardener']);
  s=run(s,{type:'paint',at:[1,3],style:'rose'});assert.equal(s.buildings.find(b=>b.type==='bench').style,'rose');
  s=run(s,{type:'reopen'});s=run(s,{type:'recycle',at:[1,4]});assert.equal(Tide.guests(s)[1].ready,false);
});
test('错误原子性、全额回收与同requestId重试',()=>{
  let s=Tide.create();const a={type:'build',kind:'house',at:[1,4],requestId:'build-one'};
  s=run(s,a);const before=JSON.stringify(s);
  const repeat=Tide.apply(s,a);assert.equal(repeat.replayed,true);assert.equal(JSON.stringify(repeat.state),before);
  assert.equal(Tide.apply(s,{requestId:'build-one',at:[1,4],kind:'house',type:'build'}).replayed,true);
  assert.equal(Tide.apply(s,{...a,kind:'lamp'}).ok,false);
  assert.equal(Tide.apply(s,{type:'build',kind:'house',at:[2,4]}).ok,false);
  assert.equal(JSON.stringify(s),before);
  s=run(s,{type:'recycle',at:[1,4]});assert.deepEqual(s.stock,{wood:4,glass:2,seed:2});assert.equal(s.turn,1);
});
test('房屋阻路会在预览说明，回收恢复原有可达性',()=>{
  let s=run(Tide.create(),{type:'gather',target:'drift'});
  s=run(s,{type:'build',kind:'bridge',at:[3,2]});s=run(s,{type:'gather',target:'crate'});
  s=run(s,{type:'build',kind:'lamp',at:[6,3]});assert.equal(Tide.guests(s)[0].ready,true);
  const p=Tide.explain(s,{type:'build',kind:'house',at:[4,2]});assert.match(p.effect,/豆灯将失去/);
  s=run(s,{type:'build',kind:'house',at:[4,2]});assert.equal(Tide.guests(s)[0].ready,false);
  s=run(s,{type:'recycle',at:[4,2]});assert.equal(Tide.guests(s)[0].ready,true);
});
test('12次动工预览夜景，观察不动；自由修整保留作品/回礼/材料',()=>{
  let s=Tide.create();for(let i=0;i<11;i++){s=run(s,{type:'build',kind:'bench',at:[1,4]});s=run(s,{type:'recycle',at:[1,4]});}
  const before=JSON.stringify(s);Tide.observe(s);assert.equal(JSON.stringify(s),before);assert.equal(s.phase,'day');
  s=run(s,{type:'build',kind:'bench',at:[1,4]});assert.equal(s.phase,'night');assert.equal(s.turn,12);
  const stock={...s.stock};s=run(s,{type:'reopen'});assert.equal(s.day,2);assert.equal(s.turn,0);assert.deepEqual(s.stock,stock);assert.equal(s.buildings.length,1);
  assert.equal(Tide.observe(s).mode,'rearrange');assert.match(Tide.observe(s).roundLabel,/自由修整/);
});
test('存档由合法动作重放，改快照不能跳过规则',()=>{
  let s=run(Tide.create(),{type:'rename',name:'<小港>'});s=run(s,{type:'build',kind:'bench',at:[1,4]});
  assert.deepEqual(Tide.fromSave(Tide.save(s)),s);
  assert.throws(()=>Tide.fromSave({format:'tide-harbor',version:1,actions:[{type:'build',kind:'lamp',at:[6,2]}]}),/无效/);
  assert.throws(()=>Tide.fromSave({format:'other',version:1,actions:[]}),/不是/);
});
test('小屋/风铃/回礼便笺叠加，文字小景描述实际颜色',()=>{
  let s=run(Tide.create(),{type:'gather',target:'drift'});
  for(const[kind,at]of [['bench',[1,3]],['garden',[1,4]],['chime',[0,4]],['house',[2,4]]])s=run(s,{type:'build',kind,at});
  s=run(s,{type:'end_day'});s=run(s,{type:'paint',at:[1,3],style:'rose'});s=run(s,{type:'paint',at:[1,4],style:'moss'});
  const ob=Tide.observe(s),g=ob.guests.find(g=>g.id==='gardener');
  assert.equal(g.notes.length,4);assert.match(g.notes.join(''),/小屋/);assert.match(g.notes.join(''),/风铃/);assert.match(g.notes.join(''),/杏粉/);assert.match(g.notes.join(''),/苔绿/);
  assert.equal(g.stay,'longer');assert.match(ob.scene,/苔绿花圃/);assert.match(ob.scene,/杏粉长凳/);assert.match(ob.scene,/风铃/);assert.match(ob.completion,/不刷新/);
  assert.equal(Tide.apply(s,{type:'recycle',at:[0,4]}).ok,false);assert.match(ob.rules.clock,/回收先回自由修整/);
  const oldSave=Tide.save(s);delete oldSave.edition;assert.deepEqual(Tide.fromSave(oldSave),s);
});
