const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict')
;(async()=>{
 const dom=new JSDOM('',{url:'http://localhost:5174/site/',runScripts:'outside-only'}),w=dom.window
 let snapshot={section:0,notes:[],walls:[{id:0,count:0}],leases:{},seed:1,stats:{}},events,interval,failRead=false
 Object.defineProperty(w.document,'hidden',{get:()=>false})
 w.setInterval=fn=>(interval=fn,1);w.clearInterval=()=>{};w.EventSource=class{constructor(){events=this}close(){this.closed=true}}
 w.fetch=async(url,options)=>{if(failRead&&options.method==='GET')throw Error('offline');if(url.endsWith('/session'))return {ok:true,json:async()=>({token:'a'.repeat(64)})};if(url.endsWith('/notes'))return {ok:true,json:async()=>({...JSON.parse(options.body).note,revision:'saved',owned:true})};return {ok:true,json:async()=>structuredClone(snapshot)}}
 w.eval(fs.readFileSync('public/js/wall-client.js','utf8'));await w.SharedWall.init()
 const changes=[],stop=w.SharedWall.subscribe(changed=>changes.push(changed)),version=w.SharedWall.version()
 await interval();assert.equal(w.SharedWall.version(),version,'unchanged polls do not invalidate drawing geometry')
 snapshot.notes=[{id:'other',section:0,text:'new'}];await events.onmessage();assert.equal(changes.at(-1),true);assert.equal(w.SharedWall.read()[0].id,'other','save event refreshes without manual reload')
 snapshot.leases={peer:{cells:[1],expires:100}};await interval();assert.equal(changes.at(-1),false,'presence updates do not rebuild the saved scene')
 failRead=true;await events.onmessage();assert.equal(w.SharedWall.read()[0].id,'other','offline polling preserves the last scene')
 const saved=await w.SharedWall.put({id:'mine',section:0,text:'draft'},'lease');assert.equal(saved.revision,'saved');assert.equal(w.SharedWall.read()[0].id,'mine','confirmed save is not reported as failed when the following refresh fails')
 stop();assert(events.closed);w.close();console.log('PASS wall client: realtime notifications, presence-only refresh, offline retention, confirmed-save acknowledgement and cleanup')
})().catch(e=>{console.error(e);process.exit(1)})
