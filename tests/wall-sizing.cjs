// Exercise the shared save path at different viewport widths, not just redisplay one note.
const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path')
const dir=process.argv[2]||path.join(__dirname,'../public')
async function createAt(wallWidth,medium,size){
 const dom=new JSDOM('<div id="view"></div>',{url:'https://size.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document
w.matchMedia=()=>({matches:true});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.show=function(){this.open=true};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:()=>true});w.HTMLElement.prototype.setPointerCapture=function(id){this.capture=id};w.HTMLElement.prototype.hasPointerCapture=function(id){return this.capture===id};w.HTMLElement.prototype.releasePointerCapture=function(){this.capture=null};
let lock=Promise.resolve();w.navigator.locks={request:(_,f)=>{const p=lock.then(f);lock=p.catch(()=>{});return p}};
let width=wallWidth;Object.defineProperties(w.HTMLElement.prototype,{clientWidth:{get(){return this.matches('[data-wall]')?width:parseFloat(this.style.width)||260}},clientHeight:{get(){return parseFloat(this.style.height)||720}},offsetWidth:{get(){return parseFloat(this.style.width)||260}},offsetHeight:{get(){return parseFloat(this.style.height)||180}}});w.HTMLElement.prototype.getBoundingClientRect=function(){if(this.matches('.gb-wall-title'))return {left:900,top:48,width:90,height:148,right:990,bottom:196};if(this.matches('.gb-exit'))return {left:28,top:28,width:100,height:44,right:128,bottom:72};let x=parseFloat(this.style.left)||0,y=parseFloat(this.style.top)||0;return {left:x,top:y,width:this.clientWidth,height:this.offsetHeight,right:x+this.clientWidth,bottom:y+this.offsetHeight}};

 let notes=[]
 w.SharedWall={seed:1,stats:{},init:async()=>{},read:()=>notes,section:()=>0,walls:()=>[{id:0,count:notes.length}],leases:()=>({}),version:()=>notes.length,subscribe:()=>()=>{},reserve:async()=>true,release:async()=>{},put:async note=>{notes=[JSON.parse(JSON.stringify({...note,owned:true}))];return notes[0]}}
 w.eval(fs.readFileSync(dir+'/js/wall-tools.js','utf8'));w.eval(fs.readFileSync(dir+'/js/guestbook.js','utf8'))
 const q=s=>d.querySelector(s),settle=()=>new Promise(resolve=>setTimeout(resolve,40))
 const click=async s=>{q(s).click();await settle()}
 const event=(el,type,x,y)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,button:0,isPrimary:true,clientX:x,clientY:y,pointerType:'mouse',pressure:.5});el.dispatchEvent(e)}
 q('#view').innerHTML=w.PAGES['/guestbook'];await w.Guestbook.mount(q('#view'))
 await click('[data-wall-tool='+medium+']');event(q('[data-wall]'),'click',wallWidth/2,500);await settle()
 q('[data-size]').value=size;q('[data-size]').dispatchEvent(new w.Event('change',{bubbles:true}));await settle()
 const previewWidth=parseFloat(q('[data-live-stage]').style.width)
 if(medium==='paper'){
   const canvas=q('[data-live-stage] canvas');event(canvas,'pointerdown',30,510);event(canvas,'pointermove',60,530);event(canvas,'pointerup',60,530);await settle()
 }
 await click('[data-gb=publish]');assert.equal(notes.length,1,q('[data-error]').textContent)
 const note=notes[0],savedWidth=parseFloat(q('[data-note]').style.width)
 assert(Math.abs(previewWidth-savedWidth)<1e-7,'preview and saved bounds must agree')
 // Changing the viewing device does not mutate the stored footprint.
 const stored=JSON.stringify(note);width=wallWidth===370?1232:370;w.dispatchEvent(new w.Event('resize'));await new Promise(r=>setTimeout(r,180))
 assert.equal(JSON.stringify(note),stored)
 assert(Math.abs(parseFloat(q('[data-note]').style.width)/width-note.worldBox.width/1000)<1e-7)
 w.Guestbook.destroy();w.close();return note
}
;(async()=>{
 for(const medium of ['sticker','paper'])for(const size of ['small','medium','large']){
   const mobile=await createAt(370,medium,size),desktop=await createAt(1232,medium,size)
   const expected=(medium==='sticker'?{small:100,medium:148,large:200}:{small:190,medium:260,large:320})[size]
   for(const note of [mobile,desktop]){
     assert(Math.abs(note.worldBox.width-expected)<1e-7,medium+' '+size+' must use wall units regardless of creation device')
     assert(Math.abs(note.worldBox.height-(medium==='sticker'?expected:expected*.6+36))<1e-7)
     assert.equal(note.worldFontSize,24,'paper details use the same wall scale')
   }
 }
 console.log('PASS shared sizing: phone/desktop creation, all sticker/paper sizes, preview/save equivalence and resize persistence')
})().catch(e=>{console.error(e);process.exit(1)})
