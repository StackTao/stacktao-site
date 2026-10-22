import { createAdminServer } from './lib/admin-server.mjs'
const app=await createAdminServer()
const origin=await app.listen()
console.log(`内容工作台：${origin}/admin/\n首次登录口令保存在：${app.ownerFile}\n发布输出：${app.output}\n默认只监听本机；不要将管理口令提交到 Git。`)
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit()))
