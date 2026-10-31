'use strict';
// Sanitized owner delivery configuration smoke. No API, POST, email or Telegram.
const assert=require('node:assert/strict');
const {review}=require('../lib/php-local-delivery-readiness.cjs');
const site={siteId:'pilot-forms',pages:[
 {id:'page-home',path:'/',sections:[{id:'form-home',component:'lead-form'}]},
 {id:'page-about',path:'/about/',sections:[{id:'form-about',component:'lead-form-flex'},
  {id:'form-graph',component:'lead-form',designGraph:{nodes:[]}}]}]};
const status={
 settings:{emailEnabled:true,emailRecipient:'private@client.example',
  telegramEnabled:false,telegramChatId:''},
 transport:{email:{ready:true},telegram:{ready:false}},
 channels:{email:{enabled:true,recipientConfigured:true},
  telegram:{enabled:false,recipientConfigured:false}},
 routes:[
  {sectionId:'form-home',sources:['published'],emailMode:'inherit',
   emailRecipient:'',telegramMode:'off',telegramChatId:'',version:2},
  {sectionId:'form-about',sources:['draft','published'],emailMode:'custom',
   emailRecipient:'special@client.example',telegramMode:'off',telegramChatId:'',version:5}],
 recent:[{submissionId:'lead-secret-123',lastError:'mail-private'}]};
const good=review(site,status,7);
assert.equal(good.checkedForms,2);
assert.equal(good.configuredForms,2);
assert.equal(good.findings.length,0);
assert.equal(good.actualPostPerformed,false);
assert.equal(good.deliveryProven,false);
const slotted={...site,pages:site.pages.map(page=>page.id!=='page-about'?page:{
 ...page,sections:page.sections.map(s=>s.id!=='form-graph'?s:{...s,
  designGraph:{nodes:[{id:'layout',type:'container',children:[{id:'form-slot',type:'form-slot'}]}]}})})};
const graphStatus={...status,routes:[...status.routes,{...status.routes[0],
 sectionId:'form-graph',version:7}]};
const graphReady=review(slotted,graphStatus,7);
assert.equal(graphReady.checkedForms,3);
assert.equal(graphReady.configuredForms,3);
assert.equal(graphReady.findings.length,0);
const graphMissing=review(slotted,status,7);
assert.ok(graphMissing.findings.some(f=>f.sectionId==='form-graph'&&
 f.code==='php-delivery:published-form-route-absent'));
const privateValues=['private@client.example','special@client.example','lead-secret-123'];
for(const secret of privateValues)assert.ok(!JSON.stringify(good).includes(secret));
const disabled=review(site,{...status,settings:{...status.settings,emailEnabled:false},
 routes:status.routes.map(r=>({...r,emailMode:'off'}))},7);
assert.equal(disabled.findings.filter(f=>f.code==='php-delivery:all-notifications-off').length,2);
assert.equal(disabled.findings.filter(f=>f.severity==='error').length,0);
const broken=review(site,{...status,routes:status.routes.map(r=>
 ({...r,emailMode:'custom',emailRecipient:'',telegramMode:'off'}))},7);
assert.ok(broken.findings.some(f=>f.code==='php-delivery:email-recipient-missing'&&f.severity==='error'));
assert.ok(broken.findings.some(f=>f.code==='php-delivery:no-ready-notification-channel'));
const missing=review(site,{...status,routes:status.routes.slice(0,1)},7);
assert.ok(missing.findings.some(f=>f.code==='php-delivery:published-form-route-absent'));
const custom=review(site,{...status,settings:{...status.settings,emailEnabled:false},
 routes:status.routes.map(r=>({...r,emailMode:'custom',emailRecipient:'override@client.example'}))},7);
assert.equal(custom.configuredForms,2);
assert.ok(!JSON.stringify(custom).includes('override@client.example'));
console.log('Published form delivery configuration no-secret readiness smoke PASS');
