import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {JSDOM} from 'jsdom'
import {renderResume} from '../scripts/lib/resume.mjs'
import {renderResumeLab} from '../scripts/lib/resume-lab.mjs'
const projects=JSON.parse(await readFile(new URL('../example-content/projects/projects.json',import.meta.url)))
const resume=JSON.parse(await readFile(new URL('../example-content/content.config.json',import.meta.url))).resume
const source=await readFile(new URL('../public/js/resume-lab.js',import.meta.url),'utf8')
function setup() {
 const dom=new JSDOM(renderResume(resume,projects),{runScripts:'outside-only'}),w=dom.window,doc=w.document,painted=[],copied=[]
 const controller=new w.AbortController(),captured=new Set()
 w.matchMedia=()=>({matches:true})
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>copied.push(text)}})
 w.HTMLCanvasElement.prototype.getContext=()=>({scale(){},clearRect(){}})
 w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({left:10,top:20,width:400,height:220})
 w.HTMLCanvasElement.prototype.setPointerCapture=id=>captured.add(id)
 w.HTMLCanvasElement.prototype.hasPointerCapture=id=>captured.has(id)
 w.HTMLCanvasElement.prototype.releasePointerCapture=id=>captured.delete(id)
 w.WallTools={paintStroke:(ctx,stroke,width,height)=>painted.push({stroke:JSON.parse(JSON.stringify(stroke)),width,height})}
 w.eval(source);w.ResumeLab.mount(doc.querySelector('.resume-page'),controller.signal)
 const q=s=>doc.querySelector(s)
 function pointer(type,x,y,id=1) {const e=new w.MouseEvent(type,{clientX:x,clientY:y,button:0,bubbles:true});Object.defineProperty(e,'pointerId',{value:id});Object.defineProperty(e,'getCoalescedEvents',{value:()=>[]});q('canvas').dispatchEvent(e)}
 return {w,doc,q,controller,painted,copied,captured,pointer}
}
test('only present, recognized projects get a demo; arbitrary names remain escaped',()=>{
 assert.equal(renderResumeLab(null),'')
 const catalog=structuredClone(projects);catalog.groups[0].projects=catalog.groups[0].projects.slice(0,1);catalog.groups[0].projects[0].name='<script>bad</script>'
 const doc=new JSDOM(renderResumeLab(catalog)).window.document
 assert.equal(doc.querySelectorAll('[data-lab-tab]').length,1);assert.equal(doc.querySelector('script'),null)
 assert.match(doc.querySelector('.rl-project-name').textContent,/<script>/)
})
test('JSON tools format, compact, copy and preserve invalid or deeply nested input',async()=>{
 const {w,q,copied}=setup(),input=q('#resume-json')
 input.value='{"name":"苏","ok":true,"tags":[1,2]}'
 q('[data-json-action=format]').click();assert.match(input.value,/\n  "name"/)
 q('[data-json-action=compact]').click();assert.equal(input.value,'{"name":"苏","ok":true,"tags":[1,2]}')
 q('[data-json-action=copy]').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(copied[0],input.value)
 input.value='{"broken":';q('[data-json-action=format]').click();assert.equal(input.value,'{"broken":');assert.equal(input.getAttribute('aria-invalid'),'true')
 input.value='['.repeat(40)+'0'+']'.repeat(40);q('[data-json-action=format]').click();assert.match(q('[data-json-status]').textContent,/32 层/)
 w.close()
})
test('guide search filters real links by multiple terms and handles no matches',()=>{
 const {w,q,doc}=setup(),input=q('#resume-guide-search')
 assert.equal(doc.querySelectorAll('[data-guide-entry]:not([hidden])').length,3)
 input.value='mCp 数据库';input.dispatchEvent(new w.Event('input'))
 assert.equal(doc.querySelectorAll('[data-guide-entry]:not([hidden])').length,1)
 const result=q('[data-guide-entry]:not([hidden])');assert.match(result.textContent,/MCP 实战/);assert.match(result.href,/github.com\/StackTao\/ClaudeCodeGuide\/blob\/main\//)
 input.value='<img onerror=bad>';input.dispatchEvent(new w.Event('input'));assert.equal(doc.querySelectorAll('[data-guide-entry]:not([hidden])').length,0);assert.match(q('[data-guide-status]').textContent,/没有匹配/)
 q('[data-guide-query=Hooks]').click();assert.equal(input.value,'Hooks');assert.match(q('[data-guide-entry]:not([hidden])').textContent,/Hooks/)
 w.close()
})
test('project switches preserve input; shared spray renderer supports gestures, cancel, undo and cleanup',()=>{
 const {w,q,doc,painted,pointer,controller,captured}=setup(),json=q('#resume-json')
 json.value='{"keep":1}';q('#rl-tab-json').dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}))
 assert.equal(doc.activeElement,q('#rl-tab-wall'));assert(!q('#rl-panel-wall').hidden)
 pointer('pointerdown',10,20);pointer('pointermove',210,130);pointer('pointerup',410,240)
 assert.equal(captured.size,0);assert.match(q('[data-wall-status]').textContent,/已画 1 笔/)
 assert.deepEqual(painted.at(-1).stroke.points.at(-1),[1,1]);assert.equal(painted.at(-1).width,400)
 pointer('pointerdown',40,40);pointer('pointermove',80,80);pointer('pointercancel',80,80)
 assert.match(q('[data-wall-status]').textContent,/已画 1 笔/)
 q('#rl-tab-json').click();assert.equal(json.value,'{"keep":1}')
 q('#rl-tab-wall').click();q('[data-lab-ink="#a45743"]').click();q('[data-lab-wall=star]').click()
 assert.equal(painted.at(-1).stroke.ink,'#a45743');assert.match(q('[data-wall-status]').textContent,/已画 2 笔/)
 q('[data-lab-wall=undo]').click();assert.match(q('[data-wall-status]').textContent,/已画 1 笔/)
 q('[data-lab-wall=clear]').click();assert(q('[data-lab-wall=undo]').disabled)
 pointer('pointerdown',50,50);controller.abort();assert.equal(captured.size,0)
 const count=painted.length;q('[data-lab-wall=star]').click();assert.equal(painted.length,count)
 w.close()
})
