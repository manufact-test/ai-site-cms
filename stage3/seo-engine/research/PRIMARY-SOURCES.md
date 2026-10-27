# Primary SEO and accessible UX sources

Reviewed: 2026-10-27. These are professional guidelines, not ranking guarantees.

- Google Search Essentials: https://developers.google.com/search/docs/essentials
  Core technical eligibility (crawler access, HTTP 200, indexable content), content/spam policy. Eligibility is not a promise to be indexed.
- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
  Useful original content, clear audience-oriented topics, navigation, meaningful URLs, descriptive anchors, natural titles and summaries.
- Structured data: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
  General policies: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
  Use only markup reflecting visible verifiable content. Schema.org vocabulary is not equivalent to supported Google rich-result features. Markup never guarantees display.
- Image SEO: https://developers.google.com/search/docs/appearance/google-images
  Informative context, useful concise alt; do not stuff keywords.
- WCAG 2.2: https://www.w3.org/WAI/WCAG22/Understanding/
  Non-text content 1.1.1: https://www.w3.org/WAI/WCAG22/Understanding/non-text-content
  Meaningful alternatives for informative images, empty alt for decorative images. Meaningful heading sequence, keyboard access, focus, text contrast and reduced motion also matter.
- Core Web Vitals: https://web.dev/articles/vitals
  Relevant current metrics: LCP, INP, CLS. Good thresholds (75th percentile field measurements): LCP <= 2.5s, INP <= 200ms, CLS <= 0.1. No metrics can be inferred reliably from inspecting JSON or HTML strings.

## Practical interpretation

1. Start with actual user need, region/language, conversion goal, research and one principal intent for each page. Topical terms are hypotheses, not claimed search volumes.
2. Design the URL/page map and navigation before static prototype pictures. Give each section a purpose, logical heading and next step. Links and CTAs must lead somewhere real.
3. Prefer one clear primary H1 per page as an editorial convention; it is not a fixed font-size or a blanket Google penalty for two H1 tags. H2-H6 reflect semantic relationships rather than visual styling.
4. Plan unique meaningful titles and meta descriptions, but search engines can rewrite snippets and there is no magic universal character count.
5. Avoid invented testimonials, prices, ratings, geographic coverage, guarantees, facts and staff credentials. Require source-backed confirmed claims for structured-data proposals. FAQ only when real user questions justify it; FAQ rich results are limited.
6. For relevant images state informative/decorative purpose. Informative alternative text describes what it conveys; decorative alt is empty. Page-specific context may prevent a safe global rewrite of shared image asset alt.
7. In three static mockups consider semantic/mobile content parity, comprehensible tap/hover/focus behaviour, keyboard usability, responsive structure and page experience, but do not call mockups a working website.
8. Real site analysis must distinguish observed structural errors from subjective recommendations. Offline tests cannot attest live HTTP, crawlability, Search Console status, content quality, real mobile UX, LCP/INP/CLS or ranking.

Revisit these primary sources for each substantive standards change.