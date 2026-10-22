import test from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createAdminServer } from '../scripts/lib/admin-server.mjs'

const root=path.resolve(import.meta.dirname,'..')
test('content studio: auth, scoped API, isolated drafts, atomic publication, shared media and concurrent edits',async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'stacktao-admin-')),source=path.join(temp,'content'),state=path.join(temp,'private'),output=path.join(temp,'dist')
  await fs.mkdir(path.join(source,'posts/2026/original'),{recursive:true});await fs.mkdir(path.join(source,'albums'),{recursive:true})
  const original='---\ntitle: Original\ndate: 2026-10-22\ncustom: keep-me\n---\nLive text\n'
  await fs.writeFile(path.join(source,'posts/2026/original/index.md'),original)
  await fs.writeFile(path.join(source,'content.config.json'),JSON.stringify({site:{name:'Test'},navigation:[]}))
  const app=await createAdminServer({root,source,state,output}),base=await app.listen(0),owner=(await fs.readFile(app.ownerFile,'utf8')).trim()
  async function request(route,{method='GET',token=owner,data,revision,headers={},raw=false}={}){const response=await fetch(base+'/api/v1'+route,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(!raw?{'Content-Type':'application/json'}:{}),...(revision?{'If-Match':revision}:{}),...headers},...(data!==undefined?{body:raw?data:JSON.stringify(data)}:{})});return {status:response.status,headers:response.headers,data:await response.json()}}
  try{
    assert.equal((await request('/posts',{token:null})).status,401)
    assert.equal((await request('/session',{method:'POST',token:null,data:{token:owner}})).status,403,'login rejects missing origin')
    const login=await request('/session',{method:'POST',token:null,data:{token:owner},headers:{Origin:base}});assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/)
    assert.equal((await request('/posts',{headers:{Origin:'https://evil.test'}})).status,403)
    const tokenResult=await request('/tokens',{method:'POST',data:{name:'draft writer',scopes:['content:read','drafts:write','media:write']}});assert.equal(tokenResult.status,201);const draftToken=tokenResult.data.token
    const {execFile}=await import('node:child_process'),{promisify}=await import('node:util')
    const input=path.join(temp,'cli-article.md');await fs.writeFile(input,'---\ntitle: CLI draft\ndate: 2026-10-22\n---\nCreated from the command line.\n')
    await promisify(execFile)(process.execPath,[path.join(root,'scripts/publish-article.mjs'),input,'--slug=cli-draft'],{env:{...process.env,STACKTAO_API:base,STACKTAO_TOKEN:draftToken}})
    const cliDraft=(await request('/posts/cli-draft')).data;assert.equal(cliDraft.title,'CLI draft');assert.equal(cliDraft.published,false,'CLI defaults to a private draft')
    assert(!(await fs.readFile(path.join(state,'tokens.json'),'utf8')).includes(draftToken),'only hashed API tokens persist')
    assert(!(JSON.stringify((await request('/tokens')).data)).includes(draftToken),'tokens cannot be read back')
    let existing=(await request('/posts/original')).data
    const edited=await request('/posts/original',{method:'PUT',revision:existing.revision,data:{...existing,title:'Edited',markdown:'New draft'}});assert.equal(edited.status,200)
    assert.equal(await fs.readFile(path.join(source,'posts/2026/original/index.md'),'utf8'),original,'saving a draft does not modify public source')
    assert.equal((await request('/posts/original',{method:'PUT',revision:existing.revision,data:existing})).status,409,'stale writer cannot overwrite draft')
    assert.equal((await request('/posts/original/publish',{method:'POST',token:draftToken,revision:edited.data.revision,data:{}})).status,403)
    assert.equal((await request('/posts',{method:'POST',data:{slug:'../escape',title:'x'}})).status,400)
    assert.equal((await request('/posts',{method:'POST',data:{title:'x',date:'2026-02-30'}})).status,400)
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64')
    const picture=await request('/media?name=picture.png',{method:'POST',token:draftToken,data:png,raw:true});assert.equal(picture.status,201)
    const privatePicture=await request('/media?name=private.png',{method:'POST',token:draftToken,data:png,raw:true});assert.equal(privatePicture.status,201)
    assert.equal((await request('/media?name=evil.png',{method:'POST',data:Buffer.from('<svg onload=alert(1)>'),raw:true})).status,415)
    assert.equal((await fetch(base+picture.data.url)).status,401,'unpublished originals require authentication')
    const preview=await request('/preview',{method:'POST',token:draftToken,data:{markdown:'![photo]('+picture.data.src+')\n<script>alert(1)</script><img src=x onerror=alert(1)>'}});assert.equal(preview.status,200);assert(!preview.data.html.includes('onerror'));assert(!preview.data.html.includes('<script>'));assert(preview.data.html.includes(picture.data.url))
    let created=await request('/posts',{method:'POST',token:draftToken,data:{slug:'api-article',title:'API article',date:'2026-10-22',markdown:'![photo]('+picture.data.src+')\n## Hello\nPublished from API'}});assert.equal(created.status,201)
    assert.equal((await request('/posts',{method:'POST',data:{slug:'api-article',title:'duplicate'}})).status,409)
    const published=await request('/posts/api-article/publish',{method:'POST',revision:created.data.revision,data:{}});assert.equal(published.status,200,JSON.stringify(published.data));assert.equal(published.data.published,true)
    const manifest=JSON.parse(await fs.readFile(path.join(output,'content/manifest.json'),'utf8'));assert.equal(manifest.articles.find(p=>p.slug==='original').title,'Original','published source stays unchanged while editing')
    assert(manifest.articles.find(p=>p.slug==='api-article'))
    assert(await fs.stat(path.join(output,'content',picture.data.src)))
    assert.equal(await fs.stat(path.join(output,'content',privatePicture.data.src)).catch(()=>null),null,'unreferenced draft images are not published')
    const articleJSON=JSON.parse(await fs.readFile(path.join(output,'content/posts/api-article.json'),'utf8'));assert(articleJSON.html.includes('content/'+picture.data.src))
    const editedPublished=await request('/posts/original/publish',{method:'POST',revision:edited.data.revision,data:{}});assert.equal(editedPublished.status,200)
    assert.match(await fs.readFile(path.join(source,'posts/2026/original/index.md'),'utf8'),/custom: keep-me/,'custom frontmatter preserved')
    created=await request('/posts/api-article',{method:'PUT',revision:published.data.revision,data:{...published.data,title:'Fail build',markdown:'Do not publish'}});assert.equal(created.status,200)
    const publicBefore=await fs.readFile(path.join(output,'content/manifest.json'),'utf8'),sourceBefore=await fs.readFile(path.join(source,'posts/2026/api-article/index.md'),'utf8')
    await fs.writeFile(path.join(source,'content.config.json'),'{invalid')
    const failed=await request('/posts/api-article/publish',{method:'POST',revision:created.data.revision,data:{}});assert.equal(failed.status,422)
    assert.equal(await fs.readFile(path.join(output,'content/manifest.json'),'utf8'),publicBefore,'failed build cannot replace live output')
    assert.equal(await fs.readFile(path.join(source,'posts/2026/api-article/index.md'),'utf8'),sourceBefore,'source restored after failed build')
    assert.equal((await request('/posts/api-article')).data.hasDraft,true)
    await fs.writeFile(path.join(source,'content.config.json'),JSON.stringify({site:{name:'Test'},navigation:[]}))
    const latest=(await request('/posts/api-article')).data
    const withdrawn=await request('/posts/api-article/unpublish',{method:'POST',revision:latest.revision,data:{}});assert.equal(withdrawn.status,200);assert.equal(withdrawn.data.published,false)
    assert(!JSON.parse(await fs.readFile(path.join(output,'content/manifest.json'),'utf8')).articles.some(p=>p.slug==='api-article'))
    assert.equal((await request('/collections',{method:'PUT',token:draftToken,revision:'new',data:{}})).status,403)
    const album=await request('/collections',{method:'PUT',revision:'new',data:{title:'Album',slug:'album',date:'2026-10-22',photos:[{src:picture.data.src,alt:'Uploaded'}]}});assert.equal(album.status,200,JSON.stringify(album.data))
    const albums=(await request('/collections')).data;assert(albums[0].revision);assert((await fs.readFile(path.join(output,'js/content-generated.js'),'utf8')).includes('content/'+picture.data.src))
    const config=(await request('/settings')).data
    assert.equal((await request('/settings',{method:'PUT',token:draftToken,revision:config.revision,data:config.data})).status,403)
    const management=await request('/tokens',{method:'POST',data:{name:'manager',scopes:['content:read','settings:write','projects:write','albums:write']}})
    assert.equal((await request('/settings',{method:'PUT',token:management.data.token,revision:config.revision,data:{...config.data,site:{name:'Managed'}}})).status,200)
    assert.equal((await request('/settings',{method:'PUT',revision:config.revision,data:config.data})).status,409)
    assert.equal((await request('/deploy',{method:'POST',data:{}})).status,409,'remote publication must be explicitly configured')
    await request('/tokens/'+tokenResult.data.id,{method:'DELETE',data:{}})
    assert.equal((await request('/posts',{token:draftToken})).status,401,'revocation takes effect immediately')
    const events=(await request('/events')).data;assert(events.some(e=>e.status==='failed'));assert(events.some(e=>e.status==='built'))
    const external=(await request('/posts/original')).data
    await request('/posts/original',{method:'PUT',revision:external.revision,data:{...external,markdown:'other draft'}})
    await fs.appendFile(path.join(source,'posts/2026/original/index.md'),'\nExternal change\n')
    const changed=(await request('/posts/original')).data
    assert.equal((await request('/posts/original/publish',{method:'POST',revision:changed.revision,data:{}})).status,409,'external edits also prevent silent overwrite')
  }finally{await app.close();await fs.rm(temp,{recursive:true,force:true})}
})

