'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const CSP=require('../lib/public-static-csp.cjs');
const page={id:'page-home',path:'/'},host='https://pilot.example';
const script='document.body.dataset.cmsLoaded="yes";';
const css='body { background: #fff; }';
const html='<html><head><style>'+css+'</style></head><body>'+
 '<main><form method="POST" action="https://collector.example/forms/pilot-site/lead"></form>'+
 '<script>'+script+'</script></main></body></html>';
const policy=(value)=>({'content-security-policy':value});
const blocked=CSP.review('pilot-site',page,html,policy(
 "default-src 'self'; script-src 'self'; style-src 'self'; form-action 'self'"),host);
assert.equal(blocked.counts.inlineScriptCount,1);
assert.equal(blocked.counts.inlineStyleCount,1);
assert.equal(blocked.counts.postFormCount,1);
assert.ok(blocked.findings.some(x=>x.code==='public-csp:inline-script-blocked'));
assert.ok(blocked.findings.some(x=>x.code==='public-csp:inline-style-blocked'));
assert.ok(blocked.findings.some(x=>x.code==='public-csp:form-collector-blocked'));
const allowed=CSP.review('pilot-site',page,html,policy(
 "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; form-action https://collector.example"),host);
assert.equal(allowed.findings.length,0);
const hash=x=>"'sha256-"+crypto.createHash('sha256').update(x).digest('base64')+"'";
const hashed=CSP.review('pilot-site',page,html,policy(
 "default-src 'self'; script-src "+hash(script)+"; style-src "+hash(css)+"; form-action https:"),host);
assert.equal(hashed.findings.length,0);
const noPolicy=CSP.review('pilot-site',page,html,{},host);
assert.ok(noPolicy.findings.some(x=>x.code==='public-csp:missing-public-csp'&&x.severity==='warning'));
assert.equal(noPolicy.policySupplied,false);
assert.equal(noPolicy.jsAndCssExecutableUnverified,true);
assert.ok(!JSON.stringify(blocked).includes('cmsLoaded'));
console.log('Public HTTPS CSP inline CSS, scripts and lead form collector smoke PASS');
