'use strict';
/* Prevent private Search Console/operator data from accidentally being generated inside the Git checkout. */
const fs=require('node:fs'),path=require('node:path');
function privateOutput(destination){
 if(typeof destination!=='string'||!path.isAbsolute(destination))throw Error('Private output path must be absolute');
 const abs=path.resolve(destination);
 const repoRoot=fs.realpathSync(path.resolve(__dirname,'../../..'));
 const parent=fs.realpathSync(path.dirname(abs));
 if(!fs.statSync(parent).isDirectory())throw Error('Private output parent must exist and be a directory');
 const rel=path.relative(repoRoot,parent);
 if(rel===''||rel==='.'||!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel))
  throw Error('Do not write private GSC evidence, search queries or decisions inside the repository checkout');
 if(fs.existsSync(abs))throw Error('Output directory already exists; refusing to overwrite');
 return abs;
}
module.exports=Object.freeze({privateOutput});
