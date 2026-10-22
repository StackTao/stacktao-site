import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const readJSON=async(file,fallback)=>{try{return JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code==='ENOENT')return fallback;throw e}}
const dateKey=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)
export function createAnalytics({source,state,originals,writeJSON}){
  const dir=path.join(state,'analytics')
  async function collect(data){
    if(!['pageview','read_complete','photo_open','outbound'].includes(data.event)||!/^\/[a-zA-Z0-9/_-]{0,160}$/.test(data.path||'')||!/^[a-f0-9-]{16,64}$/.test(data.session||''))return false
    const date=dateKey(new Date()),file=path.join(dir,date+'.json'),day=await readJSON(file,{date,pages:{},sources:{},devices:{},sessions:[],events:{}})
    if(Object.keys(day.pages).length>=1000&&!day.pages[data.path])return false
    const session=crypto.createHash('sha256').update(date+data.session).digest('hex').slice(0,24)
    day.events[data.event]=(day.events[data.event]||0)+1
    if(data.event==='pageview'){
      day.pages[data.path]=(day.pages[data.path]||0)+1
      let ref='直接访问';try{ref=new URL(data.referrer).hostname.slice(0,100)}catch{}
      if(Object.keys(day.sources).length<200||day.sources[ref])day.sources[ref]=(day.sources[ref]||0)+1
      const device=['mobile','tablet','desktop'].includes(data.device)?data.device:'desktop';day.devices[device]=(day.devices[device]||0)+1
      if(day.sessions.length<100000&&!day.sessions.includes(session))day.sessions.push(session)
    }
    await writeJSON(file,day);return true
  }
  async function report(days=30){
    const records=[...(await originals()).entries()],drafts=await fs.readdir(path.join(state,'drafts')).catch(()=>[]),published=records.filter(([,p])=>!p.data.draft)
    const privateDrafts=new Set(drafts.filter(n=>n.endsWith('.json')).map(n=>n.slice(0,-5))),allIds=new Set(records.map(([id])=>id));privateDrafts.forEach(id=>allIds.add(id))
    const tags={},months={},wordCount=text=>(String(text).match(/[\p{Script=Han}]|[\p{L}\p{N}]+/gu)||[]).length
    let words=0;for(const [,p] of published){words+=wordCount(p.data.markdown);for(const t of new Set(p.data.tags||[]))tags[t]=(tags[t]||0)+1;const month=p.data.date.slice(0,7);months[month]=(months[month]||0)+1}
    const albums=[];for(const d of await fs.readdir(path.join(source,'albums'),{withFileTypes:true}).catch(()=>[]))if(d.isDirectory()){const a=await readJSON(path.join(source,'albums',d.name,'album.json'),null);if(a)albums.push(a)}
    const projects=await readJSON(path.join(source,'projects/projects.json'),{groups:[]}),uploads=await readJSON(path.join(state,'media.json'),[]),events=await readJSON(path.join(state,'events.json'),[])
    let mediaBytes=0,mediaFiles=0;async function walk(folder){for(const e of await fs.readdir(folder,{withFileTypes:true}).catch(()=>[])){const f=path.join(folder,e.name);if(e.isDirectory())await walk(f);else if(e.isFile()&&/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(e.name)){mediaFiles++;mediaBytes+=(await fs.stat(f)).size}}}await walk(source)
    const trend=[],pages={},sources={},devices={},eventCounts={};let views=0,sessions=0
    for(let i=days-1;i>=0;i--){const date=dateKey(new Date(Date.now()-i*86400000)),d=await readJSON(path.join(dir,date+'.json'),{}),pv=d.events?.pageview||0;trend.push({date,views:pv,sessions:d.sessions?.length||0});views+=pv;sessions+=d.sessions?.length||0;for(const [dest,from] of [[pages,d.pages],[sources,d.sources],[devices,d.devices],[eventCounts,d.events]])for(const [k,v] of Object.entries(from||{}))dest[k]=(dest[k]||0)+v}
    const rank=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}))
    const archive=await fs.readFile(path.join(state,'release-history.jsonl'),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e}),history=new Map(events.map(e=>[e.id,e]));for(const line of archive.split('\n').filter(Boolean)){const e=JSON.parse(line);history.set(e.id,e)}
    const recent=[...history.values()].filter(e=>Date.parse(e.at)>=Date.now()-days*86400000).sort((a,b)=>b.at.localeCompare(a.at))
    return {generatedAt:new Date().toISOString(),timezone:'Asia/Shanghai',days,content:{articles:allIds.size,published:published.length,drafts:new Set([...privateDrafts,...records.filter(([,p])=>p.data.draft).map(([id])=>id)]).size,words,albums:albums.length,photos:albums.reduce((n,a)=>n+(a.photos||[]).length,0),projects:(projects.groups||[]).reduce((n,g)=>n+(g.projects||[]).length,0),mediaFiles,mediaBytes,uploaded:uploads.length,tags:rank(tags),months:rank(months).sort((a,b)=>a.name.localeCompare(b.name)),recent:published.sort((a,b)=>b[1].data.date.localeCompare(a[1].data.date)).slice(0,5).map(([slug,p])=>({slug,title:p.data.title,date:p.data.date,words:wordCount(p.data.markdown)}))},traffic:{views,dailySessions:sessions,trend,pages:rank(pages),sources:rank(sources),devices:rank(devices),events:rank(eventCounts)},releases:{built:recent.filter(e=>e.status==='built').length,failed:recent.filter(e=>e.status==='failed').length,pushed:recent.filter(e=>e.status==='pushed').length,recent:recent.slice(0,6),archived:true},wall:{mode:'browser-local',total:null}}
  }
  return {collect,report}
}
