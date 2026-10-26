'use strict';
// This is a local human-review form, never an automatic screenshot approval.
const SCRIPT="(function(){\n'use strict';\nconst cards=[...document.querySelectorAll('article[data-review]')];\nconst checks=['layoutAndOverflow','showcaseCoverage','keyboardAndTouch','localesAndCopy','motionAndContent'];\nconst reviewer=document.getElementById('reviewer'),status=document.getElementById('review-status');\nconst download=document.getElementById('download-review');\nconst full=document.body.dataset.fullMatrix==='true';\nconst update=()=>{\n let completed=0,rejected=0,missingNotes=0;\n for(const el of cards){\n  const verdict=el.querySelector('input[type=radio]:checked');\n  if(!verdict)continue;\n  completed++;\n  if(verdict.value==='rejected'){\n   rejected++;\n   if(!el.querySelector('textarea').value.trim())missingNotes++;\n  }\n }\n const name=reviewer.value.trim();\n const ready=full&&cards.length===54&&completed===54&&missingNotes===0&&\n  name.length>=3&&name.length<=120&&\n  checks.every(key=>document.getElementById(key).checked);\n download.disabled=!ready;\n status.textContent=completed+'/'+cards.length+' reviewed; '+rejected+' rejected; '+\n  (ready?'receipt ready':'complete review, reviewer and interaction checks required');\n};\ndocument.addEventListener('input',update);\ndocument.addEventListener('change',update);\ndownload.addEventListener('click',()=>{\n if(download.disabled)return;\n const images=cards.map(el=>({\n  file:el.dataset.file,sha256:el.dataset.sha256,\n  verdict:el.querySelector('input[type=radio]:checked').value,\n  note:el.querySelector('textarea').value.trim()\n }));\n const receipt={format:'manufact-design-factory-visual-review-v2',version:2,\n  evidenceSha256:document.body.dataset.evidenceSha256,reviewer:reviewer.value.trim(),\n  reviewedAt:new Date().toISOString(),\n  manualChecks:Object.fromEntries(checks.map(key=>[key,true])),images,\n  warning:'Self-declared human review, not CMS release authorization'};\n const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)+'\\n'],{type:'application/json'}));\n const anchor=document.createElement('a');\n anchor.href=url;anchor.download='visual-review-decision.json';\n document.body.appendChild(anchor);anchor.click();anchor.remove();\n setTimeout(()=>URL.revokeObjectURL(url),1000);\n});\nupdate();\n})();";
function reviewHtml(report){
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 })[c]);
 const card=(item,i)=>{
  const name=escape(item.file.replace(/^screenshots\//,'').replace(/\.png$/,'').replace(/-/g,' '));
  return '<article data-review data-file="'+escape(item.file)+'" data-sha256="'+escape(item.sha256)+'">'+
   '<div class="meta"><strong>'+name+'</strong><span>'+escape(item.actualWidth+'×'+item.actualHeight)+
   ' · '+(item.viewportMatch?'verified dimensions':'MISMATCH')+'</span></div>'+
   '<a href="'+escape(item.file)+'" target="_blank" rel="noopener" aria-label="Inspect '+name+'">'+
   '<img loading="lazy" src="'+escape(item.file)+'" alt="'+name+' screenshot"></a>'+
   '<fieldset><legend>Manual visual decision</legend>'+
   '<label><input type="radio" name="verdict-'+i+'" value="approved"> Approve</label>'+
   '<label><input type="radio" name="verdict-'+i+'" value="rejected"> Reject</label>'+
   '<label class="note">Note / defect <textarea rows="2" maxlength="1500" placeholder="Required for rejection"></textarea></label>'+
   '</fieldset></article>';
 };
 const numbered=report.images.map((image,i)=>({image,i}));
 const groups=[
  ['Themes · 12 visual directions',numbered.filter(x=>x.image.file.includes('/theme-'))],
  ['D3 · 42 compositions',numbered.filter(x=>x.image.file.includes('/42-compositions-'))],
  ['D4 · industry websites, RU + EN',numbered.filter(x=>x.image.file.includes('/sector-'))]
 ];
 const sections=groups.map(([name,images])=>'<section><h2>'+escape(name)+'</h2><div class="images">'+
  images.map(x=>card(x.image,x.i)).join('')+'</div></section>').join('');
 const alerts=report.errors?.length?'<p class="error">CAPTURE ERRORS: '+
  escape(report.errors.join(' | '))+'</p>':'';
 const full=report.matrixComplete===true&&report.captureCompleted===true&&
  report.quick===false&&report.images.length===54&&report.errors.length===0;
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="robots" content="noindex"><title>Design Factory · D7 human visual review</title>'+
 '<style>*,*:before,*:after{box-sizing:border-box}body{margin:0;background:#10181a;color:#edf5f2;font:15px/1.55 system-ui,sans-serif}'+
 'main{max-width:1500px;margin:auto;padding:clamp(16px,3vw,46px)}h1{font-size:clamp(1.8rem,3.5vw,3rem);line-height:1.1}h2{margin:40px 0 17px;font-size:1.5rem}'+
 '.muted{color:#b4c5c2;max-width:850px}.status{padding:12px 16px;border:1px solid #66716c;border-radius:10px;background:#202a2c}.error{color:#ffd2b6}'+
 '.images{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:18px}article{padding:10px;background:#202b2e;border:1px solid #48605b;border-radius:12px;min-width:0}'+
 '.meta{display:grid;gap:3px;padding:8px 6px 12px}.meta span{font-size:.83rem;color:#b6cbc6}img{display:block;width:100%;height:auto;border:1px solid #67716a;background:white}'+
 'a:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #c5f57b;outline-offset:3px}footer{margin:40px 0;color:#bfccc8}'+
 'fieldset{margin:10px 0 0;padding:10px;border:1px solid #67716a;border-radius:8px}fieldset label{display:inline-flex;gap:5px;align-items:center;margin-right:12px}'+
 'fieldset label.note{display:flex;flex-direction:column;align-items:stretch;gap:6px;margin-top:12px}textarea,input[type=text]{color:#edf5f2;background:#10181a;border:1px solid #748a82;border-radius:7px;padding:9px;width:100%}'+
 '.review-form{max-width:900px;background:#202b2e;padding:18px;border:1px solid #67716a;border-radius:12px}.review-form label{display:block;margin:10px 0}'+
 '.showcase-review-link{display:inline-flex;margin:4px 0 12px;padding:11px 14px;border:1px solid #c5f57b;border-radius:8px;color:#c5f57b;font-weight:700;text-decoration-thickness:2px;text-underline-offset:3px}'+
 'button{padding:12px 18px;background:#c5f57b;color:#10181a;border:0;border-radius:8px;font:inherit;font-weight:700;cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}'+
 '@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}</style></head>'+
 '<body data-full-matrix="'+String(full)+'" data-evidence-sha256="'+escape(report.evidenceSha256||'')+'"><main>'+
 '<h1>Design Factory · visual review</h1><p class="status">Manual visual acceptance: <strong>PENDING</strong> · '+
 report.images.length+' / '+report.expectedImages+' screenshots · matrix '+
 (report.matrixComplete?'complete':'incomplete')+' · 1280 / 768 / 390 px</p>'+
 alerts+'<p class="muted">Inspect screenshot quality, overflow, navigation, RU/EN, and owner placeholders. Open real sites separately for keyboard, touch and motion checks. A self-declared receipt is NOT PHP pixel parity or CMS approval.</p>'+
 '<div class="review-form"><h2>Complete human review</h2>'+
 '<p>Approve or reject every PNG below. Rejections require notes. Open the full D3 showroom, scroll through all 42 compositions, then confirm all five manual checks.</p>'+
 '<p><a class="showcase-review-link" href="showcase/index.html" target="_blank" rel="noopener">Open the full D3 showcase · inspect all 42 compositions</a></p>'+
 '<label for="reviewer">Reviewer identifier</label><input type="text" id="reviewer" maxlength="120" autocomplete="name">'+
 '<label><input type="checkbox" id="layoutAndOverflow"> Reviewed responsive layout, clipping, typography and overflow</label>'+
 '<label><input type="checkbox" id="showcaseCoverage"> Opened the full D3 showcase and inspected all 42 compositions across the scrollable page</label>'+
 '<label><input type="checkbox" id="keyboardAndTouch"> Tested keyboard focus, navigation and touch targets</label>'+
 '<label><input type="checkbox" id="localesAndCopy"> Reviewed RU/EN copy, placeholder labels and media rights</label>'+
 '<label><input type="checkbox" id="motionAndContent"> Tested reduced-motion behavior and owner-content gates</label>'+
 '<p id="review-status" role="status" aria-live="polite"></p>'+
 '<button type="button" id="download-review" disabled>Download visual-review-decision.json</button>'+
 '<p class="muted">Run the verifier against unchanged evidence and the downloaded receipt. This records claims, not verified identity or publication permission.</p></div>'+
 sections+'<footer>Offline evidence · no analytics · see visual-evidence.json</footer>'+
 '</main><script>'+SCRIPT+'</script></body></html>\n';
}
module.exports=Object.freeze({reviewHtml});
