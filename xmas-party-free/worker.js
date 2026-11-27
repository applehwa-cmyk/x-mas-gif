
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
  requireHost(pub,uid);if(pub.phase!=='lobby')fail('failed-precondition','本輪已經抽籤');const ids=pub.members.map(p=>p.id),a=makeDerangement(ids,deps.rand);priv.assignments=Object.fromEntries(ids.map((id,i)=>[id,a[i]]));priv.fortunes=Object.fromEntries(ids.map(id=>[id,deps.rand(FORTUNES)]));pub.phase='drawn';pub.startsAt=deps.now()+12000;pub.game=null;
 }else if(action==='reveal'||action==='view'){
  const p=own(pub,uid);if(d.round!==pub.round||pub.phase!=='drawn'||deps.now()<pub.startsAt)fail('failed-precondition','請等待本輪倒數結束');if(action==='view'&&!p.revealed)fail('failed-precondition','請先拆開禮物');const other=pub.members.find(x=>x.id===priv.assignments[p.id]);if(!other)fail('internal','配對資料不完整');changed=!p.revealed;p.revealed=true;result={recipient:other.name,role:other.role,wish:priv.people[other.id].wish,fortune:priv.fortunes[p.id]};
 }else if(action==='wheel'||action==='task'){
  requireHost(pub,uid);if(action==='wheel'&&!pub.members.length)fail('failed-precondition','還沒有參加者');const picked=action==='wheel'?pub.members[deps.rand(pub.members.length)]:null;pub.game={type:action,id:deps.id(),at:deps.now(),name:picked?.name??'',index:action==='task'?deps.rand(12):pub.members.indexOf(picked)};
 }else if(action==='reset'){
  requireHost(pub,uid);if(d.round!==pub.round||d.confirm!=='RESET')fail('failed-precondition','請重新確認本輪');pub.phase='lobby';pub.round++;pub.startsAt=0;pub.game=null;pub.members.forEach(p=>p.revealed=false);priv.assignments={};priv.fortunes={};
 }else fail('invalid-argument','未知操作');
 return{pub,priv,result,changed};
}


