'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {STAGE,verify}=require('./build-internal-package.cjs');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function prepare(source,destination) {
  if(!path.isAbsolute(source)||!path.isAbsolute(destination)||
     path.normalize(source)!==source||path.normalize(destination)!==destination||
     !fs.existsSync(source)||fs.realpathSync(source)!==source||
     fs.realpathSync(path.dirname(destination))!==path.dirname(destination)||
     fs.existsSync(destination)||source===destination||
     destination.startsWith(source+path.sep)||source.startsWith(destination+path.sep))
    throw Error('STAGE2_UNSAFE_DESTINATION_OR_SOURCE');
  const manifest=verify(source);
  if(manifest.productionReady!==false||manifest.isSigned!==false||
     manifest.writeEndpointsAvailable!==false||manifest.documentRoot!=='public')
    throw Error('STAGE2_PACKAGE_NOT_EMPTY_AND_INACTIVE');
  const records=[...manifest.files.map(x=>x.path),'private/package-manifest.json'];
  if(new Set(records).size!==records.length)throw Error('STAGE2_DUPLICATE_PATH');
  fs.mkdirSync(destination,{mode:0o700});
  try {
    for(const relative of records){
      if(relative.split('/').some(x=>!x||x==='.'||x==='..')||
         !/^[A-Za-z0-9_./-]+$/.test(relative))throw Error('STAGE2_BAD_PATH');
      const src=path.join(source,relative),dest=path.join(destination,relative);
      const stat=fs.lstatSync(src);
      if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)
        throw Error('STAGE2_NONREGULAR_FILE');
      fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});
      fs.copyFileSync(src,dest,fs.constants.COPYFILE_EXCL);
      fs.chmodSync(dest,0o644);
      if(fs.statSync(dest).size!==stat.size||hash(src)!==hash(dest))
        throw Error('STAGE2_FILE_CHANGED');
    }
    verify(destination);
    if(fs.existsSync(path.join(destination,'index.php'))||
       !fs.existsSync(path.join(destination,'vendor/autoload.php'))||
       !fs.existsSync(path.join(destination,'public/index.php'))||
       !fs.existsSync(path.join(destination,'private/editor/editor.js')))
      throw Error('STAGE2_UNSAFE_PACKAGE_LAYOUT');
    return {files:records.length,sha256:hash(path.join(destination,'private/package-manifest.json')),
      activated:false,productionReady:false};
  }catch(e){fs.rmSync(destination,{recursive:true,force:true});throw e;}
}
if(require.main===module){
  try{
    if(process.argv.length!==4||process.argv[2]!=='--prepare'||
      process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true'||
      process.env.GITHUB_REPOSITORY!=='manufact-test/ai-site-cms'||
      process.env.GITHUB_REF!=='refs/heads/main'||
      process.env.CMS_STAGE2_STAGING_APPROVED!=='inactive-stage2-package-only')
      throw Error('STAGE2_EXPLICIT_CI_SCOPE_REQUIRED');
    const base=fs.realpathSync(process.env.RUNNER_TEMP||'/nonexistent');
    const output=path.resolve(process.argv[3]);
    if(path.dirname(output)!==base)throw Error('STAGE2_RUNNER_TEMP_ONLY');
    const result=prepare(STAGE,output);
    process.stdout.write('Prepared '+result.files+
      ' inactive isolated Stage2 Git files; no secrets, DB or host access.\n');
  }catch(e){process.stderr.write('STAGE2_PRIVATE_STAGING_REFUSED: '+e.message+'\n');process.exitCode=3;}
}
module.exports={prepare};
