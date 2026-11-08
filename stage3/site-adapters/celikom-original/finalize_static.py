#!/usr/bin/env python3
"""Normalize browser-saved resource filenames for static-server MIME types.

Input/output are separate folders. Does not rewrite CSS, JS, SVG or PNG bytes.
"""
import argparse
import json
import shutil
from pathlib import Path
from bridge import digest

RENAMES = {
    'faq.js.Без названия': 'faq.js',
    'owner-sound-player.js.Без названия': 'owner-sound-player.js',
    'owner-v10-motion.js.Без названия': 'owner-v10-motion.js',
    'saved_resource': 'saved_resource.png',
}

def finalize(original, output):
    if output.exists(): raise ValueError('Output already exists')
    if not (original/'bridge-report.json').is_file() or not (original/'index.html').is_file():
        raise ValueError('Only a generated bridge preview is accepted')
    output.mkdir(parents=True)
    try:
        for node in original.iterdir():
            if node.is_dir(): shutil.copytree(node,output/node.name)
            elif node.is_file(): shutil.copy2(node,output/node.name)
        html=(output/'index.html').read_text(encoding='utf-8')
        changed={}
        for from_name,to_name in RENAMES.items():
            found=list(output.glob('*_files/'+from_name))
            if len(found)!=1: raise ValueError('Missing expected resource '+from_name)
            original_resource=found[0]
            new_resource=original_resource.with_name(to_name)
            if new_resource.exists(): raise ValueError('Resource collision '+to_name)
            if from_name not in html: raise ValueError('Missing HTML asset link '+from_name)
            sha=digest(original_resource.read_bytes())
            original_resource.rename(new_resource)
            if digest(new_resource.read_bytes())!=sha: raise ValueError('Asset bytes changed')
            html=html.replace(from_name,to_name)
            changed[from_name]=to_name
        (output/'index.html').write_text(html,encoding='utf-8')
        report=json.loads((output/'bridge-report.json').read_text(encoding='utf-8'))
        report['static_filename_normalization']=changed
        report['preview_html_sha256']=digest(html.encode('utf-8'))
        report['cms_imported']=False
        (output/'bridge-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        return report
    except Exception:
        shutil.rmtree(output,ignore_errors=True)
        raise

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('preview');p.add_argument('output')
    args=p.parse_args()
    print(json.dumps(finalize(Path(args.preview),Path(args.output)),ensure_ascii=False,indent=2))
