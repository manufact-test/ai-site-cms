#!/usr/bin/env node
'use strict';
// First-party Schema.org contract/rendering proof. Synthetic site only: no
// customer domain, browser capture, live Google result or external API.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const sdk=require('../sdk/contract.cjs');
const root=path.resolve(__dirname,'..');
const manifest=id=>JSON.parse(fs.readFileSync(path.join(root,'components',id+'.json'),'utf8'));
const manifests=fs.readdirSync(path.join(root,'components')).filter(f=>f.endsWith('.json'))
  .map(f=>manifest(f.slice(0,-5)));
const fixture=JSON.parse(fs.readFileSync(path.join(root,'fixtures/industrial-site.json'),'utf8'));
const copy=value=>structuredClone(value);
if(spawnSync('php',['-v']).status!==0){
  const site=copy(fixture),page=site.pages[0];
  page.seo={title:'',description:'',robots:'index',...page.seo,schemaType:'ContactPage'};
  sdk.validateSite(site,manifests);
  page.seo.schemaType='FAQPage';
  assert.throws(()=>sdk.validateSite(site,manifests));
  page.seo.schemaType='not-schema';
  assert.throws(()=>sdk.validateSite(site,manifests));
  console.log('Schema.org JS validation PASS; PHP rendering deferred to CI (php unavailable locally)');
  process.exit(0);
}
const phpSource=`require ${JSON.stringify(path.join(root,'server/bootstrap.php'))};
$site=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR);
(new \\Manufact\\Stage3\\ContractValidator(${JSON.stringify(path.join(root,'components'))}))->validate($site);
$html=\\Manufact\\Stage3\\PublicRenderer::html($site,'/','/',null,0,
  getenv('SCHEMA_TEST_ORIGIN')?:null,null,getenv('SCHEMA_TEST_PREVIEW')==='yes');
echo $html;`;
function php(site,{origin='https://example.test',preview=false,reject=false}={}){
  const result=spawnSync('php',['-r',phpSource],{input:JSON.stringify(site),encoding:'utf8',
    env:{...process.env,SCHEMA_TEST_ORIGIN:origin,SCHEMA_TEST_PREVIEW:preview?'yes':'no'}});
  if(reject){assert.notEqual(result.status,0,'PHP must reject invalid structured data');return;}
  assert.equal(result.status,0,result.stderr||'PHP contract/render failed');
  return result.stdout;
}
const jsonLd=html=>{
  const matches=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(matches.length,1,'Exactly one publisher-owned JSON-LD script');
  return JSON.parse(matches[0][1]);
};
const site=copy(fixture),home=site.pages[0];
home.seo={title:'',description:'',robots:'index',...home.seo};
assert.doesNotMatch(php(site),/application\/ld\+json/,'Legacy published pages are unchanged');
for(const type of ['WebPage','AboutPage','ContactPage']){
  home.seo={...home.seo,schemaType:type,description:'Проверенная информация о странице'};
  sdk.validateSite(site,manifests);
  const html=php(site),data=jsonLd(html);
  assert.equal(data['@context'],'https://schema.org');
  assert.equal(data['@type'],type);
  assert.equal(data.url,'https://example.test/');
  assert.equal(data['@id'],'https://example.test/#webpage');
  assert.equal(data.name,home.title);
  assert.equal(data.inLanguage,site.language||'ru');
  assert.deepEqual(data.isPartOf,{'@type':'WebSite',name:site.title,url:'https://example.test/'});
  assert.equal(data.description,home.seo.description);
  assert.doesNotMatch(php(site,{preview:true}),/application\/ld\+json/,'Private preview is script-free');
  assert.doesNotMatch(php(site,{origin:''}),/application\/ld\+json/,'No unverified host is invented');
}
home.seo.schemaType='NotARealSchema';
assert.throws(()=>sdk.validateSite(site,manifests));php(site,{reject:true});
home.seo.schemaType='FAQPage';
assert.throws(()=>sdk.validateSite(site,manifests),'FAQ cannot exist without visible questions');
php(site,{reject:true});
const faq=sdk.sectionFrom(manifest('faq-accordion'),'section-faq-structured');
faq.items[0].values={'content.question':'Как получить ответ?','content.answer':'Он опубликован на сайте.'};
faq.items[1].values={'content.question':'Безопасен ли текст </script><script>alert(1)</script>?',
  'content.answer':'Да, ввод экранируется как JSON, а не исполняется.'};
home.sections.push(faq);
sdk.validateSite(site,manifests);
const faqHtml=php(site);
const faqData=jsonLd(faqHtml);
assert.equal(faqData['@type'],'FAQPage');
assert.equal(faqData.mainEntity.length,2);
assert.equal(faqData.mainEntity[0].name,faq.items[0].values['content.question']);
assert.deepEqual(faqData.mainEntity[1],{'@type':'Question',
  name:faq.items[1].values['content.question'],
  acceptedAnswer:{'@type':'Answer',text:faq.items[1].values['content.answer']}});
assert.doesNotMatch(faqHtml,/<script>alert\(1\)<\/script>/,
  'An authored FAQ cannot break out of the JSON script');
assert.match(faqHtml,/\\u003C\/script\\u003E/,'Dangerous characters are escaped');
faq.deviceVisibility={mobile:false};
assert.throws(()=>sdk.validateSite(site,manifests),'Mobile-invisible FAQ must not be marked');
php(site,{reject:true});
delete faq.deviceVisibility;
home.seo.robots='noindex';
assert.doesNotMatch(php(site),/application\/ld\+json/,'Noindex pages publish no JSON-LD');
home.seo.robots='index';
home.seo.schemaType='none';
assert.doesNotMatch(php(site),/application\/ld\+json/,'Explicit opt-out remains script-free');
console.log('Schema.org opt-in JS/PHP/site-v1 contract + truthful FAQ/preview proof PASS');
