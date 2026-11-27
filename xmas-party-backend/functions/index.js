'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const crypto=require('node:crypto');
const {newRoom,run}=require('./core');
initializeApp();
const db=getFirestore();
const deps={now:()=>Date.now(),rand:n=>crypto.randomInt(n),token:()=>crypto.randomBytes(18).toString('hex'),id:()=>crypto.randomBytes(10).toString('hex'),hash:t=>crypto.createHash('sha256').update(t).digest('hex')};
exports.christmasParty=onCall({region:'asia-east1',maxInstances:5,timeoutSeconds:30},async req=>{
 if(!req.auth)throw new HttpsError('unauthenticated','請先登入');
 const uid=req.auth.uid,d=req.data;
 if(!d||typeof d!=='object'||typeof d.action!=='string')throw new HttpsError('invalid-argument','請求格式錯誤');
 try{
  if(d.action==='create'){
   for(let i=0;i<5;i++){const code=crypto.randomBytes(5).toString('hex').toUpperCase(),r=db.collection('christmasRooms').doc(code),s=db.collection('christmasSecrets').doc(code);const created=await db.runTransaction(async t=>{const old=await t.get(r);if(old.exists)return null;const x=newRoom(uid,d,deps);t.create(r,x.pub);t.create(s,x.priv);return{code,...x.result};});if(created)return created;}
   throw new HttpsError('resource-exhausted','請稍後再建立房間');
  }
  const code=typeof d.code==='string'?d.code.toUpperCase():'';
  if(!/^[0-9A-F]{10}$/.test(code))throw new HttpsError('invalid-argument','房間代碼為 10 位十六進位字元');
  const r=db.collection('christmasRooms').doc(code),s=db.collection('christmasSecrets').doc(code);
  return await db.runTransaction(async t=>{const [a,b]=await Promise.all([t.get(r),t.get(s)]);const x=run(a.exists?a.data():null,b.exists?b.data():null,uid,d.action,d,deps);if(x.changed){t.set(r,x.pub);t.set(s,x.priv);}return x.result;});
 }catch(e){if(e instanceof HttpsError)throw e;if(e.partyCode)throw new HttpsError(e.partyCode,e.message);console.error(e);throw new HttpsError('internal','操作失敗，請稍後再試');}
});