const assert=require('node:assert/strict')
const fs=require('node:fs')
const {JSDOM}=require('jsdom')
const source=fs.readFileSync('public/js/analytics.js','utf8')
function setup({url='https://blog.example/#/posts/test',enabled=true,dnt='0'}={}){
 const dom=new JSDOM('<article class="prose">Text</article><div class="lightbox"></div><a href="https://other.example/private?secret=1">External</a>',{url,runScripts:'outside-only',pretendToBeVisual:true})
 const w=dom.window,requests=[];w.CONTENT_CONFIG=enabled?{analytics:{endpoint:'https://stats.example/api/v1/collect'}}:{}
 Object.defineProperty(w.navigator,'doNotTrack',{value:dnt});w.fetch=async(url,o)=>{requests.push(JSON.parse(o.body));return {ok:true}}
 w.eval(source);return {dom,w,requests}
}
;(async()=>{
 for(const options of [{enabled:false},{dnt:'1'},{url:'http://localhost:5173/#/'},{url:'https://blog.example/site/#/'}]){const {dom,requests}=setup(options);assert.equal(requests.length,0);dom.window.close()}
 const {dom,w,requests}=setup();assert.equal(requests[0].event,'pageview');assert.equal(requests[0].path,'/posts/test');assert.equal(requests[0].session.length,36)
 w.document.querySelector('a').addEventListener('click',e=>e.preventDefault());w.document.querySelector('a').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(requests.at(-1).event,'outbound');assert(!JSON.stringify(requests).includes('secret'))
 w.document.querySelector('.lightbox').classList.add('is-open');await Promise.resolve();assert.equal(requests.at(-1).event,'photo_open')
 w.location.hash='/photos?private=secret';await new Promise(r=>w.setTimeout(r,10));assert.equal(requests.at(-1).path,'/photos');assert.equal(requests.at(-1).session,requests[0].session)
 const count=requests.length;w.dispatchEvent(new w.HashChangeEvent('hashchange'));assert.equal(requests.length,count,'same route does not double count')
 dom.window.close();const reading=setup();reading.w.document.querySelector('article').getBoundingClientRect=()=>({top:0,height:100});const now=reading.w.Date.now();reading.w.Date.now=()=>now+11000;reading.w.dispatchEvent(new reading.w.Event('scroll'));reading.w.dispatchEvent(new reading.w.Event('scroll'));assert.equal(reading.requests.filter(e=>e.event==='read_complete').length,1);reading.dom.window.close();console.log('PASS analytics client: opt-in, DNT, preview exclusion, hash navigation, photo and outbound events, session reuse and parameter stripping')
})().catch(e=>{console.error(e);process.exitCode=1})
