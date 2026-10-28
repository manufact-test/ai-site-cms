'use strict';
// Verify selected *published* first-party DesignGraph presentation rules.
// Not a duplicate layout renderer or pixel-level visual equality tester.
const FORMAT='manufact-seo-local-php-design-style-v1';
const assetUrl=(site,assets,id)=>'/published/'+site.siteId+(assets.get(id)?.src||'');
function reviewNode({site,graph,node,html,assets}){
 const problems=[],selector='.cmsdg-'+graph.id+' .cmsdg-n-'+node.id;
 const styles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)]
  .map(m=>m[1]).join('');
 const has=s=>styles.includes(s);
 const issue=(code,message)=>problems.push({code,message});
 const emitsStyle=object=>Object.entries(object||{}).some(([key,value])=>key!=='hidden'||value===true);
 const ownsStyles=emitsStyle(node.styles);
 if(ownsStyles&&!has(selector+'{'))
  issue('base-style-missing','Approved DesignGraph base-style CSS selector was not published.');
 for(const [device,width] of [['tablet',900],['mobile',600]]){
  const cfg=node.responsive?.[device];
  if(emitsStyle(cfg)&&!has('@media(max-width:'+width+'px){'+selector+'{'))
   issue('responsive-style-missing','Approved DesignGraph '+device+' breakpoint CSS was not published.');
 }
 for(const [name,pseudo] of [['hover',':hover'],['focus',':focus-visible'],['active',':active']]){
  const state=node.states?.[name];
  if(emitsStyle(state)&&!has(selector+pseudo+'{'))
   issue('interaction-style-missing','Approved '+name+' visual state CSS was not published.');
 }
 if(node.transition&&!has(selector+'{transition:'))
  issue('transition-style-missing','Approved DesignGraph transition CSS was not published.');
 if(node.motion?.effect&&node.motion.effect!=='none'){
  const action='animation:cmsdg-'+node.motion.effect;
  if(!has(selector+'{'+action)&&
     !has('@supports (animation-timeline: view()){'+selector+'{'+action))
   issue('motion-style-missing','Approved DesignGraph motion rule was not published.');
 }
 if(node.sequence&&Array.isArray(node.children))
  for(const child of node.children)
   if(!has(selector+' > .cmsdg-n-'+child.id+'{animation:cmsdg-'+node.sequence.effect))
    issue('sequence-style-missing','Approved DesignGraph sequence lost the child animation for '+child.id+'.');
 if(node.backgroundMedia){
  const media=node.backgroundMedia;
  const url=assetUrl(site,assets,media.assetId);
  if(!assets.has(media.assetId)||!has(selector+'{background-image:')||!has('url("'+url+'")'))
   issue('background-media-missing','Published DesignGraph background uses the wrong original image or lost its CSS.');
  for(const [device,width] of [['tablet',900],['mobile',600]]){
   const id=media[device+'AssetId'];
   if(!id)continue;
   const url=assetUrl(site,assets,id);
   if(!assets.has(id)||!has('@media(max-width:'+width+'px){'+selector+'{background-image:')||
      !has('url("'+url+'")'))
    issue('background-art-direction-missing','Published DesignGraph '+device+' background image or CSS rule is missing.');
  }
 }
 if(node.backgroundVideo){
  const media=node.backgroundVideo;
  const video=assetUrl(site,assets,media.assetId),poster=assetUrl(site,assets,media.posterAssetId);
  const backdrop=selector+' > .cmsdg-video-backdrop';
  if(!assets.has(media.assetId)||!assets.has(media.posterAssetId)||
     !html.includes('class="cmsdg-video-backdrop" aria-hidden="true"')||
     !html.includes('src="'+video+'" type="video/mp4"')||
     !html.includes('poster="'+poster+'"')||
     !has('background-image:url("'+poster+'")'))
   issue('background-video-missing','Approved muted/background video or poster is absent from actual PHP markup/CSS.');
  for(const [device,width] of [['tablet',900],['mobile',600]]){
   const id=media[device+'PosterAssetId'];
   if(!id)continue;
   const url=assetUrl(site,assets,id);
   if(!assets.has(id)||!has('@media(max-width:'+width+'px){'+backdrop+'{background-image:url("'+url+'")'))
    issue('background-video-poster-missing','Approved '+device+' video background poster is not emitted.');
  }
  if(!has('@media(prefers-reduced-motion:reduce){'+backdrop+' video{display:none!important}}')||
     !has('@media(max-width:600px){'+backdrop+' video{display:none!important}}'))
   issue('background-video-motion-safety','Published video backdrop lost reduced-motion or mobile autoplay suppression.');
 }
 return Object.freeze(problems);
}
module.exports=Object.freeze({FORMAT,reviewNode});
