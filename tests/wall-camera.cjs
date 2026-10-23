const {setup,near}=require('./wall-cross-device.cjs'),assert=require('node:assert/strict')
function transform(t){const m=t.q('.gb-wall-scene').style.transform.match(/translate\(([-.\d]+)px,([-.\d]+)px\) scale\(([-.\d]+)\)/);return {x:Number(m[1]),y:Number(m[2]),z:Number(m[3])}}
function screen(t,x,y){const r=t.q('[data-wall]').getBoundingClientRect();return [r.left+x*r.width/1000,r.top+y*r.width/1000]}
function gesture(t,el,type,point,id=1){t.event(el,type,...point,{pointerId:id,isPrimary:id===1})}
async function stroke(t,a,b){const c=t.q('.gb-free-layer canvas');gesture(t,c,'pointerdown',screen(t,...a));gesture(t,c,'pointerup',screen(t,...b));await t.settle()}
async function pinch(t,el){gesture(t,el,'pointerdown',[100,300]);gesture(t,el,'pointerdown',[200,300],2);gesture(t,el,'pointermove',[250,300],2);gesture(t,el,'pointerup',[250,300],2);gesture(t,el,'pointerup',[100,300]);await t.settle()}
async function saveDrawing(width,zoom,medium){const t=await setup(width,true);try{for(let i=0;i<zoom;i++)await t.click('[data-camera=in]');await t.click('[data-wall-tool='+medium+']');await stroke(t,[450,600],[550,660]);await t.click('[data-action=finish]');assert.equal(t.notes().length,1);return t.notes()[0]}finally{t.close()}}
const cases={
 async 'camera follows the current toolbar and Escape only closes its menu'(){const t=await setup(370,true);try{
  assert(t.q('.gb-camera-controls').closest('.gb-wall-dock'))
  await t.click('[data-wall-tool=ink]');assert(t.q('.gb-camera-controls').closest('.gb-free-actions'))
  await t.click('[data-action=cancel]');await t.place('paper');assert(t.q('.gb-camera-controls').closest('.gb-dialog-head'))
  await t.click('[data-camera=toggle]');assert.equal(t.q('.gb-camera-options').hidden,false)
  t.q('[data-camera=toggle]').dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await t.settle()
  assert.equal(t.q('.gb-camera-options').hidden,true);assert(t.q('[data-composer]').open,'Escape preserves the paper editor')
 }finally{t.close()}},
 async 'pinch anchors the midpoint and ignores the remaining finger'(){const t=await setup(370,true);try{
  const wall=t.q('[data-wall]');gesture(t,wall,'pointerdown',[100,300]);gesture(t,wall,'pointerdown',[200,300],2);gesture(t,wall,'pointermove',[250,300],2)
  let p=transform(t);near(p.z,1.5,'pinch zoom');near((175-p.x)/p.z,150,'midpoint anchor x');near((300-p.y)/p.z,300,'midpoint anchor y')
  gesture(t,wall,'pointerup',[250,300],2);gesture(t,wall,'pointermove',[150,500]);assert.deepEqual(transform(t),p,'remaining finger is inert');gesture(t,wall,'pointerup',[150,500])
  gesture(t,wall,'pointerdown',[200,400]);gesture(t,wall,'pointermove',[180,350]);gesture(t,wall,'pointerup',[180,350]);near(transform(t).x,p.x-20,'view pan x');near(transform(t).y,p.y-50,'view pan y')
 }finally{t.close()}},
 async 'desktop and zoomed mobile save identical spray and engraving geometry'(){for(const medium of ['ink','engraving']){
  const desktop=await saveDrawing(1232,0,medium),mobile=await saveDrawing(370,3,medium)
  for(const key of ['x','y','width','height'])near(desktop.frame[key],mobile.frame[key],medium+' frame '+key)
  near(desktop.strokes[0].width,mobile.strokes[0].width,'brush world width')
  desktop.strokes[0].points.forEach((p,i)=>p.forEach((value,k)=>near(value,mobile.strokes[0].points[i][k],'stroke point')))
 }},
 async 'pinching discards only the active stroke including queued samples'(){for(const medium of ['ink','engraving'])for(const flushed of [false,true]){
  const t=await setup(370,true);try{await t.click('[data-wall-tool='+medium+']');await stroke(t,[650,800],[750,850]);const c=t.q('.gb-free-layer canvas')
   gesture(t,c,'pointerdown',[100,300]);if(flushed)await t.settle(60);gesture(t,c,'pointerdown',[200,300],2);gesture(t,c,'pointermove',[250,300],2);gesture(t,c,'pointerup',[250,300],2);gesture(t,c,'pointerup',[100,300]);await t.settle();await t.click('[data-action=finish]')
   assert.equal(t.notes().length,1);assert.equal(t.notes()[0].strokes.length,1,'no pinch residue');assert(t.notes()[0].frame.x>600,'earlier draft retained')
  }finally{t.close()}
 }},
 async 'pinch during erasing restores the affected stroke'(){const t=await setup(370,true);try{
  await t.click('[data-wall-tool=engraving]');await stroke(t,[300,500],[400,550]);await t.click('[data-action=erase]');const c=t.q('.gb-free-layer canvas'),a=screen(t,350,525)
  gesture(t,c,'pointerdown',a);await t.settle();gesture(t,c,'pointerdown',[260,350],2);gesture(t,c,'pointerup',[260,350],2);gesture(t,c,'pointerup',a);await t.click('[data-action=finish]');assert.equal(t.notes()[0].strokes.length,1)
 }finally{t.close()}},
 async 'pinch during paper handwriting retains previous strokes'(){const t=await setup(370,true);try{
  await t.place('paper');const c=t.q('[data-drawing]');gesture(t,c,'pointerdown',[130,520]);gesture(t,c,'pointerup',[150,530]);await t.settle();await pinch(t,c);await t.click('[data-gb=publish]');assert.equal(t.notes()[0].strokes.length,1)
 }finally{t.close()}},
 async 'zoomed sticker placement and dragging retain size and coordinates'(){const t=await setup(370,true);try{
  await t.click('[data-camera=in]');await t.click('[data-camera=in]');await t.click('[data-wall-tool=sticker]');gesture(t,t.q('[data-wall]'),'click',screen(t,500,1200));await t.settle();await t.click('[data-gb=publish]')
  let note=t.notes()[0];assert(note);near(note.worldBox.width,148,'sticker width');near(note.worldBox.x,426,'click-centered x');near(note.worldBox.y,1126,'click-centered y')
  const original=structuredClone(note);await t.click('[data-note]');await t.click('[data-arrange]');const el=t.q('[data-note]'),a=screen(t,500,1200),b=screen(t,540,1250)
  gesture(t,el,'pointerdown',a);gesture(t,el,'pointermove',b);gesture(t,el,'pointerup',b);await t.settle();note=t.notes()[0];near(note.worldBox.x-original.worldBox.x,40,'drag world x');near(note.worldBox.y-original.worldBox.y,50,'drag world y');near(note.worldBox.width,148,'drag preserves width')
  await t.resize(1232);note=t.notes()[0];near(t.q('[data-note]').getBoundingClientRect().width/transform(t).z/1232*1000,148,'desktop display world width')
 }finally{t.close()}},
 async 'zoomed draft handle movement and collision checks use wall coordinates'(){const t=await setup(370,true);try{
  await t.place('sticker');await t.click('[data-gb=publish]');const saved=t.notes()[0]
  await t.click('[data-camera=in]');await t.click('[data-wall-tool=sticker]');gesture(t,t.q('[data-wall]'),'click',screen(t,saved.worldBox.x+74,saved.worldBox.y+74));await t.settle();assert(t.q('[data-gb=publish]').disabled,'collision still blocks saved sticker')
  const handle=t.q('.gb-stage-handle'),a=[150,450];gesture(t,handle,'pointerdown',a);gesture(t,handle,'pointermove',[a[0],a[1]+160]);gesture(t,handle,'pointerup',[a[0],a[1]+160]);await t.settle();assert(!t.q('[data-gb=publish]').disabled,'moving into empty space allows save');await t.click('[data-gb=publish]')
  near(t.notes()[1].worldBox.y-saved.worldBox.y,160/1.5/370*1000,'draft move at zoom')
 }finally{t.close()}},
 async 'typed spray and carving retain geometry after zoom and rotation'(){for(const medium of ['ink','engraving']){
  const t=await setup(370,true);try{
   await t.click('[data-camera=in]');await t.click('[data-wall-tool='+medium+']');await t.click('[data-action=text]');gesture(t,t.q('[data-wall]'),'click',screen(t,500,1600));await t.settle()
   const input=t.q('[data-message]');input.value='放大以后再落笔';input.dispatchEvent(new t.w.Event('input',{bubbles:true}));const original=t.stage();await t.click('[data-gb=publish]');const saved=structuredClone(t.notes()[0])
   near(saved.worldBox.x,original.x,'typed x');near(saved.worldBox.y,original.y,'typed y');near(saved.worldBox.width,260,'typed width');near(saved.worldFontSize,24,'typed font')
   await t.resize(1232);await t.click('[data-note]');await t.click('[data-gb=edit]');await t.click('[data-camera=in]');await t.click('[data-gb=publish]');assert.deepEqual(t.notes()[0].worldBox,saved.worldBox)
  }finally{t.close()}
 }},
 async 'view rotation preserves the focal wall point and caps zoom'(){const t=await setup(370,true);try{
  await t.click('[data-camera=in]');await t.click('[data-camera=in]');const old=transform(t),cx=(185-old.x)/old.z/370,cy=(320-old.y)/old.z/370
  await t.resize(796);const next=transform(t);near((398-next.x)/next.z/796,cx,'focal x');near((320-next.y)/next.z/796,cy,'focal y')
  for(let i=0;i<6;i++)await t.click('[data-camera=in]');near(transform(t).z,4,'maximum zoom');assert(t.q('[data-camera=in]').disabled)
  await t.click('[data-camera=reset]');assert.deepEqual(transform(t),{x:0,y:0,z:1});assert(t.q('[data-camera=out]').disabled)
 }finally{t.close()}},
 async 'camera reset and resize never dirty an existing edit'(){const t=await setup(370,true);try{
  await t.place('sticker');await t.click('[data-gb=publish]');const original=structuredClone(t.notes()[0]);await t.click('[data-note]');await t.click('[data-gb=edit]');await t.click('[data-camera=in]');assert.equal(t.w.Guestbook.hasUnsavedChanges(),false)
  await t.resize(796);await t.click('[data-camera=reset]');assert.equal(t.w.Guestbook.hasUnsavedChanges(),false);await t.click('[data-gb=publish]');for(const key of ['x','y','width','height'])near(t.notes()[0].worldBox[key],original.worldBox[key],key)
 }finally{t.close()}}
}
;(async()=>{let failed=0;for(const [name,test] of Object.entries(cases)){try{await test();console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.stack)}}if(failed)process.exitCode=1})()
