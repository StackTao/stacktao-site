import crypto from 'node:crypto'
import {createRemoteJWKSet,jwtVerify} from 'jose'
import {providers} from './login-settings.mjs'
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
const random=()=>crypto.randomBytes(32).toString('base64url')
const hash=s=>crypto.createHash('sha256').update(s).digest('base64url')
const fail=(ok)=>{if(!ok){const e=new Error('授权无效或已过期，请重新开始');e.status=400;throw e}}
export async function exchangeIdentity(id,config,flow,code,{request=fetch,keys=googleKeys}={}){
 const p=providers[id],params=new URLSearchParams({grant_type:'authorization_code',client_id:config.clientId,client_secret:config.clientSecret,code,redirect_uri:flow.redirect})
 if(p.pkce)params.set('code_verifier',flow.verifier)
 const headers={Accept:'application/json','Content-Type':'application/x-www-form-urlencoded','User-Agent':'StackTao-Studio'}
 if(id==='linuxdo'){headers.Authorization='Basic '+Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');params.delete('client_id');params.delete('client_secret')}
 const response=await request(p.token,{method:'POST',headers,body:params,redirect:'error',signal:AbortSignal.timeout(10000)});fail(response.ok)
 const token=await response.json();fail(!token.error)
 if(id==='google'){
  fail(typeof token.id_token==='string')
  const {payload}=await jwtVerify(token.id_token,keys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:config.clientId,algorithms:['RS256'],requiredClaims:['sub','iat','exp','nonce'],maxTokenAge:'10m'})
  fail(payload.nonce===flow.nonce&&typeof payload.sub==='string'&&payload.sub.length>0&&(!payload.azp||payload.azp===config.clientId))
  return payload.sub
 }
 fail(typeof token.access_token==='string'&&token.access_token.length>0)
 const profile=await request(p.user,{headers:{Authorization:`Bearer ${token.access_token}`,Accept:'application/json','User-Agent':'StackTao-Studio'},redirect:'error',signal:AbortSignal.timeout(10000)});fail(profile.ok)
 const user=await profile.json();fail((typeof user.id==='string'&&/^\d+$/.test(user.id))||(Number.isSafeInteger(user.id)&&user.id>0))
 if(id==='linuxdo')fail(user.active!==false&&user.silenced!==true)
 return String(user.id)
}
export function createOAuth(settings,accounts,{exchange=exchangeIdentity,now=Date.now}={}){
 const flows=new Map()
 return {
  begin(id,mode,origin){
   const p=providers[id],config=settings.provider(id);fail(p&&config?.enabled&&accounts.configured())
   fail(mode==='link'||accounts.bound(id,config.clientId))
   for(const [key,value] of flows)if(value.expires<now())flows.delete(key)
   fail(flows.size<200)
   const state=random(),browser=random(),verifier=random(),nonce=random(),redirect=`${origin}/api/v1/auth/oauth/${id}/callback`
   flows.set(state,{id,mode,browser:hash(browser),verifier,nonce,redirect,version:accounts.version(),revision:settings.revision(),expires:now()+5*60000})
   const url=new URL(p.authorize);url.search=new URLSearchParams({client_id:config.clientId,response_type:'code',redirect_uri:redirect,state,...(p.scope?{scope:p.scope}:{}),...(p.pkce?{code_challenge:hash(verifier),code_challenge_method:'S256'}:{}),...(id==='google'?{nonce,prompt:'select_account'}:{}),...(id==='github'?{allow_signup:'false'}:{})}).toString()
   return {url:url.href,browser}
  },
  async finish(id,state,browser,code){
   const flow=flows.get(state)
   fail(flow&&flow.id===id&&typeof browser==='string'&&hash(browser)===flow.browser)
   flows.delete(state)
   fail(flow.expires>now()&&flow.revision===settings.revision()&&flow.version===accounts.version()&&typeof code==='string'&&code.length>0&&code.length<=2048)
   const config=settings.provider(id);fail(config?.enabled)
   const subject=await exchange(id,config,flow,code)
   // Recheck after the network request; password/config changes cancel in-flight grants.
   fail(flow.revision===settings.revision())
   const version=await accounts.identity(id,config.clientId,subject,flow.mode,flow.version)
   return {version,mode:flow.mode,revision:flow.revision,provider:id}
  }
 }
}
