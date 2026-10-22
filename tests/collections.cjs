// DOM regressions for collection content and interaction. Visual composition is reviewed in a browser.
const { JSDOM, VirtualConsole } = require('jsdom')
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')

async function check(directory, generated) {
  const errors = [], console = new VirtualConsole()
  console.on('jsdomError', error => errors.push(error))
  const dom = new JSDOM('<div id="view"></div>', { url: 'https://collections.test/#/photos', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console })
  const w = dom.window, d = w.document, q = selector => d.querySelector(selector), all = selector => [...d.querySelectorAll(selector)]
  const copied = []
  d.addEventListener('click', event => { if (event.target.closest('a')) event.preventDefault() })
  w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  w.ResizeObserver = class { observe() {} disconnect() {} }
  w.IntersectionObserver = class { observe() {} disconnect() {} }
  w.HTMLElement.prototype.scrollIntoView = function () { this.scrolled = true }
  Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { async writeText(value) { copied.push(value) } } })
  for (const file of ['pages.js', 'pages-longform.js', ...(generated ? ['content-generated.js'] : []), 'studio.js']) {
    w.eval(fs.readFileSync(path.join(directory, 'js', file), 'utf8'))
  }
  const settle = () => new Promise(resolve => setTimeout(resolve, 0))
  const key = (element, value) => element.dispatchEvent(new w.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }))
  function source(route) { const template = d.createElement('template'); template.innerHTML = w.PAGES[route]; return template.content }
  let clickedPhoto = null
  function mount(route) {
    w.Studio.destroy()
    q('#view').innerHTML = w.PAGES[route]
    w.Studio.decorate(q('#view'), route)
    // The site lightbox binds the original images after decoration, never their clones.
    all('.photo-grid img').forEach(image => { image.onclick = () => { clickedPhoto = image } })
  }
  function assertLayout(layout) {
    assert.equal(q('[data-photo-layout][aria-pressed="true"]').dataset.photoLayout, layout)
    for (const room of all('.contact-room')) {
      assert.equal(room.dataset.layout, layout)
      for (const selector of ['.contact-stage', '.contact-caption', '.contact-strip']) assert.equal(room.querySelector(selector).hidden, layout !== 'reader')
      assert.equal(room.querySelector('.contact-collection').hidden, layout === 'reader')
      assert.equal(room.querySelector('.contact-loupe-toggle').hidden, layout !== 'reader')
    }
    assert.equal(q('.photo-toolbar').hidden, !['reader', 'grid'].includes(layout))
  }

  // The home explorer selects real content; changing bands changes its entire keyboard/random range.
  function mountHome() {
    w.Studio.destroy(); q('#view').innerHTML = w.PAGES['/']; w.Studio.home(q('main'))
  }
  const words = [...source('/posts').querySelectorAll('.post-row')].slice(0, 6).map(row => ({ title: row.querySelector('span').textContent.trim(), href: row.getAttribute('href') }))
  const homePhotos = [...(source('/photos').querySelector('.photo-grid')?.querySelectorAll('img') || [])].map(image => ({ title: image.alt || '沿途的一瞬', href: '#/photos', src: image.getAttribute('src') }))
  const works = [...source('/projects').querySelectorAll('.project-grid .item')].slice(0, 6).map(item => ({ title: item.querySelector('.project-name').textContent, href: item.getAttribute('href') }))
  const feeds = [{ name: '文字', items: words }, ...(homePhotos.length ? [{ name: '影像', items: homePhotos }] : []), ...(works.length ? [{ name: '造物', items: works }] : [])]
  assert(words.length > 0)
  mountHome()
  assert.deepEqual(all('.radio-stations button').map(button => button.textContent), feeds.map(feed => feed.name))
  function station(name) { return all('.radio-stations button').find(button => button.textContent === name) }
  function assertTuned(feed) {
    const dial = q('.reading-radio [role="slider"]'), selected = Number(dial.getAttribute('aria-valuenow')) - 1
    assert(selected >= 0 && selected < feed.items.length, 'selection stays in the current feed')
    assert.equal(Number(dial.getAttribute('aria-valuemax')), feed.items.length)
    assert.equal(q('.radio-screen h3').textContent, feed.items[selected].title)
    assert.equal(q('.radio-actions a').getAttribute('href'), feed.items[selected].href, 'the explorer points at an actual source destination')
    assert(dial.getAttribute('aria-valuetext').includes(feed.name))
    return selected
  }
  const originalRandom = w.Math.random
  let randomCall = 0
  w.Math.random = () => [0, .49, .999][randomCall++ % 3]
  for (const feed of feeds) {
    station(feed.name).click()
    const dial = q('.reading-radio [role="slider"]')
    assert.equal(assertTuned(feed), 0)
    key(dial, 'End'); assert.equal(assertTuned(feed), feed.items.length - 1)
    key(dial, 'ArrowRight'); assert.equal(assertTuned(feed), 0)
    key(dial, 'ArrowLeft'); assert.equal(assertTuned(feed), feed.items.length - 1)
    key(dial, 'Home'); assert.equal(assertTuned(feed), 0)
    for (let i = 0; i < 9; i++) {
      const previous = assertTuned(feed); q('.radio-random').click()
      const selected = assertTuned(feed)
      if (feed.items.length > 1) assert.notEqual(selected, previous, 'random tuning picks another item in the selected band')
    }
  }
  w.Math.random = originalRandom
  if (homePhotos.length) {
    station('影像').click()
    const selected = Math.min(2, homePhotos.length - 1), dial = q('.reading-radio [role="slider"]')
    key(dial, 'Home'); for (let i = 0; i < selected; i++) key(dial, 'ArrowRight')
    w.localStorage.setItem('stacktao-photo-layout-v2', 'grid')
    q('.radio-actions a').click()
    assert.equal(w.sessionStorage.getItem('stacktao-photo-entry'), String(selected))
    mount('/photos'); assertLayout('reader')
    assert.equal(q('.contact-stage > img').src, new URL(homePhotos[selected].src, w.location.href).href, 'photo entry opens the selected image, not the first one')
    assert.equal(w.sessionStorage.getItem('stacktao-photo-entry'), null, 'the photo entry is consumed once')
    assert.equal(w.localStorage.getItem('stacktao-photo-layout-v2'), 'grid', 'a one-off photo entry does not overwrite the preferred layout')
    mount('/photos'); assertLayout('grid')
    assert.equal(q('.contact-stage > img').src, new URL(homePhotos[0].src, w.location.href).href)
  }
  // The photo desk hands off its current print, using the same first-album coordinates as the reader.
  if (homePhotos.length > 1) {
    mountHome()
    assert.deepEqual(all('.photo-desk .photo-print img').map(image => image.getAttribute('src')), homePhotos.slice(0, 3).map(image => image.src))
    q('.photo-desk .photo-print.is-front').click()
    assert.equal(q('.photo-desk .photo-print.is-front img').getAttribute('src'), homePhotos[1].src, 'turning the desk print selects the second real source image')
    w.localStorage.setItem('stacktao-photo-layout-v2', 'masonry')
    const albumLink = q('.photo-desk .journal-photo-link')
    assert.equal(albumLink.getAttribute('href'), '#/photos'); albumLink.click()
    assert.equal(w.sessionStorage.getItem('stacktao-photo-entry'), '1')
    mount('/photos'); assertLayout('reader')
    assert.equal(q('.contact-stage > img').src, new URL(homePhotos[1].src, w.location.href).href, 'the album link opens the print currently on the desk')
    assert.equal(w.sessionStorage.getItem('stacktao-photo-entry'), null)
    assert.equal(w.localStorage.getItem('stacktao-photo-layout-v2'), 'masonry', 'desk entry preserves the saved layout')
    mount('/photos'); assertLayout('masonry')
    assert.equal(q('.contact-stage > img').src, new URL(homePhotos[0].src, w.location.href).href, 'the desk entry is consumed only once')
  }
  const savedPhotos = w.PAGES['/photos'], savedProjects = w.PAGES['/projects']
  w.PAGES['/photos'] = `<main class="page"><div class="photo-toolbar"><button data-gallery="contain">完整</button><button data-gallery="cover">铺满</button></div>
    <section class="photo-album"><h2>第一组</h2><div class="photo-grid"><img src="https://images.test/only-first.jpg" alt="第一组唯一一张"></div></section>
    <section class="photo-album"><h2>第二组</h2><div class="photo-grid"><img src="https://images.test/other-first.jpg" alt="第二组第一张"><img src="https://images.test/other-second.jpg" alt="第二组第二张"></div></section></main>`
  mountHome()
  assert.equal(all('.photo-desk .photo-print').length, 1, 'a short first album is not padded with images from later albums')
  station('影像').click(); assert.equal(q('.reading-radio [role="slider"]').getAttribute('aria-valuemax'), '1')
  for (let i = 0; i < 3; i++) {
    q('.photo-desk [aria-label="翻到下一张相片"]').click()
    assert(q('.photo-desk .photo-print.is-front img').src.endsWith('/only-first.jpg'), 'the desk never turns into another album')
  }
  w.localStorage.setItem('stacktao-photo-layout-v2', 'grid')
  q('.photo-desk .journal-photo-link').click()
  assert.equal(w.sessionStorage.getItem('stacktao-photo-entry'), '0')
  mount('/photos'); assertLayout('reader')
  assert.deepEqual(all('.contact-stage > img').map(image => image.src), ['https://images.test/only-first.jpg', 'https://images.test/other-first.jpg'])
  assert.equal(w.sessionStorage.getItem('stacktao-photo-entry'), null)
  assert.equal(w.localStorage.getItem('stacktao-photo-layout-v2'), 'grid')
  mount('/photos'); assertLayout('grid')
  w.PAGES['/photos'] = savedPhotos
  // Missing optional collections still leave a useful words-only explorer.
  delete w.PAGES['/photos']; delete w.PAGES['/projects']; mountHome()
  assert.deepEqual(all('.radio-stations button').map(button => button.textContent), ['文字'])
  key(q('.reading-radio [role="slider"]'), 'End'); assertTuned(feeds[0])
  q('.radio-random').click(); assertTuned(feeds[0])
  w.PAGES['/photos'] = savedPhotos; w.PAGES['/projects'] = savedProjects
  // Preference/session storage can be unavailable; the link and ordinary gallery remain usable.
  const homeGet = w.Storage.prototype.getItem, homeSet = w.Storage.prototype.setItem, homeRemove = w.Storage.prototype.removeItem
  w.Storage.prototype.getItem = w.Storage.prototype.setItem = w.Storage.prototype.removeItem = function () { throw Error('storage blocked') }
  mountHome()
  if (homePhotos.length) {
    station('影像').click(); key(q('.reading-radio [role="slider"]'), 'End')
    assertTuned(feeds.find(feed => feed.name === '影像'))
    q('.radio-actions a').click(); mount('/photos'); assertLayout('gallery')
    assert.equal(all('.contact-tile').length, source('/photos').querySelectorAll('.photo-grid img').length)
  } else { q('.radio-random').click(); assertTuned(feeds[0]) }
  w.Storage.prototype.getItem = homeGet; w.Storage.prototype.setItem = homeSet; w.Storage.prototype.removeItem = homeRemove
  w.localStorage.clear(); w.sessionStorage.clear()

  // Real source content: the generated site and the prototype must both retain every image.
  const photoSource = source('/photos'), photoCount = photoSource.querySelectorAll('.photo-grid img').length, albumCount = photoSource.querySelectorAll('.photo-grid').length
  assert(photoCount > 0)
  mount('/photos')
  assertLayout('gallery')
  assert.equal(all('.contact-room').length, albumCount)
  assert.equal(all('.contact-tile').length, photoCount)
  assert.equal(all('.photo-grid img').length, photoCount, 'the hidden lightbox sources survive decoration')
  assert.equal(q('.contact-stage > img').style.objectFit, 'contain', 'new visitors see the full composition')
  for (const tile of all('.contact-tile')) assert(tile.querySelector('.contact-tile-title').textContent.trim())
  all('.contact-room').forEach((room, index) => {
    const images = all('.photo-grid')[index].querySelectorAll('img'), tiles = room.querySelectorAll('.contact-tile')
    assert.equal(tiles.length, images.length)
    tiles[tiles.length - 1].click()
    assert.equal(clickedPhoto, images[images.length - 1], 'a displayed photo opens its matching lightbox source')
    assert.equal(room.querySelector('.contact-stage > img').src, images[images.length - 1].src)
  })
  for (const layout of ['reader', 'grid', 'masonry', 'gallery']) {
    q('[data-photo-layout="' + layout + '"]').click(); assertLayout(layout)
  }
  q('[data-photo-layout="grid"]').click(); mount('/photos'); assertLayout('grid')
  w.localStorage.setItem('stacktao-photo-layout-v2', 'not-a-layout'); mount('/photos'); assertLayout('gallery')

  // Two albums catch accidental global indexing, shared selected-photo state, and keyboard focus leaks.
  w.PAGES['/photos'] = `<main class="page"><div class="photo-toolbar"><button data-gallery="contain">完整</button><button data-gallery="cover">铺满</button></div>
    <section class="photo-album"><h2>山路</h2><div class="photo-grid">${[1, 2, 3].map(i => `<img src="https://images.test/a${i}.jpg" alt="山路 ${i}" data-place="山间 · 2026" data-photo-index="${i}">`).join('')}</div></section>
    <section class="photo-album"><h2>海边</h2><div class="photo-grid">${[1, 2].map(i => `<img src="https://images.test/b${i}.jpg" alt="海边 ${i}" data-place="海岸 · 2025" data-photo-index="${i + 3}">`).join('')}</div></section></main>`
  w.localStorage.removeItem('stacktao-photo-layout-v2'); mount('/photos'); assertLayout('gallery')
  q('[data-photo-layout="reader"]').click()
  const [first, second] = all('.contact-room'), firstStage = first.querySelector('.contact-stage'), secondStage = second.querySelector('.contact-stage')
  key(firstStage, 'ArrowRight')
  assert(firstStage.querySelector('img').src.endsWith('/a2.jpg'))
  assert(secondStage.querySelector('img').src.endsWith('/b1.jpg'), 'changing one album never changes the other')
  key(first.querySelector('.contact-strip'), 'End')
  assert(firstStage.querySelector('img').src.endsWith('/a3.jpg'))
  assert.equal(d.activeElement, first.querySelectorAll('.contact-frame')[2])
  key(first.querySelector('.contact-strip'), 'Home')
  assert.equal(d.activeElement, first.querySelector('.contact-frame'))
  key(secondStage, 'ArrowLeft')
  assert(secondStage.querySelector('img').src.endsWith('/b2.jpg'))
  assert(firstStage.querySelector('img').src.endsWith('/a1.jpg'))
  second.querySelector('.contact-zoom').click()
  assert.equal(clickedPhoto, all('.photo-grid')[1].querySelectorAll('img')[1])
  first.querySelector('.contact-light-switch').click()
  assert(first.classList.contains('is-darkroom')); assert(!second.classList.contains('is-darkroom'))
  first.querySelector('.contact-loupe-toggle').click()
  assert.equal(first.querySelector('.contact-loupe-toggle').getAttribute('aria-pressed'), 'true')
  q('[data-photo-layout="gallery"]').click()
  assert.equal(first.querySelector('.contact-loupe-toggle').getAttribute('aria-pressed'), 'false', 'changing layout puts the lens away')
  second.querySelectorAll('.contact-tile')[0].click()
  assert.equal(clickedPhoto, all('.photo-grid')[1].querySelector('img'))
  assert(firstStage.querySelector('img').src.endsWith('/a1.jpg'))
  assert.equal(second.querySelector('.contact-tile-place').textContent, '海岸 · 2025')
  q('[data-photo-layout="reader"]').click()
  q('[data-gallery="cover"]').click()
  all('.contact-room').forEach(room => assert.equal(room.querySelector('.contact-stage > img').style.objectFit, 'cover'))
  firstStage.querySelector('img').dispatchEvent(new w.Event('error'))
  assert.equal(firstStage.getAttribute('aria-busy'), 'false')
  assert(first.querySelector('.contact-loading').textContent.includes('无法加载'))
  key(firstStage, 'ArrowRight'); firstStage.querySelector('img').dispatchEvent(new w.Event('load'))
  assert(first.querySelector('.contact-loading').hidden)

  // Browser privacy settings may reject both reading and writing preferences; the gallery still works.
  const get = w.Storage.prototype.getItem, set = w.Storage.prototype.setItem
  w.Storage.prototype.getItem = function () { throw Error('storage blocked') }
  w.Storage.prototype.setItem = function () { throw Error('storage blocked') }
  mount('/photos'); assertLayout('gallery')
  q('[data-photo-layout="reader"]').click(); assertLayout('reader')
  q('[data-photo-layout="masonry"]').click(); assertLayout('masonry')
  w.Storage.prototype.getItem = get; w.Storage.prototype.setItem = set

  // All projects and group headings remain directly readable, with their original destinations.
  const projectSource = source('/projects'), expectedGroups = projectSource.querySelectorAll('.project-grid').length
  const expectedProjects = [...projectSource.querySelectorAll('.project-grid .item')].map(item => ({ name: item.querySelector('.project-name').textContent, description: item.querySelector('.project-desc').textContent, href: item.getAttribute('href'), target: item.getAttribute('target'), rel: item.getAttribute('rel') }))
  const headings = [...projectSource.querySelectorAll('h4')].map(item => [item.id, item.textContent])
  mount('/projects')
  assert.equal(all('.project-ledger').length, expectedGroups)
  assert.equal(all('.project-record').length, expectedProjects.length)
  assert.equal(all('.project-grid').length, 0, 'later groups do not fall back to the old grid')
  all('.project-record').forEach((record, index) => {
    const expected = expectedProjects[index], title = record.querySelector('.project-record-title')
    assert.equal(title.textContent.replace('↗', '').trim(), expected.name.trim())
    assert.equal(record.querySelector('.project-record-description').textContent, expected.description)
    for (const attr of ['href', 'target', 'rel']) assert.equal(title.getAttribute(attr), expected[attr])
    assert(!record.closest('details, [hidden]'), 'projects are never concealed in interaction containers')
    assert.equal(record.querySelector('.project-record-number').textContent, String(index + 1).padStart(2, '0'))
  })
  for (const [id, title] of headings) assert([...d.querySelectorAll('h4')].some(item => item.id === id && item.textContent === title))
  const copy = q('.project-copy'), destination = q('.project-record-title').getAttribute('href')
  copy.click(); await settle()
  assert.equal(copied.pop(), new URL(destination, w.location.href).href)
  assert(copy.textContent.includes('已复制'))
  w.navigator.clipboard.writeText = async () => { throw Error('permission denied') }
  copy.click(); await settle(); assert(copy.textContent.includes('请复制左侧链接'))
  w.navigator.clipboard.writeText = async value => { copied.push(value) }

  // Related notes must come from real body links or the project's own article, never shared footers.
  const project = (name, url) => `<a class="item" href="${url}" target="_blank" rel="noopener"><span class="project-name">${name}</span><span class="project-desc">${name} 解决的问题。</span></a>`
  w.PAGES['/projects'] = `<main><nav class="toc-nav"><a href="#first">工作</a><a href="#second">实验</a></nav><h4 id="first">工作</h4><div class="project-grid">${project('正文项目', 'https://example.test/body')}${project('页脚项目', 'https://example.test/footer')}${project('未关联项目', 'https://example.test/none')}${project('项目自己的文章', '#/posts/self')}</div><h4 id="second">实验</h4><div class="project-grid">${project('第二组项目', 'https://example.test/second')}</div></main>`
  w.PAGES['/posts'] = `<main>${[['body', '正文记录'], ['shared', '公共页脚文章'], ['self', '项目自己的文章']].map(([slug, title]) => `<a class="post-row" href="#/posts/${slug}"><span>${title}</span></a>`).join('')}</main>`
  w.PAGES['/posts/body'] = '<article><p>一段真实的开发取舍。</p><p><a href="https://example.test/body">正文项目</a></p></article>'
  w.PAGES['/posts/shared'] = '<article><p>这篇只是一次散步。</p><p class="share-line"><a href="https://example.test/footer">公共链接</a></p><footer><a href="https://example.test/footer">站点页脚</a></footer><aside class="sponsor-box"><a href="https://example.test/footer">支持链接</a></aside><aside class="article-next"><a href="https://example.test/footer">下一篇推荐</a></aside></article>'
  w.PAGES['/posts/self'] = '<article><p>这是项目自身的说明。</p></article>'
  mount('/projects')
  const records = all('.project-record')
  assert.equal(records.length, 5); assert.equal(all('.project-ledger').length, 2)
  assert.equal(records[0].querySelector('.project-record-notes blockquote').textContent, '一段真实的开发取舍。')
  assert.equal(records[0].querySelector('.project-record-notes a').getAttribute('href'), '#/posts/body')
  assert(!records[1].querySelector('.project-record-notes'), 'share/footer links are not evidence of a related project')
  assert(!records[2].querySelector('.project-record-notes'), 'unrelated projects receive no invented notes')
  assert.equal(records[3].querySelector('.project-record-notes a').getAttribute('href'), '#/posts/self')
  all('.project-record-notes').forEach(notes => assert(!notes.closest('details, [hidden]'), 'available field notes are visible without hovering or expanding'))
  assert(q('.project-directory')); assert(!q('.project-directory').closest('details'))
  records[3].querySelector('.project-copy').click(); await settle()
  assert.equal(copied.pop(), 'https://collections.test/#/posts/self', 'internal project links copy as complete URLs')
  assert.equal(errors.length, 0, errors.map(error => error.message).join('\n'))
  w.Studio.destroy(); w.close()
  global.console.log('PASS', directory, generated ? '(generated content)' : '(prototype content)', `: ${photoCount} photos / ${albumCount} albums, ${expectedProjects.length} projects / ${expectedGroups} groups; home explorer bands/real destinations/photo entry/fallbacks, photo desk handoff/first-album isolation; layouts, source lightbox, independent albums, keyboard, storage failures, visible records, clipboard, honest note links`)
}

;(async () => {
  for (const directory of process.argv.length > 2 ? process.argv.slice(2) : ['public', '..']) {
    await check(directory, false)
    if (fs.existsSync(path.join(directory, 'js/content-generated.js'))) await check(directory, true)
  }
})().catch(error => { console.error(error); process.exit(1) })
