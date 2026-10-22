import {test} from 'node:test'
import assert from 'node:assert/strict'
import {promises as fs} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {snapshot,restore} from '../scripts/data-snapshot.mjs'
test('backup restores content, media, credentials, drafts, wall and statistics without overwriting',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'stacktao-backup-'))
 try{
  const data=path.join(root,'data'),backup=path.join(root,'backup'),target=path.join(root,'restored')
  const entries={'content/content.config.json':'{}','content/posts/test.md':'# hello','content/media/test.png':'binary image fixture','state/owner-token':'test secret','state/wall.json':'{"notes":[1]}','state/drafts/test.json':'{}','state/analytics/day.json':'{"pv":2}','state/tokens.json':'[]','state/account.json':'{"id":"stable-account-id","password":{"hash":"fixture"}}'}
  for(const [name,value] of Object.entries(entries)){await fs.mkdir(path.dirname(path.join(data,name)),{recursive:true});await fs.writeFile(path.join(data,name),value)}
  await fs.writeFile(path.join(data,'state/wall-writer.lock'),'123')
  await assert.rejects(snapshot(data,backup),/Stop the app/)
  await fs.unlink(path.join(data,'state/wall-writer.lock'))
  await snapshot(data,backup);await restore(backup,target)
  for(const [name,value] of Object.entries(entries))assert.equal(await fs.readFile(path.join(target,name),'utf8'),value)
  await assert.rejects(restore(backup,target),/EEXIST/)
  await fs.writeFile(path.join(backup,'state/wall.json'),'corrupt')
  await assert.rejects(restore(backup,path.join(root,'corrupt')),/Checksum mismatch/)
  await assert.rejects(fs.access(path.join(root,'corrupt')))
 }finally{await fs.rm(root,{recursive:true,force:true})}
})

test('container entry point seeds once and preserves content and state on restart',async()=>{
 const {spawn}=await import('node:child_process')
 const {once}=await import('node:events')
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'stacktao-production-'))
 const content=path.join(root,'content'),state=path.join(root,'state'),output=path.join(root,'site/dist')
 let child
 async function boot(){
  child=spawn(process.execPath,['scripts/production.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,CONTENT_DIR:content,ADMIN_STATE_DIR:state,ADMIN_OUTPUT_DIR:output,ADMIN_PORT:'0',ADMIN_HOST:'127.0.0.1',ADMIN_PUBLIC_ORIGIN:''},stdio:['ignore','pipe','pipe']})
  await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(new Error('Startup timeout')),20000);child.stdout.on('data',chunk=>{log+=chunk;if(log.includes('内容工作台')){clearTimeout(timer);resolve()}});child.stderr.on('data',chunk=>{log+=chunk});child.once('exit',code=>{clearTimeout(timer);reject(new Error(`Startup exited ${code}: ${log}`))})})
 }
 async function stop(){const exit=once(child,'exit');child.kill('SIGTERM');await exit;child=null}
 try{
  await boot();await stop()
  const owner=await fs.readFile(path.join(state,'owner-token'),'utf8')
  await fs.writeFile(path.join(content,'keep.txt'),'persistent user data')
  await boot();await stop()
  assert.equal(await fs.readFile(path.join(content,'keep.txt'),'utf8'),'persistent user data')
  assert.equal(await fs.readFile(path.join(state,'owner-token'),'utf8'),owner)
  await fs.access(path.join(output,'index.html'))
  await fs.access(path.join(state,'wall.json'))
  await assert.rejects(fs.access(path.join(state,'wall-writer.lock')))
 }finally{if(child){const exit=once(child,'exit');child.kill('SIGTERM');await exit}await fs.rm(root,{recursive:true,force:true})}
})

test('wall lock distinguishes a previous container from a live local writer',async()=>{
 const {createWallStore}=await import('../scripts/lib/wall-store.mjs')
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'stacktao-lock-'))
 try{
  await fs.writeFile(path.join(root,'wall-writer.lock'),JSON.stringify({pid:process.pid,host:'previous-container-test'}))
  const store=await createWallStore(root)
  await assert.rejects(createWallStore(root),/另一个服务实例/)
  await store.close()
 }finally{await fs.rm(root,{recursive:true,force:true})}
})
