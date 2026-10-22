import { createLoginSettings } from './login-settings.mjs'
import { createOAuth } from './oauth.mjs'
import { createAccounts, resetMailer } from './accounts.mjs'
import { createWallStore } from './wall-store.mjs'
import { createAnalytics } from './analytics.mjs'
import http from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import matter from 'gray-matter'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

const exec = promisify(execFile)
// Only enable behind the private Caddy network; Caddy overwrites this header.
const clientIP = req => process.env.TRUST_PROXY==='caddy' && typeof req.headers['x-stacktao-client-ip']==='string' ? req.headers['x-stacktao-client-ip'] : req.socket.remoteAddress
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const uid = () => crypto.randomUUID()
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const scopes = ['content:read', 'drafts:write', 'media:write', 'publish', 'albums:write', 'projects:write', 'settings:write', 'deploy']
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.avif':'image/avif', '.gif':'image/gif', '.svg':'image/svg+xml', '.woff2':'font/woff2' }
class Problem extends Error { constructor(status, message) { super(message); this.status = status } }
function check(ok, message, status=400) { if (!ok) throw new Problem(status,message) }
async function read(file, fallback=null) { try { return await fs.readFile(file,'utf8') } catch(e) { if(e.code==='ENOENT')return fallback;throw e } }
async function json(file, fallback) { const raw=await read(file);return raw===null?fallback:JSON.parse(raw) }
async function atomic(file, value) { await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});const temp=file+'.'+uid()+'.tmp';await fs.writeFile(temp,value,{mode:0o600});await fs.rename(temp,file) }
const writeJSON = (file,data) => atomic(file,JSON.stringify(data,null,2)+'\n')
function day(value) { const text=value instanceof Date?value.toISOString().slice(0,10):String(value||'');check(/^\d{4}-\d{2}-\d{2}$/.test(text)&&!Number.isNaN(Date.parse(text))&&new Date(text).toISOString().slice(0,10)===text,'日期格式应为 YYYY-MM-DD');return text }
function cleanPost(data) {
  check(data&&typeof data==='object','需要文章对象')
  const title=String(data.title||'').trim(), markdown=String(data.markdown||'')
  check(title.length>0&&title.length<=200,'标题需要 1–200 个字');check(markdown.length<=300000,'文章内容过长')
  check(!data.tags||Array.isArray(data.tags),'标签应为数组')
  return {title,markdown,date:day(data.date||new Date().toISOString().slice(0,10)),summary:String(data.summary||'').slice(0,1000),tags:(data.tags||[]).map(String).slice(0,20),cover:String(data.cover||''),discussion:String(data.discussion||''),lang:String(data.lang||'zh'),featured:!!data.featured}
}
async function within(root, relative) {
  const full=path.resolve(root,relative), rel=path.relative(root,full)
  check(!rel.startsWith('..')&&!path.isAbsolute(rel),'路径无效')
  const real=await fs.realpath(full), base=await fs.realpath(root)
  check(real===base||real.startsWith(base+path.sep),'不允许符号链接越界')
  return real
}
async function body(req,limit=1000000,raw=false) { const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw new Problem(413,'文件或请求过大');chunks.push(chunk)}const data=Buffer.concat(chunks);if(raw)return data;try{return JSON.parse(data.toString()||'{}')}catch{throw new Problem(400,'JSON 格式不正确')} }
function sniff(buffer) {
  if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return '.png'
  if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return '.jpg'
  if(/^GIF8[79]a/.test(buffer.subarray(0,6).toString()))return '.gif'
  if(buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP')return '.webp'
  if(buffer.subarray(4,8).toString()==='ftyp'&&['avif','avis'].includes(buffer.subarray(8,12).toString()))return '.avif'
  throw new Problem(415,'只接收 PNG、JPEG、WebP、GIF 或 AVIF 图片')
}

export async function createAdminServer(options={}) {
  const root=path.resolve(options.root||path.join(import.meta.dirname,'../..'))
  const source=path.resolve(options.source||process.env.CONTENT_DIR||path.join(root,'example-content'))
  const state=path.resolve(options.state||process.env.ADMIN_STATE_DIR||path.join(root,'.local/admin'))
  const output=path.resolve(options.output||process.env.ADMIN_OUTPUT_DIR||path.join(root,'dist'))
  await fs.access(path.join(source,'content.config.json'))
  await fs.mkdir(state,{recursive:true,mode:0o700})
  const ownerFile=path.join(state,'owner-token')
  let owner=await read(ownerFile)
  if(!owner){owner='sta_owner_'+crypto.randomBytes(32).toString('base64url');await atomic(ownerFile,owner)}
  owner=owner.trim()
  const loginSettings=await createLoginSettings(state)
  const mailAvailable=()=>!!(options.sendReset||loginSettings.mail().enabled)
  const mailer=async(...args)=>{const send=options.sendReset||(loginSettings.mail().enabled?resetMailer(loginSettings.mail()):null);if(send)await send(...args)}
  const accounts=await createAccounts(state,{sendReset:mailer})
  const oauth=createOAuth(loginSettings,accounts,options.oauth)
  const sessions=new Map(), attempts=new Map(), recoveryAttempts=new Map()
  function limit(map,key,max,windowMs){const now=Date.now();for(const [id,item] of map)if(item.until<now)map.delete(id);const rate=map.get(key)||{count:0,until:now+windowMs};check(map.size<10000||map.has(key),'请求过多，请稍后重试',429);rate.count++;map.set(key,rate);check(rate.count<=max,'尝试过于频繁，请稍后重试',429)}
  let queue=Promise.resolve(), origin=options.origin||process.env.ADMIN_PUBLIC_ORIGIN||'', building=false
  const serial=fn=>{const next=queue.then(fn);queue=next.catch(()=>{});return next}
  const draftFile=id=>path.join(state,'drafts',id+'.json')
  const validSlug=id=>check(slugPattern.test(id)&&id.length<=100,'链接名只允许小写英文、数字和连字符')
  async function articleFiles() {
    const list=[]
    async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(entry.isSymbolicLink())continue;const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(entry.name==='index.md')list.push(file)}}
    await walk(path.join(source,'posts'));return list
  }
  async function originals() {
    const records=new Map()
    for(const file of await articleFiles()) {
      const raw=await read(file), parsed=matter(raw), id=String(parsed.data.slug||path.basename(path.dirname(file)))
      check(!records.has(id),'发现重复文章链接名：'+id,409)
      records.set(id,{file,raw,revision:hash(raw),data:{...parsed.data,date:day(parsed.data.date),markdown:parsed.content}})
    }
    return records
  }
  async function post(id) {
    validSlug(id)
    const original=(await originals()).get(id), draft=await json(draftFile(id),null)
    if(!original&&!draft)throw new Problem(404,'文章不存在')
    return {...cleanPost(draft?.data||original.data),slug:id,revision:hash(JSON.stringify([original?.revision||null,draft])),published:!!original&&!original.data.draft,hasDraft:!!draft||!!original?.data.draft,savedAt:draft?.savedAt||null,base:draft?.base??original?.revision??null}
  }
  function requireRevision(req,current) {check(req.headers['if-match']===current.revision,'内容已被其他窗口或 AI 修改，请重新打开后再保存。',409)}
  async function record(event) {
    const events=await json(path.join(state,'events.json'),[])
    const entry={id:uid(),at:new Date().toISOString(),...event}
    await fs.appendFile(path.join(state,'release-history.jsonl'),JSON.stringify(entry)+'\n',{mode:0o600})
    await writeJSON(path.join(state,'events.json'),[entry,...events].slice(0,100))
  }
  async function build() {
    building=true
    const stage=output+'.building-'+uid(), previous=output+'.previous'
    try {
      await fs.mkdir(path.dirname(output),{recursive:true});await fs.cp(path.join(root,'public'),stage,{recursive:true})
      await fs.copyFile(path.join(root,'index.html'),path.join(stage,'index.html'))
      await exec(process.execPath,[path.join(root,'scripts/generate-content.mjs'),'--source='+source,'--out='+path.join(stage,'content'),'--script='+path.join(stage,'js/content-generated.js')],{cwd:root,maxBuffer:2000000,timeout:120000})
      await fs.rm(previous,{recursive:true,force:true})
      let moved=false
      try{await fs.rename(output,previous);moved=true}catch(e){if(e.code!=='ENOENT')throw e}
      try{await fs.rename(stage,output)}catch(e){if(moved)await fs.rename(previous,output);throw e}
    } finally {building=false;await fs.rm(stage,{recursive:true,force:true})}
  }
  async function publishFile(file, raw, event) {
    const previous=await read(file)
    const historyId=uid()
    await writeJSON(path.join(state,'history',historyId+'.json'),{file:path.relative(source,file),before:previous,after:raw,at:new Date().toISOString()})
    await atomic(file,raw)
    try{await build()}catch(e){if(previous===null)await fs.rm(file,{force:true});else await atomic(file,previous);await record({...event,status:'failed',message:'构建失败，线上产物未替换，源文件已恢复。'});throw new Problem(422,'构建失败，已恢复原内容；草稿仍在。'+(e.stderr||e.message).slice(0,500))}
    await record({...event,status:'built',historyId})
  }
  async function auth(req) {
    const bearer=/^Bearer (.+)$/i.exec(req.headers.authorization||'')?.[1]
    if(bearer){if(!accounts.configured()&&hash(bearer)===hash(owner))return {name:'owner',admin:true,scopes};const tokens=await json(path.join(state,'tokens.json'),[]),token=tokens.find(t=>t.hash===hash(bearer)&&Date.parse(t.expiresAt)>Date.now());if(token)return {...token,admin:false};throw new Problem(401,'访问令牌无效或已过期')}
    const session=/\bstacktao_admin=([^;]+)/.exec(req.headers.cookie||'')?.[1],entry=sessions.get(session)
    if(entry?.expires>Date.now()&&entry.version===accounts.version()&&(!entry.provider||entry.revision===loginSettings.revision()))return {name:accounts.info()?.username||'owner',admin:true,scopes}
    throw new Problem(401,'请先登录工作台')
  }
  function can(actor,scope) {check(actor.admin||actor.scopes.includes(scope),'此令牌没有 '+scope+' 权限',403)}
  function admin(actor){check(actor.admin,'该操作仅限站点管理员',403)}
  function issueSession(res,version,extra={}){
    const session=crypto.randomBytes(32).toString('base64url')
    for(const [id,entry] of sessions)if(entry.expires<Date.now())sessions.delete(id)
    check(sessions.size<1000,'登录会话过多，请稍后重试',429)
    sessions.set(session,{expires:Date.now()+8*3600000,version,...extra})
    return `stacktao_admin=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${origin.startsWith('https:')?'; Secure':''}`
  }
  const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
  async function staticFile(res,file,privateFile=false) {const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':privateFile?'no-store':'no-cache'});res.end(data)}
  const wallStore=await createWallStore(state),wallRates=new Map()
  const analytics=createAnalytics({source,state,originals,writeJSON}),trackingRates=new Map()
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY')
    try {
      const expected=new URL(origin),url=new URL(req.url,origin),pathname=decodeURIComponent(url.pathname)
      check(req.headers.host===expected.host,'Host 不匹配',403)
      const callback=/^\/api\/v1\/auth\/oauth\/(github|linuxdo|google)\/callback$/.exec(pathname)
      if(callback&&req.method==='GET'){
        const clear=`stacktao_oauth=; HttpOnly; SameSite=Lax; Path=/api/v1/auth/oauth/; Max-Age=0${expected.protocol==='https:'?'; Secure':''}`
        res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer')
        try{
          limit(attempts,clientIP(req)+':oauth',30,60000)
          const browser=/\bstacktao_oauth=([^;]+)/.exec(req.headers.cookie||'')?.[1]
          const result=await oauth.finish(callback[1],url.searchParams.get('state'),browser,url.searchParams.get('code'))
          res.setHeader('Set-Cookie',[clear,issueSession(res,result.version,{provider:result.provider,revision:result.revision})])
          res.writeHead(303,{Location:result.mode==='link'?'/admin/#login-settings':'/admin/'});return res.end()
        }catch{res.setHeader('Set-Cookie',clear);res.writeHead(303,{Location:'/admin/#oauth-error'});return res.end()}
      }

      if(pathname.startsWith('/api/wall')){
        const allowed=[origin,...(process.env.WALL_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)]
        if(['127.0.0.1','localhost'].includes(expected.hostname))allowed.push('http://127.0.0.1:5173','http://localhost:5173')
        if(req.headers.origin){check(allowed.includes(req.headers.origin),'留言墙来源未授权',403);res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin')}
        if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.writeHead(204);return res.end()}
        const mutation=req.method!=='GET';if(mutation)check(allowed.includes(req.headers.origin),'留言操作需要可信来源',403)
        const now=Date.now();for(const [key,r] of wallRates)if(r.until<now)wallRates.delete(key)
        const key=clientIP(req)+':'+mutation,rate=wallRates.get(key)||{count:0,until:now+60000};check(wallRates.size<10000||wallRates.has(key),'请求过多',429);rate.count++;wallRates.set(key,rate);check(rate.count<=(mutation?600:900),'操作频繁，请稍后重试',429)
        if(pathname==='/api/wall/session'&&req.method==='POST')return send(res,201,{token:crypto.randomBytes(32).toString('hex')})
        const token=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization||'')?.[1],visitor=token?wallStore.owner(token):''
        if(pathname==='/api/wall'&&req.method==='GET'){const section=Number(url.searchParams.get('section')||0);check(Number.isInteger(section)&&section>=0,'墙面无效');return send(res,200,wallStore.snapshot(section,visitor))}
        check(visitor,'请先建立访客身份',401);const p=await body(req,1000000)
        if(pathname==='/api/wall/leases'&&req.method==='POST')return send(res,200,await wallStore.reserve(visitor,p))
        if(pathname==='/api/wall/notes'&&req.method==='POST')return send(res,200,await wallStore.put(visitor,p))
        if(pathname==='/api/wall/walls'&&req.method==='POST')return send(res,201,await wallStore.newWall())
        const lease=/^\/api\/wall\/leases\/([a-zA-Z0-9-]+)$/.exec(pathname);if(lease&&req.method==='DELETE')return send(res,200,await wallStore.release(visitor,lease[1]))
        const restore=/^\/api\/wall\/notes\/([a-zA-Z0-9-]+)\/restore$/.exec(pathname);if(restore&&req.method==='POST')return send(res,200,await wallStore.restore(restore[1],visitor))
        const note=/^\/api\/wall\/notes\/([a-zA-Z0-9-]+)$/.exec(pathname);if(note&&req.method==='DELETE')return send(res,200,await wallStore.remove(note[1],visitor,p.revision))
        throw new Problem(404,'留言接口不存在')
      }
      if(pathname==='/api/v1/collect'){
        const allowed=(process.env.ANALYTICS_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)
        check(allowed.includes(req.headers.origin),'访问统计未启用或来源未授权',403)
        res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin')
        if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.writeHead(204);return res.end()}
        check(req.method==='POST','仅支持 POST',405)
        const now=Date.now();for(const [key,r] of trackingRates)if(r.until<now)trackingRates.delete(key)
        const key=clientIP(req),rate=trackingRates.get(key)||{count:0,until:now+60000};check(trackingRates.size<10000||trackingRates.has(key),'请求过多',429);rate.count++;trackingRates.set(key,rate);check(rate.count<=120,'请求过多',429)
        const data=await body(req,2048);check(await serial(()=>analytics.collect(data)),'统计事件无效',400);return send(res,202,{ok:true})
      }
      if(req.headers.origin)check(req.headers.origin===origin,'不允许跨站请求',403)
      const method=req.method, mutation=!['GET','HEAD'].includes(method)
      if(mutation&&!req.headers.authorization)check(req.headers.origin===origin,'写入请求必须来自本站',403)
      const oauthStart=/^\/api\/v1\/auth\/oauth\/(github|linuxdo|google)\/start$/.exec(pathname)
      if(oauthStart&&method==='POST'){
        limit(attempts,clientIP(req)+':oauth-start',10,60000)
        const data=await body(req,4096);check(['login','link'].includes(data.mode),'授权模式无效')
        if(data.mode==='link'){admin(await auth(req));await accounts.verify(data.currentPassword)}
        const flow=oauth.begin(oauthStart[1],data.mode,origin)
        res.setHeader('Set-Cookie',`stacktao_oauth=${flow.browser}; HttpOnly; SameSite=Lax; Path=/api/v1/auth/oauth/; Max-Age=300${expected.protocol==='https:'?'; Secure':''}`)
        return send(res,200,{url:flow.url})
      }
      if(pathname==='/api/v1/auth/config'&&method==='GET')return send(res,200,{configured:accounts.configured(),emailRecovery:mailAvailable(),providers:loginSettings.view(origin,accounts).providers.filter(p=>p.enabled&&p.bound).map(({id,name})=>({id,name}))})
      if(pathname==='/api/v1/auth/setup'&&method==='POST'){
        limit(attempts,clientIP(req),10,60000)
        const data=await body(req,4096);check(!accounts.configured(),'管理员账号已经创建',409);check(hash(String(data.token||''))===hash(owner),'初始化凭据不正确',401)
        await accounts.setup(data);sessions.clear();return send(res,201,{ok:true})
      }
      if(pathname==='/api/v1/auth/forgot'&&method==='POST'){
        limit(recoveryAttempts,clientIP(req)+':forgot',5,15*60000)
        const data=await body(req,2048)
        check(mailAvailable(),'尚未配置邮件找回，请联系服务器管理员',503)
        await Promise.all([accounts.forgot(data.email,origin),new Promise(resolve=>setTimeout(resolve,300))])
        return send(res,200,{message:'如果邮箱与管理员账号匹配，会收到重置邮件。请检查收件箱及垃圾邮件。'})
      }
      if(pathname==='/api/v1/auth/reset'&&method==='POST'){
        limit(recoveryAttempts,clientIP(req)+':reset',10,15*60000)
        await serial(async()=>{await accounts.reset(await body(req,4096));sessions.clear();await writeJSON(path.join(state,'tokens.json'),[])})
        return send(res,200,{ok:true})
      }
      if(pathname==='/api/v1/session'&&method==='POST') {
        limit(attempts,clientIP(req),20,60000)
        const data=await body(req,4096)
        let version
        if(accounts.configured())version=(await accounts.login(data)).version
        else {check(hash(String(data.token||''))===hash(owner),'请先初始化管理员账号',401);version=accounts.version()}
        res.setHeader('Set-Cookie',issueSession(res,version));return send(res,200,{ok:true})
      }
      if(pathname.startsWith('/api/')) {
        const actor=await auth(req)
        if(pathname==='/api/v1/login-settings'&&method==='GET'){admin(actor);return send(res,200,loginSettings.view(origin,accounts))}
        const loginSetting=/^\/api\/v1\/login-settings\/(github|linuxdo|google|mail)$/.exec(pathname)
        if(loginSetting&&method==='PUT'){
          admin(actor);limit(attempts,clientIP(req)+':security',10,60000)
          const data=await body(req,8192);await accounts.verify(data.currentPassword)
          await loginSettings.save(loginSetting[1],data,req.headers['if-match'])
          return send(res,200,loginSettings.view(origin,accounts))
        }
        const unlink=/^\/api\/v1\/account\/identities\/(github|linuxdo|google)$/.exec(pathname)
        if(unlink&&method==='DELETE'){
          admin(actor);limit(attempts,clientIP(req)+':security',10,60000)
          await accounts.verify((await body(req,4096)).currentPassword);await accounts.unlink(unlink[1]);sessions.clear()
          return send(res,200,{ok:true})
        }

        if(pathname==='/api/v1/account'&&method==='GET'){admin(actor);return send(res,200,{account:accounts.info(),emailRecovery:mailAvailable()})}
        if(pathname==='/api/v1/account/password'&&method==='POST'){
          admin(actor);limit(attempts,clientIP(req)+':change',10,60000)
          await accounts.change(await body(req,4096));sessions.clear();return send(res,200,{ok:true})
        }
        if(pathname==='/api/v1/session'&&method==='DELETE'){const cookie=/\bstacktao_admin=([^;]+)/.exec(req.headers.cookie||'')?.[1];sessions.delete(cookie);res.setHeader('Set-Cookie','stacktao_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(res,200,{ok:true})}
        if(method==='GET') {
          can(actor,'content:read')
          if(pathname==='/api/v1/wall'){admin(actor);const page=Number(url.searchParams.get('page')||1);check(Number.isInteger(page)&&page>0,'页码无效');return send(res,200,wallStore.list({page,type:url.searchParams.get('type')||''}))}
          if(pathname==='/api/v1/analytics'){const days=Number(url.searchParams.get('days')||30);check([7,30,90].includes(days),'统计范围应为 7、30 或 90 天');return send(res,200,{...await analytics.report(days),wall:{mode:'shared',...wallStore.stats()},collectionEnabled:!!process.env.ANALYTICS_ORIGINS})}
          if(pathname==='/api/v1/status')return send(res,200,{name:actor.name,admin:actor.admin,building,mode:'local-build',source:path.basename(source),preview:'/site/',scopes:actor.scopes,gitDeploy:process.env.ADMIN_GIT_PUBLISH==='1'})
          if(pathname==='/api/v1/posts'){const ids=new Set((await originals()).keys());for(const name of await fs.readdir(path.join(state,'drafts')).catch(()=>[]))if(name.endsWith('.json'))ids.add(name.slice(0,-5));const all=await Promise.all([...ids].map(post));return send(res,200,all.sort((a,b)=>b.date.localeCompare(a.date)))}
          const getPost=/^\/api\/v1\/posts\/([a-z0-9-]+)$/.exec(pathname);if(getPost)return send(res,200,await post(getPost[1]))
          if(pathname==='/api/v1/media')return send(res,200,await json(path.join(state,'media.json'),[]))
          const media=/^\/api\/v1\/media\/([a-f0-9-]+\.(?:png|jpg|webp|gif|avif))\/file$/.exec(pathname);if(media)return await staticFile(res,await within(source,'media/'+media[1]),true)
          const asset=/^\/api\/v1\/posts\/([a-z0-9-]+)\/assets\/(.+)$/.exec(pathname);if(asset){const original=(await originals()).get(asset[1]);check(original,'文章不存在',404);const file=await within(path.join(path.dirname(original.file),'images'),asset[2]);check(/^image\//.test(mime[path.extname(file)]||''),'不是图片',400);return await staticFile(res,file,true)}
          if(pathname==='/api/v1/collections'){const albums=[];for(const dir of await fs.readdir(path.join(source,'albums'),{withFileTypes:true}).catch(()=>[]))if(dir.isDirectory()){const data=await json(path.join(source,'albums',dir.name,'album.json'),null);if(data)albums.push({...data,revision:hash(await read(path.join(source,'albums',dir.name,'album.json')))})}return send(res,200,albums.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))))}
          if(pathname==='/api/v1/projects'||pathname==='/api/v1/settings'){const file=path.join(source,pathname.endsWith('projects')?'projects/projects.json':'content.config.json'),raw=await read(file,'{}');return send(res,200,{data:JSON.parse(raw),revision:hash(raw)})}
          if(pathname==='/api/v1/events'){admin(actor);return send(res,200,await json(path.join(state,'events.json'),[]))}
          if(pathname==='/api/v1/tokens'){admin(actor);return send(res,200,(await json(path.join(state,'tokens.json'),[])).map(({hash,...item})=>item))}
          throw new Problem(404,'接口不存在')
        }
        if(pathname==='/api/v1/preview'&&method==='POST'){
          can(actor,'drafts:write');const data=await body(req)
          let html=sanitizeHtml(marked.parse(String(data.markdown||'')),{allowedTags:sanitizeHtml.defaults.allowedTags.concat(['img','h1','h2','details','summary']),allowedAttributes:{...sanitizeHtml.defaults.allowedAttributes,img:['src','alt','title'],code:['class']},allowedSchemes:['https','http','mailto'],transformTags:{img:(tag,attrs)=>{let src=attrs.src||'';if(/^media\/[a-f0-9-]+\.(png|jpg|webp|gif|avif)$/.test(src))src='/api/v1/'+src+'/file';else if(/^(\.\/)?images\//.test(src)&&slugPattern.test(data.slug||''))src='/api/v1/posts/'+data.slug+'/assets/'+src.replace(/^(\.\/)?images\//,'');return {tagName:tag,attribs:{...attrs,src}}}}})
          return send(res,200,{html})
        }
        const payload=await body(req,pathname==='/api/v1/media'?12*1024*1024:1000000,pathname==='/api/v1/media')
        const deleteWall=/^\/api\/v1\/wall\/([a-zA-Z0-9-]+)$/.exec(pathname);if(deleteWall&&method==='DELETE'){admin(actor);return send(res,200,await wallStore.remove(deleteWall[1],'',payload.revision,true))}
        return await serial(async()=>{
          if(pathname==='/api/v1/deploy'&&method==='POST'){
            can(actor,'deploy');check(process.env.ADMIN_GIT_PUBLISH==='1','未启用 Git 自动上线，请先配置 ADMIN_GIT_PUBLISH=1',409)
            await build()
            const git=async args=>(await exec('git',['-C',source,...args],{timeout:120000,maxBuffer:1000000})).stdout.trim()
            check(await git(['branch','--show-current'])==='main','自动上线只允许从 main 分支推送',409)
            const repo=await git(['rev-parse','--show-toplevel']),relative=path.relative(await fs.realpath(repo),await fs.realpath(source))
            const paths=['posts','albums','media','projects','content.config.json'].map(p=>path.join(relative,p)).filter(p=>p&&!p.startsWith('..'))
            const present=[];for(const p of paths)if(await fs.stat(path.join(repo,p)).catch(()=>null)||(await exec('git',['-C',repo,'ls-files','--',p])).stdout.trim())present.push(p)
            check(present.length>0,'内容目录不在当前 Git 仓库内，无法同步',409)
            await exec('git',['-C',repo,'add','--',...present])
            const changed=(await exec('git',['-C',repo,'diff','--cached','--name-only','-z','--',...present])).stdout.split('\0').filter(Boolean)
            if(changed.length)await exec('git',['-C',repo,'commit','--only','-m','Publish blog content','--',...changed],{timeout:120000})
            try{await git(['push','origin','main'])}catch{await record({kind:'deploy',status:'failed',actor:actor.name,title:'Git 同步失败',message:'本地提交保留，可修复 Git 连接后重新同步。'});throw new Problem(502,'推送失败，本地提交仍在。请检查 Git 远端及认证后重试。')}
            const commit=await git(['rev-parse','--short','HEAD']);await record({kind:'deploy',status:'pushed',actor:actor.name,title:'已推送内容',commit});return send(res,200,{commit,status:'pushed',message:'已推送 origin/main。线上部署结果请查看 GitHub Actions。'})
          }
          if(pathname==='/api/v1/posts'&&method==='POST'){
            can(actor,'drafts:write');const id=payload.slug||'post-'+new Date().toISOString().slice(0,10)+'-'+crypto.randomBytes(3).toString('hex');validSlug(id)
            check(!(await originals()).has(id)&&!(await read(draftFile(id))),'此链接名已存在，请修改或更新已有草稿',409)
            await writeJSON(draftFile(id),{data:cleanPost(payload),base:null,savedAt:new Date().toISOString()});return send(res,201,await post(id))
          }
          const edit=/^\/api\/v1\/posts\/([a-z0-9-]+)(?:\/(publish|unpublish))?$/.exec(pathname)
          if(edit){const id=edit[1],action=edit[2];can(actor,action?'publish':'drafts:write');const current=await post(id);requireRevision(req,current)
            if(method==='PUT'&&!action){await writeJSON(draftFile(id),{data:cleanPost(payload),base:current.base,savedAt:new Date().toISOString()});return send(res,200,await post(id))}
            if(method==='POST'&&action){const original=(await originals()).get(id);check(!original||current.base===original.revision,'源文件已在外部修改，请先合并修改再发布',409);check(current.markdown.trim()||action==='unpublish','正文不能为空')
              const file=original?.file||path.join(source,'posts',current.date.slice(0,4),id,'index.md')
              const data=action==='unpublish'?original?.data:cleanPost(current);check(data,'还没有已发布的文章',409)
              const {markdown,...frontmatter}=data,{markdown:oldMarkdown,...oldMetadata}=original?.data||{},raw=matter.stringify(markdown,{...oldMetadata,...frontmatter,slug:id,draft:action==='unpublish',updated:new Date().toISOString().slice(0,10)})
              await publishFile(file,raw,{kind:action,slug:id,title:current.title,actor:actor.name})
              if(action==='publish')await fs.rm(draftFile(id),{force:true});else {const draft=await json(draftFile(id),null);if(draft){draft.base=hash(raw);await writeJSON(draftFile(id),draft)}}
              return send(res,200,{...await post(id),build:'ready',url:'/site/#/posts/'+id,message:'静态站已构建。GitHub Pages 需提交并推送内容后上线。'})
            }
          }
          if(pathname==='/api/v1/media'&&method==='POST'){
            can(actor,'media:write');const ext=sniff(payload),id=uid()+ext;await fs.mkdir(path.join(source,'media'),{recursive:true});await fs.writeFile(path.join(source,'media',id),payload,{flag:'wx'});const item={id,name:String(url.searchParams.get('name')||id).slice(0,180),bytes:payload.length,src:'media/'+id,url:'/api/v1/media/'+id+'/file',createdAt:new Date().toISOString()};const all=await json(path.join(state,'media.json'),[]);await writeJSON(path.join(state,'media.json'),[item,...all]);return send(res,201,item)
          }
          if(pathname==='/api/v1/collections'&&method==='PUT'){
            can(actor,'albums:write');const id=String(payload.slug||'');validSlug(id);check(String(payload.title||'').trim(),'请填写相册名称');check(Array.isArray(payload.photos)&&payload.photos.length<=500,'照片列表无效')
            for(const photo of payload.photos)check(typeof photo.src==='string'&&(/^(?:https?:\/\/|media\/|images\/)/.test(photo.src))&&!photo.src.includes('..'),'照片路径无效')
            const file=path.join(source,'albums',id,'album.json'),old=await read(file);check(req.headers['if-match']===(old?hash(old):'new'),'相册已更改，请刷新后再编辑',409)
            const album={title:String(payload.title),slug:id,date:day(payload.date),description:String(payload.description||''),photos:payload.photos.map(p=>({src:p.src,alt:String(p.alt||''),place:String(p.place||''),date:String(p.date||'')}))};await publishFile(file,JSON.stringify(album,null,2)+'\n',{kind:'album',slug:id,title:album.title,actor:actor.name});return send(res,200,{ok:true})
          }
          if((pathname==='/api/v1/projects'||pathname==='/api/v1/settings')&&method==='PUT'){
            const project=pathname.endsWith('projects');can(actor,project?'projects:write':'settings:write');const file=path.join(source,project?'projects/projects.json':'content.config.json'),old=await read(file,'{}');check(req.headers['if-match']===hash(old),'配置已被修改，请刷新后再试',409)
            check(payload&&typeof payload==='object'&&!Array.isArray(payload),'配置格式无效');if(project)check(Array.isArray(payload.groups),'项目需要分组');else check(payload.site&&typeof payload.site.name==='string','请填写站点名称')
            await publishFile(file,JSON.stringify(payload,null,2)+'\n',{kind:project?'projects':'settings',title:project?'项目目录':'站点设置',actor:actor.name});return send(res,200,{data:payload,revision:hash(JSON.stringify(payload,null,2)+'\n')})
          }
          if(pathname==='/api/v1/tokens'&&method==='POST'){
            admin(actor);check(Array.isArray(payload.scopes)&&payload.scopes.length&&payload.scopes.every(s=>scopes.includes(s)),'权限无效');check(String(payload.name||'').trim(),'请填写令牌名称')
            const secret='sta_'+crypto.randomBytes(32).toString('base64url'),token={id:uid(),name:String(payload.name).slice(0,80),scopes:[...new Set(payload.scopes)],expiresAt:new Date(Date.now()+90*86400000).toISOString(),createdAt:new Date().toISOString(),hash:hash(secret)};const all=await json(path.join(state,'tokens.json'),[]);await writeJSON(path.join(state,'tokens.json'),[token,...all]);const {hash:_,...safe}=token;return send(res,201,{...safe,token:secret})
          }
          const revoke=/^\/api\/v1\/tokens\/([a-f0-9-]+)$/.exec(pathname);if(revoke&&method==='DELETE'){admin(actor);await writeJSON(path.join(state,'tokens.json'),(await json(path.join(state,'tokens.json'),[])).filter(t=>t.id!==revoke[1]));return send(res,200,{ok:true})}
          throw new Problem(404,'接口不存在')
        })
      }
      if(method!=='GET'&&method!=='HEAD')throw new Problem(405,'不支持此方法')
      if(pathname.startsWith('/site/'))return await staticFile(res,await within(output,pathname.slice(6)||'index.html'))
      if(pathname==='/') {res.writeHead(302,{Location:'/admin/'});return res.end()}
      if(pathname.startsWith('/admin/')){
        res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: http: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        return await staticFile(res,await within(path.join(root,'admin'),pathname.slice(7)||'index.html'),true)
      }
      throw new Problem(404,'页面不存在')
    } catch(e){if(!res.headersSent)send(res,e.status||(e.code==='ENOENT'?404:500),{error:e.status?e.message:e.code==='ENOENT'?'文件不存在':'操作失败，请查看服务日志'});else res.end();if(!e.status&&e.code!=='ENOENT')console.error(e.message)}
  })
  return {server,ownerFile,source,output,state,async listen(port=Number(process.env.ADMIN_PORT||5174),host=process.env.ADMIN_HOST||'127.0.0.1'){
    check(['127.0.0.1','localhost','::1'].includes(host)||/^https:\/\//.test(origin),'对外监听必须配置 HTTPS 的 ADMIN_PUBLIC_ORIGIN')
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>{server.removeListener('error',reject);resolve()})});if(!origin)origin=`http://${host==='::1'?'[::1]':host}:${server.address().port}`;return origin
  },async close(){await new Promise(resolve=>server.close(resolve));await wallStore.close()}}
}
