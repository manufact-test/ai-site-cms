'use strict';
/* Private, static, escaped source-pair report. No scripts or network assets. */
const FORMAT='manufact-seo-rendered-content-audit-v1';
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const clean=s=>String(s??'').replace(/[\r\n|]/g,' ').slice(0,350);
function render(report){
 if(report?.format!==FORMAT||report.readOnly!==true||report.releaseAuthorized!==false||
  !Array.isArray(report.pages)||!Array.isArray(report.findings)||!report.summary)
  throw Error('Invalid source-pinned rendered content report');
 const s=report.summary;
 const md=[
  '# Rendered SEO content — HTTP vs desktop/tablet/mobile DOM',
  '',
  '> PRIVATE · UNVERIFIED CAPTURES · NO AUTOMATIC GO. Sources are operator-provided; neither browser nor public-host authenticity is independently established.',
  '',
  'Site ID: '+clean(report.siteId)+' · mount: '+clean(report.base),
  '',
  'Compared pages: '+s.fullyComparedPages+'/'+s.plannedPages+
   ' · observed device pairs: '+s.inspectedDevicePairs+' · P0: '+s.P0+
   ' · P1: '+s.P1+' · P2: '+s.P2,
  ...(report.renderedCaptureFormat==='manufact-seo-viewport-evidence-v2'?[
   '',
   'Chromium main-response body matches: '+s.browserResponseMatchedPairs+'/'+(s.plannedPages*3)+
   ' · drift: '+s.browserResponseDriftPairs+' · blocked-request pairs: '+s.browserBlockedPairs+
   ' · script-error pairs: '+s.browserPageErrorPairs+' · changing-DOM pairs: '+s.browserUnsettledPairs,
   'Denied reasons: '+Object.entries(s.browserBlockedReasonCounts).map(([k,n])=>k+'='+n).join(' · '),
   'CSS layout: observed '+s.cssInspectedDevicePairs+'/'+(s.plannedPages*3)+
   ' · unknown '+s.cssUnknownOrUnusableDevicePairs+' · hidden H1 '+s.cssHiddenH1DevicePairs+
   ' · hidden main '+s.cssHiddenMainDevicePairs+
   ' · hidden H2–H6 '+s.cssHiddenSecondaryHeadings+
   ' · hidden CTA '+s.cssHiddenCtaDestinations+
   ' · collapsed navigation '+s.cssCollapsedNavDestinations,
   'Computed CSS is a bounded layout heuristic; it does not prove Google indexing or accessibility.',
   'Browser image loading: observed '+s.mediaObservedDevicePairs+'/'+(s.plannedPages*3)+
   ' · unknown '+s.mediaUnknownDevicePairs+' · visible failures '+s.mediaVisibleFailed+
   ' · large first-screen failures '+s.mediaLargeAboveFoldFailed+
   ' · above-fold lazy '+s.mediaAboveFoldLazy+' · no alt attribute '+s.mediaVisibleMissingAlt+
   ' · no dimension attributes '+s.mediaVisibleMissingDimensions+
   ' · visible upscaling '+s.mediaVisibleUpscaled,
   'Image observations are not LCP/CLS or lab/field Core Web Vitals; CSS placeholders may reserve dimensions.',
   'Responsive layout: observed '+s.responsiveObservedPairs+'/'+(s.plannedPages*3)+
   ' · unknown '+s.responsiveUnknownPairs+
   ' · horizontal-overflow pairs '+s.responsiveOverflowPairs+
   ' · maximum overflow '+s.responsiveOverflowMaxPx+' CSS px'+
   ' · fixed-width viewport pairs '+s.responsiveFixedViewportPairs+
   ' · tiny-target pairs '+s.responsiveTinyTargetPairs+
   ' · unnamed-target pairs '+s.responsiveUnnamedTargetPairs+
   ' · clipped-content pairs '+s.responsiveClippedProminentPairs,
   'Responsive layout counters are bounded CSS heuristics, not visual, accessibility or Google Mobile Usability certification.',
   'Chromium navigation timing: observed '+s.timingObservedPairs+'/'+(s.plannedPages*3)+
   ' · unknown '+s.timingUnknownPairs+
   ' · slow response candidates '+s.timingSlowResponsePairs+
   ' · slow FCP candidates '+s.timingSlowPaintPairs+
   ' · FCP unavailable '+s.timingPaintUnknownPairs+
   ' · slow load candidates '+s.timingSlowLoadPairs,
   'All browser timings are single isolated lab-like samples, with blocked network requests and no real-user/Google Core Web Vitals evidence.',
   'Rendered main text footprint: observed '+s.textObservedPairs+'/'+(s.plannedPages*3)+
   ' · unknown '+s.textUnknownPairs+
   ' · empty main-text pairs '+s.textEmptyMainPairs+
   ' · hidden paragraph/list blocks '+s.textHiddenBlockTotal+
   ' · mobile content-loss candidates '+s.textMobileLossPages,
   'Text footprint reports only character/block counts; it does not copy content, verify copy quality, equivalence of meaning or user visibility of each word.',
  ]:[]),
  'JSON-LD semantic runtime comparison: observed '+s.schemaRuntimeObservedPairs+'/'+
   (s.plannedPages*3)+' · unknown '+s.schemaRuntimeUnknownPairs+
   ' · changed owner-sensitive claims '+s.schemaClaimChangedPairs+
   ' · unapproved type injections '+s.schemaUnapprovedTypePairs+
   ' · unconfirmed owner-fact types '+s.schemaUnconfirmedFactPairs+
   ' · unsafe semantic regressions '+s.schemaUnsafeEntityPairs,
  'Runtime comparisons reuse the original Schema.org parser; claim values are never copied. Neither unchanged JSON-LD nor successful comparison proves owner truth or Google eligibility.',
  'Approved internal link semantics: observed '+s.linkSemanticObservedPairs+'/'+
   (s.plannedPages*3)+' · unknown '+s.linkSemanticUnknownPairs+
   ' · restricted-only planned destination pairs '+s.linkRestrictedRoutePairs+
   ' · new unsafe-scheme anchor pairs '+s.linkUnsafeSchemeGrowthPairs+
   ' · new placeholder-anchor pairs '+s.linkPlaceholderGrowthPairs,
  'Link analysis compares read-only markup and approved Blueprint routes; it does not click anchors or test destination availability.',
  'Rendered same-device fragments: observed '+s.fragmentObservedPairs+'/'+
   (s.plannedPages*3)+' · unknown '+s.fragmentUnknownPairs+
   ' · missing target IDs '+s.fragmentMissingTotal+
   ' · unverifiable fragment links '+s.fragmentUnverifiedTotal+
   ' · affected device pairs '+s.fragmentMissingPairs,
  'A missing fragment is a markup observation, not an HTTP 404; partial or drifted target captures remain unknown.',
  '',
  '## Coverage',
  '',
  '| Page ID | Route | HTTP source | Desktop | Tablet | Mobile |',
  '|---|---|---|---|---|---|'
 ];
 for(const p of report.pages)md.push('| '+clean(p.pageId)+' | '+clean(p.path)+
  ' | '+(p.httpInspected?'observed':'unknown')+
  ' | '+['desktop','tablet','mobile'].map(d=>p.devices[d].inspected?'rendered DOM / schema '+clean(p.devices[d].schemaRuntimeStatus||'unknown')+' / links '+clean(p.devices[d].linkStatus||'unknown')+' / fragments '+clean(p.devices[d].fragmentStatus||'unknown')+(report.renderedCaptureFormat==='manufact-seo-viewport-evidence-v2'?' / CSS '+clean(p.devices[d].cssVisibilityStatus||'unknown')+' / images '+clean(p.devices[d].mediaStatus||'unknown')+' / responsive '+clean(p.devices[d].responsiveStatus||'unknown')+' / timing '+clean(p.devices[d].timingStatus||'unknown')+' / text '+clean(p.devices[d].textStatus||'unknown'):''):clean(p.devices[d].reason)).join(' | ')+' |');
 md.push('','## Manual investigations','','| Priority | Page | Device | Finding | Human next step |',
  '|---|---|---|---|---|');
 for(const f of report.findings)md.push('| '+f.priority+' | '+clean(f.pageId)+
  ' | '+clean(f.device||'HTTP')+' | '+clean(f.code)+
  ' | '+clean(f.detail)+' |');
 if(!report.findings.length)md.push('| — | — | — | No contradictions in supplied source pairs | Still not a release approval |');
 md.push('','## Required next steps','','- '+report.manualNext.map(clean).join('\n- '),
  '','Input original SHA256: '+Object.entries(report.inputSHA256).map(([k,v])=>k+'='+v).join(' · '),
  '','Never infer actual Google rendering, CSS visibility, live host status, source revision, owner claims, accessibility or release acceptance from this report.',
  '');
 const css=':root{color-scheme:dark}*{box-sizing:border-box}body{font:15px/1.55 system-ui,sans-serif;background:#0c1422;color:#e6edf8;margin:0 auto;max-width:1150px;padding:34px 22px}h1{font-size:clamp(24px,4vw,36px);letter-spacing:-.03em}h2{font-size:22px;margin-top:36px}p,li{color:#b9c8dc}.eyebrow{color:#8de0ce;font-size:12px;font-weight:800;letter-spacing:.12em}section{background:#132238;border:1px solid #29405a;border-radius:15px;padding:18px;margin-top:24px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:10px;border-bottom:1px solid #2d415b;vertical-align:top}th{color:#9eb9d4}td{overflow-wrap:anywhere}.scroll{overflow-x:auto}.kpis{display:flex;flex-wrap:wrap;gap:10px}.kpi{padding:13px 20px;border-radius:12px;background:#1b304a}.kpi b{font-size:23px;display:block}.p0{color:#ff8787}.p1{color:#ffd18e}.p2{color:#a9d8ff}code{color:#e5c5ff;overflow-wrap:anywhere}footer{font-size:12px;color:#9aaec4;margin-top:36px}';
 const row=f=>'<tr><td class="'+esc(f.priority.toLowerCase())+'">'+esc(f.priority)+
  '</td><td>'+esc(f.pageId)+'<div>'+esc(f.path)+'</div></td><td>'+esc(f.device||'HTTP')+
  '</td><td><code>'+esc(f.code)+'</code></td><td>'+esc(f.detail)+
  (f.sectionId?' <code>section: '+esc(f.sectionId)+'</code>':'')+
  (f.toPageId?' <code>target: '+esc(f.toPageId)+'</code>':'')+'</td></tr>';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<title>Private rendered SEO evidence</title><style>'+css+'</style></head><body>'+
  '<div class="eyebrow">PRIVATE · READ-ONLY · NOT RELEASE AUTHORIZATION</div>'+
  '<h1>Rendered SEO content reconciliation</h1>'+
  '<p>Operator-provided original HTTP HTML vs desktop, tablet and mobile rendered DOM; linked to approved Blueprint. No host/browser provenance or deployed source revision is authenticated.</p>'+
  '<div class="kpis">'+[['Compared',s.fullyComparedPages+'/'+s.plannedPages],['Device pairs',s.inspectedDevicePairs],['P0',s.P0],['P1',s.P1],['P2',s.P2],
   ['JSON-LD semantic pairs',s.schemaRuntimeObservedPairs+'/'+(s.plannedPages*3)],
   ['Changed schema claims',s.schemaClaimChangedPairs],
   ['Unconfirmed schema types',s.schemaUnconfirmedFactPairs],
   ['Unsafe schema regressions',s.schemaUnsafeEntityPairs],
   ['Link semantics observed',s.linkSemanticObservedPairs+'/'+(s.plannedPages*3)],
   ['Restricted internal link pairs',s.linkRestrictedRoutePairs],
   ['Missing fragment-ID pairs',s.fragmentMissingPairs],
   ...(report.renderedCaptureFormat==='manufact-seo-viewport-evidence-v2'?[
    ['HTTP body matches',s.browserResponseMatchedPairs+'/'+(s.plannedPages*3)],
    ['Body drift',s.browserResponseDriftPairs],['Blocked request pairs',s.browserBlockedPairs],
    ['Script error pairs',s.browserPageErrorPairs],['Unsettled DOM pairs',s.browserUnsettledPairs],
    ['CSS observed',s.cssInspectedDevicePairs+'/'+(s.plannedPages*3)],
    ['H1 CSS-hidden',s.cssHiddenH1DevicePairs],['Main CSS-hidden',s.cssHiddenMainDevicePairs],
    ['H2–H6 CSS-hidden',s.cssHiddenSecondaryHeadings],
    ['Hidden CTA routes',s.cssHiddenCtaDestinations],
    ['Collapsed navigation',s.cssCollapsedNavDestinations],
    ['Image pairs',s.mediaObservedDevicePairs+'/'+(s.plannedPages*3)],
    ['Broken visible images',s.mediaVisibleFailed],
    ['Lazy first-screen images',s.mediaAboveFoldLazy],
    ['Visible images missing alt',s.mediaVisibleMissingAlt],
    ['Responsive observed',s.responsiveObservedPairs+'/'+(s.plannedPages*3)],
    ['Horizontal overflow pairs',s.responsiveOverflowPairs],
    ['Maximum overflow px',s.responsiveOverflowMaxPx],
    ['Tiny target pairs',s.responsiveTinyTargetPairs],
    ['Unnamed target pairs',s.responsiveUnnamedTargetPairs],
    ['Browser timing observed',s.timingObservedPairs+'/'+(s.plannedPages*3)],
    ['Slow FCP candidates',s.timingSlowPaintPairs],
    ['Main text observed',s.textObservedPairs+'/'+(s.plannedPages*3)],
    ['Mobile text-loss candidates',s.textMobileLossPages]]:[])].map(x=>'<div class="kpi"><b>'+esc(x[1])+'</b>'+esc(x[0])+'</div>').join('')+'</div>'+
  '<section><h2>Evidence coverage</h2><div class="scroll"><table><thead><tr><th>Page</th><th>Route</th><th>HTTP</th><th>Desktop</th><th>Tablet</th><th>Mobile</th></tr></thead><tbody>'+
  report.pages.map(p=>'<tr><td>'+esc(p.pageId)+'</td><td>'+esc(p.path)+'</td><td>'+(p.httpInspected?'observed':'unknown')+
   '</td>'+['desktop','tablet','mobile'].map(d=>'<td>'+esc(p.devices[d].inspected?'rendered DOM / schema '+(p.devices[d].schemaRuntimeStatus||'unknown')+' / links '+(p.devices[d].linkStatus||'unknown')+' / fragments '+(p.devices[d].fragmentStatus||'unknown')+(report.renderedCaptureFormat==='manufact-seo-viewport-evidence-v2'?' / CSS '+(p.devices[d].cssVisibilityStatus||'unknown')+' / images '+(p.devices[d].mediaStatus||'unknown')+' / responsive '+(p.devices[d].responsiveStatus||'unknown')+' / timing '+(p.devices[d].timingStatus||'unknown')+' / text '+(p.devices[d].textStatus||'unknown'):''):p.devices[d].reason)+'</td>').join('')+'</tr>').join('')+
  '</tbody></table></div></section>'+
  '<section><h2>Human investigations</h2><div class="scroll"><table><thead><tr><th>Priority</th><th>Page</th><th>Device</th><th>Code</th><th>What to inspect</th></tr></thead><tbody>'+
  (report.findings.length?report.findings.map(row).join(''):'<tr><td colspan="5">No detected contradiction in supplied captures. This does not prove Google rendering or SEO acceptance.</td></tr>')+
  '</tbody></table></div></section>'+
  '<section><h2>Before pilot SEO signoff</h2><ol>'+report.manualNext.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></section>'+
  '<footer>CSS, responsive layout, navigation timing, main-text footprint, image loading and JSON-LD comparisons are observations, not field Core Web Vitals, Google rendering, factual claims, menu interaction or accessibility approval. Original source byte digests recorded. Private report excludes customer HTML, copied body text, pricing, reviews, resource URLs, research and heading text. Not Google Search Console data; never automatic GO.</footer>'+
  '</body></html>';
 return {html,markdown:md.join('\n')};
}
module.exports=Object.freeze({render});
