import {test} from 'node:test'
import assert from 'node:assert/strict'
import {promises as fs} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {generateKeyPair,SignJWT} from 'jose'
import {createAdminServer} from '../scripts/lib/admin-server.mjs'
import {exchangeIdentity,createOAuth} from '../scripts/lib/oauth.mjs'
import {createAccounts} from '../scripts/lib/accounts.mjs'
import {createLoginSettings} from '../scripts/lib/login-settings.mjs'

test('private provider settings, password reauth, browser-bound callbacks and identity allowlist',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'oauth-server-')),state=path.join(root,'state'),source=path.join(root,'content')
 await fs.mkdir(source);await fs.writeFile(path.join(source,'content.config.json'),'{}')
 let subject='101'
 const app=await createAdminServer({source,state,oauth:{exchange:async()=>subject}}),base=await app.listen(0)
 const req=async(route,method='GET',body,cookie='',extra={})=>{const r=await fetch(base+'/api/v1'+route,{method,redirect:'manual',headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,location:r.headers.get('location'),cookies:r.headers.getSetCookie(),data:r.status===303?null:await r.json()}}
 const password='unique test password 123',bootstrap=(await fs.readFile(app.ownerFile,'utf8')).trim()
 const login=async()=>{const r=await req('/session','POST',{username:'admin',password});assert.equal(r.status,200);return r.cookies[0].split(';')[0]}
 const callback=async(id,start,cookie)=>{const state=new URL(start.data.url).searchParams.get('state');return req('/auth/oauth/'+id+'/callback?state='+state+'&code=test-code','GET',null,cookie)}
 try{
  await req('/auth/setup','POST',{username:'admin',email:'admin@example.test',password,token:bootstrap})
  let cookie=await login(),view=await req('/login-settings','GET',null,cookie)
  assert.equal(view.data.providers.length,3)
  assert.equal((await req('/login-settings')).status,401)
  const token=(await req('/tokens','POST',{name:'tool',scopes:['settings:write','content:read']},cookie)).data.token
  assert.equal((await req('/login-settings','GET',null,'',{Authorization:'Bearer '+token})).status,403)
  let revision=view.data.revision
  for(const id of ['github','linuxdo','google']){
   const data={enabled:true,clientId:id+'-client',clientSecret:'private-'+id,currentPassword:password}
   assert.equal((await req('/login-settings/'+id,'PUT',{...data,currentPassword:'bad'},cookie,{'If-Match':revision})).status,403)
   const result=await req('/login-settings/'+id,'PUT',data,cookie,{'If-Match':revision})
   assert.equal(result.status,200);assert(!JSON.stringify(result.data).includes('private-'));revision=result.data.revision
  }
  assert.deepEqual((await req('/auth/config')).data.providers,[])
  assert.equal((await req('/auth/oauth/github/start','POST',{mode:'link',currentPassword:password})).status,401)
  let start=await req('/auth/oauth/github/start','POST',{mode:'link',currentPassword:password},cookie)
  assert.equal(start.status,200);assert(start.cookies[0].includes('HttpOnly'));assert(start.cookies[0].includes('SameSite=Lax'))
  assert(new URL(start.data.url).searchParams.get('code_challenge'))
  const browser=start.cookies[0].split(';')[0]
  assert.equal((await callback('github',start,'stacktao_oauth=wrong')).location,'/admin/#oauth-error')
  let linked=await callback('github',start,browser);assert.equal(linked.location,'/admin/#login-settings')
  assert.equal((await callback('github',start,browser)).location,'/admin/#oauth-error')
  cookie=linked.cookies.find(c=>c.startsWith('stacktao_admin=')).split(';')[0]
  assert.equal((await req('/account','GET',null,cookie)).status,200)
  assert.deepEqual((await req('/auth/config')).data.providers,[{id:'github',name:'GitHub'}])
  start=await req('/auth/oauth/github/start','POST',{mode:'login'})
  subject='another-user'
  assert.equal((await callback('github',start,start.cookies[0].split(';')[0])).location,'/admin/#oauth-error')
  subject='101'
  start=await req('/auth/oauth/github/start','POST',{mode:'login'})
  const logged=await callback('github',start,start.cookies[0].split(';')[0]);assert.equal(logged.location,'/admin/')
  // Disabling/changing configuration cancels in-flight callbacks and OAuth sessions.
  cookie=await login()
  start=await req('/auth/oauth/github/start','POST',{mode:'login'})
  const settings=(await req('/login-settings','GET',null,cookie)).data
  const disabled=await req('/login-settings/github','PUT',{enabled:false,clientId:'github-client',currentPassword:password},cookie,{'If-Match':settings.revision})
  assert.equal(disabled.status,200)
  assert.equal((await callback('github',start,start.cookies[0].split(';')[0])).location,'/admin/#oauth-error')
  assert.equal((await req('/account','GET',null,logged.cookies.find(c=>c.startsWith('stacktao_admin=')).split(';')[0])).status,401)
  assert.equal((await req('/login-settings/github','PUT',{enabled:false,currentPassword:password},cookie,{'If-Match':settings.revision})).status,409)
  const mail=await req('/login-settings/mail','PUT',{enabled:true,from:'noreply@example.test',apiKey:'mail-private',currentPassword:password},cookie,{'If-Match':disabled.data.revision})
  assert.equal(mail.status,200);assert(!JSON.stringify(mail.data).includes('mail-private'))
  assert.equal((await req('/auth/config')).data.emailRecovery,true)
  assert.equal((await req('/account/identities/github','DELETE',{currentPassword:password},cookie)).status,200)
  assert.equal((await req('/account','GET',null,cookie)).status,401)
  const restored=await createLoginSettings(state)
  assert.equal(restored.provider('github').clientSecret,'private-github')
  assert.equal(restored.mail().apiKey,'mail-private')
 }finally{await app.close();await fs.rm(root,{recursive:true,force:true})}
})

