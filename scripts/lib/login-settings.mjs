import {promises as fs} from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
export const providers={
 github:{name:'GitHub',authorize:'https://github.com/login/oauth/authorize',token:'https://github.com/login/oauth/access_token',user:'https://api.github.com/user',scope:'read:user',pkce:true,docs:'https://github.com/settings/developers'},
 linuxdo:{name:'Linux DO',authorize:'https://connect.linux.do/oauth2/authorize',token:'https://connect.linux.do/oauth2/token',user:'https://connect.linux.do/api/user',scope:'',pkce:false,docs:'https://connect.linux.do/'},
 google:{name:'Google',authorize:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',scope:'openid',pkce:true,docs:'https://console.cloud.google.com/auth/clients'}
}
const fail=(ok,message,status=400)=>{if(!ok){const e=new Error(message);e.status=status;throw e}}
export async function createLoginSettings(state){
 const file=path.join(state,'login-settings.json');let data={revision:crypto.randomUUID(),providers:{},mail:null}
 try{data=JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 let queue=Promise.resolve()
 return {
  revision:()=>data.revision,
  provider:id=>Object.hasOwn(providers,id)?data.providers[id]:null,
  mail:()=>data.mail===null?{enabled:!!(process.env.RESEND_API_KEY&&process.env.MAIL_FROM),apiKey:process.env.RESEND_API_KEY||'',from:process.env.MAIL_FROM||''}:data.mail,
  view(origin,accounts){return {revision:data.revision,providers:Object.entries(providers).map(([id,p])=>{const c=data.providers[id]||{};return {id,name:p.name,docs:p.docs,enabled:!!c.enabled,clientId:c.clientId||'',hasSecret:!!c.clientSecret,bound:accounts.bound(id,c.clientId),callback:`${origin}/api/v1/auth/oauth/${id}/callback`}}),mail:{enabled:!!this.mail().enabled,from:this.mail().from,hasSecret:!!this.mail().apiKey,source:data.mail===null?'environment':'settings'}}},
  save(id,input,revision){const task=queue.then(async()=>{
   fail(revision===data.revision,'配置已更新，请刷新后再保存',409)
   let next=structuredClone(data)
   if(id==='mail'){
    const old=this.mail(),from=String(input.from||'').trim(),apiKey=input.clearSecret?'':String(input.apiKey||old.apiKey||'').trim()
    fail(from.length<320&&!/[\r\n]/.test(from)&&apiKey.length<2048,'邮件配置无效')
    fail(!input.enabled||(/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)&&apiKey),'启用邮件找回前请填写发件邮箱和 API Key')
    next.mail={enabled:input.enabled===true,from,apiKey}
   }else{
    fail(Object.hasOwn(providers,id),'不支持的登录方式')
    const old=data.providers[id]||{},clientId=String(input.clientId||'').trim(),clientSecret=input.clearSecret?'':String(input.clientSecret||old.clientSecret||'').trim()
    fail(clientId.length<=512&&clientSecret.length<=2048&&!/[\r\n]/.test(clientId+clientSecret),'应用凭据无效')
    fail(!input.enabled||(clientId&&clientSecret),'启用前请填写 Client ID 和 Client Secret')
    next.providers[id]={enabled:input.enabled===true,clientId,clientSecret}
   }
   next.revision=crypto.randomUUID();const temp=file+'.'+next.revision+'.tmp'
   await fs.writeFile(temp,JSON.stringify(next),{mode:0o600});await fs.rename(temp,file);data=next
  });queue=task.catch(()=>{});return task}
 }
}
