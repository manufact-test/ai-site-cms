import fs from 'node:fs';
import path from 'node:path';
import { notFound, permanentRedirect } from 'next/navigation';
import React from 'react';

// Only immutable published HTML is read. No CMS imports, tokens, sessions or DB.
const base = path.join(process.cwd(), 'data');
const manifest = JSON.parse(fs.readFileSync(path.join(base, 'release-manifest.json'), 'utf8'));
const decode = text => String(text ?? '').replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|#039);/gi, (_, code) => {
  const common = {amp:'&', quot:'"', apos:"'", lt:'<', gt:'>', '#039':"'"};
  if (common[code.toLowerCase()]) return common[code.toLowerCase()];
  if (code[0] === '#') {
    const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isInteger(n) && n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '';
  }
  return _;
});
export const routeFromSlug = slug => slug?.length ? '/' + slug.join('/') + '/' : '/';
const entry = route => manifest.pages.find(p => p.path === route) ??
  manifest.redirects.find(p => p.from === route);
const htmlFor = route => {
  const item = entry(route);
  if (!item) notFound();
  return fs.readFileSync(path.join(base, item.file), 'utf8');
};
function tag(html, regex) { return decode(html.match(regex)?.[1] ?? ''); }
export function metadataFor(route) {
  const html = htmlFor(route);
  const value = (name, key = 'name') => tag(html, new RegExp('<meta\\s+' + key + '="' + name + '"\\s+content="([^"]*)"','i'));
  const title = tag(html, /<title>([\s\S]*?)<\/title>/i);
  const description = value('description');
  const robots = value('robots');
  const canonical = tag(html, /<link rel="canonical" href="([^"]*)"/i);
  const ogTitle = value('og:title','property') || title;
  const ogDescription = value('og:description','property') || description;
  const ogImage = value('og:image','property');
  const ogUrl = value('og:url','property');
  const twitterImage = value('twitter:image');
  return {
    title, description,
    ...(robots ? {robots} : {}),
    ...(canonical ? {alternates:{canonical}} : {}),
    openGraph: {type:'website', title:ogTitle, description:ogDescription,
      ...(ogUrl ? {url:ogUrl} : {}), ...(ogImage ? {images:[ogImage]} : {})},
    twitter: {card:twitterImage ? 'summary_large_image' : 'summary',
      title:value('twitter:title') || ogTitle, description:value('twitter:description') || ogDescription,
      ...(twitterImage ? {images:[twitterImage]} : {})}
  };
}
export function renderPage(route, serverRedirect = false) {
  const redirected = manifest.redirects.find(r => r.from === route);
  if (serverRedirect && redirected) permanentRedirect(redirected.to); // Next default is HTTP 308
  const html = htmlFor(route);
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (body === undefined) throw new Error('Published HTML body missing');
  const styles = Array.from(html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi), m => m[1]).join('\n');
  return React.createElement(React.Fragment, null,
    React.createElement('style', {dangerouslySetInnerHTML:{__html:styles}}),
    React.createElement('div', {dangerouslySetInnerHTML:{__html:body}})
  );
}
export function language() { return tag(htmlFor('/'), /<html lang="([^"]*)"/i) || 'ru'; }
