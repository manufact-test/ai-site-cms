'use strict';
// Self-contained real SIGKILL supervisor for the CI-only signed release lab.
// Invoked synchronously by the comprehensive Stage2 upgrade suite; never
// targets a host, customer installation, arbitrary path or public endpoint.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
if(process.env.CI!=='true'||process.env.CMS_ALLOW_PHP_INSTALL_LAB!=='1'
  ||process.env.CMS_ALLOW_EPHEMERAL_SIGNING_LAB!=='1')
  throw Error('Only disposable CI supervisor allowed');
const [root,phase,...args]=process.argv.slice(2);
const marker=/^ai-site-cms-php-switch-lab-[a-f0-9]{32}$/;
if(path.dirname(root)!==fs.realpathSync(os.tmpdir())
  ||!marker.test(path.basename(root)) ||fs.realpathSync(root)!==root
  ||!['intent','pointer','receipt'].includes(phase)
  ||args[0]!=='approved-activate')
  throw Error('Foreign recovery root or unsupported operator request');
const fixture=path.resolve(__dirname,'../tests/fixtures/trusted-upgrade-operator.php');
const op=spawn('php',[fixture,...args],{env:process.env,stdio:['ignore','ignore','pipe']});
let errors='';
op.stderr.on('data',b=>{errors+=b.toString().slice(0,200)});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const exists=p=>{try{return fs.lstatSync(p).isFile()||fs.lstatSync(p).isDirectory()}
  catch(e){if(e.code==='ENOENT')return false;throw e}};
function reached(){
  if(!exists(path.join(root,'switch-exclusive.lock'))
    ||!exists(path.join(root,'switch-intent.json')))return false;
  const journal=JSON.parse(fs.readFileSync(path.join(root,'switch-intent.json')));
  if(journal.targetSequence!==1||journal.kind!=='upgrade')return false;
  const active=path.join(root,'active.json'),receipt=path.join(root,'active-receipt.json');
  if(phase==='intent')return !exists(active);
  if(!exists(active))return false;
  const pointer=JSON.parse(fs.readFileSync(active));
  if(pointer.sequence!==1||pointer.current!==journal.to)return false;
  if(phase==='pointer')return !exists(receipt);
  if(!exists(receipt))return false;
  return JSON.parse(fs.readFileSync(receipt)).sequence===1;
}
(async()=>{
  let observed=false;
  for(let i=0;i<350;i++){
    if(op.exitCode!==null)throw Error('Operator exited before observable SIGKILL boundary: '+errors);
    if(reached()){observed=true;break}
    await sleep(30);
  }
  if(!observed)throw Error('Signed operator never reached '+phase+' journal boundary');
  const closed=new Promise(resolve=>op.once('close',(code,signal)=>resolve({code,signal})));
  op.kill('SIGKILL');
  const end=await closed;
  if(end.signal!=='SIGKILL')throw Error('Operator was not actually killed by SIGKILL');
  process.stdout.write(JSON.stringify({phase,signal:end.signal,journalRetained:true})+'\n');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1})
.finally(()=>{if(op.exitCode===null)op.kill('SIGKILL')});
