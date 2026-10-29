'use strict';
/* Explicit, operator-attested dimensions for comparing Search Console exports. */
const crypto=require('node:crypto');
const FORMAT='manufact-seo-search-evidence-context-v1';
const types=['web','image','video','news'],devices=['ALL','DESKTOP','MOBILE','TABLET'];
function strict(x,allowed,label){
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!allowed.includes(k)))
  throw Error('Invalid '+label+' fields');
}
function validate(raw){
 strict(raw,['format','property','searchType','country','device','filters','exportMethod','exportedAt','dataState','comparabilityKey','authenticity'],'GSC evidence context');
 if(raw.format!==FORMAT)throw Error('Unsupported GSC context format');
 if(typeof raw.property!=='string'||raw.property.length>250||!raw.property.trim())throw Error('Missing GSC property');
 if(!/^(sc-domain:[a-z0-9.-]+|https:\/\/[a-z0-9.-]+(?::443)?\/(?:[a-z0-9-]+\/)*)$/i.test(raw.property))
  throw Error('GSC property should be domain or HTTPS URL-prefix property');
 if(!types.includes(raw.searchType))throw Error('GSC searchType must be web, image, video or news');
 if(!devices.includes(raw.device))throw Error('Unsupported GSC device dimension');
 if(!(raw.country==='ALL'||/^[A-Z]{3}$/.test(raw.country)))throw Error('GSC country must be ALL or ISO 3166-1 alpha-3 code');
 if(!['gsc-ui','gsc-api'].includes(raw.exportMethod))throw Error('GSC export method required');
 if(raw.dataState!=='final')throw Error('Only final non-provisional GSC date ranges are comparable');
 if(typeof raw.exportedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(raw.exportedAt)||
    !Number.isFinite(Date.parse(raw.exportedAt)))throw Error('GSC export UTC timestamp required');
 if(!Array.isArray(raw.filters)||raw.filters.length>16)throw Error('Unsupported GSC filters');
 const filters=raw.filters.map(f=>{
  strict(f,['dimension','operator','expression'],'GSC filter');
  if(!['query','page','searchAppearance'].includes(f.dimension)||
     !['equals','contains','notContains','notEquals','regex','notRegex'].includes(f.operator)||
     typeof f.expression!=='string'||f.expression.length<1||f.expression.length>250||
     /[\u0000-\u001f]/.test(f.expression))throw Error('Unsupported GSC filter definition');
  return {...f};
 });
 const stableFilters=filters.slice().sort((a,b)=>
  [a.dimension,a.operator,a.expression].join('|').localeCompare([b.dimension,b.operator,b.expression].join('|')));
 const signature=JSON.stringify({property:raw.property.toLowerCase(),searchType:raw.searchType,
  country:raw.country,device:raw.device,filters:stableFilters});
 const comparabilityKey=crypto.createHash('sha256').update(signature).digest('hex');
 if(raw.comparabilityKey!==undefined&&raw.comparabilityKey!==comparabilityKey)throw Error('GSC filter comparability key mismatch');
 return Object.freeze({format:FORMAT,property:raw.property,searchType:raw.searchType,country:raw.country,
  device:raw.device,filters:stableFilters,exportMethod:raw.exportMethod,exportedAt:raw.exportedAt,
  dataState:raw.dataState,comparabilityKey,authenticity:'operator-declared-not-verified'});
}
module.exports=Object.freeze({FORMAT,validate});
