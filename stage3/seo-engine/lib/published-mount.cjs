'use strict';
// Internal mount-to-logical route mapping; not evidence of production routing.
function fromSnapshot(snapshot){
 const value=snapshot?.mountPath;
 if(value===undefined)return '';
 if(typeof value!=='string'||!/^\/published\/[a-z][a-z0-9-]{2,79}\/$/.test(value)||
   snapshot.siteId&&value!=='/published/'+snapshot.siteId+'/')
  throw Error('Invalid HTML snapshot mountPath');
 return value;
}
function route(actual,mount=''){
 if(typeof actual!=='string'||!actual.startsWith('/'))return null;
 if(!mount)return actual;
 if(!actual.startsWith(mount))return null;
 return '/'+actual.slice(mount.length);
}
module.exports=Object.freeze({fromSnapshot,route});
