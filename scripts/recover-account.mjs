import {promises as fs} from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const state=path.resolve(process.env.ADMIN_STATE_DIR||'.local/admin')
const origin=new URL(process.env.ADMIN_PUBLIC_ORIGIN||'http://127.0.0.1:5174')
if(origin.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(origin.hostname))throw new Error('Recovery requires HTTPS')
try{await fs.access(path.join(state,'wall-writer.lock'));throw new Error('Stop the admin service first')}catch(e){if(e.code!=='ENOENT')throw e}
const file=path.join(state,'account.json'),account=JSON.parse(await fs.readFile(file,'utf8'))
const token=crypto.randomBytes(32).toString('base64url')
account.reset={hash:crypto.createHash('sha256').update(token).digest('hex'),expires:Date.now()+15*60000}
const temp=file+'.'+crypto.randomUUID()+'.tmp'
await fs.writeFile(temp,JSON.stringify(account),{mode:0o600});await fs.rename(temp,file)
console.log(`启动后台后，在你自己的浏览器打开以下一次性链接（15 分钟有效，切勿分享）：\n${origin.origin}/admin/#reset=${token}`)
