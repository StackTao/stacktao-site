import {promises as fs} from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const state=path.resolve(process.env.ADMIN_STATE_DIR||'.local/admin')
try{await fs.access(path.join(state,'wall-writer.lock'));throw new Error('Stop the admin service before rotating its credential')}catch(e){if(e.code!=='ENOENT')throw e}
await fs.access(path.join(state,'owner-token'))
const temporary=path.join(state,'owner-token.new')
await fs.writeFile(temporary,'sta_owner_'+crypto.randomBytes(32).toString('base64url'),{flag:'wx',mode:0o600})
await fs.rename(temporary,path.join(state,'owner-token'))
console.log('管理口令已轮换。请通过服务器私下读取 owner-token，并重新启动后台。')
