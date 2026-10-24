'use strict';
// D2 closed visual theme catalog. Exact CMS fields are kept separate from
// standalone design-only tokens, which require a future PHP/Studio adapter.
const defaults={surface:'paper',spacing:'airy',align:'left'};
const textThemes=[
  {
    id:'editorial',label:'01 / Editorial Folio',cms:['#F6F2EA','#FFFFFF','#202B34','#A0442A','georgia',1120],
    appearance:['paper','airy','left'],headline:[64,48,35],
    design:['split','frame','paper','serif','wide','line','relaxed']
  },
  {
    id:'technical',label:'02 / Technical Blueprint',cms:['#EDF3F8','#FFFFFF','#172A43','#164F9D','arial',1260],
    appearance:['tint','normal','left'],headline:[60,43,30],
    design:['split','grid','bordered','sans','normal','solid','dense']
  },
  {
    id:'minimal',label:'03 / Contemporary Minimal',cms:['#FAFAF8','#FFFFFF','#222927','#245C49','system',1020],
    appearance:['default','airy','center'],headline:[52,40,30],
    design:['centered','circle','floating','sans','tight','line','relaxed']
  },
  {
    id:'noir',label:'04 / Noir Portfolio',cms:['#101217','#1C2029','#F4F2ED','#6936BD','georgia',1360],
    appearance:['dark','airy','left'],headline:[74,53,34],
    design:['offset','stair','bordered','serif','wide','solid','relaxed']
  },
  {
    id:'brutalist',label:'05 / Signal Brutal',cms:['#F8EBD2','#FFFFFF','#241D19','#AC3023','arial',1480],
    appearance:['tint','tight','left'],headline:[82,56,38],
    design:['stacked','block','bordered','sans','wide','solid','dense']
  },
  {
    id:'atelier',label:'06 / Atelier Maison',cms:['#F5EFF0','#FFFFFF','#38272D','#83415D','georgia',1120],
    appearance:['paper','airy','left'],headline:[69,48,34],
    design:['offset','arch','floating','serif','normal','line','relaxed']
  },
  {
    id:'verdant',label:'07 / Verdant Field',cms:['#EAF2EA','#FFFFFF','#1C382A','#1D5C3D','system',1180],
    appearance:['tint','airy','left'],headline:[61,45,31],
    design:['split','circle','paper','sans','normal','line','relaxed']
  },
  {
    id:'oceanic',label:'08 / Oceanic Clarity',cms:['#E6F2F4','#FFFFFF','#123742','#15566A','arial',1260],
    appearance:['tint','normal','left'],headline:[65,46,33],
    design:['stacked','wave','floating','sans','normal','solid','relaxed']
  },
  {
    id:'copper',label:'09 / Copper Workshop',cms:['#F6EEE3','#FFFFFF','#392B21','#895020','georgia',1200],
    appearance:['paper','normal','left'],headline:[68,49,33],
    design:['offset','block','paper','serif','tight','solid','dense']
  },
  {
    id:'plum',label:'10 / Modern Gallery',cms:['#F6EFF7','#FFFFFF','#372740','#703580','georgia',1140],
    appearance:['paper','airy','center'],headline:[64,46,31],
    design:['centered','arch','floating','serif','wide','line','relaxed']
  },
  {
    id:'cobalt',label:'11 / Cobalt Systems',cms:['#EBEFFB','#FFFFFF','#1A2B50','#253E99','system',1300],
    appearance:['tint','normal','left'],headline:[65,48,33],
    design:['split','grid','bordered','sans','tight','solid','dense']
  },
  {
    id:'mono',label:'12 / Monochrome Studio',cms:['#FFFFFF','#F7F7F7','#171717','#252525','arial',1100],
    appearance:['default','airy','center'],headline:[67,49,34],
    design:['stacked','frame','paper','sans','wide','line','relaxed']
  }
];
const enums={
  layout:['split','centered','stacked','offset'],
  art:['frame','grid','circle','stair','block','arch','wave'],
  card:['paper','bordered','floating'],
  display:['serif','sans'],
  tracking:['wide','normal','tight'],
  nav:['line','solid'],
  density:['relaxed','dense']
};
const hex=x=>typeof x==='string'&&/^#[0-9A-F]{6}$/i.test(x);
function contrast(a,b){
  const lum=h=>{
    const components=[1,3,5].map(pos=>{
      const v=parseInt(h.slice(pos,pos+2),16)/255;
      return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;
    });
    return components[0]*0.2126+components[1]*0.7152+components[2]*0.0722;
  };
  const [x,y]=[lum(a),lum(b)].sort((a,b)=>b-a);
  return (x+0.05)/(y+0.05);
}
const themes={};
for(const spec of textThemes){
  const [background,surface,text,primary,font,maxWidth]=spec.cms;
  if(!/^[a-z][a-z0-9-]+$/.test(spec.id)||Object.hasOwn(themes,spec.id)
    ||![background,surface,text,primary].every(hex)||!['georgia','arial','system'].includes(font)
    ||!Number.isInteger(maxWidth)||maxWidth<680||maxWidth>1600)
    throw Error('Unsafe or duplicate Design Factory theme');
  if(contrast(background,text)<4.5||contrast(surface,text)<4.5)
    throw Error('Theme contrast below 4.5:1: '+spec.id);
  const [surf,spacing,align]=spec.appearance;
  if(!['default','paper','tint','dark'].includes(surf)||!['tight','normal','airy'].includes(spacing)||!['left','center'].includes(align))
    throw Error('Invalid CMS section appearance');
  const [desktop,tablet,mobile]=spec.headline;
  if(![desktop,tablet,mobile].every(v=>Number.isInteger(v)&&v>=10&&v<=120))
    throw Error('Invalid responsive headline');
  const keys=Object.keys(enums),design={};
  spec.design.forEach((v,i)=>{if(!enums[keys[i]].includes(v))throw Error('Unexpected design token');design[keys[i]]=v;});
  themes[spec.id]=Object.freeze({
    label:spec.label,
    cms:Object.freeze({background,surface,text,primary,font,maxWidth}),
    appearance:Object.freeze({surface:surf,spacing,align}),
    headline:Object.freeze({desktop:desktop+'px',tablet:tablet+'px',mobile:mobile+'px'}),
    design:Object.freeze(design),
    contrast:Object.freeze({body:Number(contrast(background,text).toFixed(2)),card:Number(contrast(surface,text).toFixed(2))}),
  });
}
module.exports=Object.freeze(themes);
