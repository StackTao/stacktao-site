import {test} from 'node:test'
import assert from 'node:assert/strict'
import {promises as fs} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createAdminServer} from '../scripts/lib/admin-server.mjs'
test('account setup, password auth, session revocation, email reset and scoped-token isolation',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'account-test-')),source=path.join(temp,'content'),state=path.join(temp,'state')
 await fs.mkdir(source);await fs.writeFile(path.join(source,'content.config.json'),'{}')
 let mail,app=await createAdminServer({source,state,sendReset:async(email,url)=>{mail={email,url}}}),base=await app.listen(0)
 const bootstrap=(await fs.readFile(app.ownerFile,'utf8')).trim(),password='a long test password 123',next='a different long password 456'
 const req=async(route,method='GET',body,cookie='',bearer='',origin=base)=>{
  const r=await fetch(base+'/api/v1'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(bearer?{Authorization:'Bearer '+bearer}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}
 }
 try{
  assert.equal((await req('/auth/config')).body.configured,false)
  const data={username:'owner',email:'owner@example.test',password,token:bootstrap}
  assert.equal((await req('/auth/setup','POST',{...data,token:'wrong'})).status,401)
  assert.equal((await req('/auth/setup','POST',{...data,password:'short'})).status,400)
  assert.equal((await req('/auth/setup','POST',data,'','','https://evil.example')).status,403)
  assert.equal((await req('/auth/setup','POST',data)).status,201)
  assert.equal((await req('/auth/setup','POST',data)).status,409)
  assert.equal((await req('/status','GET',null,'',bootstrap)).status,401)
  assert.equal((await req('/session','POST',{token:bootstrap})).status,401)
  assert.equal((await req('/session','POST',{username:'owner',password:'wrong'})).status,401)
  const a=await req('/session','POST',{username:'owner',password}),b=await req('/session','POST',{username:'owner',password})
  assert.equal(a.status,200);assert.equal((await req('/account','GET',null,a.cookie)).body.account.username,'owner')
  const apiToken=(await req('/tokens','POST',{name:'test',scopes:['content:read']},a.cookie)).body.token
  assert.equal((await req('/account/password','POST',{currentPassword:password,password:next},'',apiToken)).status,403)
  assert.equal((await req('/account/password','POST',{currentPassword:'wrong',password:next},a.cookie)).status,403)
  assert.equal((await req('/account/password','POST',{currentPassword:password,password:next},a.cookie)).status,200)
  for(const cookie of [a.cookie,b.cookie])assert.equal((await req('/status','GET',null,cookie)).status,401)
  assert.equal((await req('/session','POST',{username:'owner',password})).status,401)
  const fresh=await req('/session','POST',{username:'owner',password:next});assert.equal(fresh.status,200)
  const unknown=await req('/auth/forgot','POST',{email:'nobody@example.test'})
  const known=await req('/auth/forgot','POST',{email:'owner@example.test'})
  assert.deepEqual(known.body,unknown.body);assert.equal(known.status,200)
  await new Promise(resolve=>setTimeout(resolve,20));assert.equal(mail.email,'owner@example.test');assert(mail.url.startsWith(base+'/admin/#reset='))
  const token=mail.url.split('#reset=')[1],raw=await fs.readFile(path.join(state,'account.json'),'utf8')
  assert(!raw.includes(password));assert(!raw.includes(next));assert(!raw.includes(token))
  const results=await Promise.all([req('/auth/reset','POST',{token,password}),req('/auth/reset','POST',{token,password:next})])
  assert.deepEqual(results.map(r=>r.status).sort(),[200,400])
  assert.equal((await req('/status','GET',null,fresh.cookie)).status,401)
  assert.equal((await req('/status','GET',null,'',apiToken)).status,401)
  await app.close();app=await createAdminServer({source,state});base=await app.listen(0)
  assert.equal((await req('/auth/config')).body.configured,true)
  assert.equal((await req('/auth/forgot','POST',{email:'owner@example.test'})).status,503)
  assert.equal((await req('/session','POST',{username:'owner',password})).status,200)
  for(let i=0;i<20;i++)await req('/session','POST',{username:'owner',password:'bad'})
  assert.equal((await req('/session','POST',{username:'owner',password})).status,429)
 }finally{await app.close();await fs.rm(temp,{recursive:true,force:true})}
})

test('expired recovery link is rejected without changing password',async()=>{
 const {createAccounts}=await import('../scripts/lib/accounts.mjs')
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'expired-reset-'))
 try{
  let url
  const accounts=await createAccounts(root,{sendReset:async(email,link)=>{url=link}})
  await accounts.setup({username:'tester',email:'test@example.test',password:'long unique test password'})
  await accounts.forgot('test@example.test','https://blog.example.test')
  await new Promise(resolve=>setTimeout(resolve,10))
  const file=path.join(root,'account.json'),record=JSON.parse(await fs.readFile(file,'utf8'))
  record.reset.expires=Date.now()-1;await fs.writeFile(file,JSON.stringify(record))
  const reopened=await createAccounts(root)
  await assert.rejects(reopened.reset({token:url.split('#reset=')[1],password:'another unique password'}),/过期/)
  await reopened.login({username:'tester',password:'long unique test password'})
 }finally{await fs.rm(root,{recursive:true,force:true})}
})
