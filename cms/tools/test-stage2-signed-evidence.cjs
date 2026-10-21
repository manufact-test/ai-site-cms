'use strict';
// End-to-end disposable Stage2 operator evidence authentication.
// No real target, no permanently trusted key, no host probes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {STAGE}=require('./build-internal-package.cjs');
const legal=require('./stage2-license-dossier.cjs');
const owner=require('./stage2-owner-decision.cjs');
const signing=require('./stage2-evidence-bundle.cjs');
const scope=require('./stage2-operator-scope.cjs');
const ownerConsent=require('./stage2-owner-consent.cjs');
let count=0;
function ok(v,label){assert.ok(v,label);count++;}
function refuses(fn,label){assert.throws(fn,undefined,label);count++;}
function run(node,args,env={}){
  return spawnSync(node,args,{encoding:'utf8',env:{...process.env,...env}});
}
function utc(time){return new Date(Math.floor(time/1000)*1000).toISOString().slice(0,19)+'Z';}
function main(){
  const now=Date.now(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'cms-stage2-signed-'));
  const secret=path.join(temp,'operator-private'),site=path.join(temp,'visitor');
  fs.mkdirSync(secret,{mode:0o700});
  fs.mkdirSync(path.join(site,'public'),{recursive:true,mode:0o700});
  fs.writeFileSync(path.join(site,'public','index.html'),
    '<!doctype html><title>Disposable separate visitor site</title>');
  try{
    const license=legal.createDossier();
    const handoff=run('php',[path.join(STAGE,'bin/stage2-target-host-handoff.php'),
      '--check','--cms-root='+STAGE,
      '--cms-public='+path.join(STAGE,'public'),
      '--site-root='+site,'--family=html'],{
        CMS_ENV:'test',CMS_STAGE2_RUNTIME_GATE:'ci-bound',
        CMS_ALLOW_SQLITE_TEST_ONLY:'1'
      });
    ok(handoff.status===0,'independently execute complete packaged PHP handoff');
    const offline=JSON.parse(handoff.stdout);
    const origins={cmsOrigin:'https://cms.review-test-platform.com',
      siteOrigin:'https://visitor.review-test-platform.com'};
    const grant={format:scope.FORMAT,repository:'manufact-test/ai-site-cms',
      scope:'target-readonly-https-get',cmsOrigin:origins.cmsOrigin,
      siteOrigin:origins.siteOrigin,reference:'stage2-disposable-e2e-session',
      issuedAt:utc(now-240000),expiresAt:utc(now+1800000)};
    const scopeHash=scope.inspectScope(grant,origins,now);
    const https={format:'ai-site-cms-stage2-active-https-observation-v1',
      requestedOriginsSha256:scopeHash.originPairSha256,
      operatorScopeRecordSha256:scopeHash.operatorScopeRecordSha256,
      ciLoopbackOnly:false,actualHttpsRequestsAttempted:true,
      httpsObservationsPass:true,targetHostAccepted:false,
      stage2Accepted:false,productionReady:false,
      results:Object.fromEntries([
        ['cmsHealth',200],['cmsPrivateVendor',404],
        ['cmsPrivateEditor',403],['cmsPublishGet',404],['visitorHome',200]
      ].map(([key,status])=>[key,{
        status,passed:true,tlsPeerVerified:true,
        peerCertificateSha256:'b'.repeat(64)
      }]))
    };
    // Independent owner signing key, distinct from the operator's evidence
    // signer. All records are synthetic; no real host access is granted.
    const ownerDir=path.join(temp,'independent-owner-trust');
    fs.mkdirSync(ownerDir,{mode:0o700});
    const ownerPair=crypto.generateKeyPairSync('ed25519');
    const ownerPub=path.join(ownerDir,'owner-public.pem');
    const ownerPin=signing.keyDigest(ownerPair.publicKey);
    fs.writeFileSync(ownerPub,ownerPair.publicKey.export({format:'pem',type:'spki'}),{mode:0o600});
    const permitPayload={format:ownerConsent.FORMAT,
      scopeSha256:scopeHash.operatorScopeRecordSha256,
      originsSha256:scopeHash.originPairSha256,
      permission:'stage2-single-readonly-https-observation',
      expiresAt:scopeHash.scopeExpiresAt,
      nonce:crypto.randomBytes(16).toString('hex'),productionReady:false};
    const permitSignature=crypto.sign(null,Buffer.concat([
      ownerConsent.DOMAIN,Buffer.from(JSON.stringify(permitPayload)+'\n')]),
      ownerPair.privateKey).toString('base64');
    const ownerPermit=path.join(secret,'owner-signed-consent.json');
    fs.writeFileSync(ownerPermit,JSON.stringify({
      format:ownerConsent.FORMAT,payload:permitPayload,signature:permitSignature
    })+'\n',{mode:0o600});
    const permitDigest=crypto.createHash('sha256').update(fs.readFileSync(ownerPermit))
      .digest('hex');
    Object.assign(https,{ownerConsentSha256:permitDigest,
      ownerPublicPinSha256:ownerPin,cryptographicScopeSignatureVerified:true});
    const ownerOptions={file:ownerPermit,publicKey:ownerPub,trustedDigest:ownerPin};
    const db={state:'ready',reason:'matched',version:2};
    const records={scope:grant,offline,https,database:db};
    const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
    const privatePem=privateKey.export({format:'pem',type:'pkcs8'});
    const publicPem=publicKey.export({format:'pem',type:'spki'});
    const digest=signing.keyDigest(publicPem);
    ok(digest.length===64,'fresh test operator key and separately pinned SPKI digest');
    const files={};
    for(const [name,data] of Object.entries(records)){
      const file=path.join(secret,name+'.json');files[name]=file;
      fs.writeFileSync(file,JSON.stringify(data),{mode:0o600});
    }
    const privatePath=path.join(secret,'signer-private.pem');
    const publicPath=path.join(secret,'owner-pinned-public.pem');
    const output=path.join(secret,'signed-evidence.json');
    fs.writeFileSync(privatePath,privatePem,{mode:0o600});
    fs.writeFileSync(publicPath,publicPem,{mode:0o600});
    const signArgs=[
      path.join(__dirname,'stage2-evidence-bundle.cjs'),'--sign',
      ...signing.FIELDS.map(name=>'--'+name+'='+files[name]),
      '--private-key='+privatePath,'--output='+output
    ];
    const noGrant=run(process.execPath,signArgs,{
      CMS_STAGE2_OPERATOR_SIGNING:''});
    ok(noGrant.status===3&&noGrant.stdout===''
      &&noGrant.stderr.trim()==='STAGE2_OPERATOR_SIGNATURE_REFUSED',
      'default signing denied without operator action');
    // Fail with the actual local cause BEFORE the intentionally opaque CLI,
    // so CI diagnoses contract errors without exposing private key bytes.
    ok(signing.readPrivate(privatePath,8192).length>64,
      'operator private key readable from mode-0600 workspace');
    ok(signing.makeSigned(records,privatePem).format===signing.FORMAT,
      'direct disposable evidence signing with Ed25519 key works');
    const signed=run(process.execPath,signArgs,{
      CMS_STAGE2_OPERATOR_SIGNING:'explicit-offline-attestation'});
    ok(signed.status===0&&signed.stderr===''
      &&fs.statSync(output).mode%512===0o600,
      'explicit offline CLI signs records into permission-restricted artifact');
    const bundle=JSON.parse(fs.readFileSync(output));
    const verified=signing.verifySigned(bundle,publicPem,digest,now);
    ok(verified.signatureValidUnderPinnedKey&&
      !verified.ownerAuthorizationVerified&&!verified.liveTargetHostVerified,
      'signature proves records integrity but not real host claims');
    ok(verified.records.offline.cmsPackageManifestSha256===
      license.packageManifestSha256,'signed handoff tied to actual package digest');
    const accepted=owner.assemble(license,{},{
      bundle,publicKey:publicPem,trustedDigest:digest
    },ownerOptions);
    ok(accepted.cryptographicEvidenceRecord.signatureCryptographicallyValid&&
      accepted.cryptographicEvidenceRecord.ownerOfSigningKeyIndependentlyAuthenticated===false
      &&accepted.stage2Accepted===false
      &&accepted.ownerReadOnlyConsentProof.signatureCryptographicallyVerifiedUnderPinnedKey
      &&accepted.ownerReadOnlyConsentProof.matchedHttpsScopeAndOrigins
      &&accepted.ownerReadOnlyConsentProof.writeInstallAuthorized===false
      &&accepted.attachedEvidence.externalHttps.independentlyReverifiedSignedConsent,
      'signed operator evidence plus independent owner pin correlate without accepting Stage2');
    const checkArgs=[
      path.join(__dirname,'stage2-owner-decision.cjs'),'--build',
      '--signed-bundle='+output,
      '--trusted-pubkey='+publicPath,
      '--trusted-spki-sha256='+digest,
      '--owner-consent='+ownerPermit,
      '--owner-trusted-pubkey='+ownerPub,
      '--owner-trusted-spki-sha256='+ownerPin
    ];
    const ownerCli=run(process.execPath,checkArgs);
    ok(ownerCli.status===0&&ownerCli.stderr==='',
      'real owner CLI verifies signing key pinned out-of-band by digest');
    const html=fs.readFileSync(path.join(legal.OUT,'stage2-owner-decision.html'),'utf8');
    ok(html.includes('Ed25519 signature verified')
      &&html.includes('Owner read-only consent signature independently reverified')
      &&html.includes('NOT independently authenticated')&&!html.includes('<script'),
      'offline human-readable owner report discloses identity and host trust gaps');
    const outputJson=JSON.parse(fs.readFileSync(
      path.join(legal.OUT,'stage2-owner-decision.json'),'utf8'));
    ok(outputJson.cryptographicEvidenceRecord.signedPayloadSha256===
      verified.signedPayloadSha256&&outputJson.remainingCriteria.length===8
      &&outputJson.ownerReadOnlyConsentProof.consentSha256===permitDigest,
      'signed report is internally self-consistent and still has 8 open gates');
    const repeated=run(process.execPath,signArgs,{
      CMS_STAGE2_OPERATOR_SIGNING:'explicit-offline-attestation'});
    ok(repeated.status===3,'operator cannot silently overwrite signed session');

    refuses(()=>owner.assemble(license,{},{
      bundle,publicKey:publicPem,trustedDigest:digest
    }),'forged HTTPS claim of owner signature without actual consent is rejected');
    refuses(()=>owner.assemble(license,{},{
      bundle,publicKey:publicPem,trustedDigest:digest
    },{...ownerOptions,trustedDigest:'0'.repeat(64)}),
    'independently wrong owner Ed25519 key pin rejected');
    const badPermit=JSON.parse(fs.readFileSync(ownerPermit,'utf8'));
    badPermit.payload.permission='stage2-write-install';
    fs.writeFileSync(ownerPermit,JSON.stringify(badPermit)+'\n');
    refuses(()=>owner.assemble(license,{},{
      bundle,publicKey:publicPem,trustedDigest:digest
    },ownerOptions),'tampered owner permit rejected before any status promotion');
    fs.writeFileSync(ownerPermit,JSON.stringify({
      format:ownerConsent.FORMAT,payload:permitPayload,signature:permitSignature
    })+'\n');
    const falseClaim=signing.makeSigned({...records,https:{...https,
      ownerConsentSha256:'1'.repeat(64)}},privatePem);
    refuses(()=>owner.assemble(license,{},{
      bundle:falseClaim,publicKey:publicPem,trustedDigest:digest
    },ownerOptions),'signed operator receipt cannot replace owner consent digest');
    const crossSite=signing.makeSigned({...records,https:{...https,
      ownerPublicPinSha256:'2'.repeat(64)}},privatePem);
    refuses(()=>owner.assemble(license,{},{
      bundle:crossSite,publicKey:publicPem,trustedDigest:digest
    },ownerOptions),'signed operator receipt cannot substitute owner signing key');
    const missingOwner=run(process.execPath,checkArgs.filter(x=>
      !x.startsWith('--owner-')));
    ok(missingOwner.status===3&&missingOwner.stdout===''&&
      missingOwner.stderr.trim()==='STAGE2_OWNER_REVIEW_REFUSED',
      'CLI cannot accept claimed owner signature without pinned consent evidence');
    const evil=JSON.parse(JSON.stringify(bundle));
    evil.payload.records.offline.cmsPackageManifestSha256='0'.repeat(64);
    refuses(()=>signing.verifySigned(evil,publicPem,digest,now),
      'post-signature artifact substitution fails Ed25519');
    const wrong=crypto.generateKeyPairSync('ed25519').publicKey
      .export({format:'pem',type:'spki'});
    refuses(()=>signing.verifySigned(bundle,wrong,digest,now),
      'wrong operator signing key fails pinned check');
    refuses(()=>signing.verifySigned(bundle,publicPem,'c'.repeat(64),now),
      'attacker-picked digest fails independent public-key pin');
    refuses(()=>signing.verifySigned(bundle,publicPem,digest,now+7200000),
      'replay fails at evidence expiry');
    const future=signing.makeSigned(records,privatePem,new Date(now+900000));
    refuses(()=>signing.verifySigned(future,publicPem,digest,now),
      'fresh-signature far-future session refused');
    const inconsistent={...records,offline:{...offline,
      cmsPackageManifestSha256:'f'.repeat(64)}};
    const mismatched=signing.makeSigned(inconsistent,privatePem);
    refuses(()=>owner.assemble(license,{},{
      bundle:mismatched,publicKey:publicPem,trustedDigest:digest
    }),'valid signed evidence from another package blocked');
    const other=signing.makeSigned({...records,https:{...https,
      requestedOriginsSha256:'d'.repeat(64)}},privatePem);
    refuses(()=>owner.assemble(license,{},{
      bundle:other,publicKey:publicPem,trustedDigest:digest
    }),'valid signed but wrong origin scope blocked');
    refuses(()=>owner.assemble(license,{scope:grant},{
      bundle,publicKey:publicPem,trustedDigest:digest
    }),'unsigned partial override cannot mix with signed package');
    const fake={...bundle,stage2Accepted:true};
    refuses(()=>signing.verifySigned(fake,publicPem,digest,now),
      'forged successful stage2 flag in envelope blocked');
    const noKey=run(process.execPath,checkArgs.map(x=>
      x.startsWith('--trusted-spki-sha256=')?'--trusted-spki-sha256='+('0'.repeat(64)):x));
    ok(noKey.status===3&&noKey.stdout===''&&
      noKey.stderr.trim()==='STAGE2_OWNER_REVIEW_REFUSED',
      'real owner CLI rejects independently unpinned signer public key');
    fs.chmodSync(privatePath,0o644);
    const publicKeyLeak=run(process.execPath,signArgs.map(x=>
      x.startsWith('--output=')?'--output='+path.join(secret,'second.json'):x),{
        CMS_STAGE2_OPERATOR_SIGNING:'explicit-offline-attestation'});
    ok(publicKeyLeak.status===3,'world-readable signing key rejected before output');
    fs.chmodSync(privatePath,0o600);

    // GitHub CI must upload ONLY unsigned empty operator findings, not the
    // deliberately invented disposable signed claims used in this test.
    const clean=owner.build();
    ok(clean.cryptographicEvidenceRecord===null
      &&Object.values(clean.attachedEvidence).every(v=>v===null),
      'synthetic signed evidence erased from CI review output');
    ok(!JSON.stringify(clean).includes(origins.cmsOrigin)
      &&!JSON.stringify(clean).includes(secret),
      'no synthetic target origins, local paths or private key in deliverables');
    console.log('Stage2 signed operator evidence: '+count+
      ' integration checks PASS; ephemeral key and synthetic claims not distributed');
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
main();
