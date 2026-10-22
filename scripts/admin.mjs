import { createAdminServer } from './lib/admin-server.mjs'
const app=await createAdminServer()
const origin=await app.listen()
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit()))
console.log(`内容工作台：${origin}/admin/\n首次登录口令保存在：${app.ownerFile}\n发布输出：${app.output}\n请通过 HTTPS 访问生产后台；不要将管理口令提交到 Git。`)
