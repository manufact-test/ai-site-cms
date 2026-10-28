'use strict';
// Byte-footprint computation smoke, not an actual Chrome/Web Vitals benchmark.
const assert=require('node:assert/strict');
const {review}=require('../lib/php-local-footprint.cjs');
const site={siteId:'pilot',pages:[{id:'home',path:'/'}]};
const snapshot={siteId:'pilot',pages:[{id:'home',path:'/',html:'<html><head><style>h1{color:red}</style></head><body><main><h1>Hi</h1><img src="/a" loading="lazy"></main></body></html>'}]};
const media={siteId:'pilot',verifiedLocalHttpBytes:true,resources:[
 {assetId:'hero',variantOf:null,status:200,mime:'image/png',bodyBytes:1000000,renderedPageIds:['home']},
 {assetId:'hero-small',variantOf:'hero',status:200,mime:'image/png',bodyBytes:250000,renderedPageIds:['home']},
 {assetId:'bg',variantOf:null,status:200,mime:'video/mp4',bodyBytes:7500000,renderedPageIds:['home']} ]};
const value=review(site,snapshot,media);
assert.equal(value.pages[0].minimumRepresentativeMediaBytes,7750000);
assert.equal(value.pages[0].maximumRepresentativeMediaBytes,8500000);
for(const code of ['large-image','large-video','large-possible-media-footprint','first-image-lazy','image-dimensions-not-declared'])
 assert.ok(value.findings.some(x=>x.code==='php-footprint:'+code),code);
assert.equal(value.actualWebVitalsMeasured,false);
console.log('Local PHP byte-footprint smoke PASS');