const PROJECT='xmas-party-2026-3e368';
const ORIGIN='https://applehwa-cmyk.github.io';
const JWK='https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const cors={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'POST, GET, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
function bytes(s){if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('bad base64');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));}
const parse=s=>JSON.parse(new TextDecoder().decode(bytes(s)));
let keyCache=new Map(),keyUntil=0,keyFlight=null;
async function keys(){if(Date.now()<keyUntil)return keyCache;if(!keyFlight)keyFlight=(async()=>{const r=await fetch(JWK);if(!r.ok)throw Error('Google public key unavailable');const body=await r.json();if(!Array.isArray(body.keys)||!body.keys.length)throw Error('bad keys');const map=new Map();for(const k of body.keys){if(k.kty==='RSA'&&k.kid)map.set(k.kid,await crypto.subtle.importKey('jwk',k,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']));}keyCache=map;const max=Number((r.headers.get('cache-control')||'').match(/max-age=(\d+)/)?.[1]||300);keyUntil=Date.now()+Math.min(max,3600)*1000;return map;})().finally(()=>keyFlight=null);return keyFlight;}
async function verify(request){try{const raw=request.headers.get('Authorization')||'';if(!raw.startsWith('Bearer ')||raw.length>8192)throw Error('token');const parts=raw.slice(7).split('.');if(parts.length!==3)throw Error('token');const h=parse(parts[0]),p=parse(parts[1]),now=Math.floor(Date.now()/1000);if(h.alg!=='RS256'||typeof h.kid!=='string'||p.aud!==PROJECT||p.iss!=='https://securetoken.google.com/'+PROJECT||typeof p.sub!=='string'||!p.sub||p.sub.length>128||!Number.isFinite(p.exp)||p.exp<=now||!Number.isFinite(p.iat)||p.iat>now+30||!Number.isFinite(p.auth_time)||p.auth_time>now+30)throw Error('claims');const key=(await keys()).get(h.kid);if(!key||!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('signature');return p.sub;}catch{fail('unauthenticated','身份驗證失敗，請重新開啟網頁');}}
function hex(n){return [...crypto.getRandomValues(new Uint8Array(n))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function hash(s){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function rand(n){const a=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
async function makeDeps(d){const t=hex(18),m=new Map([[t,await hash(t)]]);if(typeof d.recovery==='string'&&d.recovery.length<=100){const r=d.recovery.trim();m.set(r,await hash(r));}return{now:()=>Date.now(),rand,id:()=>hex(10),token:()=>t,hash:x=>{if(!m.has(x))throw Error('unknown token');return m.get(x);}};}
function publicRoom(pub,uid){if(pub.host!==uid&&!pub.members.some(x=>x.uid===uid))fail('permission-denied','請先加入房間或使用復原碼');return{host:pub.host===uid?uid:'host',members:pub.members.map(p=>({...p,uid:p.uid===uid?uid:'member:'+p.id})),settings:pub.settings,phase:pub.phase,round:pub.round,startsAt:pub.startsAt,game:pub.game,createdAt:pub.createdAt};}
async function dispatch(db,uid,d){if(d.action==='clock'){await db.prepare('SELECT code FROM rooms LIMIT 1').first();return{};}if(d.action==='create'){const deps=await makeDeps(d);for(let i=0;i<5;i++){const code=hex(5).toUpperCase(),x=newRoom(uid,d,deps);const q=await db.prepare('INSERT OR IGNORE INTO rooms(code,version,pub,priv) VALUES(?,1,?,?)').bind(code,JSON.stringify(x.pub),JSON.stringify(x.priv)).run();if(q.meta.changes===1)return{code,...x.result};}fail('resource-exhausted','暫時無法建立房間');}
 const code=typeof d.code==='string'?d.code.toUpperCase():'';
 if(!/^[0-9A-F]{10}$/.test(code))fail('invalid-argument','房間代碼格式錯誤');
 for(let i=0;i<8;i++){const row=await db.prepare('SELECT version,pub,priv FROM rooms WHERE code=?').bind(code).first();if(!row)fail('not-found','找不到這個房間');const pub=JSON.parse(row.pub);
  if(d.action==='state')return{room:publicRoom(pub,uid),version:row.version};
  const deps=await makeDeps(d),x=run(pub,JSON.parse(row.priv),uid,d.action,d,deps);
  if(!x.changed)return x.result;
  const q=await db.prepare('UPDATE rooms SET version=version+1,pub=?,priv=? WHERE code=? AND version=?').bind(JSON.stringify(x.pub),JSON.stringify(x.priv),code,row.version).run();
  if(q.meta.changes===1)return x.result;
 }
 fail('aborted','其他人正在更新房間，請再試一次');
}
const statusCodes={'unauthenticated':401,'permission-denied':403,'not-found':404,'already-exists':409,'failed-precondition':409,'invalid-argument':400,'resource-exhausted':429,'aborted':409};
export default {async fetch(request,env){
 const origin=request.headers.get('Origin');if(origin&&origin!==ORIGIN)return response({error:'來源不允許'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method==='GET')return response({service:'Christmas Magic Party',backend:'cloudflare-d1',configured:!!env.DB});
 if(request.method!=='POST')return response({error:'Method not allowed'},405);
 try{if(!env.DB)throw Error('Missing DB binding');const raw=await request.text();if(raw.length>12000)fail('invalid-argument','資料過長');let d;try{d=JSON.parse(raw);}catch{fail('invalid-argument','請求格式錯誤');}if(!d||typeof d!=='object'||Array.isArray(d)||typeof d.action!=='string')fail('invalid-argument','請求格式錯誤');const uid=await verify(request);const data=await dispatch(env.DB,uid,d);return response({...data,serverNow:Date.now()});}
 catch(e){if(!e.partyCode)console.error('Party backend failure',e?.message);return response({error:e.partyCode?e.message:'雲端暫時無法使用，請確認部署或免費額度',code:e.partyCode||'internal'},statusCodes[e.partyCode]||500);}
}};
