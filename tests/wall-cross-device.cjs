// Cross-device gestures must change position/content, never the authored geometry.
const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path')
const dir=process.argv[2]||path.join(__dirname,'../public')
const near=(a,b,message)=>assert(Math.abs(a-b)<1e-6,message+': '+a+' != '+b)
async function setup(initialWidth=370){
 const dom=new JSDOM('<div id="view"></div>',{url:'https://gesture.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document
 w.matchMedia=()=>({matches:true});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{}
 w.HTMLDialogElement.prototype.show=function(){this.open=true};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))}
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:()=>true})
 w.HTMLElement.prototype.setPointerCapture=function(id){this.capture=id};w.HTMLElement.prototype.hasPointerCapture=function(id){return this.capture===id};w.HTMLElement.prototype.releasePointerCapture=function(){this.capture=null}
 let width=initialWidth,notes=[],version=0
 const dimension=(el,key)=>parseFloat(el.style[key])||(key==='height'?180:260)
 Object.defineProperties(w.HTMLElement.prototype,{clientWidth:{get(){return this.matches('[data-wall]')?width:dimension(this,'width')}},clientHeight:{get(){return this.matches('[data-wall]')?5000:dimension(this,'height')}},offsetWidth:{get(){return Math.round(dimension(this,'width'))}},offsetHeight:{get(){return Math.round(dimension(this,'height'))}}})
 w.HTMLElement.prototype.getBoundingClientRect=function(){if(this.matches('.gb-wall-title,.gb-exit'))return {left:-200,top:-200,width:1,height:1,right:-199,bottom:-199};const x=parseFloat(this.style.left)||0,y=parseFloat(this.style.top)||0,a=this.clientWidth,b=dimension(this,'height');return {left:x,top:y,width:a,height:b,right:x+a,bottom:y+b}}
 w.SharedWall={seed:1,stats:{},init:async()=>{},read:()=>notes,section:()=>0,walls:()=>[{id:0,count:notes.length}],leases:()=>({}),version:()=>version,subscribe:()=>()=>{},reserve:async()=>true,release:async()=>{},put:async note=>{const saved=JSON.parse(JSON.stringify({...note,owned:true}));notes=notes.filter(n=>n.id!==note.id).concat(saved);version++;return saved}}
 for(const file of ['wall-tools','guestbook'])w.eval(fs.readFileSync(dir+'/js/'+file+'.js','utf8'))
 const q=s=>d.querySelector(s),settle=(ms=40)=>new Promise(r=>setTimeout(r,ms)),click=async s=>{q(s).click();await settle()}
 const event=(el,type,x,y,extra={})=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,button:0,isPrimary:true,clientX:x,clientY:y,pointerType:'touch',pressure:.5},extra);el.dispatchEvent(e)}
 const mount=async()=>{w.Guestbook.destroy();q('#view').innerHTML=w.PAGES['/guestbook'];await w.Guestbook.mount(q('#view'));await settle()}
 await mount()
 return {w,q,click,event,settle,mount,notes:()=>notes,resize:async value=>{width=value;w.dispatchEvent(new w.Event('resize'));await settle(180)},stage:()=>{const s=q('[data-live-stage]');return {x:parseFloat(s.style.left)/width*1000,y:parseFloat(s.style.top)/width*1000,width:parseFloat(s.style.width)/width*1000}},place:async medium=>{await click('[data-wall-tool='+medium+']');event(q('[data-wall]'),'click',width*.45,500);await settle()},close:()=>{w.Guestbook.destroy();w.close()}}
}
const cases={
 async 'moving paper and stickers preserves exact dimensions'(){
  for(const width of [370,796,1232])for(const medium of ['sticker','paper']){
   const t=await setup(width);try{
    await t.place(medium)
    if(medium==='paper'){const c=t.q('[data-drawing]');t.event(c,'pointerdown',30,20);t.event(c,'pointerup',60,40);await t.settle()}
    await t.click('[data-gb=publish]');const before=structuredClone(t.notes()[0]),el=t.q('[data-note]')
    await t.click('[data-note]');await t.click('[data-arrange]')
    t.event(el,'pointerdown',width*.45,500);t.event(el,'pointermove',width*.45+20,550);t.event(el,'pointerup',width*.45+20,550);await t.settle()
    const after=t.notes()[0]
    near(after.worldBox.width,before.worldBox.width,'moving must preserve width');near(after.worldBox.height,before.worldBox.height,'moving must preserve height')
    near(after.worldBox.x-before.worldBox.x,20/width*1000,'horizontal move');near(after.worldBox.y-before.worldBox.y,50/width*1000,'vertical move')
   }finally{t.close()}
  }
 },
 async 'draft rotation and recovery preserve wall coordinates'(){
  const t=await setup();try{
   await t.place('sticker');const original=t.stage()
   await t.resize(796);near(t.stage().x,original.x,'rotation x');near(t.stage().y,original.y,'rotation y')
   await t.click('[data-gb=close]');await t.resize(1232);await t.mount()
   await t.click('.gb-draft-resume:not([hidden])');near(t.stage().x,original.x,'recovery x');near(t.stage().y,original.y,'recovery y')
   await t.click('[data-gb=publish]');near(t.notes()[0].worldBox.x,original.x,'saved x');near(t.notes()[0].worldBox.y,original.y,'saved y')
  }finally{t.close()}
 },
 async 'editing without changes stays clean through rotation'(){
  const t=await setup();try{
   await t.place('paper');await t.click('[data-mode=text]');const input=t.q('[data-message]');input.value='横竖屏保持位置';input.dispatchEvent(new t.w.Event('input',{bubbles:true}));await t.click('[data-gb=publish]')
   const original=structuredClone(t.notes()[0]);await t.click('[data-note]');await t.click('[data-gb=edit]');assert.equal(t.w.Guestbook.hasUnsavedChanges(),false)
   await t.resize(1232);assert.equal(t.w.Guestbook.hasUnsavedChanges(),false,'rotation alone must not dirty an edit');await t.click('[data-gb=publish]')
   near(t.notes()[0].worldBox.x,original.worldBox.x,'edit x');near(t.notes()[0].worldBox.y,original.worldBox.y,'edit y')
  }finally{t.close()}
 },
 async 'editing a desktop edge note on mobile does not shift it inward'(){
  const t=await setup(1232);try{
   await t.place('paper');await t.click('[data-mode=text]');await t.click('[data-gb=reposition]');t.event(t.q('[data-wall]'),'click',0,500);await t.settle()
   const input=t.q('[data-message]');input.value='边缘文字';input.dispatchEvent(new t.w.Event('input',{bubbles:true}));await t.click('[data-gb=publish]');const original=structuredClone(t.notes()[0])
   await t.resize(370);await t.click('[data-note]');await t.click('[data-gb=edit]');near(t.stage().x,original.worldBox.x,'mobile edit stays at authored edge');await t.click('[data-gb=publish]');near(t.notes()[0].worldBox.x,original.worldBox.x,'save keeps edge')
  }finally{t.close()}
 },
 async 'paper keeps a fast release endpoint and backs up on pen up'(){
  const t=await setup();try{
   await t.place('paper');await t.settle(350);const c=t.q('[data-drawing]');t.event(c,'pointerdown',30,20);t.event(c,'pointerup',90,60);await t.settle(350)
   const saved=t.w.WallTools.draftStore('stacktao-shared-wall-ui-v1-text-0').read();assert(saved,'handwriting is backed up without a form input event')
   assert.equal(saved.draft.strokes[0].points.length,2,'fast strokes include release point');await t.click('[data-gb=publish]');assert.equal(t.notes()[0].strokes[0].points.length,2)
  }finally{t.close()}
 },
 async 'recovered spray uses the displayed color and width'(){
  const t=await setup();try{
   await t.click('[data-wall-tool=ink]');const brush=t.q('[data-brush]');brush.value='26';brush.dispatchEvent(new t.w.Event('change',{bubbles:true}));await t.click('[data-color="#a45743"]')
   const c=t.q('.gb-free-layer canvas');t.event(c,'pointerdown',100,300);t.event(c,'pointerup',140,340);await t.settle();await t.click('[data-action=cancel]');await t.mount();await t.click('.gb-draft-resume:not([hidden])')
   assert.equal(t.q('[data-brush]').value,'26');assert.equal(t.q('[data-color="#a45743"]').getAttribute('aria-pressed'),'true')
   assert.equal(t.q('[data-guestbook]').style.getPropertyValue('--paint'),'#a45743')
  }finally{t.close()}
 },
 async 'another finger cannot redirect a held spray nozzle'(){
  const t=await setup();try{
   await t.click('[data-wall-tool=ink]');const c=t.q('.gb-free-layer canvas');t.event(c,'pointerdown',100,300);t.event(c,'pointermove',250,400,{pointerId:2,isPrimary:false});await t.settle(220);t.event(c,'pointerup',100,300);await t.click('[data-action=finish]')
   const n=t.notes()[0];assert(n);assert(n.frame.width<60,'stationary spray must not jump to the other finger')
  }finally{t.close()}
 },
 async 'another finger cannot move an active drawing'(){
  const t=await setup();try{
   await t.click('[data-wall-tool=engraving]');const c=t.q('.gb-free-layer canvas');t.event(c,'pointerdown',100,300);t.event(c,'pointerup',140,340);await t.settle();await t.click('[data-action=move]')
   const selection=t.q('.gb-free-selection'),left=selection.style.left,top=selection.style.top
   t.event(c,'pointerdown',120,320);t.event(c,'pointermove',220,420,{pointerId:2,isPrimary:false});assert.equal(selection.style.left,left,'second finger x');assert.equal(selection.style.top,top,'second finger y')
   t.event(c,'pointermove',140,350);t.event(c,'pointerup',140,350);await t.settle();await t.click('[data-action=finish]');assert.equal(t.notes().length,1)
  }finally{t.close()}
 }
}
;(async()=>{let failed=0;for(const [name,test] of Object.entries(cases)){try{await test();console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.message)}}if(failed)process.exitCode=1})()
