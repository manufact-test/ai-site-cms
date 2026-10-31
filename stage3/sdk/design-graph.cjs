'use strict';
// Optional AI-authored Design Graph v1. A closed, typed design AST, never HTML/CSS/JS.
// Independent from Design Factory's branch: integration requires a later explicit adapter.
const IDENT=/^[a-z][a-z0-9-]{2,79}$/,TOKEN=/^[a-z][a-z0-9-]{1,39}$/;
const SAFE_URL=/^\/(?!\/)[a-zA-Z0-9/_#?=&.%-]*$/;
const ICON_PATHS=Object.freeze({
 check:'<path d="M5 12l4 4L19 6"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 star:'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z"/>',
 sparkles:'<path d="m12 3 2 7 7 2-7 2-2 7-7-2 7-2z"/>',
 shield:'<path d="M12 2 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
 play:'<path d="m8 5 12 7-12 7z"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 "heart":"<path d=\"M20 5c-2-3-6-3-8 0-2-3-6-3-8 0-3 5 3 10 8 15 5-5 11-10 8-15z\"/>",
 "phone":"<path d=\"M22 16.6v3a2 2 0 0 1-2 2A20 20 0 0 1 2.4 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.7L7 10a15 15 0 0 0 7 7l1.6-2a2 2 0 0 1 1.7-.6l3 .5a2 2 0 0 1 1.7 1.7z\"/>",
 "calendar":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M16 3v4M8 3v4M3 10h18\"/>",
 "user":"<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/>",
 "home":"<path d=\"m3 10 9-7 9 7v11H3zM9 21v-7h6v7\"/>",
 "map-pin":"<path d=\"M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z\"/><circle cx=\"12\" cy=\"10\" r=\"2.5\"/>",
 "globe":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18\"/>",
 "chevron-right":"<path d=\"m9 5 7 7-7 7\"/>",
 "chevron-left":"<path d=\"m15 5-7 7 7 7\"/>",
 "chevron-down":"<path d=\"m5 9 7 7 7-7\"/>",
 "plus":"<path d=\"M12 5v14M5 12h14\"/>",
 "minus":"<path d=\"M5 12h14\"/>",
 "close":"<path d=\"M5 5 19 19M19 5 5 19\"/>",
 "shopping-cart":"<circle cx=\"9\" cy=\"20\" r=\"1\"/><circle cx=\"19\" cy=\"20\" r=\"1\"/><path d=\"M2 3h2l3 13h12l3-9H5\"/>",
 "message-circle":"<path d=\"M20 11.5a8 8 0 0 1-11 7.4L3 21l2.1-6A8 8 0 1 1 20 11.5z\"/>",
 "camera":"<path d=\"M3 7h4l2-3h6l2 3h4v14H3z\"/><circle cx=\"12\" cy=\"14\" r=\"4\"/>",
 "download":"<path d=\"M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3\"/>",
 "external-link":"<path d=\"M13 4h7v7M20 4l-9 9M20 14v6H4V4h6\"/>",
 "info":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6M12 7h.01\"/>",
 "search":"<circle cx=\"10.5\" cy=\"10.5\" r=\"7\"/><path d=\"m16 16 5 5\"/>",
 "truck":"<path d=\"M2 6h13v12H2zM15 11h4l3 4v3h-7z\"/><circle cx=\"7\" cy=\"19\" r=\"2\"/><circle cx=\"18\" cy=\"19\" r=\"2\"/>",
 "package":"<path d=\"m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10\"/>"
});
const MOTIONS=['none','fade-in','fade-up','slide-left','zoom-in'];
const TYPES=['container','heading','text','button','image','divider','icon','video','disclosure','tabs','tab','list','list-item','link','quote','gallery','carousel','table','table-row','table-cell','popup','form-slot'];
const STYLE_KEYS=['display','columns','direction','align','justify','gap','padding','radius',
  'color','background','fontSize','fontWeight','lineHeight','maxWidth','position','top','left',
  'opacity','borderColor','borderWidth','textAlign','order','hidden','rowGap','columnGap',
  'paddingX','paddingY','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginBottom','widthPercent','minHeight','minHeightViewport','heightViewport','gridColumnSpan',
  'flexWrap','flexGrow','alignSelf','letterSpacing','fontFamily','objectFit','aspectRatio',
  'overflow','shadow','gradient','fluidFont','right','bottom','zIndex','widthPx','heightPx','minWidth','maxHeight','gridRowSpan','flexBasisPercent','flexShrink','justifySelf','alignContent','gridAutoFlow','objectPositionX','objectPositionY','outlineColor','outlineWidth','textDecoration','whiteSpace','fontStyle','textTransform','textWrap','wordBreak','textOverflow','textShadow','gridColumnsPreset','transformOrigin','isolation','mixBlendMode','clipShape','wordSpacing','textIndent','gridColumnStart','gridRowStart','translateX','translateY','rotateDeg','scalePercent','backdropBlur','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius','borderStyle','filterPreset','shadowFine','gridTracks','gridAutoRowsPx'];
const FORM_APPEARANCE_SIZES=Object.freeze({gap:[0,64],labelGap:[0,24],columns:[1,2],maxWidth:[240,1200],
  inputRadius:[0,48],inputPadding:[4,32],inputFontSize:[12,24],borderWidth:[0,4],
  stepRadius:[0,48],stepPadding:[0,40],
  buttonRadius:[0,48],buttonPadding:[6,32],buttonFontSize:[12,28]});
const FORM_APPEARANCE_COLORS=['inputBackground','borderColor','inputColor','labelColor','focusColor',
  'stepBackground','stepBorderColor','progressColor','buttonBackground','buttonColor'];
const FORM_APPEARANCE_KEYS=[...Object.keys(FORM_APPEARANCE_SIZES),'labelWeight','buttonWeight',...FORM_APPEARANCE_COLORS];
const FORM_APPEARANCE_CSS=Object.freeze({gap:'--cmsdg-form-gap',inputRadius:'--cmsdg-form-input-radius',
  inputPadding:'--cmsdg-form-input-padding',buttonRadius:'--cmsdg-form-button-radius',
  buttonPadding:'--cmsdg-form-button-padding',labelWeight:'--cmsdg-form-label-weight',
  inputBackground:'--cmsdg-form-input-bg',borderColor:'--cmsdg-form-border',
  buttonBackground:'--cmsdg-form-button-bg',buttonColor:'--cmsdg-form-button-color',
  labelGap:'--cmsdg-form-label-gap',columns:'--cmsdg-form-columns',maxWidth:'--cmsdg-form-max-width',
  inputFontSize:'--cmsdg-form-input-font-size',borderWidth:'--cmsdg-form-border-width',
  buttonFontSize:'--cmsdg-form-button-font-size',buttonWeight:'--cmsdg-form-button-weight',
  inputColor:'--cmsdg-form-input-color',labelColor:'--cmsdg-form-label-color',focusColor:'--cmsdg-form-focus-color',
  stepRadius:'--cmsdg-form-step-radius',stepPadding:'--cmsdg-form-step-padding',
  stepBackground:'--cmsdg-form-step-bg',stepBorderColor:'--cmsdg-form-step-border',
  progressColor:'--cmsdg-form-progress-color'});
const TABLE_APPEARANCE_SIZES=Object.freeze({cellPadding:[4,32],cardRadius:[0,32],
  cardGap:[0,40],cardPadding:[0,32],labelWidth:[25,65]});
const TABLE_APPEARANCE_COLORS=['borderColor','headerBackground','headerColor','cardBackground','labelColor'];
const TABLE_APPEARANCE_CSS=Object.freeze({cellPadding:'--cmsdg-table-cell-padding',
  cardRadius:'--cmsdg-table-card-radius',cardGap:'--cmsdg-table-card-gap',
  cardPadding:'--cmsdg-table-card-padding',labelWidth:'--cmsdg-table-label-width',
  borderColor:'--cmsdg-table-border',headerBackground:'--cmsdg-table-header-bg',
  headerColor:'--cmsdg-table-header-color',cardBackground:'--cmsdg-table-card-bg',
  labelColor:'--cmsdg-table-label-color'});
const DEFAULT_TOKENS=Object.freeze({
  colors:{foreground:'#182b3d',background:'#ffffff',accent:'#0a5bff',muted:'#667788'},
  spacing:{small:12,medium:24,large:48},
  radii:{soft:12,round:24},
  typography:{body:16,heading:42}
});
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fail=(at,message)=>{throw Error('Design Graph '+message+' @ '+at);};
function keys(obj,allowed,at){
  if(!object(obj)||Object.keys(obj).some(k=>!allowed.includes(k)))fail(at,'unknown keys');
}
function number(n,min,max){return Number.isInteger(n)&&n>=min&&n<=max;}
function validateTokens(input){
  const t=input===undefined?DEFAULT_TOKENS:input;
  keys(t,['colors','spacing','radii','typography'],'tokens');
  for(const kind of ['colors','spacing','radii','typography']){
    const group=t[kind];
    if(!object(group)||Object.keys(group).length>30)fail('tokens.'+kind,'invalid group');
    for(const [name,value] of Object.entries(group)){
      if(!TOKEN.test(name))fail('tokens.'+kind,'invalid token name');
      if(kind==='colors'?!/^#[a-f0-9]{6}$/i.test(value):!number(value,kind==='typography'?8:0,kind==='typography'?120:240))
        fail('tokens.'+kind+'.'+name,'invalid token value');
    }
  }
  return t;
}
function resolve(value,kind,tokens,at){
  if(typeof value==='string'&&value.startsWith('@')){
    const token=value.slice(1),group=tokens[kind];
    if(!own(group,token))fail(at,'unknown '+kind+' token');
    return group[token];
  }
  if(kind==='colors'){
    if(typeof value!=='string'||!/^#[a-f0-9]{6}$/i.test(value))fail(at,'invalid color');
  }else if(!number(value,0,kind==='typography'?120:kind==='spacing'?240:240))
    fail(at,'invalid numeric length');
  return value;
}
function validateFormAppearance(appearance,tokens,at){
  keys(appearance,FORM_APPEARANCE_KEYS,at);
  for(const [key,value] of Object.entries(appearance)){
    if(own(FORM_APPEARANCE_SIZES,key)){
      const [min,max]=FORM_APPEARANCE_SIZES[key];
      if(!number(value,min,max))fail(at+'/'+key,'invalid form size');
    }else if(key==='labelWeight'||key==='buttonWeight'){
      if(![400,500,600,700].includes(value))fail(at+'/'+key,'invalid form font weight');
    }else resolve(value,'colors',tokens,at+'/'+key);
  }
}
function formAppearanceCSS(appearance,tokens,at){
  return Object.entries(appearance).map(([key,value])=>
    FORM_APPEARANCE_CSS[key]+':'+(FORM_APPEARANCE_COLORS.includes(key)?
      resolve(value,'colors',tokens,at+'/'+key):String(value)+(['labelWeight','buttonWeight','columns'].includes(key)?'':'px'))).join(';');
}
function validateTableAppearance(appearance,tokens,at){
  keys(appearance,Object.keys(TABLE_APPEARANCE_CSS),at);
  for(const [key,value] of Object.entries(appearance)){
    if(own(TABLE_APPEARANCE_SIZES,key)){
      if(!number(value,...TABLE_APPEARANCE_SIZES[key]))fail(at+'/'+key,'invalid table size');
    }else resolve(value,'colors',tokens,at+'/'+key);
  }
}
function tableAppearanceCSS(appearance,tokens,at){
  return Object.entries(appearance).map(([key,value])=>TABLE_APPEARANCE_CSS[key]+':'+
    (TABLE_APPEARANCE_COLORS.includes(key)?resolve(value,'colors',tokens,at+'/'+key):
      String(value)+(key==='labelWidth'?'%':'px'))).join(';');
}

// A bounded spreadsheet bridge for an EXISTING authored table. It changes only
// table-cell text and rectangular row/column structure; never CSS or HTML.
function parseTableMatrix(source,format='auto'){
  if(typeof source!=='string'||source.length>12000||!source.trim())
    fail('table-paste','expected 1–12000 text characters');
  if(!['auto','tab','comma','semicolon'].includes(format))fail('table-paste','unknown separator');
  const input=source.replace(/^\uFEFF/,'');
  const firstLine=input.split(/\r?\n/,1)[0];
  // Excel can quote a heading containing commas, even when the real CSV
  // separator is a semicolon. Inspect only delimiters outside quoted fields.
  const separators={'\t':0,',':0,';':0};let scanningQuote=false;
  for(let i=0;i<firstLine.length;i++){
    if(firstLine[i]==='"'){
      if(scanningQuote&&firstLine[i+1]==='"'){i++;continue;}
      scanningQuote=!scanningQuote;
    }else if(!scanningQuote&&Object.hasOwn(separators,firstLine[i]))
      separators[firstLine[i]]++;
  }
  const separator=format==='tab'?'\t':format==='comma'?',':format==='semicolon'?';':
    separators['\t']?'\t':separators[';']>separators[',']?';':',';
  const rows=[];let row=[],cell='',quoted=false,cellQuoted=false,afterQuote=false,atStart=true;
  const finishCell=()=>{
    // Whitespace inside an explicitly quoted CSV cell is authored data;
    // unquoted spreadsheet delimiters may have incidental padding.
    const value=cellQuoted?cell:cell.trim();
    if(value.length>1600||/[\x00-\x1f\x7f]/.test(value))fail('table-paste','invalid cell text');
    row.push(value);cell='';quoted=false;cellQuoted=false;afterQuote=false;atStart=true;
  };
  const finishRow=()=>{
    finishCell();rows.push(row);row=[];
    if(rows.length>10)fail('table-paste','maximum 10 rows');
  };
  for(let i=0;i<input.length;i++){
    const char=input[i];
    if(quoted){
      if(char==='"'){
        if(input[i+1]==='"'){cell+='"';i++;}
        else{quoted=false;afterQuote=true;}
      }else{
        if(char==='\r'||char==='\n')fail('table-paste','line breaks inside cells are not supported');
        cell+=char;
      }
      continue;
    }
    if(char==='"'){
      // Bare quotes are ordinary text in a copied TSV cell; a quote in the
      // FIRST position instead starts RFC-style quoted CSV/TSV content.
      if(!atStart){cell+='"';continue;}
      quoted=true;cellQuoted=true;atStart=false;continue;
    }
    if(char===separator){finishCell();continue;}
    if(char==='\r'||char==='\n'){
      if(char==='\r'&&input[i+1]==='\n')i++;
      finishRow();continue;
    }
    if(afterQuote){if(char===' ')continue;fail('table-paste','text after closing quote');}
    cell+=char;atStart=false;
  }
  if(quoted)fail('table-paste','unclosed quote');
  if(row.length||cell||!rows.length)finishRow();
  if(rows.at(-1)?.length===1&&rows.at(-1)[0]===''&&rows.length>2)rows.pop();
  const columns=rows[0]?.length||0;
  if(rows.length<2||rows.length>10||columns<2||columns>6||
    rows.some(r=>r.length!==columns))fail('table-paste','expected 2–10 equal rows and 2–6 columns');
  return rows;
}
function findGraphNode(graph,nodeId){
  const find=nodes=>{for(const node of nodes){
    if(node.id===nodeId)return node;
    if(node.children){const match=find(node.children);if(match)return match;}
  }return null;};
  return find(graph?.nodes||[]);
}
function tableMatrix(graph,tableId){
  const table=findGraphNode(graph,tableId);
  if(!table||table.type!=='table')fail(tableId,'expected an existing table');
  return table.children.map(row=>row.children.map(cell=>cell.text));
}
function tableTsv(graph,tableId,spreadsheetSafe=true){
  if(typeof spreadsheetSafe!=='boolean')fail('table-export','invalid safety option');
  return tableMatrix(graph,tableId).map(row=>row.map(value=>{
    // TSV quoting must preserve literal leading quotes and embedded quotes
    // on the next import; spreadsheet exports additionally neutralize formulas.
    const text=spreadsheetSafe&&/^\s*[=+@-]/.test(value)?"'"+value:value;
    return text.includes('"')||/^\s|\s$/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
  }).join('\t')).join('\n');
}
function replaceTableMatrix(graph,tableId,matrix,makeId){
  if(!Array.isArray(matrix)||matrix.length<2||matrix.length>10||
    !Array.isArray(matrix[0])||matrix[0].length<2||matrix[0].length>6||
    matrix.some(row=>!Array.isArray(row)||row.length!==matrix[0].length||
      row.some(value=>typeof value!=='string'||value.length>1600||/[\x00-\x1f\x7f]/.test(value))))
    fail('table-paste','invalid rectangular matrix');
  const before=tableMatrix(graph,tableId);
  if(JSON.stringify(before)===JSON.stringify(matrix))return graph;
  const copy=structuredClone(graph);
  const table=findGraphNode(copy,tableId);
  let needIds=false;
  table.children=matrix.map((values,r)=>{
    const existing=table.children[r];
    if(!existing)needIds=true;
    const row=existing||{id:null,type:'table-row',styles:{},children:[]};
    row.children=values.map((value,c)=>{
      const prior=existing?.children[c];
      if(!prior)needIds=true;
      return prior?{...prior,text:value}:{id:null,type:'table-cell',styles:{},text:value};
    });
    return row;
  });
  if(needIds&&typeof makeId!=='function')fail('table-paste','ID factory required for added rows or columns');
  const ids=new Set();
  const collect=nodes=>nodes.forEach(node=>{ids.add(node.id);if(node.children)collect(node.children);});
  collect(graph.nodes);
  const allocate=()=>{
    const id=makeId();
    if(typeof id!=='string'||!IDENT.test(id)||ids.has(id))fail('table-paste','invalid new node ID');
    ids.add(id);return id;
  };
  for(const row of table.children){
    if(row.id===null)row.id=allocate();
    for(const cell of row.children)if(cell.id===null)cell.id=allocate();
  }
  return copy;
}
function reorderTableColumn(graph,tableId,from,to){
  const table=findGraphNode(graph,tableId);
  if(!table||table.type!=='table')fail(tableId,'expected an existing table');
  const width=table.children[0].children.length;
  if(!number(from,0,width-1)||!number(to,0,width-1))
    fail('table-reorder','column index outside the table');
  if(from===to)return graph;
  if(table.rowHeaders&&(from===0||to===0))
    fail('table-reorder','first semantic row-heading column must stay first');
  const copy=structuredClone(graph),target=findGraphNode(copy,tableId);
  for(const row of target.children){
    const [cell]=row.children.splice(from,1);
    row.children.splice(to,0,cell);
  }
  return copy;
}
function reorderTableRow(graph,tableId,from,to){
  const table=findGraphNode(graph,tableId);
  if(!table||table.type!=='table')fail(tableId,'expected an existing table');
  const max=table.children.length-1;
  // Row zero is a semantic header, never a draggable data row.
  if(!number(from,1,max)||!number(to,1,max))
    fail('table-reorder','header row cannot move');
  if(from===to)return graph;
  const copy=structuredClone(graph),target=findGraphNode(copy,tableId);
  const [row]=target.children.splice(from,1);
  target.children.splice(to,0,row);
  return copy;
}
function parseListLines(source){
  if(typeof source!=='string'||source.length>24000||!source.trim())
    fail('list-paste','expected nonempty text up to 24000 characters');
  const items=source.replace(/^\uFEFF/,'').split(/\r?\n/).map(line=>line.trim());
  while(items.at(-1)==='')items.pop();
  if(!items.length||items.length>24||items.some(line=>!line||line.length>3000||/[\x00-\x1f\x7f]/.test(line)))
    fail('list-paste','expected 1–24 nonempty lines, max 3000 characters each');
  return items;
}
function listLines(graph,listId){
  const list=findGraphNode(graph,listId);
  if(!list||list.type!=='list')fail(listId,'expected an existing list');
  return list.children.map(item=>item.text);
}
function replaceListLines(graph,listId,lines,makeId){
  if(!Array.isArray(lines)||!lines.length||lines.length>24||
    lines.some(value=>typeof value!=='string'||!value.trim()||value.length>3000||
      /[\x00-\x1f\x7f]/.test(value)))fail('list-paste','invalid list lines');
  if(JSON.stringify(listLines(graph,listId))===JSON.stringify(lines))return graph;
  const copy=structuredClone(graph),list=findGraphNode(copy,listId),prior=list.children;
  const ids=new Set();
  const collect=nodes=>nodes.forEach(node=>{ids.add(node.id);if(node.children)collect(node.children);});
  collect(graph.nodes);
  list.children=lines.map((text,index)=>{
    if(prior[index])return {...prior[index],text};
    if(typeof makeId!=='function')fail('list-paste','ID factory required for new items');
    const id=makeId();
    if(typeof id!=='string'||!IDENT.test(id)||ids.has(id))fail('list-paste','invalid new node ID');
    ids.add(id);return {id,type:'list-item',text,styles:{}};
  });
  return copy;
}
function validateStyle(style,tokens,at,mode='base'){
  keys(style,STYLE_KEYS,at);
  const enums={
    display:['block','grid','flex','none'],direction:['row','column'],
    align:['start','center','end','stretch','between'],justify:['start','center','end','stretch','between'],
    alignSelf:['auto','start','center','end','stretch'],position:['static','relative','absolute','sticky'],
    textAlign:['left','center','right'],flexWrap:['nowrap','wrap'],
    fontFamily:['inherit','system','arial','georgia','serif','mono','site-body','site-heading'],
    objectFit:['cover','contain','fill','none'],aspectRatio:['auto','square','portrait','landscape','wide'],
    overflow:['visible','hidden','auto'],shadow:['none','soft','medium','strong'],justifySelf:['auto','start','center','end','stretch'],alignContent:['start','center','end','stretch','between'],gridAutoFlow:['row','column','row-dense','column-dense'],textDecoration:['none','underline','line-through'],whiteSpace:['normal','nowrap','pre-line'],
    fontStyle:['normal','italic'],textTransform:['none','uppercase','lowercase','capitalize'],textWrap:['wrap','balance','pretty','nowrap'],wordBreak:['normal','break-all','break-word'],textOverflow:['clip','ellipsis'],textShadow:['none','soft','strong'],gridColumnsPreset:['sidebar-left','sidebar-right','wide-center','editorial'],transformOrigin:['center','top-left','top-right','bottom-left','bottom-right'],isolation:['auto','isolate'],mixBlendMode:['normal','multiply','screen','overlay','darken','lighten'],clipShape:['none','circle','ellipse','diagonal','hexagon'],borderStyle:['solid','dashed','dotted','double'],filterPreset:['none','grayscale','sepia','contrast','vibrant']
  };
  const ranges={columns:[1,12],gridColumnSpan:[1,12],flexGrow:[0,6],fontWeight:[100,900],
    lineHeight:[80,250],letterSpacing:[-50,200],maxWidth:[0,1920],widthPercent:[1,100],
    borderWidth:[0,12],order:[-30,30],opacity:[0,100],outlineWidth:[0,8],zIndex:[-10,30],widthPx:[1,1920],heightPx:[1,1400],minWidth:[0,1920],maxHeight:[0,1600],gridRowSpan:[1,12],flexBasisPercent:[0,100],flexShrink:[0,1],objectPositionX:[0,100],objectPositionY:[0,100],marginTop:[-160,160],marginBottom:[-160,160],minHeightViewport:[0,120],heightViewport:[1,120],wordSpacing:[-40,100],textIndent:[-100,200],gridColumnStart:[1,13],gridRowStart:[1,13],translateX:[-600,600],translateY:[-600,600],rotateDeg:[-180,180],scalePercent:[50,200],backdropBlur:[0,32],gridAutoRowsPx:[24,600]};
  for(const [key,value] of Object.entries(style)){
    if(mode==='state'&&!['color','background','borderColor','borderWidth','borderStyle','radius','opacity','gradient','outlineColor','outlineWidth','filterPreset','scalePercent'].includes(key))
      fail(at,'unsupported interaction state property');
    if(['color','background','borderColor','outlineColor'].includes(key)){resolve(value,'colors',tokens,at+'/'+key);continue;}
    if(key==='gridTracks'){
      if(!Array.isArray(value)||value.length<2||value.length>6||value.some(n=>!number(n,1,12)))fail(at,'invalid weighted grid tracks');
      continue;
    }
    if(key==='fluidFont'){
      keys(value,['min','max'],at+'/fluidFont');
      if(!number(value.min,10,120)||!number(value.max,10,120)||value.min>value.max)
        fail(at,'invalid fluid typography');
      continue;
    }
    if(key==='shadowFine'){
      keys(value,['x','y','blur','spread','color','inset'],at+'/shadowFine');
      for(const [field,min,max] of [['x',-100,100],['y',-100,100],['blur',0,160],['spread',-80,80]])
        if(!number(value[field],min,max))fail(at,'invalid shadowFine '+field);
      resolve(value.color,'colors',tokens,at+'/shadowFine.color');
      if(typeof value.inset!=='boolean')fail(at,'invalid shadowFine inset');
      continue;
    }
    if(key==='gradient'){
      keys(value,['angle','from','to','via','viaAt','type','centerX','centerY','radius'],at+'/gradient');
      if(!number(value.angle,0,360)||!own(value,'from')||!own(value,'to')||own(value,'via')!==own(value,'viaAt')||
        (own(value,'viaAt')&&!number(value.viaAt,1,99)))fail(at,'invalid gradient');
      if((own(value,'type')&&!['linear','radial'].includes(value.type))||(own(value,'centerX')&&!number(value.centerX,0,100))||(own(value,'centerY')&&!number(value.centerY,0,100))||(own(value,'radius')&&!['closest-side','farthest-side','farthest-corner'].includes(value.radius))||(value.type!=='radial'&&['centerX','centerY','radius'].some(k=>own(value,k))))fail(at,'invalid gradient geometry');
      resolve(value.from,'colors',tokens,at+'/from');resolve(value.to,'colors',tokens,at+'/to');
      if(own(value,'via'))resolve(value.via,'colors',tokens,at+'/via');continue;
    }
    if(['gap','rowGap','columnGap','padding','paddingX','paddingY','paddingTop','paddingRight','paddingBottom','paddingLeft','top','left','right','bottom','minHeight'].includes(key)){
      resolve(value,'spacing',tokens,at+'/'+key);continue;
    }
    if(key==='radius'||key==='fontSize'||["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"].includes(key)){
      resolve(value,key==='fontSize'?'typography':'radii',tokens,at+'/'+key);continue;
    }
    if(own(enums,key)){if(!enums[key].includes(value))fail(at,key);continue;}
    if(own(ranges,key)){if(!number(value,...ranges[key]))fail(at,key);continue;}
    if(key==='hidden'){if(typeof value!=='boolean')fail(at,key);continue;}
    fail(at,'invalid style '+key);
  }
  if(own(style,'fontSize')&&own(style,'fluidFont'))fail(at,'competing typography controls');
  if(own(style,'widthPx')&&own(style,'widthPercent'))fail(at,'competing width units');
  if(own(style,'minHeight')&&own(style,'minHeightViewport'))fail(at,'competing min-height');
  if(own(style,'heightPx')&&own(style,'heightViewport'))fail(at,'competing height');
  if(['columns','gridColumnsPreset','gridTracks'].filter(k=>own(style,k)).length>1)fail(at,'competing grid template');
  if(own(style,'shadow')&&own(style,'shadowFine'))fail(at,'competing shadow controls');
}
function validateMotion(motion,at){
  keys(motion,['effect','duration','delay','trigger','easing'],at);
  if(!MOTIONS.includes(motion.effect)||!number(motion.duration,150,2000)||!number(motion.delay,0,1000)||
    (own(motion,'trigger')&&!['load','scroll'].includes(motion.trigger))||
    (own(motion,'easing')&&!['ease','ease-in','ease-out','ease-in-out','linear'].includes(motion.easing))||
    (motion.trigger==='scroll'&&motion.delay!==0))
    fail(at,'invalid motion');
}
const SEQUENCE_EASINGS=['ease','ease-in','ease-out','ease-in-out','linear'];
function validateSequence(seq,children,at){
  keys(seq,['effect','duration','delay','stagger','easing'],at);
  if(!MOTIONS.includes(seq.effect)||seq.effect==='none'||!number(seq.duration,150,2000)||
    !number(seq.delay,0,1000)||!number(seq.stagger,0,900)||
    !SEQUENCE_EASINGS.includes(seq.easing)||!children.length||
    seq.duration+seq.delay+seq.stagger*(children.length-1)>8000||
    children.some(c=>c.motion?.effect&&c.motion.effect!=='none'))
    fail(at,'invalid sequence or competing child motion');
}
function validHref(href){
  return typeof href==='string'&&href.length<=300&&(
    SAFE_URL.test(href)||/^https:\/\/[a-z0-9.-]+(?:\/[^\s"'<>\\]*)?$/i.test(href)||
    /^mailto:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,63}$/i.test(href)||
    /^tel:\+[1-9][0-9]{6,14}$/.test(href));
}
function validateGraph(graph,assetIds,existingIds,tokensInput,mediaKinds=new Map()){
  keys(graph,['version','id','nodes'],'graph');
  if(graph.version!==1||!IDENT.test(graph.id))fail('graph','unsupported version/id');
  const tokens=validateTokens(tokensInput),seen=existingIds||new Set();
  if(seen.has(graph.id))fail('graph','duplicate graph id');
  seen.add(graph.id);
  if(!Array.isArray(graph.nodes)||graph.nodes.length<1||graph.nodes.length>30)
    fail('graph.nodes','invalid number of roots');
  let count=0;const popups=new Set(),triggers=[];
  function visit(node,depth,parentType=null){
    if(depth>8||++count>90)fail('graph','excessive depth or node count');
    keys(node,['id','type','text','href','assetId','alt','level','styles','responsive','states','children','icon','motion','posterAssetId','loop','ordered','cite','backgroundMedia','backgroundVideo','responsiveMedia','popupTarget','sequence','transition','iconSize','iconWeight','runs','layout','columnsDesktop','columnsTablet','columnsMobile','lightbox','caption','photoShape','photoShapeTablet','photoShapeMobile','scrollControls','visibleDesktop','visibleTablet','visibleMobile','tableLayoutTablet','tableLayoutMobile','rowHeaders','tableAppearance','tableAppearanceTablet','tableAppearanceMobile','semanticTag','ariaLabel','formAppearance','formAppearanceTablet','formAppearanceMobile'],'node');
    if(!IDENT.test(node.id)||seen.has(node.id)||!TYPES.includes(node.type))fail('node','duplicate id / unknown type');
    seen.add(node.id);
    if(node.type!=='form-slot'&&['formAppearance','formAppearanceTablet','formAppearanceMobile'].some(k=>own(node,k)))
      fail(node.id,'form appearance is only available on form slots');
    if(own(node,'popupTarget')){
      if(node.type!=='button'||own(node,'href')||typeof node.popupTarget!=='string'||!IDENT.test(node.popupTarget))
        fail(node.id,'popup trigger must be a button with a valid popup ID');
      triggers.push({id:node.id,target:node.popupTarget});
    }
    if(node.type==='popup'){
      if(depth!==0||typeof node.text!=='string'||!node.text.trim()||node.text.length>120||
        /[\x00-\x1f]/.test(node.text))fail(node.id,'popup must be a labelled root panel');
      popups.add(node.id);
    }
    if(own(node,'sequence')&&node.type!=='container')fail(node.id,'sequence requires a container');
    if(own(node,'semanticTag')&&(node.type!=='container'||!['div','article','section','aside'].includes(node.semanticTag)))fail(node.id,'invalid semantic container tag');
    if(own(node,'ariaLabel')&&(node.type!=='container'||(node.semanticTag||'div')==='div'||typeof node.ariaLabel!=='string'||!node.ariaLabel.trim()||node.ariaLabel.length>120||/[\x00-\x1f]/.test(node.ariaLabel)))fail(node.id,'invalid container accessible name');
    if(own(node,'backgroundMedia')){
      if(['image','video','icon','divider','table-row','table-cell'].includes(node.type))
        fail(node.id,'background media not supported on this node');
      const m=node.backgroundMedia;
      keys(m,['assetId','tabletAssetId','mobileAssetId','size','positionX','positionY',
        'tabletPositionX','tabletPositionY','mobilePositionX','mobilePositionY','overlay'],'backgroundMedia');
      for(const id of [m.assetId,m.tabletAssetId,m.mobileAssetId].filter(v=>v!==undefined)){
        if(typeof id!=='string'||!assetIds.has(id)||
          !['image/jpeg','image/png','image/webp'].includes(mediaKinds.get(id)))
          fail(node.id,'background must reference an uploaded raster image');
      }
      if(!m.assetId||own(m,'size')&&!['cover','contain'].includes(m.size)||
        ['positionX','positionY','tabletPositionX','tabletPositionY','mobilePositionX','mobilePositionY']
          .some(k=>own(m,k)&&!number(m[k],0,100)))
        fail(node.id,'invalid background placement');
      if(own(m,'overlay')){
        keys(m.overlay,['color','opacity'],'background overlay');
        resolve(m.overlay.color,'colors',tokens,node.id+'/overlay');
        if(!number(m.overlay.opacity,0,90))fail(node.id,'invalid overlay opacity');
      }
      if([node.styles||{},node.responsive?.tablet||{},node.responsive?.mobile||{}].some(layer=>own(layer,'gradient')))
        fail(node.id,'background image conflicts with CSS gradient');
    }
    // Decorative video backgrounds need a real raster poster for fallbacks.
    if(own(node,'backgroundVideo')){
      if(node.type!=='container'||own(node,'backgroundMedia'))
        fail(node.id,'video backdrop requires a container without a raster background');
      const v=node.backgroundVideo;
      keys(v,['assetId','posterAssetId','tabletPosterAssetId','mobilePosterAssetId','positionX','positionY',
        'tabletPositionX','tabletPositionY','mobilePositionX','mobilePositionY','overlay'],node.id+'/backgroundVideo');
      if(typeof v.assetId!=='string'||!assetIds.has(v.assetId)||mediaKinds.get(v.assetId)!=='video/mp4')
        fail(node.id,'video backdrop must reference a site-owned MP4');
      for(const key of ['posterAssetId','tabletPosterAssetId','mobilePosterAssetId']){
        const id=v[key];
        if(key==='posterAssetId'||id!==undefined){
          if(typeof id!=='string'||!assetIds.has(id)||
            !['image/png','image/jpeg','image/webp'].includes(mediaKinds.get(id)))
            fail(node.id,'video backdrop poster must be a site-owned raster image');
        }
      }
      if(['positionX','positionY','tabletPositionX','tabletPositionY','mobilePositionX','mobilePositionY']
        .some(k=>own(v,k)&&!number(v[k],0,100)))fail(node.id,'invalid backdrop position');
      if(own(v,'overlay')){
        keys(v.overlay,['color','opacity'],node.id+'/backgroundVideo.overlay');
        resolve(v.overlay.color,'colors',tokens,node.id+'/video overlay');
        if(!number(v.overlay.opacity,0,90))fail(node.id,'invalid video overlay opacity');
      }
      if([node.styles||{},node.responsive?.tablet||{},node.responsive?.mobile||{}].some(layer=>own(layer,'gradient')))
        fail(node.id,'video backdrop conflicts with CSS gradient');
    }
    if(own(node,'responsiveMedia')){
      if(node.type!=='image')fail(node.id,'device images only on image nodes');
      const media=node.responsiveMedia;
      keys(media,['tabletAssetId','mobileAssetId'],node.id+'/responsiveMedia');
      if(!Object.keys(media).length)fail(node.id,'empty device image selection');
      for(const id of Object.values(media)){
        if(typeof id!=='string'||!assetIds.has(id)||
          !['image/png','image/jpeg','image/webp'].includes(mediaKinds.get(id)))
          fail(node.id,'device image must reference a site-owned raster asset');
      }
    }
    if((node.type!=='list'&&own(node,'ordered'))||(node.type==='list'&&own(node,'ordered')&&typeof node.ordered!=='boolean'))fail(node.id,'invalid ordered list flag');
    if(node.type==='table-row'&&parentType!=='table')fail(node.id,'row must belong to table');
    if(parentType==='table'&&node.type!=='table-row')fail(node.id,'table accepts only rows');
    if(node.type==='table-cell'&&parentType!=='table-row')fail(node.id,'cell must belong to row');
    if(parentType==='table-row'&&node.type!=='table-cell')fail(node.id,'row accepts only cells');
    if(parentType==='gallery'&&node.type!=='image')fail(node.id,'gallery accepts only images');
    if(parentType==='carousel'&&node.type!=='container')fail(node.id,'carousel accepts only authored container cards');
    if(node.type==='list-item'&&parentType!=='list')fail(node.id,'list item must belong to list');
    if(parentType==='list'&&node.type!=='list-item')fail(node.id,'list accepts only list items');
    if(node.type==='tab'&&parentType!=='tabs')fail(node.id,'tab must belong to tabs');
    if(parentType==='tabs'&&node.type!=='tab')fail(node.id,'tabs accept only tab children');
    if(node.type!=='quote'&&own(node,'cite'))fail(node.id,'unexpected citation');
    if(node.type==='quote'&&own(node,'cite')&&
      (typeof node.cite!=='string'||node.cite.length>160||/[\x00-\x1f]/.test(node.cite)))
      fail(node.id,'invalid quote attribution');
    if(node.type!=='gallery'&&['layout','columnsDesktop','columnsTablet','columnsMobile','lightbox','photoShape','photoShapeTablet','photoShapeMobile'].some(k=>own(node,k)))fail(node.id,'gallery settings on other node');
    if(!['gallery','carousel'].includes(node.type)&&['scrollControls','visibleDesktop','visibleTablet','visibleMobile'].some(k=>own(node,k)))fail(node.id,'scroll settings on other node');
    if(node.type!=='table'&&['tableLayoutTablet','tableLayoutMobile','rowHeaders','tableAppearance','tableAppearanceTablet','tableAppearanceMobile'].some(k=>own(node,k)))
      fail(node.id,'table layout on another node');
    if(own(node,'caption')&&(node.type!=='image'||typeof node.caption!=='string'||node.caption.length>240||/[\x00-\x1f]/.test(node.caption)))fail(node.id,'invalid gallery photo caption');
    if(node.type==='gallery'){
      for(const key of ['photoShape','photoShapeTablet','photoShapeMobile'])
        if(own(node,key)&&!['natural','square','landscape','portrait'].includes(node[key]))fail(node.id,'invalid gallery photo shape');
      if(own(node,'layout')&&!['scroll','grid'].includes(node.layout))fail(node.id,'invalid gallery layout');
      if(own(node,'scrollControls')&&(typeof node.scrollControls!=='boolean'||node.scrollControls&&node.layout==='grid'))fail(node.id,'scroll navigation requires scroll gallery');
      for(const [k,max] of [['visibleDesktop',6],['visibleTablet',4],['visibleMobile',2]])if(own(node,k)&&(node.layout==='grid'||!number(node[k],1,max)))fail(node.id,'invalid visible gallery cards');
      if(own(node,'lightbox')&&typeof node.lightbox!=='boolean')fail(node.id,'invalid gallery lightbox');
      if(['columnsDesktop','columnsTablet','columnsMobile'].some(k=>own(node,k))&&node.layout!=='grid')fail(node.id,'columns require grid gallery');
      for(const [key,min,max] of [['columnsDesktop',1,6],['columnsTablet',1,4],['columnsMobile',1,2]])
        if(own(node,key)&&!number(node[key],min,max))fail(node.id,'invalid gallery columns');
      if(node.lightbox&&node.children?.some(child=>own(child,'href')))fail(node.id,'gallery lightbox conflicts with linked photos');
      if(typeof node.text!=='string'||!node.text.trim()||node.text.length>120||
        /[\x00-\x1f]/.test(node.text)||['href','assetId','alt','level','icon','loop','posterAssetId','ordered'].some(k=>own(node,k)))
        fail(node.id,'invalid gallery label');
    }else if(node.type==='carousel'){
      if(typeof node.text!=='string'||!node.text.trim()||node.text.length>120||
        /[\x00-\x1f]/.test(node.text)||
        ['href','assetId','alt','level','icon','loop','posterAssetId','ordered'].some(k=>own(node,k)))
        fail(node.id,'invalid carousel accessible label');
      if(own(node,'scrollControls')&&typeof node.scrollControls!=='boolean')
        fail(node.id,'invalid carousel controls');
      for(const [key,max] of [['visibleDesktop',6],['visibleTablet',4],['visibleMobile',2]])
        if(own(node,key)&&!number(node[key],1,max))fail(node.id,'invalid carousel visible card count');
    }else if(node.type==='table'){
      if(own(node,'rowHeaders')&&typeof node.rowHeaders!=='boolean')fail(node.id,'invalid row header flag');
      for(const key of ['tableAppearance','tableAppearanceTablet','tableAppearanceMobile'])
        if(own(node,key))validateTableAppearance(node[key],tokens,node.id+'/'+key);
      for(const key of ['tableLayoutTablet','tableLayoutMobile'])
        if(own(node,key)&&!['scroll','cards'].includes(node[key]))fail(node.id,'invalid responsive table layout');
      if(own(node,'text')&&(typeof node.text!=='string'||node.text.length>160||
        /[\x00-\x1f]/.test(node.text)))fail(node.id,'invalid table caption');
      if(['href','assetId','alt','level','icon','loop','posterAssetId','ordered'].some(k=>own(node,k)))
        fail(node.id,'invalid table metadata');
    }else if(node.type==='popup'){
      if(['href','assetId','alt','level','icon','loop','posterAssetId','ordered'].some(k=>own(node,k)))
        fail(node.id,'invalid popup metadata');
    }else if(node.type==='container'||node.type==='divider'||node.type==='tabs'||node.type==='list'||node.type==='table-row'){

      if(own(node,'text')||own(node,'href')||own(node,'assetId')||own(node,'alt')||own(node,'level')||own(node,'posterAssetId')||own(node,'loop'))
        fail(node.id,'invalid container content');
    }else if(node.type==='form-slot'){
      for(const key of ['formAppearance','formAppearanceTablet','formAppearanceMobile'])
        if(own(node,key))validateFormAppearance(node[key],tokens,node.id+'/'+key);
      if(['text','href','assetId','alt','level','icon','posterAssetId','loop','ordered','cite','caption','children','runs','popupTarget','backgroundMedia','backgroundVideo','responsiveMedia','sequence','semanticTag','ariaLabel','layout'].some(k=>own(node,k)))
        fail(node.id,'form slot is a presentation-only leaf');
    }else if(node.type==='table-cell'){
      if(typeof node.text!=='string'||node.text.length>1600||/[\x00-\x1f]/.test(node.text)||
        ['href','assetId','alt','level','icon','loop','posterAssetId','ordered'].some(k=>own(node,k)))
        fail(node.id,'invalid table cell');
    }else if(node.type==='list-item'){
      if(typeof node.text!=='string'||node.text.length>3000||/[\x00-\x1f]/.test(node.text)||
        own(node,'href')||own(node,'assetId')||own(node,'alt')||own(node,'level')||own(node,'icon')||own(node,'posterAssetId')||own(node,'loop'))
        fail(node.id,'invalid list item');
    }else if(node.type==='disclosure'||node.type==='tab'){
      if(typeof node.text!=='string'||!node.text.trim()||node.text.length>160||
        /[\x00-\x1f]/.test(node.text)||own(node,'href')||own(node,'assetId')||
        own(node,'alt')||own(node,'level')||own(node,'icon')||own(node,'posterAssetId')||own(node,'loop'))
        fail(node.id,'invalid disclosure/tab label');
    }else if(node.type==='icon'){
      if((own(node,'iconSize')&&!number(node.iconSize,12,128))||
        (own(node,'iconWeight')&&!['thin','regular','bold'].includes(node.iconWeight)))
        fail(node.id,'invalid icon appearance');
      if(!own(ICON_PATHS,node.icon)||own(node,'text')||own(node,'href')||own(node,'assetId')||
        own(node,'level')||own(node,'children')||own(node,'posterAssetId')||own(node,'loop')||
        (own(node,'alt')&&(typeof node.alt!=='string'||node.alt.length>200||/[\x00-\x1f]/.test(node.alt))))
        fail(node.id,'invalid icon');
    }else if(node.type==='video'){
      if(typeof node.assetId!=='string'||!assetIds.has(node.assetId)||
        mediaKinds.get(node.assetId)!=='video/mp4'||
        typeof node.alt!=='string'||node.alt.length<1||node.alt.length>200||
        /[\x00-\x1f]/.test(node.alt)||own(node,'text')||own(node,'href')||
        own(node,'level')||own(node,'icon')||
        (own(node,'loop')&&typeof node.loop!=='boolean')||
        (own(node,'posterAssetId')&&(!assetIds.has(node.posterAssetId)||
          !/^image\/(?:png|jpeg|webp)$/.test(mediaKinds.get(node.posterAssetId)||''))))
        fail(node.id,'invalid video binding');
    }else if(node.type==='image'){
      if(own(node,'href')&&!validHref(node.href))fail(node.id,'unsafe media action');
      if(typeof node.assetId!=='string'||!assetIds.has(node.assetId)||
        !/^image\//.test(mediaKinds.get(node.assetId)||'')||own(node,'posterAssetId')||own(node,'loop')||
        typeof node.alt!=='string'||node.alt.length>200||/[\x00-\x1f]/.test(node.alt)||
        own(node,'text')||own(node,'level')||own(node,'icon'))fail(node.id,'invalid image binding');
    }else{
      if(typeof node.text!=='string'||node.text.length>3000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(node.text)||
        own(node,'assetId')||own(node,'alt')||own(node,'icon')||own(node,'posterAssetId')||own(node,'loop'))fail(node.id,'invalid text');
      if(['button','link'].includes(node.type)&&!own(node,'popupTarget')&&!validHref(node.href))
        fail(node.id,'unsafe link');
      if(!['button','link'].includes(node.type)&&own(node,'href'))fail(node.id,'unexpected link');
      if(node.type==='heading'&&(!number(node.level||2,1,6)))fail(node.id,'heading level');
      if(node.type!=='heading'&&own(node,'level'))fail(node.id,'unexpected level');
    }
    if(own(node,'runs')){
      if(!['heading','text'].includes(node.type)||!Array.isArray(node.runs)||
        node.runs.length<2||node.runs.length>16)
        fail(node.id,'formatted fragments require a heading or paragraph');
      let sum='';
      for(const run of node.runs){
        keys(run,['text','strong','italic','color','href'],node.id+'/run');
        if(typeof run.text!=='string'||run.text.length<1||run.text.length>1500||
          /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(run.text))
          fail(node.id,'invalid formatted fragment');
        for(const key of ['strong','italic'])if(own(run,key)&&typeof run[key]!=='boolean')
          fail(node.id,'invalid fragment emphasis');
        if(own(run,'color'))resolve(run.color,'colors',tokens,node.id+'/run/color');
        if(own(run,'href')&&!validHref(run.href))fail(node.id,'invalid fragment link');
        sum+=run.text;
      }
      if(sum!==node.text)fail(node.id,'formatted fragments must equal the editable plain text');
    }
    if(node.type!=='icon'&&(own(node,'iconSize')||own(node,'iconWeight')))
      fail(node.id,'unexpected icon appearance');
    validateStyle(node.styles||{},tokens,node.id+'/styles');
    if(own(node,'motion'))validateMotion(node.motion,node.id+'/motion');
    if(own(node,'transition')){
      keys(node.transition,['duration','easing'],node.id+'/transition');
      if(!number(node.transition.duration,0,1000)||
        !SEQUENCE_EASINGS.includes(node.transition.easing))
        fail(node.id,'invalid interaction transition');
    }
    if(own(node,'responsive')){
      keys(node.responsive,['tablet','mobile'],node.id+'/responsive');
      for(const [bp,st] of Object.entries(node.responsive))validateStyle(st,tokens,node.id+'/'+bp);
    }
    if(own(node,'states')){
      keys(node.states,['hover','focus','active'],node.id+'/states');
      for(const [state,st] of Object.entries(node.states))validateStyle(st,tokens,node.id+'/'+state,'state');
    }
    if(!['container','disclosure','tabs','tab','list','gallery','carousel','table','table-row','popup'].includes(node.type)&&own(node,'children'))fail(node.id,'noncontainer children');
    if(['container','disclosure','tabs','tab','list','gallery','carousel','table','table-row','popup'].includes(node.type)){
      const min=['tabs','gallery','carousel','table'].includes(node.type)?2:
        ['tab','disclosure','list','table-row','popup'].includes(node.type)?1:0;
      const max=node.type==='tabs'?8:node.type==='list'?24:['gallery','carousel'].includes(node.type)?12:
        node.type==='table'?10:node.type==='table-row'?6:30;
      if(!Array.isArray(node.children)||node.children.length<min||node.children.length>max)
        fail(node.id,'invalid content-group children');
      if(node.type==='table'){
        const widths=node.children.map(row=>row.children?.length);
        if(widths.some(w=>!Number.isInteger(w)||w<2||w>6||w!==widths[0]))
          fail(node.id,'table must be rectangular with 2-6 columns');
      }
      if(own(node,'sequence'))validateSequence(node.sequence,node.children,node.id+'/sequence');
      if(node.type==='carousel'&&node.children.some(child=>!Array.isArray(child.children)||!child.children.length))
        fail(node.id,'carousel cards need authored content');
      node.children.forEach(n=>visit(n,depth+1,node.type));
    }
  }
  graph.nodes.forEach(n=>visit(n,0));
  for(const t of triggers)if(!popups.has(t.target))fail(t.id,'popup target absent from this graph');
  return graph;
}
function formSlotIds(graph){
  const ids=[];
  const visit=nodes=>{for(const node of nodes||[]){
    if(node.type==='form-slot')ids.push(node.id);
    if(Array.isArray(node.children))visit(node.children);
  }};
  visit(graph?.nodes);
  return ids;
}
function baseGraph(sectionId){
  return {version:1,id:sectionId+'-design',nodes:[
    {id:sectionId+'-layout',type:'container',styles:{display:'grid',columns:2,gap:'@large',padding:'@large',align:'center'},
      responsive:{mobile:{columns:1,gap:'@medium',padding:'@medium'}},children:[
      {id:sectionId+'-title',type:'heading',level:2,text:'Ваш уникальный заголовок',
        styles:{fontSize:'@heading',color:'@foreground',lineHeight:115}},
      {id:sectionId+'-copy',type:'text',text:'Все элементы, сетки, отступы и стили редактируются в CMS.',
        styles:{fontSize:'@body',color:'@muted'}}
    ]}
  ]};
}

/**
 * Atomic, AI-free structural editing of an existing typed composition.
 * Never mutates source, preserves every descendant property and media asset reference.
 * The final edit is still validated by the normal site/asset contract on Apply.
 */
function editTree(graph,operation){
  if(!object(operation)||!['duplicate','move','insert','wrap','unwrap','remove'].includes(operation.action))
    fail('edit','unknown operation');
  const next=JSON.parse(JSON.stringify(graph));
  const scan=()=>{
    if(next.version!==1||!Array.isArray(next.nodes)||next.nodes.length<1||next.nodes.length>30)
      fail('edit','invalid roots');
    const found=new Map();
    const visit=(node,items,depth,parentType=null)=>{
      if((node.type==='tab'&&parentType!=='tabs')||(parentType==='tabs'&&node.type!=='tab')||
        (node.type==='list-item'&&parentType!=='list')||(parentType==='list'&&node.type!=='list-item')||
        (node.type==='table-row'&&parentType!=='table')||(parentType==='table'&&node.type!=='table-row')||
        (node.type==='table-cell'&&parentType!=='table-row')||(parentType==='table-row'&&node.type!=='table-cell')||
        (parentType==='gallery'&&node.type!=='image')||
        (parentType==='carousel'&&node.type!=='container')||(node.type==='popup'&&depth!==0))fail('edit','invalid group hierarchy');
      if(['tabs','gallery','carousel','table'].includes(node.type)&&(!Array.isArray(node.children)||node.children.length<2))
        fail('edit','group must contain at least two items');
      if(['tab','disclosure','list','table-row','popup'].includes(node.type)&&(!Array.isArray(node.children)||!node.children.length))
        fail('edit','interactive panel needs content');
      if(node.type==='table'&&node.children.some(row=>!Array.isArray(row.children)||
        row.children.length<2||row.children.length>6||row.children.length!==node.children[0].children.length))
        fail('edit','table must have equal columns');
      if(!object(node)||typeof node.id!=='string'||!IDENT.test(node.id)||
        found.has(node.id)||!TYPES.includes(node.type)||depth>8||found.size>=90)
        fail('edit','invalid node, duplicated id or graph limit');
      found.set(node.id,{node,items,depth});
      if(['container','disclosure','tabs','tab','list','gallery','carousel','table','table-row','popup'].includes(node.type)){
        if(!Array.isArray(node.children)||node.children.length>(node.type==='tabs'?8:node.type==='list'?24:
          ['gallery','carousel'].includes(node.type)?12:node.type==='table'?10:node.type==='table-row'?6:30))fail('edit','container limit');
        node.children.forEach(child=>visit(child,node.children,depth+1,node.type));
      }else if(own(node,'children'))fail('edit','invalid child owner');
    };
    next.nodes.forEach(node=>visit(node,next.nodes,0));
    return found;
  };
  const before=scan(),source=operation.action==='insert'?null:before.get(operation.nodeId);
  if(operation.action!=='insert'&&!source)fail('edit','missing selected node');
  const descendants=[];
  const walk=(node)=>{descendants.push(node);if(['container','disclosure','tabs','tab','list','gallery','carousel','table','table-row','popup'].includes(node.type))node.children.forEach(walk);};
  if(source)walk(source.node);
  if(operation.action==='duplicate'){
    if(!Array.isArray(operation.ids)||operation.ids.length!==descendants.length||
       operation.ids.some(id=>typeof id!=='string'||!IDENT.test(id)||before.has(id))||
       new Set(operation.ids).size!==operation.ids.length)fail('edit','invalid replacement ids');
    const copy=JSON.parse(JSON.stringify(source.node));
    let idx=0;
    const rewrite=(node)=>{node.id=operation.ids[idx++];if(['container','disclosure','tabs','tab','list','gallery','carousel','table','table-row','popup'].includes(node.type))node.children.forEach(rewrite);};
    rewrite(copy);
    source.items.splice(source.items.indexOf(source.node)+1,0,copy);
  }else if(operation.action==='insert'){
    const target=before.get(operation.targetId);
    if(!target||!['before','after','inside'].includes(operation.placement)||
       !object(operation.node))fail('edit','invalid insertion');
    if(operation.placement==='inside'){
      if(!['container','disclosure','tabs','tab','list','gallery','carousel','table','table-row','popup'].includes(target.node.type))fail('edit','destination not a container');
      target.node.children.push(JSON.parse(JSON.stringify(operation.node)));
    }else{
      target.items.splice(target.items.indexOf(target.node)+(operation.placement==='after'?1:0),
        0,JSON.parse(JSON.stringify(operation.node)));
    }
  }else if(operation.action==='move'){
    const target=before.get(operation.targetId);
    if(!target||!['before','after','inside'].includes(operation.placement)||
       descendants.some(n=>n.id===operation.targetId))
      fail('edit','invalid destination or cycle');
    if(operation.placement==='inside'&&!['container','disclosure','tabs','tab','list','gallery','carousel','table','table-row','popup'].includes(target.node.type))
      fail('edit','destination not a container');
    source.items.splice(source.items.indexOf(source.node),1);
    if(operation.placement==='inside')target.node.children.push(source.node);
    else target.items.splice(target.items.indexOf(target.node)+(operation.placement==='after'?1:0),0,source.node);
  }else if(operation.action==='wrap'){
    if(typeof operation.wrapperId!=='string'||!IDENT.test(operation.wrapperId)||
      before.has(operation.wrapperId))fail('edit','invalid wrapper id');
    source.items.splice(source.items.indexOf(source.node),1,{
      id:operation.wrapperId,type:'container',
      styles:{display:'flex',direction:'column',gap:16},children:[source.node]
    });
  }else if(operation.action==='unwrap'){
    if(source.node.type!=='container'||!source.node.children.length)
      fail('edit','only a nonempty container can be unwrapped');
    source.items.splice(source.items.indexOf(source.node),1,...source.node.children);
  }else{
    if(before.size===descendants.length)fail('edit','cannot remove all graph nodes');
    source.items.splice(source.items.indexOf(source.node),1);
  }
  scan();
  return next;
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function declarations(style,t){
  const css=[],put=(k,v)=>css.push(k+':'+v);
  const aliases={display:'display',direction:'flex-direction',color:'color',fontWeight:'font-weight',
    maxWidth:'max-width',position:'position',textAlign:'text-align',order:'order',
    flexWrap:'flex-wrap',flexGrow:'flex-grow',flexShrink:'flex-shrink',overflow:'overflow',objectFit:'object-fit',zIndex:'z-index',justifySelf:'justify-self',textDecoration:'text-decoration',whiteSpace:'white-space',fontStyle:'font-style',textTransform:'text-transform',textWrap:'text-wrap',wordBreak:'word-break',textOverflow:'text-overflow',transformOrigin:'transform-origin',isolation:'isolation',mixBlendMode:'mix-blend-mode'};
  const pixel={textIndent:'text-indent',borderTopLeftRadius:'border-top-left-radius',borderTopRightRadius:'border-top-right-radius',borderBottomRightRadius:'border-bottom-right-radius',borderBottomLeftRadius:'border-bottom-left-radius',gap:'gap',rowGap:'row-gap',columnGap:'column-gap',padding:'padding',
    paddingX:'padding-inline',paddingY:'padding-block',marginTop:'margin-top',
    marginBottom:'margin-bottom',radius:'border-radius',fontSize:'font-size',
    minHeight:'min-height',top:'top',left:'left',right:'right',bottom:'bottom',widthPx:'width',heightPx:'height',minWidth:'min-width',maxHeight:'max-height'};
  for(const [k,v] of Object.entries(style)){
    if(k==='fluidFont'){
      const slope=(v.max-v.min)*100/880,intercept=v.min-slope*3.2;
      put('font-size','clamp('+v.min+'px,calc('+slope.toFixed(4)+'vw + '+intercept.toFixed(4)+'px),'+v.max+'px)');
      continue;
    }
    if(k==='shadowFine'){
      put('box-shadow',(v.inset?'inset ':'')+v.x+'px '+v.y+'px '+v.blur+'px '+v.spread+'px '+
        resolve(v.color,'colors',t,k));continue;
    }
    if(k==='gradient'){
      const prefix=v.type==='radial'?'radial-gradient(circle '+(v.radius||'farthest-corner')+' at '+(v.centerX??50)+'% '+(v.centerY??50)+'%,':'linear-gradient('+v.angle+'deg,';
      put('background-image',prefix+resolve(v.from,'colors',t,k)+','+(own(v,'via')?resolve(v.via,'colors',t,k)+' '+v.viaAt+'%,':'')+
        resolve(v.to,'colors',t,k)+')');continue;
    }
    const color=['color','background','borderColor','outlineColor'].includes(k);
    const spacing=['gap','rowGap','columnGap','padding','paddingX','paddingY','top','left','right','bottom','minHeight'].includes(k);
    const group=spacing?'spacing':['radius','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].includes(k)?'radii':k==='fontSize'?'typography':null;
    const value=color?resolve(v,'colors',t,k):group?resolve(v,group,t,k):v;
    if(own(aliases,k)){put(aliases[k],k==='maxWidth'?value+'px':value);continue;}
    if(k==='hidden'){if(value)put('display','none');continue;}
    if(k==='columns'){put('grid-template-columns','repeat('+value+',minmax(0,1fr))');continue;}
    if(k==='gridTracks'){put('grid-template-columns',v.map(w=>'minmax(0,'+w+'fr)').join(' '));continue;}
    if(k==='gridAutoRowsPx'){put('grid-auto-rows','minmax('+v+'px,auto)');continue;}
    if(k==='gridColumnsPreset'){put('grid-template-columns',{'sidebar-left':'minmax(0,1fr) minmax(0,2fr)','sidebar-right':'minmax(0,2fr) minmax(0,1fr)','wide-center':'minmax(0,1fr) minmax(0,3fr) minmax(0,1fr)','editorial':'minmax(0,2fr) minmax(0,3fr) minmax(0,2fr)'}[value]);continue;}
    if(k==='gridColumnStart'||k==='gridRowStart'){put(k==='gridColumnStart'?'grid-column-start':'grid-row-start',value);continue;}
    if(k==='translateX'||k==='translateY'){put(k==='translateX'?'--cmsdg-tx':'--cmsdg-ty',value+'px');continue;}
    if(k==='rotateDeg'){put('rotate',value+'deg');continue;}
    if(k==='scalePercent'){put('scale',(value/100).toFixed(2));continue;}
    if(k==='wordSpacing'){put('word-spacing',(value/10).toFixed(1)+'px');continue;}
    if(k==='filterPreset'){put('filter',{none:'none',grayscale:'grayscale(1)',sepia:'sepia(.85)',contrast:'contrast(1.25)',vibrant:'saturate(1.6)'}[value]);continue;}
    if(k==='borderStyle'){put('border-style',value);continue;}
    if(k==='textShadow'){put('text-shadow',{'none':'none','soft':'0 2px 8px #10182040','strong':'0 4px 18px #10182080'}[value]);continue;}
    if(k==='clipShape'){put('clip-path',{'none':'none','circle':'circle(50% at 50% 50%)','ellipse':'ellipse(50% 40% at 50% 50%)','diagonal':'polygon(0 0,100% 0,100% 90%,0 100%)','hexagon':'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)'}[value]);continue;}
    if(k==='backdropBlur'){put('backdrop-filter','blur('+value+'px)');put('-webkit-backdrop-filter','blur('+value+'px)');continue;}
    if(k==='gridColumnSpan'){put('grid-column','span '+value);continue;}
    if(k==='gridRowSpan'){put('grid-row','span '+value);continue;}
    if(k==='gridAutoFlow'){put('grid-auto-flow',value.replace('-', ' '));continue;}
    if(k==='flexBasisPercent'){put('flex-basis',value+'%');continue;}
    if(k==='objectPositionX'||k==='objectPositionY'){put(k==='objectPositionX'?'--cmsdg-object-x':'--cmsdg-object-y',value+'%');continue;}
    if(k==='alignContent'){put('align-content',value==='between'?'space-between':value==='start'?'flex-start':value==='end'?'flex-end':value);continue;}
    if(['align','justify','alignSelf'].includes(k)){
      put({align:'align-items',justify:'justify-content',alignSelf:'align-self'}[k],
        value==='between'?'space-between':value==='start'?'flex-start':value==='end'?'flex-end':value);continue;
    }
    if(k==='fontFamily'){
      put('font-family',{inherit:'inherit',system:'system-ui,Arial,sans-serif',arial:'Arial,sans-serif',
        georgia:'Georgia,serif',serif:'ui-serif,Georgia,serif',mono:'ui-monospace,monospace',
        'site-body':'var(--cms-font)','site-heading':'var(--cms-heading-font)'}[value]);continue;
    }
    if(k==='aspectRatio'){
      put('aspect-ratio',{auto:'auto',square:'1/1',portrait:'3/4',landscape:'4/3',wide:'16/9'}[value]);continue;
    }
    if(k==='shadow'){
      put('box-shadow',{none:'none',soft:'0 5px 16px #10182020',medium:'0 12px 32px #10182033',
        strong:'0 20px 56px #1018204d'}[value]);continue;
    }
    if(k==='minHeightViewport'||k==='heightViewport'){const prop=k==='minHeightViewport'?'min-height':'height';put(prop,value+'vh');put(prop,value+'svh');continue;}
    if(['paddingTop','paddingRight','paddingBottom','paddingLeft'].includes(k))continue;
    if(own(pixel,k)){put(pixel[k],value+'px');continue;}
    if(k==='widthPercent'){put('width',value+'%');continue;}
    if(k==='letterSpacing'){put('letter-spacing',(value/10).toFixed(1)+'px');continue;}
    if(k==='background')put('background-color',value);
    if(k==='borderColor')put('border-color',value);
    if(k==='outlineColor')put('outline-color',value);
    if(k==='outlineWidth'){put('outline-style','solid');put('outline-width',value+'px');put('outline-offset','2px');}
    if(k==='lineHeight')put('line-height',(value/100).toFixed(2));
    if(k==='opacity')put('opacity',(value/100).toFixed(2));
    if(k==='borderWidth'){if(!own(style,'borderStyle'))put('border-style','solid');put('border-width',value+'px');}
  }
  if(own(style,'gridColumnStart')&&own(style,'gridColumnSpan'))put('grid-column',style.gridColumnStart+' / span '+style.gridColumnSpan);
  if(own(style,'gridRowStart')&&own(style,'gridRowSpan'))put('grid-row',style.gridRowStart+' / span '+style.gridRowSpan);
  for(const [key,prop] of [['paddingTop','padding-top'],['paddingRight','padding-right'],['paddingBottom','padding-bottom'],['paddingLeft','padding-left']])if(own(style,key))put(prop,resolve(style[key],'spacing',t,key)+'px');
  return css.join(';');
}
function render(site,graph,mount='',mediaPreview=null,sectionId=graph.id,videoPreview=null,formSection=null,previewFormStep=0){
  validateGraph(graph,new Set(site.assets.map(x=>x.id)),new Set(),
    site.designTokens,new Map(site.assets.map(x=>[x.id,x.mime])));
  const tokens=validateTokens(site.designTokens);
  const safeMount=mount.replace(/\/$/,'');
  const assets=new Map(site.assets.map(a=>[a.id,a])),rules=[];
  const scope='.cmsdg-'+graph.id;
  const galleryTranslations={
    ru:['Открыть фотографию','Закрыть фотографию','Предыдущая фотография','Следующая фотография','Навигация по фотографиям','Фотография'],
    en:['Open photo','Close photo','Previous photo','Next photo','Photo navigation','Photo'],
    pl:['Otwórz zdjęcie','Zamknij zdjęcie','Poprzednie zdjęcie','Następne zdjęcie','Nawigacja zdjęć','Zdjęcie'],
    de:['Foto öffnen','Foto schließen','Vorheriges Foto','Nächstes Foto','Fotonavigation','Foto'],
    be:['Адкрыць фота','Закрыць фота','Папярэдняе фота','Наступнае фота','Навігацыя па фота','Фота'],
    uk:['Відкрити фото','Закрити фото','Попереднє фото','Наступне фото','Навігація фотографіями','Фото']
  };
  const gl=galleryTranslations[site.language]||galleryTranslations.ru;
  const attr=s=>escapeHtml(s);
  /* The Graph canvas must show actual authored field labels but must NEVER emit a live form action. */
  const authoredSection=formSection||site.pages?.flatMap(p=>p.sections||[])
    .find(section=>section.designGraph?.id===graph.id);
  const renderInertForm=()=>{
    if(!authoredSection||!['lead-form','lead-form-flex'].includes(authoredSection.component))return '<p>Форма заявки — серверный предпросмотр</p>';
    const elements=new Map(authoredSection.elements.map(element=>[element.slot,element.values]));
    const labelOf=slot=>String(elements.get(slot)?.['content.text']||'');
    const words={
      ru:['Это предварительный вид; отправка отключена','Предыдущий шаг','Следующий шаг','Шаг','Условный вопрос'],
      en:['Preview only; submission disabled','Previous step','Next step','Step','Conditional question'],
      pl:['Tylko podgląd; wysyłanie wyłączone','Poprzedni krok','Następny krok','Krok','Pytanie warunkowe'],
      de:['Nur Vorschau; Absenden deaktiviert','Vorheriger Schritt','Nächster Schritt','Schritt','Bedingtes Feld'],
      be:['Толькі прагляд; адпраўка адключана','Папярэдні крок','Наступны крок','Крок','Умоўнае пытанне'],
      uk:['Лише перегляд; надсилання вимкнено','Попередній крок','Наступний крок','Крок','Умовне питання']
    }[site.language]||['Это предварительный вид; отправка отключена','Предыдущий шаг','Следующий шаг','Шаг','Условный вопрос'];
    const fields=[
      {id:'name',kind:'text',label:labelOf('name-label'),required:true,placeholder:''},
      {id:'email',kind:'email',label:labelOf('email-label'),required:true,placeholder:''},
      {id:'message',kind:'textarea',label:labelOf('message-label'),required:true,placeholder:''}
    ];
    for(const [i,slot] of ['extra-one','extra-two','extra-three'].entries()){
      const data=elements.get(slot)||{},kind=data['behavior.kind'];
      if(!kind||kind==='off')continue;
      fields.push({id:'extra'+(i+1),kind,label:String(data['content.text']||''),
        required:data['behavior.required']===true,placeholder:'',
        options:String(data['content.options']||'').split(/\r?\n/).filter(Boolean)});
    }
    for(const item of authoredSection.formFields||[])
      fields.push({id:item.id,kind:item.kind,label:item.label,required:item.required,
        placeholder:item.placeholder,options:item.options,when:item.when,fullWidth:item.fullWidth});
    const fieldMarkup=field=>{
      const label=attr(field.label)+(field.required?' *':'')+(field.when?' <small>('+attr(words[4])+')</small>':'');
      const options=(field.options||[]).map(option=>'<option>'+attr(option)+'</option>').join('');
      let control;
      if(field.kind==='textarea')control='<textarea disabled rows="3" placeholder="'+attr(field.placeholder||'')+'"></textarea>';
      else if(field.kind==='select')control='<select disabled><option value=""></option>'+options+'</select>';
      else if(field.kind==='radio')control='<div class="cmsdg-preview-choices">'+
        (field.options||[]).map(option=>'<label><input disabled type="radio"> '+attr(option)+'</label>').join('')+'</div>';
      else if(field.kind==='checkbox')control='<input disabled type="checkbox">';
      else control='<input disabled type="'+attr(['text','tel','email','number','date','url'].includes(field.kind)?field.kind:'text')+
        '" placeholder="'+attr(field.placeholder||'')+'">';
      const classes='cmsdg-preview-field'+(field.kind==='textarea'||field.fullWidth?' cmsdg-preview-wide':'')+
        (field.when?' cmsdg-preview-conditional':'');
      if(field.kind==='radio')return '<fieldset data-cms-form-field="'+attr(field.id)+'" class="'+classes+'"><legend>'+label+'</legend>'+control+'</fieldset>';
      return '<label data-cms-form-field="'+attr(field.id)+'" class="'+classes+'">'+label+control+'</label>';
    };
    const steps=Array.isArray(authoredSection.formSteps)?authoredSection.formSteps:null;
    const stepIndex=steps?Math.min(steps.length-1,Math.max(0,
      Number.isInteger(previewFormStep)?previewFormStep:0)):0;
    const active=steps?new Set(steps[stepIndex].fields):null;
    const visible=fields.filter(field=>!active||active.has(field.id));
    const progress=steps?'<p class="cmsdg-preview-progress">'+attr(words[3])+' '+(stepIndex+1)+' / '+steps.length+' · '+attr(steps[stepIndex].title)+'</p>':'';
    const next=steps?'<div class="cmsdg-preview-steps"><button type="button" disabled>'+attr(words[1])+
      '</button><button type="button" disabled>'+attr(words[2])+'</button></div>':'';
    const activeFields=visible.map(fieldMarkup).join('');
    const body=steps?'<fieldset class="cmsdg-preview-step"><legend>'+attr(steps[stepIndex].title)+
      '</legend>'+activeFields+next+'</fieldset>':activeFields;
    return '<div class="cmsdg-form-preview" role="group" aria-label="'+attr(labelOf('heading'))+'">'+
      '<h2>'+attr(labelOf('heading'))+'</h2>'+progress+
      body+
      '<label class="cmsdg-preview-consent"><input type="checkbox" disabled> '+attr(labelOf('consent-label'))+'</label>'+
      '<button type="button" disabled class="cmsdg-preview-submit">'+attr(labelOf('submit-label'))+'</button>'+
      '<small class="cmsdg-preview-note">'+attr(words[0])+'</small></div>';
  };
  const imageUrl=id=>{
    const a=assets.get(id);
    return a?(mediaPreview?mediaPreview(id):null)||safeMount+a.src:null;
  };
  const cssUrl=url=>JSON.stringify(String(url)).replace(/</g,'\\3c ').replace(/>/g,'\\3e ');
  const backdropPos=(m,bp,axis)=>bp==='mobile'?
    (m['mobilePosition'+axis]??m['tabletPosition'+axis]??m['position'+axis]??50):
    bp==='tablet'?(m['tabletPosition'+axis]??m['position'+axis]??50):
      (m['position'+axis]??50);
  const makeBackdrop=(m,id,bp='desktop')=>{
    const url=imageUrl(id);if(!url)return '';
    let image='url('+cssUrl(url)+')';
    if(m.overlay){
      const color=resolve(m.overlay.color,'colors',tokens,'overlay')+
        Math.round(m.overlay.opacity*255/100).toString(16).padStart(2,'0');
      image='linear-gradient('+color+','+color+'),'+image;
    }
    return 'background-image:'+image+';background-size:'+(m.size||'cover')+
      ';background-position:'+backdropPos(m,bp,'X')+'% '+backdropPos(m,bp,'Y')+'%;background-repeat:no-repeat';
  };
  const tableHeaderIds=new Set(),tableRowHeaderIds=new Set(),tableCellLabels=new Map();
  const markHeaders=nodes=>{for(const node of nodes){
    if(node.type==='table'){
      const headers=node.children[0]?.children||[];
      headers.forEach(cell=>tableHeaderIds.add(cell.id));
      if(node.rowHeaders)for(const row of node.children.slice(1))tableRowHeaderIds.add(row.children[0].id);
      if(node.tableLayoutTablet==='cards'||node.tableLayoutMobile==='cards')
        for(const row of node.children.slice(1))row.children.forEach((cell,i)=>
          tableCellLabels.set(cell.id,headers[i]?.text||''));
    }
    if(node.children)markHeaders(node.children);
  }};markHeaders(graph.nodes);
  const richText=n=>{
    if(!n.runs)return attr(n.text);
    return n.runs.map(run=>{
      let part=attr(run.text);
      if(run.strong)part='<strong>'+part+'</strong>';
      if(run.italic)part='<em>'+part+'</em>';
      if(run.color)part='<span style="color:'+resolve(run.color,'colors',tokens,n.id+'/run/color')+'">'+part+'</span>';
      if(run.href){
        const href=run.href.startsWith('/')?safeMount+run.href:run.href;
        part='<a href="'+attr(href)+'"'+(href.startsWith('https://')?' rel="noopener noreferrer"':'')+'>'+part+'</a>';
      }
      return part;
    }).join('');
  };
  function visit(n,parentType=null){
    const selector=scope+' .cmsdg-n-'+n.id;
    const usesTranslate=[n.styles||{},n.responsive?.tablet||{},n.responsive?.mobile||{}].some(s=>own(s,'translateX')||own(s,'translateY'));
    if(usesTranslate)rules.push(selector+'{--cmsdg-tx:0px;--cmsdg-ty:0px;translate:var(--cmsdg-tx) var(--cmsdg-ty)}');
    if(n.runs)rules.push(selector+'{white-space:pre-line}');
    const baseline=declarations(n.styles||{},tokens);
    if(baseline)rules.push(selector+'{'+baseline+'}');
    for(const bp of ['tablet','mobile']){
      const css=declarations(n.responsive?.[bp]||{},tokens);
      if(css)rules.push('@media(max-width:'+(bp==='tablet'?'900':'600')+'px){'+selector+'{'+css+'}}');
    }
    if(n.transition){
      const t=n.transition,base=selector;
      rules.push(base+'{transition:color '+t.duration+'ms '+t.easing+
        ',background-color '+t.duration+'ms '+t.easing+
        ',border-color '+t.duration+'ms '+t.easing+
        ',border-radius '+t.duration+'ms '+t.easing+
        ',opacity '+t.duration+'ms '+t.easing+
        ',filter '+t.duration+'ms '+t.easing+
        ',scale '+t.duration+'ms '+t.easing+'}');
    }
    for(const state of ['hover','focus','active']){
      const css=declarations(n.states?.[state]||{},tokens);
      if(css)rules.push(selector+(state==='focus'?':focus-visible':state==='active'?':active':':hover')+'{'+css+'}');
    }
    if(n.backgroundMedia){
      const m=n.backgroundMedia;
      const desktop=makeBackdrop(m,m.assetId);if(desktop)rules.push(selector+'{'+desktop+'}');
      for(const [bp,limit] of [['tablet',900],['mobile',600]]){
        if(!m[bp+'AssetId']&&m[bp+'PositionX']===undefined&&m[bp+'PositionY']===undefined)continue;
        const id=bp==='mobile'?m.mobileAssetId||m.tabletAssetId||m.assetId:
          m.tabletAssetId||m.assetId;
        const css=makeBackdrop(m,id,bp);
        if(css)rules.push('@media(max-width:'+limit+'px){'+selector+'{'+css+'}}');
      }
    }
    if(n.backgroundVideo){
      const v=n.backgroundVideo,b=selector+' > .cmsdg-video-backdrop';
      const poster=id=>'url('+cssUrl(imageUrl(id))+')';
      const basePosition=n.styles?.position&&n.styles.position!=='static'?n.styles.position:'relative';
      rules.push(selector+'{position:'+basePosition+';isolation:isolate}'+b+
        '{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden;border-radius:inherit;'+
        'background-image:'+poster(v.posterAssetId)+';background-size:cover;background-repeat:no-repeat;'+
        'background-position:'+backdropPos(v,'desktop','X')+'% '+backdropPos(v,'desktop','Y')+'%}');
      for(const [bp,limit] of [['tablet',900],['mobile',600]]){
        const position=n.responsive?.[bp]?.position;
        if(position)rules.push('@media(max-width:'+limit+'px){'+selector+'{position:'+(position==='static'?'relative':position)+'}}');
        const id=v[bp+'PosterAssetId'];if(id)
          rules.push('@media(max-width:'+limit+'px){'+b+'{background-image:'+poster(id)+'}}');
        if(v[bp+'PositionX']!==undefined||v[bp+'PositionY']!==undefined){
          const pos=backdropPos(v,bp,'X')+'% '+backdropPos(v,bp,'Y')+'%';
          rules.push('@media(max-width:'+limit+'px){'+b+'{background-position:'+pos+'}'+
            (bp==='tablet'?b+' video{object-position:'+pos+'!important}':'')+'}');
        }
      }
      rules.push(b+' video{position:absolute;inset:0;width:100%!important;height:100%!important;'+
        'max-width:none!important;object-fit:cover;object-position:'+backdropPos(v,'desktop','X')+'% '+
        backdropPos(v,'desktop','Y')+'%;display:block}');
      if(v.overlay){
        const tint=resolve(v.overlay.color,'colors',tokens,n.id+'/video overlay')+
          Math.round(v.overlay.opacity*255/100).toString(16).padStart(2,'0');
        rules.push(b+'::after{content:"";position:absolute;inset:0;background-color:'+tint+'}');
      }
      rules.push('@media(prefers-reduced-motion:reduce){'+b+' video{display:none!important}}');
      rules.push('@media(max-width:600px){'+b+' video{display:none!important}}');
    }
    if(n.sequence){
      const t=n.sequence;
      n.children.forEach((ch,i)=>rules.push(selector+' > .cmsdg-n-'+ch.id+
        '{animation:cmsdg-'+t.effect+' '+t.duration+'ms '+t.easing+' '+(t.delay+i*t.stagger)+'ms both}'));
    }
    if(n.motion&&n.motion.effect!=='none'){
      const m=n.motion,easing=m.easing||'ease-out';
      if(m.trigger==='scroll'){
        // CSS-only scroll timeline: non-supporting browsers retain visible static content.
        // Timeline durations follow view progress rather than milliseconds.
        rules.push('@supports (animation-timeline: view()){'+selector+
          '{animation:cmsdg-'+m.effect+' 1s '+easing+' both;animation-timeline:view(block);animation-range:entry 0% cover 35%}}');
      }else rules.push(selector+'{animation:cmsdg-'+m.effect+' '+m.duration+'ms '+easing+' '+m.delay+'ms both}');
    }
    const cls='cmsdg-n-'+n.id;
    if(n.type==='popup')return '<div popover="auto" id="cmsdg-popup-'+n.id+'" class="'+cls+' cmsdg-popup" role="dialog" aria-label="'+attr(n.text)+'">'+
      '<button type="button" class="cmsdg-popup-close" popovertarget="cmsdg-popup-'+n.id+'" popovertargetaction="hide" aria-label="Закрыть окно">×</button>'+
      n.children.map(visit).join('')+'</div>';
    if(n.type==='container'){
      let backdrop='';
      if(n.backgroundVideo){
        const v=n.backgroundVideo,poster=imageUrl(v.posterAssetId);
        const videoSrc=videoPreview?videoPreview(v.assetId):safeMount+assets.get(v.assetId).src;
        backdrop='<div class="cmsdg-video-backdrop" aria-hidden="true">'+
          (videoSrc?'<video autoplay muted loop playsinline preload="none"'+
            (poster?' poster="'+attr(poster)+'"':'')+'><source src="'+attr(videoSrc)+
            '" type="video/mp4" media="(min-width: 601px) and (prefers-reduced-motion: no-preference)"></video>':'')+'</div>';
      }
      const tag=n.semanticTag||'div';
      return '<'+tag+' class="'+cls+'"'+(n.ariaLabel?' aria-label="'+attr(n.ariaLabel)+'"':'')+'>'+backdrop+n.children.map(visit).join('')+'</'+tag+'>';
    }
    if(n.type==='list')return '<'+(n.ordered?'ol':'ul')+' class="'+cls+' cmsdg-list">'+n.children.map(visit).join('')+'</'+(n.ordered?'ol':'ul')+'>';
    if(n.type==='list-item')return '<li class="'+cls+'">'+attr(n.text)+'</li>';
    if(n.type==='gallery'){
      const grid=n.layout==='grid',variables=grid?' style="--cmsdg-gallery-columns:'+ (n.columnsDesktop??3)+';--cmsdg-gallery-tablet:'+ (n.columnsTablet??2)+';--cmsdg-gallery-mobile:'+ (n.columnsMobile??1)+'"':(['visibleDesktop','visibleTablet','visibleMobile'].some(k=>own(n,k))?' style="--cmsdg-visible-desktop:'+(n.visibleDesktop??1)+';--cmsdg-visible-tablet:'+(n.visibleTablet??1)+';--cmsdg-visible-mobile:'+(n.visibleMobile??1)+'"':'');
      const content=n.children.map((child,index)=>{
        const image=visit(child,'gallery');
        const id='cmsdg-lightbox-'+child.id;
        const caption=child.caption?'<figcaption>'+attr(child.caption)+'</figcaption>':'';
        const trigger=n.lightbox?'<button type="button" class="cmsdg-lightbox-trigger" popovertarget="'+id+'" aria-label="'+gl[0]+' '+(index+1)+'">'+image+'</button>':image;
        const before='cmsdg-lightbox-'+n.children[(index+n.children.length-1)%n.children.length].id;
        const after='cmsdg-lightbox-'+n.children[(index+1)%n.children.length].id;
        const navigation='<nav class="cmsdg-gallery-nav" aria-label="'+gl[4]+'">'+
          '<button type="button" popovertarget="'+before+'" aria-label="'+gl[2]+'">←</button>'+
          '<span>'+(index+1)+' / '+n.children.length+'</span>'+
          '<button type="button" popovertarget="'+after+'" aria-label="'+gl[3]+'">→</button></nav>';
        const popup=n.lightbox?'<div id="'+id+'" popover="auto" class="cmsdg-gallery-popover" role="dialog" aria-label="'+attr(child.alt||gl[5]+' '+(index+1))+'">'+
          '<button type="button" class="cmsdg-gallery-close" popovertarget="'+id+'" popovertargetaction="hide" aria-label="'+gl[1]+'">×</button>'+
          '<div class="cmsdg-gallery-expanded">'+image+'</div>'+caption+navigation+'</div>':'';
        const prev=n.children[(index+n.children.length-1)%n.children.length].id;
        const next=n.children[(index+1)%n.children.length].id;
        const scrollNav=n.scrollControls&&n.children.length>1?'<nav class="cmsdg-gallery-scroll-nav" aria-label="'+gl[4]+'"><a href="#cmsdg-photo-'+prev+'" aria-label="'+gl[2]+'">←</a><span>'+(index+1)+' / '+n.children.length+'</span><a href="#cmsdg-photo-'+next+'" aria-label="'+gl[3]+'">→</a></nav>':'';
        return '<figure class="cmsdg-gallery-item" id="cmsdg-photo-'+child.id+'">'+trigger+caption+scrollNav+popup+'</figure>';
      }).join('');
      return '<div class="'+cls+' cmsdg-gallery'+(grid?' cmsdg-gallery-grid':'')+' cmsdg-gallery-shape-'+(n.photoShape||'natural')+' cmsdg-gallery-tablet-'+(n.photoShapeTablet||n.photoShape||'natural')+' cmsdg-gallery-mobile-'+(n.photoShapeMobile||n.photoShapeTablet||n.photoShape||'natural')+'" role="region" aria-roledescription="gallery" aria-label="'+attr(n.text)+'" tabindex="0"'+variables+'>'+content+'</div>';
    }
    if(n.type==='carousel'){
      const vars=' style="--cmsdg-card-desktop:'+(n.visibleDesktop??1)+
        ';--cmsdg-card-tablet:'+(n.visibleTablet??1)+
        ';--cmsdg-card-mobile:'+(n.visibleMobile??1)+'"';
      const cards=n.children.map((child,index)=>'<div class="cmsdg-card-slide" id="cmsdg-card-'+child.id+
        '" role="group" aria-roledescription="slide" aria-label="'+(index+1)+' / '+n.children.length+'">'+visit(child)+'</div>').join('');
      const nav=n.scrollControls?'<nav class="cmsdg-card-nav" aria-label="'+attr(n.text)+'">'+
        n.children.map((child,index)=>'<a href="#cmsdg-card-'+child.id+'" aria-label="'+attr(n.text)+' · '+(index+1)+'">'+(index+1)+'</a>').join('')+'</nav>':'';
      return '<section class="'+cls+' cmsdg-card-carousel" role="region" aria-roledescription="carousel" aria-label="'+attr(n.text)+'"'+vars+'>'+
        nav+'<div class="cmsdg-card-track" tabindex="0">'+cards+'</div></section>';
    }
    if(n.type==='table'){
      const tablet=n.tableLayoutTablet||'scroll',mobile=n.tableLayoutMobile||tablet;
      const selector=scope+' .cmsdg-table-owner-'+n.id;
      for(const [key,media] of [['tableAppearance',null],
        ['tableAppearanceTablet','@media(max-width:900px)'],['tableAppearanceMobile','@media(max-width:600px)']]){
        if(!n[key]||!Object.keys(n[key]).length)continue;
        const rule=selector+'{'+tableAppearanceCSS(n[key],tokens,n.id+'/'+key)+'}';
        rules.push(media?media+'{'+rule+'}':rule);
      }
      return '<div class="cmsdg-table-scroll'+(tablet==='cards'?' cmsdg-tablet-cards':'')+
        (mobile==='cards'?' cmsdg-mobile-cards':'')+' cmsdg-table-owner-'+n.id+'" role="region" aria-label="'+attr(n.text||'Таблица')+'" tabindex="0"><table class="'+cls+' cmsdg-table">'+
      (n.text?'<caption>'+attr(n.text)+'</caption>':'')+
      '<thead>'+visit(n.children[0])+'</thead><tbody>'+n.children.slice(1).map(visit).join('')+'</tbody></table></div>';
    }
    if(n.type==='table-row')return '<tr class="'+cls+'">'+n.children.map(visit).join('')+'</tr>';
    if(n.type==='table-cell'){
      const colHeader=tableHeaderIds.has(n.id),rowHeader=tableRowHeaderIds.has(n.id);
      const tag=colHeader||rowHeader?'th':'td';
      return '<'+tag+(colHeader?' scope="col"':rowHeader?' scope="row"':'')+
        (tableCellLabels.has(n.id)?
        ' data-label="'+attr(tableCellLabels.get(n.id))+'"':'')+
        ' class="'+cls+'">'+attr(n.text)+'</'+tag+'>';
    }
    if(n.type==='quote')return '<figure class="'+cls+' cmsdg-quote"><blockquote><p>'+attr(n.text)+'</p></blockquote>'+
      (n.cite?'<figcaption>'+attr(n.cite)+'</figcaption>':'')+'</figure>';
    if(n.type==='disclosure')return '<details class="'+cls+' cmsdg-disclosure"><summary>'+attr(n.text)+'</summary><div class="cmsdg-disclosure-body">'+n.children.map(visit).join('')+'</div></details>';
    if(n.type==='tab')return '<div class="'+cls+' cmsdg-tab-panel" id="cmsdg-panel-'+n.id+'">'+n.children.map(visit).join('')+'</div>';
    if(n.type==='tabs'){
      const controls=n.children.map((tab,i)=>'<input type="radio" name="cmsdg-tabs-'+n.id+'" id="cmsdg-tab-'+tab.id+'" aria-controls="cmsdg-panel-'+tab.id+'"'+(i===0?' checked':'')+'><label for="cmsdg-tab-'+tab.id+'">'+attr(tab.text)+'</label>').join('');
      for(const tab of n.children)rules.push(scope+' .cmsdg-tabs-'+n.id+':has(> .cmsdg-tabs-controls > #cmsdg-tab-'+tab.id+':checked) > .cmsdg-tabs-panels > #cmsdg-panel-'+tab.id+'{display:block}');
      return '<div class="'+cls+' cmsdg-tabs-'+n.id+'"><div class="cmsdg-tabs-controls" role="group" aria-label="Вкладки">'+controls+'</div><div class="cmsdg-tabs-panels">'+n.children.map(visit).join('')+'</div></div>';
    }
    if(n.type==='form-slot'){
      const target=selector;
      for(const [key,limit] of [['formAppearance',null],['formAppearanceTablet',900],['formAppearanceMobile',600]]){
        if(!n[key])continue;
        const declarations=formAppearanceCSS(n[key],tokens,n.id+'/'+key);
        if(declarations)rules.push(limit?'@media(max-width:'+limit+'px){'+target+'{'+declarations+'}}':
          target+'{'+declarations+'}');
      }
      return '<div class="'+cls+' cmsdg-form-slot">'+renderInertForm()+'</div>';
    }
    if(n.type==='divider')return '<hr class="'+cls+'">';
    if(n.type==='icon'){
      const size=n.iconSize||'1em',weight={thin:'1.25',regular:'2',bold:'3'}[n.iconWeight||'regular'];
      return '<svg class="'+cls+'" viewBox="0 0 24 24" width="'+size+'" height="'+size+
        '" fill="none" stroke="currentColor" stroke-width="'+weight+'" stroke-linecap="round" stroke-linejoin="round" '+
        (n.alt?'role="img" aria-label="'+attr(n.alt)+'"':'aria-hidden="true"')+'>'+ICON_PATHS[n.icon]+'</svg>';
    }
    if(n.type==='heading')return '<h'+(n.level||2)+' class="'+cls+'">'+richText(n)+'</h'+(n.level||2)+'>';
    if(n.type==='text')return '<p class="'+cls+'">'+richText(n)+'</p>';
    if(n.type==='button'&&n.popupTarget)return '<button type="button" class="'+cls+' cmsdg-popup-trigger" popovertarget="cmsdg-popup-'+n.popupTarget+'">'+attr(n.text)+'</button>';
    if(n.type==='button'||n.type==='link')return '<a class="'+cls+'" href="'+attr(n.href.startsWith('/')?mount.replace(/\/$/,'')+n.href:n.href)+'"'+(n.href.startsWith('https://')?' rel="noopener noreferrer"':'')+'>'+attr(n.text)+'</a>';
    if(n.type==='video'){
      const videoAsset=assets.get(n.assetId);
      const videoSrc=videoPreview?videoPreview(n.assetId):safeMount+videoAsset.src;
      if(!videoSrc)return '<div class="'+cls+'" role="status">Загружается защищённое видео</div>';
      const poster=n.posterAssetId?assets.get(n.posterAssetId):null;
      const posterSource=poster?(mediaPreview?mediaPreview(n.posterAssetId):safeMount+poster.src):null;
      const posterHtml=posterSource?' poster="'+attr(posterSource)+'"':'';
      // No autoplay, external providers, unknown formats, script or iframe.
      return '<video class="'+cls+'" controls playsinline preload="metadata"'+
        (n.loop?' loop':'')+posterHtml+' aria-label="'+attr(n.alt)+'">'+
        '<source src="'+attr(videoSrc)+'" type="video/mp4">'+
        'Ваш браузер не поддерживает видео.</video>';
    }
    const asset=assets.get(n.assetId),src=mediaPreview?mediaPreview(n.assetId):null;
    if(!asset)return '';
    const base=src||safeMount+asset.src;
    const variants=asset.variants||[];
    // Source parity with PHP PublicRenderer::responsiveAttrs: sorted, deduped
    // responsive derivatives and the unmodified original at its own width.
    const candidates=new Map(variants.map(v=>[v.width,safeMount+v.src]));
    if(Number.isInteger(asset.width)&&asset.width>0&&!candidates.has(asset.width))
      candidates.set(asset.width,safeMount+asset.src);
    const responsive=src?'':(variants.length?' srcset="'+
      [...candidates.entries()].sort((a,b)=>a[0]-b[0]).map(([w,url])=>attr(url)+' '+w+'w').join(', ')+
      '" sizes="(max-width:600px) 100vw, (max-width:900px) 50vw, 100vw"':'');
    const dimensions=Number.isInteger(asset.width)&&Number.isInteger(asset.height)&&
      asset.width>=1&&asset.width<=4096&&asset.height>=1&&asset.height<=4096?
      ' width="'+asset.width+'" height="'+asset.height+'"':'';
    const img='<img loading="lazy" class="'+cls+'" src="'+attr(base)+'"'+responsive+dimensions+' alt="'+attr(n.alt)+'">';
    const variantsByDevice=n.responsiveMedia;
    let picture=img;
    if(variantsByDevice){
      let source='';
      for(const [device,limit] of [['mobile',600],['tablet',900]]){
        const id=variantsByDevice[device+'AssetId'];if(!id)continue;
        const selected=imageUrl(id);
        if(selected)source+='<source media="(max-width:'+limit+'px)" srcset="'+attr(selected)+'">';
      }
      picture='<picture class="cmsdg-picture">'+source+img+'</picture>';
    }
    let visual=picture;
    if(n.href){
      const href=n.href.startsWith('/')?mount.replace(/\/$/,'')+n.href:n.href;
      visual='<a class="cmsdg-image-action" href="'+attr(href)+'"'+(href.startsWith('https://')?' rel="noopener noreferrer"':'')+'>'+picture+'</a>';
    }
    return n.caption&&parentType!=='gallery'?'<figure class="cmsdg-image-figure">'+visual+'<figcaption>'+attr(n.caption)+'</figcaption></figure>':visual;
  }
  const html=graph.nodes.map(visit).join('');
  const tableCardsCss=selector=>selector+'{overflow:visible}'+
    selector+' .cmsdg-table{display:block;min-width:0;border-collapse:separate}'+
    selector+' .cmsdg-table thead{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}'+
    selector+' .cmsdg-table tbody{display:grid;gap:var(--cmsdg-table-card-gap,12px)}'+
    selector+' .cmsdg-table tbody tr{display:block;border:1px solid var(--cmsdg-table-border,#c6cdd7);border-radius:var(--cmsdg-table-card-radius,12px);padding:var(--cmsdg-table-card-padding,8px) 12px;min-width:0;background:var(--cmsdg-table-card-bg,transparent)}'+
    selector+' .cmsdg-table tbody :is(td,th){display:grid;grid-template-columns:minmax(0,var(--cmsdg-table-label-width,42%)) minmax(0,1fr);gap:12px;border:0;border-bottom:1px solid var(--cmsdg-table-border,#dce3ec);padding:var(--cmsdg-table-cell-padding,10px) 2px;overflow-wrap:anywhere;background:transparent}'+
    selector+' .cmsdg-table tbody :is(td,th):last-child{border-bottom:0}'+
    selector+' .cmsdg-table tbody :is(td,th)::before{content:attr(data-label);font-weight:700;color:var(--cmsdg-table-label-color,inherit)}';
  return '<section class="cmsdg '+('cmsdg-'+graph.id)+'" id="'+attr(sectionId)+'"><style>'+
    scope+'{min-width:0;max-width:none;padding:0;min-height:0}'+scope+' *{box-sizing:border-box;min-width:0}'+
    scope+' img,'+scope+' video{max-width:100%;height:auto;object-position:var(--cmsdg-object-x,50%) var(--cmsdg-object-y,50%)}'+scope+' svg{display:inline-block;vertical-align:middle;flex:none}'+
    scope+' .cmsdg-table-scroll{max-width:100%;overflow-x:auto;overscroll-behavior-inline:contain}'+
    scope+' .cmsdg-table-scroll:focus-visible,'+scope+' .cmsdg-gallery:focus-visible,'+scope+' .cmsdg-card-track:focus-visible{outline:3px solid #1868d3;outline-offset:2px}'+
    scope+' .cmsdg-table{border-collapse:collapse;width:100%;min-width:480px}'+
    scope+' .cmsdg-table th,'+scope+' .cmsdg-table td{padding:var(--cmsdg-table-cell-padding,12px) 16px;border:1px solid var(--cmsdg-table-border,#c6cdd7);text-align:start}'+
    scope+' .cmsdg-table th{font-weight:700;background:var(--cmsdg-table-header-bg,#f2f5f9);color:var(--cmsdg-table-header-color,inherit)}'+
    '@media(min-width:601px) and (max-width:900px){'+tableCardsCss(scope+' .cmsdg-tablet-cards')+'}'+
    '@media(max-width:600px){'+tableCardsCss(scope+' .cmsdg-mobile-cards')+'}'+
    scope+' .cmsdg-card-track{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:4px;padding:4px 2px 12px;overscroll-behavior-inline:contain}'+
    scope+' .cmsdg-card-slide{flex:0 0 calc((100% - (var(--cmsdg-card-desktop) - 1)*16px)/var(--cmsdg-card-desktop));min-width:0;scroll-snap-align:start;scroll-margin-block:24px}'+
    '@media(max-width:900px){'+scope+' .cmsdg-card-slide{flex-basis:calc((100% - (var(--cmsdg-card-tablet) - 1)*16px)/var(--cmsdg-card-tablet))}}'+
    '@media(max-width:600px){'+scope+' .cmsdg-card-slide{flex-basis:calc((100% - (var(--cmsdg-card-mobile) - 1)*16px)/var(--cmsdg-card-mobile))}}'+
    scope+' .cmsdg-card-nav{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:8px}'+
    scope+' .cmsdg-card-nav a{display:grid;place-items:center;min-width:40px;min-height:40px;padding:4px 8px;color:inherit;border:1px solid currentColor;border-radius:8px;text-decoration:none}'+
    scope+' .cmsdg-card-nav a:focus-visible{outline:3px solid #1868d3;outline-offset:2px}'+
    scope+' .cmsdg-gallery{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:8px;padding:8px 2px;overscroll-behavior-inline:contain}'+
    scope+' .cmsdg-gallery>.cmsdg-gallery-item{flex:0 0 min(82%,420px);scroll-snap-align:start;min-width:0;max-width:100%;margin:0;border-radius:10px;overflow:hidden}'+
    scope+' .cmsdg-gallery[style*="--cmsdg-visible-desktop"]>.cmsdg-gallery-item{flex-basis:calc((100% - (var(--cmsdg-visible-desktop) - 1)*16px)/var(--cmsdg-visible-desktop));max-width:100%}'+
    '@media(max-width:900px){'+scope+' .cmsdg-gallery[style*="--cmsdg-visible-desktop"]>.cmsdg-gallery-item{flex-basis:calc((100% - (var(--cmsdg-visible-tablet) - 1)*16px)/var(--cmsdg-visible-tablet))}}'+
    '@media(max-width:600px){'+scope+' .cmsdg-gallery[style*="--cmsdg-visible-desktop"]>.cmsdg-gallery-item{flex-basis:calc((100% - (var(--cmsdg-visible-mobile) - 1)*16px)/var(--cmsdg-visible-mobile))}}'+
    scope+' .cmsdg-gallery-item img{display:block;width:100%;height:auto;object-fit:cover;border-radius:inherit}'+
    scope+' .cmsdg-gallery-shape-square>.cmsdg-gallery-item img{aspect-ratio:1/1}'+
    scope+' .cmsdg-gallery-shape-landscape>.cmsdg-gallery-item img{aspect-ratio:16/9}'+
    scope+' .cmsdg-gallery-shape-portrait>.cmsdg-gallery-item img{aspect-ratio:3/4}'+
    scope+' .cmsdg-gallery-expanded img{aspect-ratio:auto!important;object-fit:contain!important}'+
    scope+' .cmsdg-gallery-item figcaption{padding:8px 4px;line-height:1.45;font-size:.9em;overflow-wrap:anywhere}'+
    scope+' .cmsdg-gallery-scroll-nav{display:flex;gap:12px;align-items:center;justify-content:center;padding:8px}'+
    scope+' .cmsdg-gallery-scroll-nav a{display:grid;place-items:center;min-width:40px;min-height:40px;border:1px solid currentColor;border-radius:8px;text-decoration:none}'+
    scope+' .cmsdg-gallery-scroll-nav a:focus-visible{outline:3px solid currentColor;outline-offset:3px}'+
    scope+' .cmsdg-gallery-grid{display:grid;grid-template-columns:repeat(var(--cmsdg-gallery-columns,3),minmax(0,1fr));overflow:visible;scroll-snap-type:none}'+
    scope+' .cmsdg-gallery-grid>.cmsdg-gallery-item{flex:none}'+
    '@media(max-width:900px){'+scope+' .cmsdg-gallery-grid{grid-template-columns:repeat(var(--cmsdg-gallery-tablet,2),minmax(0,1fr))}'+scope+' .cmsdg-gallery-tablet-natural>.cmsdg-gallery-item img{aspect-ratio:auto}'+scope+' .cmsdg-gallery-tablet-square>.cmsdg-gallery-item img{aspect-ratio:1/1}'+scope+' .cmsdg-gallery-tablet-landscape>.cmsdg-gallery-item img{aspect-ratio:16/9}'+scope+' .cmsdg-gallery-tablet-portrait>.cmsdg-gallery-item img{aspect-ratio:3/4}}'+
    '@media(max-width:600px){'+scope+' .cmsdg-gallery-grid{grid-template-columns:repeat(var(--cmsdg-gallery-mobile,1),minmax(0,1fr))}'+scope+' .cmsdg-gallery-mobile-natural>.cmsdg-gallery-item img{aspect-ratio:auto}'+scope+' .cmsdg-gallery-mobile-square>.cmsdg-gallery-item img{aspect-ratio:1/1}'+scope+' .cmsdg-gallery-mobile-landscape>.cmsdg-gallery-item img{aspect-ratio:16/9}'+scope+' .cmsdg-gallery-mobile-portrait>.cmsdg-gallery-item img{aspect-ratio:3/4}}'+
    scope+' .cmsdg-lightbox-trigger{display:block;width:100%;padding:0;border:0;background:transparent;color:inherit;cursor:zoom-in}'+
    scope+' .cmsdg-lightbox-trigger:focus-visible{outline:3px solid #1868d3;outline-offset:-3px}'+
    scope+' .cmsdg-gallery-popover{position:fixed;inset:0;margin:auto;padding:20px;max-width:min(1100px,calc(100vw - 24px));max-height:95dvh;overflow:auto;border:1px solid #c7d2e0;border-radius:14px;background:#fff;color:#182b3d;box-shadow:0 22px 70px #08172c66}'+
    scope+' .cmsdg-gallery-popover:not(:popover-open){display:none!important}'+
    scope+' .cmsdg-gallery-popover::backdrop{background:#071321b8}'+
    scope+' .cmsdg-gallery-expanded{display:grid;place-items:center;clear:both}'+
    scope+' .cmsdg-gallery-expanded img{width:auto;max-width:100%;max-height:75dvh;height:auto;object-fit:contain}'+
    scope+' .cmsdg-gallery-close{float:right;margin:0 0 8px 12px;border:1px solid #8b9aac;border-radius:50%;background:#fff;color:#182b3d;min-width:40px;height:40px;font:24px system-ui;cursor:pointer}'+
    scope+' .cmsdg-gallery-nav{display:flex;justify-content:center;align-items:center;gap:24px;margin-top:10px}'+
    scope+' .cmsdg-gallery-nav button{min-width:42px;height:42px;border:1px solid #8b9aac;border-radius:8px;background:#fff;color:#182b3d;font:24px system-ui;cursor:pointer}'+
    scope+' .cmsdg-picture img{max-width:100%;height:auto}'+
    scope+' .cmsdg-image-action{display:inline-block;max-width:100%}'+
    scope+' .cmsdg-image-action img{display:block}'+
    scope+' .cmsdg-image-figure{margin:0;min-width:0;max-width:100%}'+
    scope+' .cmsdg-image-figure figcaption{padding:8px 0;line-height:1.45;overflow-wrap:anywhere}'+
    scope+' .cmsdg-popup{box-sizing:border-box;position:fixed;inset:0;margin:auto;min-width:0;max-width:min(680px,calc(100vw - 32px));max-height:min(85dvh,900px);overflow:auto;background:#fff;color:#182b3d;border:1px solid #ccd8e4;border-radius:18px;padding:28px;box-shadow:0 20px 65px #0c193b55}'+
    scope+' .cmsdg-popup:not(:popover-open){display:none!important}'+
    scope+' .cmsdg-popup::backdrop{background:#08172c99}'+
    scope+' .cmsdg-popup-close{position:sticky;top:0;float:right;z-index:1;width:40px;height:40px;margin:-14px -14px 4px 10px;border:1px solid #ccd8e4;border-radius:50%;background:#fff;color:#182b3d;font:24px system-ui;cursor:pointer}'+
    scope+' .cmsdg-popup-trigger{font:inherit;cursor:pointer}'+
    scope+' .cmsdg-form-preview{display:grid;gap:12px;width:100%;max-width:700px;font:inherit}'+
    scope+' .cmsdg-preview-field{display:grid;gap:6px;font:inherit;min-width:0}'+
    scope+' .cmsdg-preview-field input:not([type="checkbox"]):not([type="radio"]),'+scope+' .cmsdg-preview-field textarea,'+scope+' .cmsdg-preview-field select{width:100%;max-width:100%;padding:10px 12px;border:1px solid #b9c8d8;border-radius:8px;font:inherit;color:inherit;background:transparent;opacity:1}'+
    scope+' .cmsdg-form-preview input:disabled,'+scope+' .cmsdg-form-preview select:disabled,'+scope+' .cmsdg-form-preview textarea:disabled{opacity:.75}'+
    scope+' .cmsdg-preview-field small{font-size:.8em}'+
    scope+' .cmsdg-preview-conditional{opacity:.8}'+
    scope+' .cmsdg-preview-choices{display:grid;gap:8px}'+
    scope+' .cmsdg-preview-choices label{display:flex;gap:8px;align-items:center}'+
    scope+' .cmsdg-preview-consent{display:flex;gap:10px;align-items:flex-start}'+
    scope+' .cmsdg-preview-submit{padding:12px 18px;border:0;border-radius:10px;background:var(--cms-primary,#0a5bff);color:#fff;font:inherit}'+
    scope+' .cmsdg-preview-steps{display:flex;gap:12px}'+
    scope+' .cmsdg-preview-steps button{padding:10px;border-radius:8px;border:1px solid #b9c8d8;background:transparent;color:inherit}'+
    scope+' .cmsdg-form-slot .cmsdg-form-preview{gap:var(--cmsdg-form-gap,16px);grid-template-columns:repeat(var(--cmsdg-form-columns,1),minmax(0,1fr));max-width:var(--cmsdg-form-max-width,700px)}'+
    scope+' .cmsdg-form-slot .cmsdg-form-preview>h2,'+scope+' .cmsdg-form-slot .cmsdg-preview-progress,'+scope+' .cmsdg-form-slot .cmsdg-preview-step,'+scope+' .cmsdg-form-slot .cmsdg-preview-steps,'+scope+' .cmsdg-form-slot .cmsdg-preview-consent,'+scope+' .cmsdg-form-slot .cmsdg-preview-submit,'+scope+' .cmsdg-form-slot .cmsdg-preview-note,'+scope+' .cmsdg-form-slot .cmsdg-preview-wide{grid-column:1/-1}'+
    scope+' .cmsdg-form-slot .cmsdg-preview-step{display:grid;grid-template-columns:repeat(var(--cmsdg-form-columns,1),minmax(0,1fr));gap:var(--cmsdg-form-gap,16px);min-width:0;margin:0;border:1px solid var(--cmsdg-form-step-border,#dae4ef);border-radius:var(--cmsdg-form-step-radius,12px);padding:var(--cmsdg-form-step-padding,18px);background:var(--cmsdg-form-step-bg,transparent)}'+
    scope+' .cmsdg-form-slot .cmsdg-preview-step legend{font-weight:700;padding:0 9px}'+
    scope+' .cmsdg-form-slot .cmsdg-preview-progress{color:var(--cmsdg-form-progress-color,inherit)}'+
    scope+' .cmsdg-form-slot .cmsdg-preview-field{font-weight:var(--cmsdg-form-label-weight,600);color:var(--cmsdg-form-label-color,inherit);gap:var(--cmsdg-form-label-gap,6px)}'+
    scope+' .cmsdg-form-slot .cmsdg-preview-field input:not([type=checkbox]):not([type=radio]),'+scope+' .cmsdg-form-slot .cmsdg-preview-field select,'+scope+' .cmsdg-form-slot .cmsdg-preview-field textarea{padding:var(--cmsdg-form-input-padding,12px);border-radius:var(--cmsdg-form-input-radius,8px);border-color:var(--cmsdg-form-border,#a5b3c4);background:var(--cmsdg-form-input-bg,#fff)}'+
    scope+' .cmsdg-form-slot .cmsdg-preview-field input:not([type=checkbox]):not([type=radio]),'+scope+' .cmsdg-form-slot .cmsdg-preview-field select,'+scope+' .cmsdg-form-slot .cmsdg-preview-field textarea{border-width:var(--cmsdg-form-border-width,1px);color:var(--cmsdg-form-input-color,inherit);font-size:var(--cmsdg-form-input-font-size,inherit)}'+
    scope+' .cmsdg-form-slot .cmsdg-preview-submit{padding:var(--cmsdg-form-button-padding,12px) 18px;border-radius:var(--cmsdg-form-button-radius,10px);background:var(--cmsdg-form-button-bg,var(--cms-primary,#0a5bff));color:var(--cmsdg-form-button-color,#fff);font-size:var(--cmsdg-form-button-font-size,inherit);font-weight:var(--cmsdg-form-button-weight,inherit)}'+
    scope+' .cmsdg-preview-note{font-size:.8em;opacity:.7}'+
    scope+' .cmsdg-quote{margin:12px 0;padding:20px;border-inline-start:4px solid currentColor}'+
    scope+' .cmsdg-quote blockquote{margin:0}'+
    scope+' .cmsdg-quote figcaption{margin-top:12px;font-size:.9em}'+
    scope+' .cmsdg-list{padding-inline-start:1.5em;margin-block:12px}'+
    scope+' .cmsdg-list > li{margin-block:6px}'+
    scope+' .cmsdg-disclosure > summary{cursor:pointer;list-style-position:inside}'+
    scope+' .cmsdg-disclosure-body{padding:12px 0}'+
    scope+' .cmsdg-tabs-controls{display:flex;flex-wrap:wrap;gap:8px;padding:4px 0 12px}'+
    scope+' .cmsdg-tabs-controls input{position:absolute;width:1px;height:1px;opacity:0}'+
    scope+' .cmsdg-tabs-controls label{cursor:pointer;padding:10px 16px;border:1px solid currentColor;border-radius:8px}'+
    scope+' .cmsdg-tabs-controls input:checked + label{font-weight:700;background:#eef3fa}'+
    scope+' .cmsdg-tabs-controls input:focus-visible + label{outline:3px solid #1868d3;outline-offset:2px}'+
    scope+' .cmsdg-tab-panel{display:none}'+
    '@keyframes cmsdg-fade-in{from{opacity:0}to{opacity:1}}'+
    '@keyframes cmsdg-fade-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}'+
    '@keyframes cmsdg-slide-left{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}'+
    '@keyframes cmsdg-zoom-in{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}'+
    '@media(prefers-reduced-motion:reduce){'+scope+' [class*="cmsdg-n-"]{animation:none!important;transition:none!important}}'+
    rules.join('')+'</style>'+html+'</section>';
}

function auditAccessibility(graph,tokensInput){
  const tokens=validateTokens(tokensInput),findings=[],headings=[];
  const add=(code,severity,node,message)=>findings.push({
    code,severity,nodeId:node&&typeof node.id==='string'?node.id:null,message
  });
  const colorOf=value=>{
    if(typeof value!=='string')return null;
    if(value.startsWith('@'))return tokens.colors[value.slice(1)]||null;
    return /^#[a-f0-9]{6}$/i.test(value)?value.toLowerCase():null;
  };
  const sizeOf=value=>{
    if(typeof value==='string'&&value.startsWith('@'))return tokens.typography[value.slice(1)]||null;
    return typeof value==='number'&&Number.isFinite(value)?value:null;
  };
  const luminance=hex=>{
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>
      v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));
    return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
  };
  const contrast=(a,b)=>{
    const x=luminance(a),y=luminance(b);
    return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
  };
  const genericLabel=/^(?:click here|here|read more|more|learn more|open|link|button|нажмите здесь|здесь|сюда|подробнее|читать далее|узнать больше|открыть)$/i;
  const genericAlt=/^(?:image|photo|picture|graphic|video|фото|изображение|картинка|рисунок|видео)(?:\s+\d+)?$/i;
  const walk=(nodes,parent)=>{
    for(const node of nodes||[]){
      const style=node.styles&&typeof node.styles==='object'?node.styles:{};
      const color=Object.prototype.hasOwnProperty.call(style,'color')?colorOf(style.color):parent.color;
      let backgrounds=parent.backgrounds||[];
      if(style.gradient&&typeof style.gradient==='object'){
        backgrounds=[style.gradient.from,style.gradient.via,style.gradient.to].map(colorOf).filter(Boolean);
      }else if(Object.prototype.hasOwnProperty.call(style,'background')){
        const background=colorOf(style.background);
        backgrounds=background?[background]:[];
      }
      const level=Number(node.level)||2;
      let fontSize=Object.prototype.hasOwnProperty.call(style,'fontSize')?sizeOf(style.fontSize):parent.fontSize;
      if(node.type==='heading'&&!Object.prototype.hasOwnProperty.call(style,'fontSize')){
        const baseSize=parent.fontSize||16;
        fontSize=baseSize*({1:2,2:1.5,3:1.17,4:1,5:0.83,6:0.67}[level]||1);
      }
      const fontWeight=Object.prototype.hasOwnProperty.call(style,'fontWeight')?Number(style.fontWeight):
        node.type==='heading'?700:(parent.fontWeight||400);
      const label=typeof node.text==='string'?node.text.trim():'';
      if(node.type==='heading'){
        headings.push({node,level});
        if(!label)add('empty-text','warning',node,'Заголовок пустой — добавьте понятный текст.');
      }else if(node.type==='text'&&!label){
        add('empty-text','warning',node,'Текстовый элемент пустой — добавьте содержание или удалите его.');
      }
      if(node.type==='image'){
        const alt=typeof node.alt==='string'?node.alt.trim():'';
        if(!alt)add('missing-alt','warning',node,'У изображения пустой alt. Если оно несёт смысл, добавьте описание; если декоративное — проверьте намеренно пустой alt.');
        else if(genericAlt.test(alt))add('generic-alt','warning',node,'Описание изображения слишком общее. Укажите, что именно показано.');
      }
      if(node.type==='video'){
        const alt=typeof node.alt==='string'?node.alt.trim():'';
        if(!alt)add('missing-video-name','error',node,'Видео не имеет доступного названия.');
        else if(genericAlt.test(alt))add('generic-video-name','warning',node,'Название видео слишком общее. Опишите его содержание.');
      }
      if(node.type==='button'){
        if(!label)add('empty-link-name','error',node,'Ссылка-кнопка не имеет доступного названия.');
        else if(genericLabel.test(label))add('generic-link-name','warning',node,'Название ссылки слишком общее. Уточните, куда ведёт ссылка.');
        const focus=node.states&&node.states.focus&&typeof node.states.focus==='object'?node.states.focus:{};
        const explicitFocus=Number(focus.outlineWidth)>0||Number(focus.borderWidth)>0||
          (typeof focus.borderColor==='string'&&Number(style.borderWidth)>0);
        if((style.outlineWidth===0||focus.outlineWidth===0)&&!explicitFocus)
          add('focus-indicator-removed','warning',node,'У ссылки отключён контур фокуса без явной замены. Сохраните заметный индикатор клавиатурного фокуса.');
      }
      if((node.type==='heading'||node.type==='text'||node.type==='button'||(node.type==='icon'&&node.alt))&&color&&backgrounds.length){
        const ratios=backgrounds.map(bg=>contrast(color,bg));
        const ratio=Math.min(...ratios);
        const large=fontSize!==null&&(fontSize>=24||(fontSize>=18.66&&fontWeight>=700));
        const minimum=large?3:4.5;
        if(ratio<minimum)add('low-contrast','warning',node,
          'Контраст текста '+ratio.toFixed(2)+':1; ориентир WCAG AA — не менее '+minimum.toFixed(1)+':1.');
      }
      if(['container','disclosure','tabs','tab','list','gallery','carousel','table','table-row','popup'].includes(node.type)&&Array.isArray(node.children))walk(node.children,{color,backgrounds,fontSize,fontWeight});
    }
  };
  if(!graph||!Array.isArray(graph.nodes)){
    add('invalid-graph','error',null,'Не удалось проверить структуру композиции.');
    return findings;
  }
  walk(graph.nodes,{color:null,backgrounds:[],fontSize:16,fontWeight:400});
  let previous=null,h1Count=0;
  for(const item of headings){
    if(item.level===1&&++h1Count>1)add('multiple-h1','warning',item.node,'В этой композиции несколько заголовков первого уровня. Проверьте иерархию всей страницы.');
    if(previous&&item.level>previous.level+1)add('heading-order','warning',item.node,
      'Уровень заголовка перескакивает с H'+previous.level+' на H'+item.level+'. Проверьте последовательность заголовков.');
    previous=item;
  }
  return findings;
}

module.exports=Object.freeze({validateTokens,validateStyle,validateGraph,baseGraph,editTree,render,auditAccessibility,formSlotIds,parseTableMatrix,tableMatrix,tableTsv,replaceTableMatrix,reorderTableColumn,reorderTableRow,parseListLines,listLines,replaceListLines,DEFAULT_TOKENS,TYPES,STYLE_KEYS,MOTIONS,SEQUENCE_EASINGS,ICON_PATHS});
