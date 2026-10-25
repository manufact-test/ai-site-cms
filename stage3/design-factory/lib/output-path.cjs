'use strict';
const fs=require('node:fs');
const path=require('node:path');

function isWithin(root,candidate){
 const relative=path.relative(root,candidate);
 return relative===''||(!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep));
}
function resolveOutsideRepository(requested,repositoryRoot,label='Output'){
 if(typeof requested!=='string'||!requested.trim())throw Error(label+' path required');
 const absolute=path.resolve(requested);
 const parent=path.dirname(absolute);
 if(!fs.existsSync(parent))throw Error(label+' parent missing');
 const canonicalRepository=fs.realpathSync(repositoryRoot);
 const canonicalParent=fs.realpathSync(parent);
 const target=path.join(canonicalParent,path.basename(absolute));
 if(isWithin(canonicalRepository,target))
  throw Error(label+' must be outside repository, including through symlinked parents');
 try{
  if(fs.lstatSync(target).isSymbolicLink())throw Error(label+' must not be a symlink');
 }catch(error){
  if(error.code!=='ENOENT')throw error;
 }
 return target;
}
module.exports=Object.freeze({resolveOutsideRepository});