test('Git synchronization commits only content and pushes to an isolated local remote',async()=>{
  const {execFile}=await import('node:child_process'),{promisify}=await import('node:util'),exec=promisify(execFile)
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'stacktao-git-')),repo=path.join(temp,'repo'),source=path.join(repo,'content'),remote=path.join(temp,'remote.git')
  const git=async(...args)=>(await exec('git',['-C',repo,...args])).stdout.trim()
  await fs.mkdir(path.join(source,'posts'),{recursive:true})
  await fs.writeFile(path.join(source,'content.config.json'),JSON.stringify({site:{name:'Test'},navigation:[]}))
  await fs.writeFile(path.join(repo,'framework.txt'),'original')
  await git('init','-b','main');await git('config','user.name','Test');await git('config','user.email','test@example.invalid');await git('add','.');await git('commit','-m','Initial')
  await exec('git',['init','--bare',remote]);await git('remote','add','origin',remote)
  await fs.writeFile(path.join(repo,'framework.txt'),'unrelated staged change');await git('add','framework.txt')
  await fs.writeFile(path.join(source,'content.config.json'),JSON.stringify({site:{name:'Updated'},navigation:[]}))
  const previous=process.env.ADMIN_GIT_PUBLISH;process.env.ADMIN_GIT_PUBLISH='1'
  const app=await createAdminServer({root,source,state:path.join(temp,'state'),output:path.join(temp,'dist')}),base=await app.listen(0),owner=(await fs.readFile(app.ownerFile,'utf8')).trim()
  try{
    const response=await fetch(base+'/api/v1/deploy',{method:'POST',headers:{Authorization:'Bearer '+owner,'Content-Type':'application/json'},body:'{}'}),result=await response.json()
    assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.status,'pushed')
    assert.equal(await git('show','HEAD:framework.txt'),'original','unrelated staged changes are not committed')
    assert.equal(await git('diff','--cached','--name-only'),'framework.txt')
    assert.equal((await exec('git',['--git-dir='+remote,'rev-parse','refs/heads/main'])).stdout.trim(),await git('rev-parse','HEAD'))
  }finally{await app.close();if(previous===undefined)delete process.env.ADMIN_GIT_PUBLISH;else process.env.ADMIN_GIT_PUBLISH=previous;await fs.rm(temp,{recursive:true,force:true})}
})

