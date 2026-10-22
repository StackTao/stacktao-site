import {promises as fs} from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {promisify} from 'node:util'
const scrypt=promisify(crypto.scrypt)
const digest=value=>crypto.createHash('sha256').update(value).digest('hex')
const fail=(ok,message,status=400)=>{if(!ok){const error=new Error(message);error.status=status;throw error}}
const normalize=value=>String(value||'').trim().toLowerCase()
async function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){
 fail(typeof password==='string'&&password.length>=12&&password.length<=128,'密码需为 12–128 个字符，建议使用独特的长密码')
 const key=await scrypt(password,salt,64,{N:131072,r:8,p:1,maxmem:160*1024*1024})
 return {algorithm:'scrypt-v1',salt,hash:key.toString('hex')}
}
async function matches(password,stored){
 const valid=typeof password==='string'&&password.length>=12&&password.length<=128
 const result=await hashPassword(valid?password:'invalid-password-placeholder',stored?.salt||'00000000000000000000000000000000')
 return valid&&!!stored&&crypto.timingSafeEqual(Buffer.from(result.hash,'hex'),Buffer.from(stored.hash,'hex'))
}
export async function createAccounts(state,{sendReset}={}){
 const file=path.join(state,'account.json');let account=null,queue=Promise.resolve(),pending=0
 try{account=JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 const serial=fn=>{fail(pending<20,'认证请求过多，请稍后重试',429);pending++;const next=queue.then(fn).finally(()=>pending--);queue=next.catch(()=>{});return next}
 async function save(next){const temp=file+'.'+crypto.randomUUID()+'.tmp';await fs.writeFile(temp,JSON.stringify(next),{mode:0o600});await fs.rename(temp,file);account=next}
 const publicInfo=()=>account?{id:account.id,username:account.username,email:account.email,providers:account.identities.map(i=>i.provider),passwordChangedAt:account.passwordChangedAt}:null
 return {
  bound:(provider,clientId)=>!!account?.identities.some(i=>i.provider===provider&&i.clientId===clientId),
  verify:password=>serial(async()=>{fail(account&&await matches(password,account.password),'当前密码不正确',403);return account.version}),
  identity:(provider,clientId,subject,mode,version)=>serial(async()=>{
   fail(account&&account.version===version,'账号已更新，请重新授权',409)
   fail(typeof subject==='string'&&subject.length>0&&subject.length<=255,'身份无效')
   if(mode==='link')await save({...account,version:crypto.randomUUID(),identities:[...account.identities.filter(i=>i.provider!==provider),{provider,clientId,subject}]})
   else fail(account.identities.some(i=>i.provider===provider&&i.clientId===clientId&&i.subject===subject),'此第三方账号未绑定管理员',403)
   return account.version
  }),
  unlink:provider=>serial(async()=>{fail(account,'请先初始化账号',409);await save({...account,version:crypto.randomUUID(),identities:account.identities.filter(i=>i.provider!==provider)})}),
  configured:()=>!!account,
  version:()=>account?.version||'bootstrap',
  info:publicInfo,
  setup:data=>serial(async()=>{
   fail(!account,'管理员账号已经创建',409)
   const username=normalize(data.username),email=normalize(data.email)
   fail(/^[a-z0-9_.-]{3,64}$/.test(username),'账号使用 3–64 位英文、数字、点、横线或下划线')
   fail(email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'请填写有效的找回邮箱')
   await save({schema:1,id:crypto.randomUUID(),username,email,identities:[],password:await hashPassword(data.password),version:crypto.randomUUID(),passwordChangedAt:new Date().toISOString(),reset:null})
   return publicInfo()
  }),
  login:data=>serial(async()=>{
   const ok=await matches(data.password,account?.password)
   fail(ok&&normalize(data.username)===account?.username,'账号或密码不正确',401)
   return {version:account.version,name:account.username}
  }),
  change:data=>serial(async()=>{
   fail(account,'请先创建账号',409)
   fail(await matches(data.currentPassword,account.password),'当前密码不正确',403)
   fail(data.password!==data.currentPassword,'新密码不能与当前密码相同')
   await save({...account,password:await hashPassword(data.password),version:crypto.randomUUID(),reset:null,passwordChangedAt:new Date().toISOString()})
  }),
  forgot:(email,origin)=>serial(async()=>{
   if(!sendReset||!account||normalize(email)!==account.email||Date.now()-(account.resetRequestedAt||0)<60000)return
   const token=crypto.randomBytes(32).toString('base64url')
   await save({...account,reset:{hash:digest(token),expires:Date.now()+15*60000},resetRequestedAt:Date.now()})
   // Never expose tokens via an API response or logs; delivery stays server-side.
   Promise.resolve().then(()=>sendReset(account.email,`${origin}/admin/#reset=${token}`)).catch(()=>console.error('Password reset email delivery failed; check mail provider configuration.'))
  }),
  reset:data=>serial(async()=>{
   fail(account?.reset&&account.reset.expires>Date.now()&&typeof data.token==='string'&&digest(data.token)===account.reset.hash,'重置链接无效或已过期，请重新申请',400)
   await save({...account,password:await hashPassword(data.password),version:crypto.randomUUID(),identities:[],reset:null,passwordChangedAt:new Date().toISOString()})
  })
 }
}
export function resetMailer(config={apiKey:process.env.RESEND_API_KEY,from:process.env.MAIL_FROM}){
 if(!config.apiKey||!config.from)return null
 return async(email,url)=>{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:config.from,to:[email],subject:'重置 StackTao 后台密码',text:`请打开以下链接设置新密码（15 分钟内有效，仅可使用一次）：\n\n${url}\n\n如果不是你本人申请，请忽略此邮件。`}),signal:AbortSignal.timeout(10000)})
  if(!response.ok)throw new Error('Mail delivery failed')
 }
}
