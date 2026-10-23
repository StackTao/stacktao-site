import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import { renderResume } from '../scripts/lib/resume.mjs'
import { resumeEditor } from '../admin/resume.js'

const sample = JSON.parse(await readFile(new URL('../example-content/content.config.json', import.meta.url))).resume

test('resume uses escaped selectable content and excludes unsafe links', () => {
  const doc = new JSDOM(renderResume({...sample,name:'<script>bad</script>',contacts:[{label:'<img src=x>',url:'javascript:alert(1)'}],sections:[{title:'<工作>',items:[{title:'<项目>',url:'data:text/html,bad',points:['<svg onload=bad>']}]}]})).window.document
  assert.equal(doc.querySelector('h1').textContent,'<script>bad</script>')
  assert.equal(doc.querySelectorAll('script,img,svg[onload],a[href^="javascript"],a[href^="data:"]').length,0)
  assert.equal(doc.querySelector('li').textContent,'<svg onload=bad>')
  assert.match(doc.querySelector('.resume-eyebrow').textContent,/DRAFT/)
  assert.equal(renderResume(null),'')
  assert.equal(renderResume({name:''}),'')
  assert.doesNotMatch(renderResume({...sample,draft:false}),/虚构|DRAFT|示例简历/)
})

test('print waits for fonts and does not print after navigating away', async () => {
  const dom = new JSDOM(renderResume(sample),{runScripts:'outside-only'})
  let ready, printed=0
  dom.window.document.fonts = {ready:new Promise(resolve=>ready=resolve)}
  dom.window.print=()=>printed++
  dom.window.eval(await readFile(new URL('../public/js/resume.js',import.meta.url),'utf8'))
  const doc=dom.window.document,button=doc.querySelector('[data-resume-print]')
  dom.window.Resume.mount(doc)
  const printing=button.onclick()
  assert.equal(printed,0);assert(button.disabled)
  ready();await printing
  assert.equal(printed,1);assert(!button.disabled)
  dom.window.document.fonts.ready=new Promise(resolve=>ready=resolve)
  const leaving=button.onclick();button.remove();ready();await leaving
  assert.equal(printed,1)
})

test('editor saves edits and repeated items with revision protection without altering other settings', async () => {
  const dom=new JSDOM('<main></main>'),main=dom.window.document.querySelector('main')
  const config={site:{name:'Keep me'},guestbook:{endpoint:'/api/wall'},resume:structuredClone(sample)}
  const saved=[],notices=[],errors=[];let dirty=false
  await resumeEditor({main,api:async(route,options)=>{assert.equal(route,'/settings');if(!options)return {data:config,revision:'r1'};saved.push(options);return {revision:'r'+(saved.length+1)}},run:fn=>async()=>{try{await fn()}catch(e){errors.push(e)}},toast:s=>notices.push(s),changed:v=>dirty=v,busy:()=>{}})
  main.querySelector('[name=name]').value='苏 · 已修改'
  main.querySelector('[name=points]').value='第一项真实成果\n\n第二项真实成果'
  main.querySelector('[data-add-entry="0"]').click()
  assert(dirty)
  assert.equal(main.querySelector('[name=name]').value,'苏 · 已修改')
  main.querySelector('#resume-draft').value='false'
  await main.querySelector('#save-resume').onclick()
  assert.equal(errors.length,0);assert.equal(saved[0].headers['If-Match'],'r1')
  assert.equal(saved[0].body.site.name,'Keep me');assert.equal(saved[0].body.guestbook.endpoint,'/api/wall')
  assert.equal(saved[0].body.resume.name,'苏 · 已修改')
  assert.equal(saved[0].body.resume.draft,false)
  assert.equal(saved[0].body.resume.sections[0].items.length,3)
  assert.deepEqual(saved[0].body.resume.sections[0].items[0].points,['第一项真实成果','第二项真实成果'])
  await main.querySelector('#save-resume').onclick()
  assert.equal(saved[1].headers['If-Match'],'r2');assert(!dirty)
  main.querySelector('[name=url]').value='javascript:alert(1)'
  await main.querySelector('#save-resume').onclick()
  assert.equal(saved.length,2);assert.match(errors[0].message,/链接/)
})
