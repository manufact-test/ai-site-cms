'use strict';
// Four-route CMS page metadata overlay. No URL, robots, ID or arbitrary fields.
const FORMAT='manufact-design-factory-page-settings-v1';
const PAGES=Object.freeze(['home','services','approach','contact']);
const FIELDS=Object.freeze(['title','seoTitle','seoDescription','navigationLabel']);
const LIMITS=Object.freeze({title:160,seoTitle:160,seoDescription:300,navigationLabel:100});
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
function fail(message){throw Error('PAGE_SETTINGS: '+message);}
function exact(value,keys,scope){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))
  fail('Invalid '+scope+' properties');
}
function capture(site){
 if(!site||!Array.isArray(site.pages)||site.pages.length!==4)fail('Expected four compiled CMS pages');
 const pages={};
 for(const key of PAGES){
  const p=site.pages.find(x=>x.id==='df-page-'+key);
  if(!p||!p.seo||!p.navigation)fail('Missing page '+key);
  pages[key]={title:p.title,seoTitle:p.seo.title,seoDescription:p.seo.description,
   navigationLabel:p.navigation.label};
 }
 return {format:FORMAT,version:1,pages};
}
function apply(site,raw){
 if(!site||site.format!=='manufact-ai-site-v1')fail('CMS site required');
 exact(raw,['format','version','pages'],'metadata');
 if(raw.format!==FORMAT||raw.version!==1)fail('Unsupported metadata format');
 exact(raw.pages,PAGES,'four-page map');
 if(Object.keys(raw.pages).length!==4)fail('Every canonical page required');
 const baseline=capture(site),result={format:FORMAT,version:1,pages:{}};
 let changed=0;
 for(const key of PAGES){
  const row=raw.pages[key];
  exact(row,FIELDS,'page '+key);
  if(Object.keys(row).length!==4)fail('Missing fields on '+key);
  for(const field of FIELDS){
   const value=row[field];
   if(typeof value!=='string'||value.length>LIMITS[field]||
    /[\u0000-\u001f\u007f]/.test(value)||
    ((field==='title'||field==='seoTitle'||field==='navigationLabel')&&!value.trim()))
    fail('Invalid '+key+'.'+field);
  }
  const normalized=Object.fromEntries(FIELDS.map(field=>[field,row[field]]));
  const page=site.pages.find(x=>x.id==='df-page-'+key);
  if(FIELDS.some(field=>normalized[field]!==baseline.pages[key][field]))changed++;
  page.title=normalized.title;
  page.seo.title=normalized.seoTitle;
  page.seo.description=normalized.seoDescription;
  page.navigation.label=normalized.navigationLabel;
  result.pages[key]=normalized;
 }
 return {site,settings:result,changed};
}
module.exports=Object.freeze({FORMAT,PAGES,FIELDS,LIMITS,capture,apply});
