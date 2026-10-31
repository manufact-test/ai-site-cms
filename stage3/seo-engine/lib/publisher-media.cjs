'use strict';
// Read-only selection aligned with current Stage 3 PublicRenderer::html OG image fallback.
// Explicit page SEO image wins; then section legacy slot media, then nested Design Graph images.
// This mirrors existing publisher behavior; it does not invent a new CMS SEO field.
const FORMAT='manufact-seo-publisher-media-selection-v1';
function select(site,page){
 if(!site||!Array.isArray(site.assets)||!page||!Array.isArray(page.sections))
  throw Error('Publisher media selection needs Site v1 page and assets');
 const byId=new Map(site.assets.map(a=>[a.id,a]));
 const usable=id=>{
  const asset=typeof id==='string'&&id?byId.get(id):null;
  return asset&&asset.mime!=='video/mp4'?asset:null;
 };
 const declared=page.seo?.ogImage;
 if(typeof declared==='string'&&declared){
  const asset=byId.get(declared);
  if(asset)return {asset,source:'page.seo.ogImage',sectionId:null};
 }
 for(const section of page.sections){
  for(const element of [...(section.elements||[]),...(section.items||[])]){
   const asset=usable(element?.values?.['content.media']);
   if(asset)return {asset,source:'section-content.media',sectionId:section.id};
  }
 }
 function graphFind(nodes){
  if(!Array.isArray(nodes))return null;
  for(const node of nodes){
   if(node?.type==='image'){
    const asset=usable(node.assetId);
    if(asset)return asset;
   }
   const child=graphFind(node?.children);
   if(child)return child;
  }
  return null;
 }
 for(const section of page.sections){
  const asset=graphFind(section.designGraph?.nodes);
  if(asset)return {asset,source:'section-designGraph-image',sectionId:section.id};
 }
 return {asset:null,source:'none',sectionId:null};
}
function inventory(site){
 if(!site||!Array.isArray(site.pages))throw Error('Publisher media inventory requires Site v1');
 return site.pages.map(p=>({pageId:p.id,path:p.path,...select(site,p)}));
}
module.exports=Object.freeze({FORMAT,select,inventory});
