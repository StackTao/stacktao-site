const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict'),path=require('path');
for(const root of process.argv.slice(2).length?process.argv.slice(2):['public']){
 const dir=path.resolve(root),dom=new JSDOM('<div id="view"></div>',{url:'https://journal.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});w.HTMLElement.prototype.scrollIntoView=function(){this.scrolled=true};
 w.ResizeObserver=class{observe(){}disconnect(){}};w.IntersectionObserver=class{observe(){}disconnect(){}};
 for(const file of ['pages.js','pages-longform.js','studio.js'])w.eval(fs.readFileSync(path.join(dir,'js',file),'utf8'));
 const q=s=>d.querySelector(s);const mount=route=>{w.Studio.destroy();q('#view').innerHTML=w.PAGES[route];w.Studio.decorate(q('#view'),route)};
 mount('/posts');const total=d.querySelectorAll('.post-row').length;assert(total>1);let title=q('.post-row > span').textContent;
 const input=q('.archive-field input');input.value=title;input.dispatchEvent(new w.Event('input'));assert(d.querySelectorAll('.post-row:not([hidden])').length>=1);
 input.value='找不到的文章xyz';input.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('.post-row:not([hidden])').length,0);assert(!q('.archive-empty').hidden);
 mount('/posts');assert.equal(q('.archive-field input').value,'找不到的文章xyz');q('.archive-reset').click();assert.equal(d.querySelectorAll('.post-row:not([hidden])').length,total);
 const select=q('.archive-tools select');select.value=select.options[1].value;select.dispatchEvent(new w.Event('change'));assert([...d.querySelectorAll('[data-year-group]:not([hidden])')].every(g=>g.querySelector('.year-label').textContent.trim()===select.value));
 const route=q('.post-row').getAttribute('href').slice(1);w.Studio.destroy();q('#view').innerHTML=w.PAGES[route];q('article').classList.add('article-prose');w.Studio.decorate(q('#view'),route);
 q('.reading-size').value='large';q('.reading-size').dispatchEvent(new w.Event('change'));assert.equal(q('article').dataset.readingSize,'large');q('.reading-mark').click();assert(!q('.reading-resume').hidden);assert(JSON.parse(w.localStorage.getItem('stacktao-reading-marks'))[route]);
 q('.reading-resume').click();assert(d.activeElement.scrolled);w.Studio.destroy();q('#view').innerHTML=w.PAGES[route];q('article').classList.add('article-prose');w.Studio.decorate(q('#view'),route);assert.equal(q('.reading-size').value,'large');assert(!q('.reading-resume').hidden);
 const set=w.Storage.prototype.setItem;w.Storage.prototype.setItem=function(){throw Error('blocked')};q('.reading-mark').click();assert(q('.reading-mark-hint').textContent.includes('无法保存'));w.Storage.prototype.setItem=set;
 w.Studio.destroy();q('#view').innerHTML=w.PAGES['/'];w.Studio.home(q('main'));assert(q('.journal-objects .reading-radio'));assert(!q('.journal-writing .reading-radio'));assert(q('.journal-writing .journal-entry'));assert(q('.journal-objects .journal-work'));
 const dial=q('.radio-dial'),before=dial.getAttribute('aria-valuenow');dial.click();assert.notEqual(dial.getAttribute('aria-valuenow'),before);
 w.Studio.destroy();w.close();console.log('PASS',root,': archive filter/year/reset/restore, font size persistence, paragraph bookmark/focus/storage failure, home content-first structure and dial');
}
