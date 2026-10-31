'use strict';
/* Focused operator checklist: source binding, explicit human evidence, never override technical gates. */
const assert=require('node:assert/strict');
const FLOW=require('../lib/first-site-acceptance-workflow.cjs');
const sha='a'.repeat(64),sourceSha='b'.repeat(64);
const summary={format:'manufact-seo-first-site-check-v1',siteId:'site-industrial-demo',
 sourceSiteSha256:sourceSha,publishedVersion:12,automaticRelease:false,
 release:{blockingGates:1,blockerIds:['php-form-delivery-not-tested'],mandatoryManualChecks:6}};
const bundle={format:'manufact-seo-review-bundle-v1',siteId:summary.siteId,readOnly:true,
 approvedSiteSource:{fileSha256:sourceSha},
 release:{blockers:[{gateId:'php-form-delivery-not-tested',message:'Form POST must be checked live'}]}};
const template=FLOW.template(summary,sha,bundle);
assert.equal(template.tasks.length,7);
assert(template.tasks.some(x=>x.taskId==='manual:real-form-delivery'));
const untouched=FLOW.review(summary,sha,template,bundle);
assert.equal(untouched.summary.openOriginalTechnicalGates,1);
assert.equal(untouched.releaseAuthorized,false);
const done=JSON.parse(JSON.stringify(template));
done.tasks[0].state='operator-checked';
done.tasks[0].owner='Launch lead';
done.tasks[0].reviewedAt='2026-10-29';
done.tasks[0].reason='Lead reported manual inspection, not an actual new first-site run';
done.tasks[0].evidenceRefs=['private://form-check-note'];
const reported=FLOW.review(summary,sha,done,bundle);
assert.equal(reported.summary.operatorCheckedAssertions,1);
assert.equal(reported.summary.openOriginalTechnicalGates,1);
assert.equal(reported.summary.automaticTechnicalGateClosures,0);
assert.equal(reported.tasks[0].releasePermission,false);
assert.throws(()=>FLOW.review(summary,'c'.repeat(64),done,bundle),/Stale/);
const next=FLOW.template(summary,'c'.repeat(64),bundle,done);
assert.equal(next.tasks[0].state,'unreviewed');
assert.equal(next.tasks[0].previousDecisionForReferenceOnly.state,'operator-checked');
assert.throws(()=>FLOW.review(summary,sha,{...done,tasks:done.tasks.slice(1)},bundle),/Stale/);
process.stdout.write('First-site human acceptance source-bound product smoke PASS.\n');
