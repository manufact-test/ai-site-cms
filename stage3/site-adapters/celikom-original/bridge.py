#!/usr/bin/env python3
"""CELIKOM saved-source preservation bridge. Offline prep only, NOT a CMS importer.

No network, no credentials and no publication. Requires: beautifulsoup4.
"""
import argparse
import hashlib
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString

FORMAT = "celikom-source-content-map-v1"
ORIGIN = "https://lemonchiffon-narwhal-791953.hostingersite.com"
MAX_ZIP_BYTES = 40 * 1024 * 1024

def digest(data): return hashlib.sha256(data).hexdigest()

def secure_extract(archive, dest):
    with zipfile.ZipFile(archive) as z:
        members = [x for x in z.infolist() if not x.is_dir()]
        if sum(x.file_size for x in members) > MAX_ZIP_BYTES: raise ValueError('ZIP слишком большой')
        for i in members:
            rel = Path(i.filename)
            if rel.is_absolute() or any(part in ('..', '') for part in rel.parts): raise ValueError('Unsafe ZIP path')
            if rel.suffix.lower() not in {'.html','.css','.js','.svg','.woff2','.png','.jpg','.jpeg','.webp','.mp3','.ogg','.wav'} and not rel.name.startswith('saved_resource') and '.Без названия' not in rel.name:
                raise ValueError('Неизвестный тип файла: '+str(rel))
            target = dest / rel
            if not target.resolve().is_relative_to(dest.resolve()): raise ValueError('Unsafe output path')
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(z.read(i))
    return members

def text_value(el): return el.get_text(' ', strip=True)
def plain_edit(tag, value):
    tag.clear()
    tag.append(NavigableString(value))
def heading_parts(tag):
    return [n for n in tag.descendants if isinstance(n, NavigableString) and str(n).strip()]

def discover_fields(soup):
    result = {}
    def field(key, node, kind='text', maxlen=1500):
        if node is None: return
        if key in result: raise ValueError('Duplicate content key '+key)
        result[key] = {'node':node,'value':str(node) if kind=='fragment' else text_value(node),'max':maxlen,'kind':kind}
    field('seo.title',soup.title,'text',150)
    field('seo.description',soup.select_one('meta[name="description"]'),'meta',350)
    if 'seo.description' in result:
        result['seo.description']['value']=soup.select_one('meta[name="description"]').get('content','')
    for section in soup.select('section[id]'):
        sid=section.get('id')
        if not re.fullmatch(r'[a-z][a-z0-9-]*',sid): continue
        head=section.find(['h1','h2'])
        if head:
            for i,part in enumerate(heading_parts(head),1): field(f'{sid}.heading.{i}',part,'fragment',220)
        lead=section.select_one('p.hero-lead, p.section-body')
        if lead and not lead.find(True): field(f'{sid}.intro',lead,'text',1000)
        if sid not in ('faq','features','how','contribute','install','transparency'): continue
        for i,tag in enumerate(section.find_all('h3'),1):
            if tag.find(True): continue
            field(f'{sid}.item.{i}.title',tag,'text',220)
            p=tag.find_next_sibling('p')
            if p and not p.find(True): field(f'{sid}.item.{i}.body',p,'text',1000)
    faq=soup.select('section#faq details.faq-item[id]')
    if len(faq)!=28: raise ValueError('Expected 28 original FAQ items, got '+str(len(faq)))
    for d in faq:
        ident=d['id']
        q=d.select_one('summary span')
        a=d.select_one('.answer > p')
        if q is None or a is None or q.find(True) or a.find(True):
            raise ValueError('Unsupported FAQ structure at '+ident)
        field(f'faq.{ident}.question',q,'text',320)
        field(f'faq.{ident}.answer',a,'text',3000)
    return result

def editable_manifest(html_bytes):
    soup=BeautifulSoup(html_bytes.decode('utf-8'),'html.parser')
    fields=discover_fields(soup)
    return {'format':FORMAT,'source_sha256':digest(html_bytes),'fields':{k:row['value'] for k,row in fields.items()}}

def normalize_local_links(text):
    text=text.replace(ORIGIN+'/#','#')
    text=text.replace(ORIGIN+'/','./')
    return text