test('provider exchanges verify Google signatures/claims and fetch GitHub/Linux DO immutable IDs',async()=>{
 const pair=await generateKeyPair('RS256'),other=await generateKeyPair('RS256')
 const flow={redirect:'https://blog.example.test/api/v1/auth/oauth/google/callback',verifier:'verifier',nonce:'nonce'}
 const config={clientId:'client',clientSecret:'secret'}
 async function jwt(overrides={},key=pair.privateKey){return new SignJWT({nonce:'nonce',...overrides}).setProtectedHeader({alg:'RS256'}).setIssuer(overrides.iss||'https://accounts.google.com').setAudience(overrides.aud||'client').setSubject('google-sub').setIssuedAt().setExpirationTime(overrides.exp||'5m').sign(key)}
 const requestFor=token=>async()=>new Response(JSON.stringify({id_token:token}),{status:200})
 assert.equal(await exchangeIdentity('google',config,flow,'code',{request:requestFor(await jwt()),keys:pair.publicKey}),'google-sub')
 for(const token of [await jwt({nonce:'wrong'}),await jwt({aud:'other'}),await jwt({iss:'https://evil.test'}),await jwt({exp:1}),await jwt({},other.privateKey)])await assert.rejects(exchangeIdentity('google',config,flow,'code',{request:requestFor(token),keys:pair.publicKey}))
 for(const id of ['github','linuxdo']){
  let calls=0
  const request=async(url,options)=>{calls++;if(calls===1){assert.equal(options.redirect,'error');if(id==='linuxdo')assert(options.headers.Authorization.startsWith('Basic '));else assert.equal(options.body.get('code_verifier'),'verifier');return new Response(JSON.stringify({access_token:'test-token'}))}assert.equal(options.headers.Authorization,'Bearer test-token');return new Response(JSON.stringify({id:42,active:true,silenced:false}))}
  assert.equal(await exchangeIdentity(id,config,flow,'code',{request}),'42');assert.equal(calls,2)
 }
})

test('expired flow cannot bind and password recovery removes external identities',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'oauth-expire-'))
 try{
  let link,now=Date.now()
  const accounts=await createAccounts(root,{sendReset:async(e,url)=>{link=url}}),settings=await createLoginSettings(root)
  await accounts.setup({username:'admin',email:'admin@example.test',password:'long unique password 123'})
  await settings.save('github',{enabled:true,clientId:'client',clientSecret:'secret'},settings.revision())
  const oauth=createOAuth(settings,accounts,{now:()=>now,exchange:async()=> '42'})
  const first=oauth.begin('github','link','https://blog.example.test');now+=6*60000
  await assert.rejects(oauth.finish('github',new URL(first.url).searchParams.get('state'),first.browser,'code'))
  const next=oauth.begin('github','link','https://blog.example.test');await oauth.finish('github',new URL(next.url).searchParams.get('state'),next.browser,'code')
  assert(accounts.bound('github','client'))
  await accounts.forgot('admin@example.test','https://blog.example.test');await new Promise(resolve=>setTimeout(resolve,10))
  await accounts.reset({token:link.split('#reset=')[1],password:'another long password 456'})
  assert(!accounts.bound('github','client'))
 }finally{await fs.rm(root,{recursive:true,force:true})}
})
