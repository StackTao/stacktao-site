const { JSDOM } = require('jsdom')
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict')
;(async () => {
for (const dir of process.argv.slice(2).length ? process.argv.slice(2) : ['public']) {
  const root = path.resolve(dir), dom = new JSDOM('<div id="view"></div>', { url:'https://blog.test/', runScripts:'outside-only', pretendToBeVisual:true })
  const w = dom.window, d = w.document, view = d.querySelector('#view')
  w.matchMedia = () => ({ matches:true }); w.HTMLElement.prototype.scrollIntoView = function () { this.scrolled = true }
  let copied = ''; w.navigator.clipboard = { writeText: async text => { copied = text } }
  for (const file of ['pages.js','studio.js','cabinet.js']) w.eval(fs.readFileSync(path.join(root,'js',file),'utf8'))
  function source(route) { const node = d.createElement('div'); node.innerHTML = w.PAGES[route]; return node }
  function mount(route) { w.Cabinet.destroy(); w.Studio.destroy(); view.innerHTML = w.PAGES[route]; w.Studio.decorate(view,route); w.Cabinet.decorate(view,route) }
  for (const route of ['/bookmarks','/use','/media','/podcasts','/streams','/sponsors','/chat','/chat-zh','/feed']) {
    const source = d.createElement('div'); source.innerHTML = w.PAGES[route]
    const links = [...source.querySelectorAll('a')].filter(a => !a.closest('.toc-fixed')).map(a => a.getAttribute('href'))
    mount(route)
    assert.equal(view.querySelectorAll('h1').length,1,route+' one heading')
    const actual = [...view.querySelectorAll('a')].map(a => a.getAttribute('href'))
    for (const link of links) assert(actual.includes(link),route+' preserves '+link)
  }
  mount('/bookmarks'); const first = view.querySelector('.bookmark-pin'); first.click()
  assert.equal(first.getAttribute('aria-pressed'),'true'); view.querySelector('.bookmark-filter').click()
  assert.equal(view.querySelectorAll('.bookmark-file:not([hidden])').length,1)
  mount('/bookmarks'); assert.equal(view.querySelector('.bookmark-pin').getAttribute('aria-pressed'),'true')
  const originalSet = w.Storage.prototype.setItem; w.Storage.prototype.setItem = () => { throw Error('blocked') }
  view.querySelector('.bookmark-pin').click(); assert.equal(view.querySelector('.bookmark-pin').getAttribute('aria-pressed'),'true')
  assert.match(view.querySelector('.cabinet-status').textContent,/无法保存/); w.Storage.prototype.setItem = originalSet
  // Pin feedback follows the successful action, remains interruptible and respects reduced motion.
  const pinAnimations = []
  w.HTMLElement.prototype.animate = function (frames, options) {
    const animation = { target:this, frames, options, cancelled:false, cancel() { this.cancelled = true } }
    pinAnimations.push(animation); return animation
  }
  let reducedMotion = false; w.matchMedia = () => ({ matches:reducedMotion })
  const animatedPin = view.querySelector('.bookmark-pin'), titleBefore = view.querySelector('.bookmark-title').textContent
  animatedPin.click(); assert.equal(pinAnimations.length,1); assert.equal(animatedPin.getAttribute('aria-pressed'),'false')
  assert.equal(pinAnimations[0].target,animatedPin); assert.equal(pinAnimations[0].frames.at(-1).transform,'none')
  assert(pinAnimations[0].options.duration <= 600,'the response settles instead of looping')
  animatedPin.click(); assert.equal(pinAnimations.length,2); assert(pinAnimations[0].cancelled,'rapid clicks interrupt the previous snap')
  assert.equal(view.querySelector('.bookmark-title').textContent,titleBefore,'feedback never changes the linked content')
  reducedMotion = true; animatedPin.click(); assert.equal(pinAnimations.length,2); assert(pinAnimations[1].cancelled)
  assert.equal(animatedPin.getAttribute('aria-pressed'),'false','reduced motion still updates the saved state')
  reducedMotion = false; animatedPin.click(); assert.equal(pinAnimations.length,3)
  w.Cabinet.destroy(); assert(pinAnimations[2].cancelled,'route cleanup cancels a pending snap')
  w.matchMedia = () => ({ matches:true })
  mount('/use'); const jump = view.querySelector('.tool-index a[href="#cli"]'); jump.click()
  assert(view.querySelector('#cli').scrolled); assert.equal(d.activeElement.id,'cli')
  const copy = view.querySelector('.tool-command .cabinet-copy'), expected = view.querySelector('.tool-command code').textContent
  copy.click(); await new Promise(resolve => setImmediate(resolve)); assert.equal(copied,expected); assert.match(copy.textContent,/已复制/)
  const toolHeadings = [...source('/use').querySelectorAll('h2[id]')].map(heading => heading.textContent)
  assert.deepEqual([...view.querySelectorAll('.tool-section h2')].map(heading => heading.textContent),toolHeadings,'toolchain sections remain visible')
  assert.doesNotMatch(view.textContent,/HHKB Studio|Herman Miller Aeron|RICOH GR/,'unknown personal hardware is not asserted')
  const episodes = [...source('/podcasts').querySelectorAll('[data-lang]')]
  mount('/podcasts'); assert.equal(view.querySelectorAll('.programme-record').length,episodes.length)
  episodes.forEach(episode => {
    const title = episode.querySelector('a.item')?.textContent.trim() || [...episode.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent.trim()).join(' ').trim()
    assert(view.textContent.includes(title),'programme text is retained')
  })
  assert.doesNotMatch(view.textContent,/Shows I host or guest on|我主持的|我参与的/,'example topics do not claim hosting credits')
  ;[...view.querySelectorAll('.programme-record')].forEach((record,index) => {
    const meta = episodes[index].querySelector('.op50')?.textContent || ''
    assert.equal(!!record.querySelector('.programme-track'),/(?:(\d+)h\s*)?(\d+)min/.test(meta),'duration bars require actual duration metadata')
    assert(record.querySelector('.programme-number'),'every programme retains its index')
  })
  const podcastPage = w.PAGES['/podcasts']
  w.PAGES['/podcasts'] = '<main><h1>节目</h1><div data-lang="zh">已发布记录<div class="op50">54min</div></div><div data-lang="zh">主题示例<div class="op50">暂无音频</div></div></main>'
  mount('/podcasts')
  assert.equal(view.querySelectorAll('.programme-track').length,1)
  assert.equal(view.querySelectorAll('.programme-number').length,2)
  assert.match(view.querySelector('.programme-measure').style.getPropertyValue('--record-length'),/%/)
  w.PAGES['/podcasts'] = podcastPage
  const circles = source('/sponsors').querySelector('.circles')?.textContent.trim()
  mount('/sponsors'); if (circles) assert.equal(view.querySelector('.sponsor-signatures').textContent.trim(),circles)
  assert.doesNotMatch(view.textContent,/Lumen Labs|Peak Foundation|Mira Patel/,'fictional sponsors are absent')
  const mediaCount = source('/media').querySelectorAll('.media-card').length
  mount('/media'); assert.equal(view.querySelectorAll('.media-volume').length,mediaCount)
  w.Cabinet.decorate(view,'/media'); assert.equal(view.querySelectorAll('.media-shelf').length,mediaCount ? 1 : 0)
  for (const route of ['/bookmarks','/use','/podcasts','/streams','/media','/sponsors']) {
    const page = w.PAGES[route]; w.PAGES[route] = '<main><h1>暂未整理</h1><p>有内容时再放上来。</p></main>'
    mount(route); assert.equal(view.querySelectorAll('h1').length,1); assert.match(view.textContent,/有内容时再放上来/)
    assert.equal(view.querySelectorAll('.bookmark-file,.tool-section,.programme-record,.media-volume,.sponsor-signatures').length,0,'empty collections do not invent entries')
    w.PAGES[route] = page
  }
  // The production generator groups links by year; each link must remain its own record.
  const generated = path.join(root,'js','content-generated.js')
  if (fs.existsSync(generated)) {
    w.eval(fs.readFileSync(generated,'utf8'))
    const source = d.createElement('div'); source.innerHTML = w.PAGES['/feed']
    const expected = [...source.querySelectorAll('a.post-row')].map(a => ({ href:a.getAttribute('href'), title:a.querySelector('span').textContent, date:a.querySelector('.meta').textContent }))
    const years = [...source.querySelectorAll('.year-label')].map(year => year.textContent)
    mount('/feed')
    assert.equal(view.querySelectorAll('.feed-entry').length,expected.length,'generated feed has one entry per article')
    assert.deepEqual([...view.querySelectorAll('.year-label')].map(year => year.textContent),years,'year labels remain attached to their groups')
    ;[...view.querySelectorAll('.feed-entry')].forEach((entry,index) => {
      assert.equal(entry.querySelectorAll('a').length,1)
      assert.equal(entry.querySelector('a').getAttribute('href'),expected[index].href)
      assert.equal(entry.querySelector('a').textContent.trim(),expected[index].title)
      assert.equal(entry.querySelector('.feed-entry-date').textContent,expected[index].date)
    })
  }
  w.PAGES['/feed'] = '<main><h1>更新</h1><div data-year-group><div class="year-label">2026</div><a class="post-row item" href="#/posts/a"><span>A</span><span class="meta">Oct 22</span></a><a class="post-row item" href="#/posts/b"><span>B</span><span class="meta">Oct 1</span></a></div><div data-year-group><div class="year-label">2025</div><a class="post-row item" href="#/posts/c"><span>C</span><span class="meta">Dec 8</span></a></div></main>'
  mount('/feed')
  assert.deepEqual([...view.querySelectorAll('[data-year-group]')].map(group => group.querySelectorAll('.feed-entry').length),[2,1])
  assert.deepEqual([...view.querySelectorAll('.feed-entry-number')].map(number => number.textContent),['03','02','01'])
  assert.deepEqual([...view.querySelectorAll('.feed-ledger')].map(list => list.getAttribute('aria-label')),['2026 年更新','2025 年更新'])
  w.PAGES['/feed'] = '<main><h1>更新</h1><p>暂时没有更新。</p></main>'; mount('/feed')
  assert.equal(view.querySelectorAll('.feed-entry').length,0); assert.match(view.textContent,/暂时没有更新/)
  w.Cabinet.destroy(); w.Studio.destroy(); w.close()
  console.log('PASS',dir,': collection content/links, bookmark pin/filter/persistence/storage failure/snap cancellation/reduced motion, inventory navigation/copy, programme metadata, real toolchain sections, honest example credits, media/idempotence, generated feed records/year semantics/links/dates and empty feed')
}
})().catch(error => { console.error(error); process.exitCode = 1 })