def apply_values(html_bytes, values):
    if values.get('format')!=FORMAT: raise ValueError('Unsupported values format')
    if values.get('source_sha256')!=digest(html_bytes): raise ValueError('Source SHA-256 mismatch; stop')
    if not isinstance(values.get('fields'),dict): raise ValueError('Missing fields object')
    soup=BeautifulSoup(html_bytes.decode('utf-8'),'html.parser')
    available=discover_fields(soup)
    if set(values['fields'])!=set(available): raise ValueError('Changed/unknown/missing keys; stop')
    changed=0
    for key,new in values['fields'].items():
        row=available[key]
        if not isinstance(new,str) or not new.strip() or len(new)>row['max'] or '\x00' in new:
            raise ValueError('Invalid edit: '+key)
        if new==row['value']: continue
        if row['kind']=='fragment': row['node'].replace_with(NavigableString(new))
        elif row['kind']=='meta': row['node']['content']=new
        else: plain_edit(row['node'],new)
        changed+=1
    return (normalize_local_links(str(soup)) if changed else normalize_local_links(html_bytes.decode('utf-8'))),changed

def source_inventory(root):
    originals=list(root.glob('*.html'))
    if len(originals)!=1: raise ValueError('Expected exactly one saved HTML file')
    source=originals[0];html=source.read_bytes()
    if not html.startswith(b'<!DOCTYPE html>') and b'<html' not in html[:1000]: raise ValueError('Invalid HTML')
    resource_dirs=[x for x in root.iterdir() if x.is_dir() and x.name.endswith('_files')]
    if len(resource_dirs)!=1: raise ValueError('Expected saved resource directory')
    if len(BeautifulSoup(html,'html.parser').select('section[id]'))!=11: raise ValueError('Expected 11 sections')
    return source,resource_dirs[0],html

def make_edit_workspace(original_zip,out):
    if out.exists(): raise ValueError('Target exists: refuse overwrite')
    out.mkdir(parents=True)
    try:
        root=out/'source';root.mkdir()
        secure_extract(original_zip,root)
        page,res,html=source_inventory(root)
        fields=editable_manifest(html)
        (out/'values.json').write_text(json.dumps(fields,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        files={str(p.relative_to(root)):digest(p.read_bytes()) for p in root.rglob('*') if p.is_file()}
        info={'format':'celikom-source-preservation-v1','source_zip_sha256':digest(Path(original_zip).read_bytes()),'source_html':page.name,'resources_directory':res.name,'sha256':files,'sections':11,'faq':28,'editable_keys':len(fields['fields']),'missing_audio':['/?demo_audio=service','/?demo_audio=restored'],'cms_imported':False}
        (out/'source-manifest.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        return info
    except Exception:
        shutil.rmtree(out,ignore_errors=True);raise

def build(workspace,out,values_path=None):
    if out.exists(): raise ValueError('Target exists: refuse overwrite')
    src=workspace/'source'
    info=json.loads((workspace/'source-manifest.json').read_text(encoding='utf-8'))
    for rel,sha in info['sha256'].items():
        p=src/rel
        if not p.exists() or digest(p.read_bytes())!=sha: raise ValueError('Original source changed: '+rel)
    page=src/info['source_html'];html=page.read_bytes()
    values=json.loads((values_path or workspace/'values.json').read_text(encoding='utf-8'))
    new_html,changed=apply_values(html,values)
    out.mkdir(parents=True)
    try:
        shutil.copytree(src/info['resources_directory'],out/info['resources_directory'])
        (out/'index.html').write_text(new_html,encoding='utf-8')
        manifest={'format':'celikom-source-preview-v1','source_zip_sha256':info['source_zip_sha256'],'source_html_sha256':digest(html),'preview_html_sha256':digest(new_html.encode()),'changed_fields':changed,'cms_imported':False,'audio_available':False}
        (out/'bridge-report.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        return manifest
    except Exception:
        shutil.rmtree(out,ignore_errors=True);raise

def main():
    ap=argparse.ArgumentParser(description='Preserve CELIKOM and patch allowlisted text offline')
    sub=ap.add_subparsers(dest='cmd',required=True)
    p=sub.add_parser('prepare');p.add_argument('archive');p.add_argument('workspace')
    p=sub.add_parser('build');p.add_argument('workspace');p.add_argument('output');p.add_argument('--values')
    args=ap.parse_args()
    try:
        if args.cmd=='prepare':result=make_edit_workspace(Path(args.archive),Path(args.workspace))
        else:result=build(Path(args.workspace),Path(args.output),Path(args.values) if args.values else None)
        print(json.dumps(result,ensure_ascii=False,indent=2))
    except Exception as exc:
        print('FAILED: '+str(exc),file=sys.stderr);sys.exit(1)

if __name__=='__main__':main()
