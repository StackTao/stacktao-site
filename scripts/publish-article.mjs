import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const args=process.argv.slice(2),file=args.find(a=>!a.startsWith('--'))
if(!file||!process.env.STACKTAO_TOKEN){console.error('用法：STACKTAO_TOKEN=... npm run publish:article -- article.md [--slug=my-post] [--publish] [--deploy]\n默认只创建草稿。STACKTAO_API 默认 http://127.0.0.1:5174');process.exit(1)}
const base=(process.env.STACKTAO_API||'http://127.0.0.1:5174').replace(/\/$/,''),headers={Authorization:'Bearer '+process.env.STACKTAO_TOKEN}
async function request(route,method,data,revision){const res=await fetch(base+'/api/v1'+route,{method,headers:{...headers,...(data instanceof Uint8Array?{'Content-Type':'application/octet-stream'}:{'Content-Type':'application/json'}),...(revision?{'If-Match':revision}:{})},body:data instanceof Uint8Array?data:JSON.stringify(data)});const result=await res.json();if(!res.ok)throw Error(result.error);return result}
try{
  const full=path.resolve(file),parsed=matter(await fs.readFile(full,'utf8'));let markdown=parsed.content
  // Relative article images are uploaded before creating a draft. Remote images are left unchanged.
  for(const match of [...markdown.matchAll(/!\[[^\]]*\]\((?:\.\/)?(images\/[^\s)]+)\)/g)]){
    const image=path.resolve(path.dirname(full),match[1]);if(!image.startsWith(path.dirname(full)+path.sep))throw Error('图片路径越界')
    const uploaded=await request('/media?name='+encodeURIComponent(path.basename(image)),'POST',await fs.readFile(image));markdown=markdown.replace(match[0],match[0].replace(/(?:\.\/)?images\/[^\s)]+/,uploaded.src))
  }
  const slugArg=args.find(a=>a.startsWith('--slug='))?.slice(7),slug=slugArg||parsed.data.slug
  let current=null
  if(slug){const response=await fetch(base+'/api/v1/posts/'+encodeURIComponent(slug),{headers});if(response.ok)current=await response.json();else if(response.status!==404)throw Error((await response.json()).error)}
  const payload={...parsed.data,date:parsed.data.date instanceof Date?parsed.data.date.toISOString().slice(0,10):parsed.data.date,markdown,...(slug?{slug}:{})}
  let result=await request(current?'/posts/'+slug:'/posts',current?'PUT':'POST',payload,current?.revision)
  console.log('草稿已保存：'+result.slug)
  if(args.includes('--publish')||args.includes('--deploy')){result=await request('/posts/'+result.slug+'/publish','POST',{},result.revision);console.log('静态站已构建：'+base+result.url)}
  if(args.includes('--deploy')){const deployed=await request('/deploy','POST',{});console.log(deployed.message+' '+deployed.commit)}
}catch(e){console.error(e.message);process.exitCode=1}
