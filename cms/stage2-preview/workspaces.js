'use strict';
/* Bounded, browser-local multi-site workspace. No HTTP, auth, hosting or publish. */
(()=>{
  const P=window.CmsPreviewProject;
  const indexKey='ai-site-cms-stage2-workspaces-v1';
  const oldKey='ai-site-cms-stage2-preview-local-v1';
  const oldNotes='ai-site-cms-stage2-preview-feedback-v1';
  const cap=8,limit=8;
  let serial=0;
  const clone=value=>structuredClone(value);
  const dataKey=id=>'ai-site-cms-stage2-site-'+id+'-versions-v1';
  const notesKey=id=>'ai-site-cms-stage2-site-'+id+'-notes-v1';
  const name=value=>String(value).trim().slice(0,100);
  function recordsFrom(value){
    if(!Array.isArray(value)||value.length>limit)throw Error('Повреждена история проекта');
    return value.map(r=>{
      if(!r||typeof r.at!=='number'||!Number.isFinite(r.at)||r.at<=0||
        r.at>Date.now()+86400000)throw Error('Некорректная дата сохранения');
      return {at:r.at,doc:P.normalize(r.doc)};
    });
  }
  function validateIndex(raw){
    if(!raw||raw.version!==1||!Array.isArray(raw.entries)||
      raw.entries.length<1||raw.entries.length>cap||
      typeof raw.activeId!=='string')throw Error('Некорректный каталог локальных проектов');
    const ids=new Set();
    for(const x of raw.entries){
      if(!x||typeof x.id!=='string'||!/^ws-[a-z0-9-]{5,48}$/.test(x.id)||
        ids.has(x.id)||typeof x.title!=='string'||!x.title.trim()||x.title.length>100||
        typeof x.at!=='number'||!Number.isFinite(x.at))throw Error('Повреждена запись в каталоге');
      ids.add(x.id);
    }
    if(!ids.has(raw.activeId))throw Error('Активный проект отсутствует');
    return clone(raw);
  }
  function create(storage){
    let index=null,migrated=false;
    const key=id=>dataKey(id);
    const allocate=()=>{
      let id;
      do{id='ws-'+Date.now().toString(36)+'-'+(++serial).toString(36);}
      while(index?.entries.some(x=>x.id===id));
      return id;
    };
    const setIndex=next=>{const validated=validateIndex(next);
      storage.setItem(indexKey,JSON.stringify(validated));index=validated;};
    const read=id=>{
      if(!index?.entries.some(x=>x.id===id))throw Error('Проект не найден');
      const raw=storage.getItem(key(id));
      if(raw===null)return [];
      return recordsFrom(JSON.parse(raw));
    };
    const current=id=>{
      const records=read(id);
      if(!records.length&&index.entries.length!==1)throw Error('У проекта нет сохранённого содержимого');
      return {id,records,doc:records[0]?.doc||P.template()};
    };
    function open(){
      if(index)return current(index.activeId);
      const raw=storage.getItem(indexKey);
      if(raw!==null){
        index=validateIndex(JSON.parse(raw));
        return current(index.activeId);
      }
      // Conservative migration: COPY the old version history, never delete it.
      const old=storage.getItem(oldKey);
      const history=old===null?[]:recordsFrom(JSON.parse(old));
      const id=allocate(),first=history[0]?.doc||P.template();
      const next={version:1,activeId:id,
        entries:[{id,title:name(first.siteTitle),at:Date.now()}]};
      try{
        if(history.length)storage.setItem(key(id),JSON.stringify(history));
        // Optional feedback copy must never jeopardize migration of project data.
        try{
          if(storage.getItem(oldNotes)!==null&&storage.getItem(notesKey(id))===null)
            storage.setItem(notesKey(id),storage.getItem(oldNotes));
        }catch(_){/* Original feedback key remains available for manual recovery. */}
        setIndex(next);
      }catch(e){
        if(history.length)storage.removeItem(key(id));
        throw e;
      }
      migrated=history.length>0;
      return current(id);
    }
    function save(id,doc){
      if(!index?.entries.some(x=>x.id===id))throw Error('Неизвестный проект');
      const valid=P.validate(doc),history=read(id),json=JSON.stringify(valid);
      const count=Math.max(1,Math.min(limit,Math.floor(2_200_000/Math.max(json.length,1))));
      const existing=history[0]&&JSON.stringify(history[0].doc)===json;
      const next=existing?history:[{at:Date.now(),doc:valid},...history].slice(0,count);
      storage.setItem(key(id),JSON.stringify(next));
      setIndex({...index,entries:index.entries.map(e=>e.id===id?{...e,title:name(valid.siteTitle),at:Date.now()}:e)});
      return clone(next);
    }
    function add(doc){
      if(!index)throw Error('Каталог не загружен');
      if(index.entries.length>=cap)throw Error('Доступно не более восьми локальных сайтов. Экспортируйте и удалите ненужный.');
      const valid=P.validate(doc),id=allocate();
      const history=[{at:Date.now(),doc:valid}];
      storage.setItem(key(id),JSON.stringify(history));
      try{setIndex({...index,activeId:id,
        entries:[...index.entries,{id,title:name(valid.siteTitle),at:Date.now()}]});}
      catch(e){storage.removeItem(key(id));throw e;}
      return {id,doc:clone(valid),records:clone(history)};
    }
    function select(id){
      const dest=current(id); // Validate content before switching active site.
      setIndex({...index,activeId:id});
      return dest;
    }
    function remove(id){
      if(!index.entries.some(e=>e.id===id))throw Error('Проект не найден');
      if(index.entries.length===1)throw Error('Последний проект удалить нельзя');
      const rest=index.entries.filter(e=>e.id!==id);
      const nextId=id===index.activeId?rest[0].id:index.activeId;
      const target=current(nextId);
      setIndex({...index,activeId:nextId,entries:rest});
      storage.removeItem(key(id));
      storage.removeItem(notesKey(id));
      return target;
    }
    function prune(id,doc){
      const valid=P.validate(doc);
      const history=[{at:Date.now(),doc:valid}];
      storage.setItem(key(id),JSON.stringify(history));
      setIndex({...index,entries:index.entries.map(e=>e.id===id?{...e,title:name(valid.siteTitle),at:Date.now()}:e)});
      return history;
    }
    const list=()=>clone(index?.entries||[]);
    const active=()=>index?.activeId;
    return Object.freeze({open,current,add,save,select,remove,prune,list,active,notesKey,
      get migrated(){return migrated},limit:cap});
  }
  Object.defineProperty(window,'CmsPreviewWorkspaces',{value:Object.freeze({create,indexKey,oldKey,notesKey})});
})();
