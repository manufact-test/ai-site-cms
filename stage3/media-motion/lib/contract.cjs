/* media-motion-bundle-v1, intentionally self-contained for file:// browsers and Node */
(function (root, build) {
  'use strict';
  const api = build();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MediaMotionContract = api;
})(typeof globalThis === 'object' ? globalThis : null, function () {
  'use strict';
  const FORMAT = 'media-motion-bundle-v1';
  const MAX_OUTPUT = 450 * 1024;
  const ID = /^[a-z][a-z0-9-]{2,63}$/;
  const SHA = /^[a-f0-9]{64}$/;
  const MODES = ['grid', 'masonry', 'carousel'];
  const EFFECTS = ['none', 'fade', 'slide-up', 'slide-left', 'scale', 'reveal', 'stagger', 'hover-lift', 'focus-ring'];
  const EASINGS = ['ease', 'ease-out', 'ease-in-out', 'linear'];
  const TRIGGERS = ['load', 'hover', 'focus', 'manual'];
  const ICONS = ['spark', 'image', 'layers', 'arrow', 'play', 'check', 'sun', 'star'];
  const MIME = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const must = (condition, error) => { if (!condition) throw new Error(error); };
  const keys = (object, allowed, path) => {
    must(isObj(object), path + ': expected object');
    must(Object.keys(object).every(key => allowed.includes(key)), path + ': unknown field');
    must(allowed.every(k => Object.prototype.hasOwnProperty.call(object, k)), path + ': missing field');
  };
  const text = (s, max, path) => must(typeof s === 'string' && s.length <= max && !/[\u0000-\u001f\u007f]/.test(s), path + ': invalid text');
  const integer = (v, min, max, name) => must(Number.isInteger(v) && v >= min && v <= max, name + ': out of range');
  const ext = mime => MIME[mime];
  const safeName = v => typeof v === 'string' && /^media\/[a-z][a-z0-9-]{2,63}-[0-9]{2,5}\.(png|jpg|webp)$/.test(v);
  const hex = bytes => Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
  function normalizeVideo(provider, url) {
    text(url, 300, 'video.url');
    if (provider === 'none') { must(url === '', 'video:none requires blank URL'); return ''; }
    const parsed = new URL(url);
    must(parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port && !parsed.search && !parsed.hash, 'Video URL must be a clean https URL');
    if (provider === 'youtube') {
      must(parsed.hostname === 'www.youtube-nocookie.com' && /^\/embed\/[A-Za-z0-9_-]{11}$/.test(parsed.pathname), 'YouTube privacy embed only');
    } else if (provider === 'vimeo') {
      must(parsed.hostname === 'player.vimeo.com' && /^\/video\/[0-9]{1,15}$/.test(parsed.pathname), 'Vimeo player embed only');
    } else must(false, 'Unsupported video provider');
    return url;
  }
  function motionCSS(motions) {
    const used = motions.filter(m => m.preset !== 'none');
    if (!used.length) return '';
    let css = '@media (prefers-reduced-motion: no-preference){\n';
    for (const m of used) {
      const cls = '.mm-' + m.id;
      const timing = `${m.duration}ms ${m.easing} ${m.delay}ms`;
      const d = m.distance;
      const frames = ({ fade: ['opacity:0', 'opacity:1'], 'slide-up': [`opacity:0;transform:translateY(${d}px)`, 'opacity:1;transform:none'], 'slide-left': [`opacity:0;transform:translateX(-${d}px)`, 'opacity:1;transform:none'], scale: [`opacity:0;transform:scale(${(1 - d / 250).toFixed(3)})`, 'opacity:1;transform:none'], reveal: ['clip-path:inset(0 0 100% 0);opacity:.75', 'clip-path:inset(0);opacity:1'], stagger: [`opacity:0;transform:translateY(${d}px)`, 'opacity:1;transform:none'] })[m.preset];
      if (frames) {
        css += `@keyframes mm-k-${m.id}{from{${frames[0]}}to{${frames[1]}}}\n`;
        // CSS-only baseline always shows content, never sets initial opacity to zero.
        const selector = m.preset === 'stagger' ? `${cls}>*` : cls;
        css += `${selector}{animation:mm-k-${m.id} ${timing} both}\n`;
        if (m.preset === 'stagger') css += `${cls}>*:nth-child(2){animation-delay:${m.delay + 80}ms}${cls}>*:nth-child(3){animation-delay:${m.delay + 160}ms}\n`;
      } else if (m.preset === 'hover-lift') css += `${cls}{transition:transform ${timing}}${cls}:hover{transform:translateY(-${d}px)}\n`;
      else if (m.preset === 'focus-ring') css += `${cls}:focus-visible{outline:3px solid currentColor;outline-offset:3px}\n`;
      if (m.mobile === 'off') css += `@media(max-width:600px){${cls},${cls}>*{animation:none!important;transition:none!important;transform:none!important}}\n`;
    }
    return css + '}\n@media (prefers-reduced-motion: reduce){[class*="mm-"]{animation:none!important;transition:none!important;transform:none!important;clip-path:none!important}}\n';
  }
  function validateBundle(bundle) {
    keys(bundle, ['format', 'assets', 'galleries', 'motions', 'icons', 'video', 'css'], 'bundle');
    must(bundle.format === FORMAT, 'Unsupported bundle format');
    must(Array.isArray(bundle.assets) && bundle.assets.length <= 50, 'Invalid assets');
    must(Array.isArray(bundle.galleries) && bundle.galleries.length <= 12, 'Invalid galleries');
    must(Array.isArray(bundle.motions) && bundle.motions.length <= 20, 'Invalid motions');
    must(Array.isArray(bundle.icons) && bundle.icons.length <= ICONS.length && new Set(bundle.icons).size === bundle.icons.length && bundle.icons.every(x => ICONS.includes(x)), 'Invalid icon tokens');
    const aids = new Set(), variantPaths = new Set();
    for (const a of bundle.assets) {
      keys(a, ['id', 'name', 'alt', 'caption', 'focal', 'original', 'variants'], 'asset');
      must(ID.test(a.id) && !aids.has(a.id), 'Invalid/duplicate asset ID'); aids.add(a.id);
      text(a.name, 140, 'asset.name'); text(a.alt, 200, 'asset.alt'); text(a.caption, 500, 'asset.caption');
      keys(a.focal, ['x', 'y'], 'focal'); integer(a.focal.x, 0, 100, 'focal.x'); integer(a.focal.y, 0, 100, 'focal.y');
      keys(a.original, ['mime', 'width', 'height', 'bytes', 'sha256'], 'original');
      must(Boolean(MIME[a.original.mime]), 'Original MIME disallowed'); integer(a.original.width, 1, 8192, 'original.width'); integer(a.original.height, 1, 8192, 'original.height');
      integer(a.original.bytes, 1, 12 * 1024 * 1024, 'original.bytes'); must(SHA.test(a.original.sha256), 'Invalid original hash');
      must(Array.isArray(a.variants) && a.variants.length <= 4, 'Invalid variants');
      const sizes = new Set();
      for (const v of a.variants) {
        keys(v, ['file', 'mime', 'width', 'height', 'bytes', 'sha256'], 'variant');
        must(safeName(v.file) && v.file.startsWith('media/' + a.id + '-') && v.file.endsWith('.' + MIME[v.mime]), 'Unsafe variant file/type');
        integer(v.width, 1, 8192, 'variant.width'); integer(v.height, 1, 8192, 'variant.height');
        integer(v.bytes, 1, MAX_OUTPUT, 'variant.bytes'); must(SHA.test(v.sha256), 'Invalid variant hash');
        must(!sizes.has(v.width) && !variantPaths.has(v.file), 'Duplicate variant');
        must(v.width * v.height <= a.original.width * a.original.height && Math.max(v.width,v.height) <= Math.max(a.original.width,a.original.height), 'Unexpected upscaling');
        sizes.add(v.width); variantPaths.add(v.file);
      }
    }
    const mids = new Set();
    for (const m of bundle.motions) {
      keys(m, ['id', 'preset', 'duration', 'delay', 'easing', 'distance', 'trigger', 'mobile'], 'motion');
      must(ID.test(m.id) && !mids.has(m.id), 'Invalid/duplicate motion ID'); mids.add(m.id);
      must(EFFECTS.includes(m.preset) && EASINGS.includes(m.easing) && TRIGGERS.includes(m.trigger) && ['on', 'off'].includes(m.mobile), 'Invalid motion enums');
      integer(m.duration, 100, 1200, 'motion.duration'); integer(m.delay, 0, 600, 'motion.delay'); integer(m.distance, 0, 64, 'motion.distance');
    }
    const gids = new Set();
    for (const g of bundle.galleries) {
      keys(g, ['id', 'title', 'layout', 'assetIds', 'columns', 'motionId'], 'gallery');
      must(ID.test(g.id) && !gids.has(g.id), 'Invalid/duplicate gallery ID'); gids.add(g.id);
      text(g.title, 100, 'gallery.title'); must(MODES.includes(g.layout), 'Invalid gallery layout'); integer(g.columns, 1, 5, 'gallery.columns');
      must(Array.isArray(g.assetIds) && g.assetIds.length <= 40 && new Set(g.assetIds).size === g.assetIds.length && g.assetIds.every(x => aids.has(x)), 'Invalid gallery assets');
      must(g.motionId === null || mids.has(g.motionId), 'Unknown gallery motion');
    }
    keys(bundle.video, ['provider', 'url', 'posterAssetId', 'aspect'], 'video');
    normalizeVideo(bundle.video.provider, bundle.video.url);
    must(bundle.video.posterAssetId === null || aids.has(bundle.video.posterAssetId), 'Unknown video poster');
    must(['16:9', '4:3', '1:1'].includes(bundle.video.aspect), 'Invalid video aspect');
    must(typeof bundle.css === 'string' && bundle.css === motionCSS(bundle.motions), 'CSS must be deterministic from motions');
    return bundle;
  }
  const emptyBundle = () => ({ format: FORMAT, assets: [], galleries: [{ id: 'gallery-main', title: 'Галерея', layout: 'grid', assetIds: [], columns: 3, motionId: 'motion-main' }], motions: [{ id: 'motion-main', preset: 'fade', duration: 440, delay: 0, easing: 'ease-out', distance: 24, trigger: 'load', mobile: 'on' }], icons: ['image', 'play'], video: { provider: 'none', url: '', posterAssetId: null, aspect: '16:9' }, css: '' });
  function makeBundle() { const b = emptyBundle(); b.css = motionCSS(b.motions); return b; }
  function srcset(asset) {
    return asset.variants.slice().sort((a, b) => a.width - b.width).map(v => `${v.file} ${v.width}w`).join(', ');
  }
  return Object.freeze({ FORMAT, MAX_OUTPUT, ID, MIME, MODES, EFFECTS, EASINGS, TRIGGERS, ICONS, normalizeVideo, motionCSS, validateBundle, makeBundle, srcset, hex });
});
