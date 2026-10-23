import {promises as fs} from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'
const processStart=async pid=>{try{return (await fs.readFile(`/proc/${pid}/stat`,'utf8')).split(') ')[1].split(' ')[19]}catch{return null}}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex')
const fail=(ok,message,status=400)=>{if(!ok){const e=new Error(message);e.status=status;throw e}}
const idOK=s=>typeof s==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(s)
const inks=['#343832','#3f5870','#a45743','#e9edcf','#d7f557','#6286ee','#f47760']
export function cellsFor(note){
 const cells=new Set(),box=note.frame||note.worldBox
 const add=(x,y,r)=>{for(let a=Math.max(0,Math.floor((x-r)/8));a<=Math.min(124,Math.floor((x+r)/8));a++)for(let b=Math.max(0,Math.floor((y-r)/8));b<=Math.floor((y+r)/8);b++){cells.add(b*128+a);fail(cells.size<=30000,'占用范围过大，请分次留言')}}
 if(note.frame){for(const s of note.strokes){let previous;for(const p of s.points){const q=[box.x+p[0]*box.width,box.y+p[1]*box.height],a=previous||q,length=Math.hypot(q[0]-a[0],q[1]-a[1]),steps=Math.max(1,Math.ceil(length/4)),r=note.medium==='ink'?s.width*1.15+2:s.width*.5+2;for(let i=0;i<=steps;i++)add(a[0]+(q[0]-a[0])*i/steps,a[1]+(q[1]-a[1])*i/steps,r);previous=q}}}
 else for(let x=Math.floor(box.x/8);x<=Math.min(124,Math.floor((box.x+box.width)/8));x++)for(let y=Math.floor(box.y/8);y<=Math.floor((box.y+box.height)/8);y++){cells.add(y*128+x);fail(cells.size<=30000,'占用范围过大')}
 return [...cells]
}
function clean(input){
 fail(input&&idOK(input.id),'留言标识无效');fail(['ink','engraving','paper','sticker'].includes(input.medium),'留言类型无效');fail(['draw','text'].includes(input.mode),'留言模式无效')
 fail(Number.isInteger(input.section)&&input.section>=0,'墙面无效');fail(typeof input.text==='string'&&input.text.length<=180,'文字最多 180 字');fail(typeof input.name==='string'&&input.name.length<=24,'落款最多 24 字')
 fail(['ivory','sage','rose'].includes(input.paper),'纸张无效');fail(['small','medium','large'].includes(input.size),'尺寸无效')
 const b=input.frame||input.worldBox;fail(b&&['x','y','width','height'].every(k=>Number.isFinite(b[k]))&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0&&b.x+b.width<=1000.1&&b.y+b.height<=10000,'留言必须位于墙面内')
 fail(Array.isArray(input.strokes)&&input.strokes.length<=150,'笔画过多');let points=0
 for(const s of input.strokes){fail(inks.includes(s.ink)&&Number.isFinite(s.width)&&s.width>0&&s.width<=160,'笔触无效');fail(Array.isArray(s.points)&&s.points.length>0,'笔画无效');points+=s.points.length;fail(points<=6000,'笔迹最多 6000 个点');fail(s.points.every(p=>Array.isArray(p)&&p.length===3&&p.every(v=>Number.isFinite(v)&&v>=0&&v<=1)),'坐标无效')}
 fail(input.medium==='sticker'||input.text.trim()||points,'请先留下内容')
 const n={};for(const k of ['id','medium','mode','section','text','name','paper','size','strokes'])n[k]=input[k]
 if(input.frame){fail(input.mode==='draw'&&['ink','engraving'].includes(input.medium),'自由笔迹无效');n.layout=3;n.frame={...b}}else{n.layout=2;n.worldBox={...b}}
 n.ink=inks.includes(input.ink)?input.ink:inks[1];n.font=['wenkai','mashan','caveat','kai','song','hei','round','brush','mono'].includes(input.font)?input.font:'wenkai';n.worldFontSize=Math.max(8,Math.min(200,Number(input.worldFontSize)||24));n.fontSize=Math.max(14,Math.min(64,Number(input.fontSize)||24))
 if(input.medium==='sticker'){fail(['spark','bloom','orbit','mountain','ticket','camp','sprout','ginkgo','mushroom','coffee','camera','cassette'].includes(input.sticker),'贴纸无效');n.sticker=input.sticker}
 return n
}
export async function createWallStore(state){
 await fs.mkdir(state,{recursive:true})
 const lock=path.join(state,'wall-writer.lock')
 try{const record=JSON.parse(await fs.readFile(lock,'utf8')),pid=typeof record==='number'?record:record.pid;try{if(typeof record==='object'&&(record.host!==os.hostname()||(record.start&&record.start!==await processStart(pid)))){const stale=new Error('Previous container');stale.code='ESRCH';throw stale}process.kill(pid,0);fail(false,'共享墙已由另一个服务实例管理，请先停止该实例',409)}catch(e){if(e.code!=='ESRCH')throw e;await fs.unlink(lock)}}catch(e){if(e.code!=='ENOENT')throw e}
 await fs.writeFile(lock,JSON.stringify({pid:process.pid,host:os.hostname(),start:await processStart(process.pid)}),{flag:'wx',mode:0o600})
 const file=path.join(state,'wall.json'),leases=new Map();let data
 try{data=JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;data={version:1,seed:crypto.randomInt(256),walls:[0],notes:[],deleted:[]};await fs.writeFile(file,JSON.stringify(data),{mode:0o600})}
 let queue=Promise.resolve()
 const serial=fn=>{const next=queue.then(fn);queue=next.catch(()=>{});return next}
 const save=async next=>{const tmp=file+'.tmp';await fs.mkdir(state,{recursive:true});await fs.writeFile(tmp,JSON.stringify(next),{mode:0o600});await fs.rename(tmp,file);data=next}
 const publicNote=(n,owner)=>{const {ownerHash,cells,...rest}=n;return {...rest,owned:ownerHash===owner}}
 function prune(){for(const [id,l] of leases)if(l.expires<Date.now())leases.delete(id)}
 const stats=()=>({total:data.notes.length,deleted:data.deleted.length,walls:data.walls.length,types:Object.fromEntries(['ink','engraving','paper','sticker'].map(t=>[t,data.notes.filter(n=>n.medium===t).length]))})
 function snapshot(section,owner){prune();return {seed:data.seed,section,walls:data.walls.map(id=>({id,count:data.notes.filter(n=>n.section===id).length})),notes:data.notes.filter(n=>n.section===section).map(n=>publicNote(n,owner)),leases:Object.fromEntries([...leases].filter(([,l])=>l.wall===section).map(([id,{ownerHash,...l}])=>[id,l])),stats:stats()}}
 function collision(section,cells,ignore,lease,owner){const set=new Set(cells);fail(!data.notes.some(n=>n.section===section&&n.id!==ignore&&n.cells.some(c=>set.has(c))),'这里已有留言，请调整位置后重试',409);prune();fail(![...leases].some(([id,l])=>id!==lease&&l.wall===section&&(l.note===ignore&&ignore||l.cells.some(c=>set.has(c)))),'另一位访客正在这里创作，请稍后或换个位置',409)}
 async function reserve(owner,p){return serial(async()=>{fail(idOK(p.id)&&data.walls.includes(p.wall),'占位参数无效');fail(Array.isArray(p.cells)&&p.cells.length<=30000&&p.cells.every(c=>Number.isInteger(c)&&c>=0&&c<160000),'占位范围无效');const old=leases.get(p.id);fail(!old||old.ownerHash===owner,'不能修改他人的占位',403);if(p.note){const n=data.notes.find(n=>n.id===p.note);fail(n&&n.ownerHash===owner,'只能编辑自己留下的痕迹',403)}collision(p.wall,p.cells,p.note,p.id,owner);fail(leases.size<500||old,'当前创作者较多，请稍后重试',429);leases.set(p.id,{ownerHash:owner,wall:p.wall,cells:[...new Set(p.cells)],note:p.note||null,expires:Date.now()+15000});return snapshot(p.wall,owner)})}
 async function put(owner,p){return serial(async()=>{const n=clean(p.note),old=data.notes.find(x=>x.id===n.id),deleted=data.deleted.find(x=>x.id===n.id);fail(!deleted,'该留言已删除，请重新创作',409);fail(data.walls.includes(n.section),'墙面不存在',404);if(old){fail(old.ownerHash===owner,'只能修改自己的留言',403);fail(p.revision===old.revision,'留言已更新，请重新打开再编辑',409)}else fail(data.notes.filter(x=>x.section===n.section).length<24,'这面墙已满，请打开新墙',409)
 const cells=cellsFor(n);if(p.lease)fail(leases.get(p.lease)?.ownerHash===owner,'占位不属于当前访客',403);collision(n.section,cells,n.id,p.lease,owner)
 if(n.frame){const l=leases.get(p.lease);fail(l&&l.ownerHash===owner&&l.expires>Date.now()&&l.wall===n.section,'占位过期，请重新确认后提交',409)}
 const entry={...n,ownerHash:owner,cells,revision:crypto.randomUUID(),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),date:old?.date||new Date().toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'})};await save({...data,notes:[entry,...data.notes.filter(x=>x.id!==n.id)]});if(p.lease)leases.delete(p.lease);return publicNote(entry,owner)})}
 async function remove(id,owner,revision,admin=false){return serial(async()=>{const n=data.notes.find(n=>n.id===id);fail(n,'留言不存在',404);fail(admin||n.ownerHash===owner,'只能删除自己的留言',403);fail(revision===n.revision,'留言已更新，请刷新后重试',409);await save({...data,notes:data.notes.filter(x=>x.id!==id),deleted:[{...n,deletedAt:new Date().toISOString(),moderated:admin},...data.deleted]});for(const [key,l]of leases)if(l.note===id)leases.delete(key);return {ok:true}})}
 return {close:async()=>{await queue;await fs.unlink(lock).catch(()=>{})},snapshot,stats,reserve,put,remove,owner:token=>hash(token),release:async(owner,id)=>serial(async()=>{if(leases.get(id)?.ownerHash===owner)leases.delete(id);return {ok:true}}),newWall:async()=>serial(async()=>{const empty=data.walls.find(id=>!data.notes.some(n=>n.section===id));if(empty!==undefined)return {id:empty};fail(data.walls.length<100000,'墙面数量已达上限');const id=Math.max(...data.walls)+1;await save({...data,walls:[...data.walls,id]});return {id}}),list:({page=1,type='',section,deleted=false}={})=>{const notes=(deleted?data.deleted:data.notes).filter(n=>(!type||n.medium===type)&&(section===undefined||n.section===section));page=Math.min(page,Math.max(1,Math.ceil(notes.length/20)));return {stats:stats(),total:notes.length,page,notes:notes.slice((page-1)*20,page*20).map(n=>publicNote(n,''))}},restore:async(id,owner,admin=false,revision)=>serial(async()=>{const n=data.deleted.find(n=>n.id===id);fail(n&&(admin||!n.moderated&&n.ownerHash===owner),'这处痕迹无法恢复',403);if(admin)fail(revision===n.revision,'留言档案已更新，请刷新后重试',409);fail(data.notes.filter(x=>x.section===n.section).length<24,'墙面已满',409);collision(n.section,n.cells,n.id,null,owner);const {deletedAt,moderated,...rest}=n;rest.revision=crypto.randomUUID();await save({...data,notes:[rest,...data.notes],deleted:data.deleted.filter(x=>x.id!==id)});return publicNote(rest,owner)})}
}
