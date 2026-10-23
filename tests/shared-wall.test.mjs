import test from 'node:test'
import assert from 'node:assert/strict'
import {promises as fs} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createAdminServer} from '../scripts/lib/admin-server.mjs'
const root=path.resolve(import.meta.dirname,'..')
const note=(id,x=10)=>({id,section:0,medium:'ink',mode:'text',paper:'ivory',size:'medium',text:'一起留下痕迹',name:'访客',strokes:[],worldBox:{x,y:300,width:80,height:50}})
test('shared wall: two visitors, atomic collisions, ownership, revisions, leases, moderation, capacity and persistence',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'shared-wall-')),source=path.join(temp,'content'),state=path.join(temp,'state');await fs.mkdir(path.join(source,'posts'),{recursive:true});await fs.writeFile(path.join(source,'content.config.json'),'{}')
 let app=await createAdminServer({root,source,state,output:path.join(temp,'dist')}),base=await app.listen(0),owner=(await fs.readFile(app.ownerFile,'utf8')).trim()
 const req=async(route,method='GET',data,token)=>{const r=await fetch(base+route,{method,headers:{Origin:base,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json()}}
 try{
 await assert.rejects(()=>createAdminServer({root,source,state,output:path.join(temp,'dist')}),/另一个服务实例/)
 const a=(await req('/api/wall/session','POST',{})).data.token,b=(await req('/api/wall/session','POST',{})).data.token
 const racing=await Promise.all([req('/api/wall/notes','POST',{note:note('one')},a),req('/api/wall/notes','POST',{note:note('two')},b)])
 assert.deepEqual(racing.map(r=>r.status).sort(),[200,409]);const winner=racing[0].status===200?a:b,loser=winner===a?b:a,created=racing.find(r=>r.status===200).data
 const snapshot=(await req('/api/wall?section=0','GET',null,loser)).data;assert.equal(snapshot.notes.length,1);assert.equal(snapshot.notes[0].owned,false);assert(!JSON.stringify(snapshot).includes('ownerHash'));assert(!JSON.stringify(snapshot).includes(winner))
 assert.equal((await req('/api/wall/notes/'+created.id,'DELETE',{revision:created.revision},loser)).status,403)
 assert.equal((await req('/api/wall/notes','POST',{note:{...created,text:'修改'},revision:'stale'},winner)).status,409)
 const updated=await req('/api/wall/notes','POST',{note:{...created,text:'修改'},revision:created.revision},winner);assert.equal(updated.status,200)
 const lease=await req('/api/wall/leases','POST',{id:'lease-a',wall:0,cells:[6400],note:null},a);assert.equal(lease.status,200)
 assert.equal((await req('/api/wall/leases','POST',{id:'lease-b',wall:0,cells:[6400]},b)).status,409)
 const realNow=Date.now;Date.now=()=>realNow()+16000;try{assert.equal((await req('/api/wall/leases','POST',{id:'lease-b',wall:0,cells:[6400]},b)).status,200,'expired reservations release space')}finally{Date.now=realNow}
 assert.equal((await req('/api/wall/notes','POST',{note:{...note('invalid'),text:'x'.repeat(181)}},a)).status,400)
 assert.equal((await req('/api/wall/notes','POST',{note:note('bypass',0),lease:'lease-b'},a)).status,403)
 const drawing={...note('drawing',300),mode:'draw',layout:3,frame:{x:300,y:500,width:80,height:60},strokes:[{ink:'#3f5870',width:7,points:[[.1,.1,.5],[.9,.9,.5]]}]};delete drawing.worldBox
 assert.equal((await req('/api/wall/notes','POST',{note:drawing},a)).status,409)
 await req('/api/wall/leases','POST',{id:'drawing-lease',wall:0,cells:[]},a)
 assert.equal((await req('/api/wall/notes','POST',{note:drawing,lease:'drawing-lease'},a)).status,200)
 const stats=(await req('/api/v1/wall','GET',null,owner)).data;assert.equal(stats.stats.types.ink,2)
 assert.equal((await req('/api/v1/wall/'+created.id,'DELETE',{revision:updated.data.revision},owner)).status,200)
 assert.equal((await req('/api/wall/notes/'+created.id+'/restore','POST',{},winner)).status,403)
 assert.equal((await req('/api/wall/notes','POST',{note:created,revision:created.revision},winner)).status,409)
 const archive=(await req('/api/v1/wall?deleted=1&page=99','GET',null,owner)).data
 assert.equal(archive.page,1);assert.equal(archive.total,1);assert.equal(archive.notes[0].id,created.id)
 assert.equal((await req('/api/v1/wall/'+created.id+'/restore','POST',{revision:updated.data.revision},a)).status,401)
 assert.equal((await req('/api/v1/wall/'+created.id+'/restore','POST',{revision:'stale'},owner)).status,409)
 const blocker=(await req('/api/wall/notes','POST',{note:note('restore-blocker')},loser)).data
 assert.equal((await req('/api/v1/wall/'+created.id+'/restore','POST',{revision:updated.data.revision},owner)).status,409)
 await req('/api/wall/notes/restore-blocker','DELETE',{revision:blocker.revision},loser)
 const restored=await req('/api/v1/wall/'+created.id+'/restore','POST',{revision:updated.data.revision},owner)
 assert.equal(restored.status,200);assert.notEqual(restored.data.revision,updated.data.revision)
 assert.equal((await req('/api/wall/notes','POST',{note:created,revision:updated.data.revision},winner)).status,409)
 await req('/api/v1/wall/'+created.id,'DELETE',{revision:restored.data.revision},owner)
 const deleted=await req('/api/wall/notes/drawing','DELETE',{revision:(await req('/api/wall','GET',null,a)).data.notes[0].revision},a);assert.equal(deleted.status,200)
 assert.equal((await req('/api/wall/notes/drawing/restore','POST',{},a)).status,200)
 for(let i=0;i<23;i++){const n={...note('capacity-'+i,10+i%8*110),worldBox:{x:10+i%8*110,y:1000+Math.floor(i/8)*100,width:50,height:40},medium:['paper','sticker','engraving'][i%3],sticker:'spark'};assert.equal((await req('/api/wall/notes','POST',{note:n},a)).status,200)}
 assert.equal((await req('/api/wall/notes','POST',{note:{...note('full'),worldBox:{x:20,y:2500,width:50,height:40}}},a)).status,409)
 const newWalls=await Promise.all([req('/api/wall/walls','POST',{},a),req('/api/wall/walls','POST',{},b)]);assert.equal(newWalls[0].data.id,1);assert.equal(newWalls[1].data.id,1)
 const before=(await req('/api/v1/wall','GET',null,owner)).data.stats
 await app.close();app=await createAdminServer({root,source,state,output:path.join(temp,'dist')});base=await app.listen(0)
 assert.deepEqual((await req('/api/v1/wall','GET',null,owner)).data.stats,before)
 assert.equal((await req('/api/wall','GET',null,a)).data.notes.filter(n=>n.owned).length,24)
 assert.deepEqual((await req('/api/wall','GET',null,a)).data.leases,{})
 }finally{await app.close();await fs.rm(temp,{recursive:true,force:true})}
})