test('analytics uses real inventory, validates collection, deduplicates daily sessions and isolates reporting',async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'stacktao-analytics-')),source=path.join(temp,'content'),state=path.join(temp,'state')
  await fs.mkdir(path.join(source,'posts/2026/test'),{recursive:true})
  await fs.writeFile(path.join(source,'posts/2026/test/index.md'),'---\ntitle: Test\ndate: 2026-10-22\ntags: [writing]\n---\n你好 world')
  await fs.writeFile(path.join(source,'content.config.json'),'{}')
  const app=await createAdminServer({root,source,state,output:path.join(temp,'dist')}),base=await app.listen(0),owner=(await fs.readFile(app.ownerFile,'utf8')).trim(),previous=process.env.ANALYTICS_ORIGINS
  const get=async route=>{const r=await fetch(base+route,{headers:{Authorization:'Bearer '+owner}});return {status:r.status,data:await r.json()}}
  const event={event:'pageview',path:'/posts/test',session:'abcd1234-abcd-1234-abcd-123456789012',referrer:'https://example.com/private?secret=yes',device:'mobile'}
  const send=(data=event,origin='https://blog.example')=>fetch(base+'/api/v1/collect',{method:'POST',headers:{Origin:origin,'Content-Type':'text/plain'},body:JSON.stringify(data)})
  try{
    delete process.env.ANALYTICS_ORIGINS
    assert.equal((await send()).status,403)
    process.env.ANALYTICS_ORIGINS='https://blog.example'
    assert.equal((await send(event,'https://evil.example')).status,403)
    assert.equal((await send({...event,path:'/posts/test?secret=1'})).status,400)
    assert.equal((await send({...event,event:'arbitrary'})).status,400)
    assert.equal((await send()).status,202);assert.equal((await send()).status,202)
    assert.equal((await send({...event,event:'read_complete'})).status,202)
    const report=(await get('/api/v1/analytics?days=7')).data
    assert.equal(report.content.published,1);assert.equal(report.content.words,3);assert.equal(report.content.tags[0].name,'writing')
    assert.equal(report.traffic.views,2);assert.equal(report.traffic.dailySessions,1);assert.equal(report.traffic.sources[0].name,'example.com');assert.equal(report.traffic.trend.length,7)
    assert.equal(report.traffic.events.find(e=>e.name==='read_complete').value,1)
    assert.equal((await get('/api/v1/analytics?days=400')).status,400)
    assert.equal((await fetch(base+'/api/v1/analytics')).status,401)
    const disk=await fs.readFile(path.join(state,'analytics',(await fs.readdir(path.join(state,'analytics')))[0]),'utf8')
    assert(!disk.includes(event.session));assert(!disk.includes('secret'));assert(!disk.includes('127.0.0.1'))
    assert.equal(report.wall.total,null)
  }finally{if(previous===undefined)delete process.env.ANALYTICS_ORIGINS;else process.env.ANALYTICS_ORIGINS=previous;await app.close();await fs.rm(temp,{recursive:true,force:true})}
})
