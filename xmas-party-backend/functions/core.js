
'use strict';
const ROLES=8,FORTUNES=8,MAX=60;
function fail(code,message){throw Object.assign(new Error(message),{partyCode:code});}
function str(v,max,required=false){if(typeof v!=='string')fail('invalid-argument','欄位格式錯誤');v=v.trim();if(v.length>max||(required&&!v))fail('invalid-argument','欄位長度錯誤');return v;}
function settings(d){d=d||{};const title=str(d.title??'聖誕魔法派對',60,true),date=str(d.date??'',32),budget=str(d.budget??'',6),rules=str(d.rules??'',300);if(date&&(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(date)||!Number.isFinite(Date.parse(date))))fail('invalid-argument','日期格式錯誤');if(budget&&!/^\d{1,6}$/.test(budget))fail('invalid-argument','預算格式錯誤');return{title,date,budget,rules};}
function wish(d){return{gift:str(d.gift??'',100),color:str(d.color??'',60),avoid:str(d.avoid??'',100)};}
function makeDerangement(ids,rand){if(ids.length<2)fail('failed-precondition','至少需要 2 位參加者');for(let t=0;t<200;t++){const a=ids.slice();for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}if(a.every((x,i)=>x!==ids[i]))return a;}const a=ids.slice();for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return ids.map(x=>a[(a.indexOf(x)+1)%a.length]);}
function member(pub,uid){return pub.members.find(x=>x.uid===uid);}
function requireHost(pub,uid){if(pub.host!==uid)fail('permission-denied','只有主持人可以操作');}
function own(pub,uid){const m=member(pub,uid);if(!m)fail('permission-denied','請先加入房間');return m;}
function newRoom(uid,data,deps){const token=deps.token();return{pub:{host:uid,memberUids:{},members:[],settings:settings(data),phase:'lobby',round:1,startsAt:0,game:null,createdAt:deps.now()},priv:{hostHash:deps.hash(token),people:{},assignments:{},fortunes:{}},result:{recovery:token}};}
function run(pub,priv,uid,action,d,deps){
 if(!pub||!priv)fail('not-found','找不到這個房間');
 pub=JSON.parse(JSON.stringify(pub));priv=JSON.parse(JSON.stringify(priv));
 let result={},changed=true;
 if(action==='recoverHost'){
  const t=str(d.recovery,100,true);if(deps.hash(t)!==priv.hostHash)fail('permission-denied','主持人復原碼錯誤');
  if(pub.host!==uid){const previous=member(pub,pub.host);if(previous){if(member(pub,uid))fail('failed-precondition','此裝置已是其他參加者');delete pub.memberUids[pub.host];previous.uid=uid;pub.memberUids[uid]=true;}pub.host=uid;}result={host:true};
 }else if(action==='join'){
  const existing=member(pub,uid);if(existing){result={id:existing.id};changed=false;}
  else{if(pub.phase!=='lobby')fail('failed-precondition','活動已開始，請使用原裝置或復原碼');if(pub.members.length>=MAX)fail('resource-exhausted','房間已滿');const name=str(d.name,18,true).replace(/\s+/g,' ');if(pub.members.some(p=>p.name.toLowerCase()===name.toLowerCase()))fail('already-exists','姓名已使用');if(!Number.isInteger(d.role)||d.role<0||d.role>=ROLES)fail('invalid-argument','請選擇角色');const id=deps.id(),token=deps.token();pub.members.push({id,uid,name,role:d.role,revealed:false});pub.memberUids[uid]=true;priv.people[id]={wish:wish(d),hash:deps.hash(token)};result={id,recovery:token};}
 }else if(action==='recover'){
  const token=str(d.recovery,100,true),h=deps.hash(token);const p=pub.members.find(p=>priv.people[p.id]?.hash===h);if(!p)fail('permission-denied','參加者復原碼錯誤');const old=member(pub,uid);if(old&&old.id!==p.id)fail('failed-precondition','此裝置已加入其他身分');if(p.uid!==uid){delete pub.memberUids[p.uid];p.uid=uid;pub.memberUids[uid]=true;}result={id:p.id};
 }else if(action==='rotate'){
  const p=own(pub,uid),token=deps.token();priv.people[p.id].hash=deps.hash(token);result={recovery:token};
 }else if(action==='rotateHost'){
  requireHost(pub,uid);const token=deps.token();priv.hostHash=deps.hash(token);result={recovery:token};
 }else if(action==='settings'){requireHost(pub,uid);if(pub.phase!=='lobby')fail('failed-precondition','抽籤後不能修改規則');pub.settings=settings(d);}
 else if(action==='wish'){const p=own(pub,uid);if(pub.phase!=='lobby')fail('failed-precondition','抽籤後願望已鎖定');priv.people[p.id].wish=wish(d);}
 else if(action==='start'){
  requireHost(pub,uid);if(pub.phase!=='lobby')fail('failed-precondition','本輪已經抽籤');const ids=pub.members.map(p=>p.id),a=makeDerangement(ids,deps.rand);priv.assignments=Object.fromEntries(ids.map((id,i)=>[id,a[i]]));priv.fortunes=Object.fromEntries(ids.map(id=>[id,deps.rand(FORTUNES)]));pub.phase='drawn';pub.startsAt=deps.now()+4500;pub.game=null;
 }else if(action==='reveal'||action==='view'){
  const p=own(pub,uid);if(d.round!==pub.round||pub.phase!=='drawn'||deps.now()<pub.startsAt)fail('failed-precondition','請等待本輪倒數結束');if(action==='view'&&!p.revealed)fail('failed-precondition','請先拆開禮物');const other=pub.members.find(x=>x.id===priv.assignments[p.id]);if(!other)fail('internal','配對資料不完整');changed=!p.revealed;p.revealed=true;result={recipient:other.name,role:other.role,wish:priv.people[other.id].wish,fortune:priv.fortunes[p.id]};
 }else if(action==='wheel'||action==='task'){
  requireHost(pub,uid);if(action==='wheel'&&!pub.members.length)fail('failed-precondition','還沒有參加者');const picked=action==='wheel'?pub.members[deps.rand(pub.members.length)]:null;pub.game={type:action,id:deps.id(),at:deps.now(),name:picked?.name??'',index:action==='task'?deps.rand(12):pub.members.indexOf(picked)};
 }else if(action==='reset'){
  requireHost(pub,uid);if(d.round!==pub.round||d.confirm!=='RESET')fail('failed-precondition','請重新確認本輪');pub.phase='lobby';pub.round++;pub.startsAt=0;pub.game=null;pub.members.forEach(p=>p.revealed=false);priv.assignments={};priv.fortunes={};
 }else fail('invalid-argument','未知操作');
 return{pub,priv,result,changed};
}
module.exports={newRoom,run,makeDerangement};
