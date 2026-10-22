const { JSDOM } = require('jsdom')
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')

async function check(directory, reduced) {
  const directoryRoutes = ['/', '/posts', '/notes', '/podcasts', '/streams', '/projects', '/demos', '/photos', '/use', '/bookmarks', '/media', '/guestbook', '/sponsors', '/chat-zh', '/feed', '/chat', '/collective']
  const dom = new JSDOM(`<!doctype html><html><body>
    <div class="app-shell"><nav class="nav-right"><button data-search>搜索</button><a href="#/posts" data-nav="blog">文章</a><a id="custom-home" href="#/" data-nav="home" data-route="/">自定首页</a><a id="custom-posts" href="#/posts" data-nav="writing" data-route="/posts">自定文章</a><a id="custom-override" href="#/projects" data-nav="blog" data-route="/projects">自定造物</a></nav><div id="view" tabindex="-1"></div></div>
    <div class="search-mask" role="dialog" aria-modal="true" aria-hidden="true"><div class="search-panel"><div class="search-field"><input aria-controls="search-results"></div><div id="search-results" class="search-hits"></div></div></div>
    <div class="lightbox" role="dialog" aria-hidden="true"><button class="lightbox-close">关闭</button><img><div class="lightbox-cap"></div></div>
  </body></html>`, { url: 'https://blog.test/#/posts', runScripts: 'outside-only', pretendToBeVisual: true })
  const w = dom.window, d = w.document, q = selector => d.querySelector(selector)
  let y = 0, lastScrolled = null, guestbookMounts = 0, dirty = false, allowLeave = false, leavePrompts = 0
  Object.defineProperty(w, 'scrollY', { get: () => y })
  w.scrollTo = (x, top) => { y = typeof x === 'object' ? x.top : top }
  w.HTMLElement.prototype.scrollIntoView = function () { lastScrolled = this }
  w.matchMedia = () => ({ matches: reduced })
  w.Guestbook = { mount(root) { if (root.querySelector('[data-guestbook]')) guestbookMounts++ }, destroy() {}, confirmLeave() { if (!dirty) return true; leavePrompts++; return allowLeave } }
  w.PAGES = {
    '/': '<main><h1>首页</h1></main>',
    '/posts': '<main><h1>文章</h1><a id="post-link" href="#/posts/story">阅读文章</a></main>',
    '/posts/story': '<article class="prose"><h1>山间来信</h1><p class="post-meta">2026</p><p>正文里有 onlybody 关键词。</p><a id="anchor-link" href="#chapter">去章节</a><h2 id="chapter">章节</h2></article>',
    '/projects': '<main><h1>项目</h1></main>',
    '/posts/unsafe-title': '<article class="prose"><h1>字面标题</h1><p>literalmarkup</p></article>',
    '/photos': '<main><h1>相册</h1><div class="photo-grid"><button id="photo-trigger"><img src="one.jpg" alt="山"></button><img src="two.jpg" alt="海"></div></main>',
    '/guestbook': '<main data-guestbook><textarea id="draft">未完成的草稿</textarea></main>',
    '/404': '<main><h1>404</h1></main>',
  }
  directoryRoutes.forEach(route => { if (!w.PAGES[route]) w.PAGES[route] = '<main><h1>栏目</h1></main>' })
  w.PAGES['/talks'] = '<main><h1>Retired talks</h1></main>'
  w.PAGES['/talks/legacy'] = '<article><h1>Retired detail</h1></article>'
  w.PAGES['/giving-talks'] = '<main><h1>Retired speaker</h1></main>'
  w.SEARCH_INDEX = [
    { title: '山间来信', kind: 'Blog', href: '#/posts/story' },
    { title: '<img src=x onerror=alert(1)>', kind: 'Blog', href: '#/posts/unsafe-title' },
    { title: 'unsafe', href: 'javascript:alert(1)' },
    { title: 'missing', href: '#/missing' },
    { title: 'Retired talks', kind: 'Talk', href: '#/talks' },
  ]
  w.eval(fs.readFileSync(path.join(directory, 'js/site.js'), 'utf8'))
  const settle = () => new Promise(resolve => setTimeout(resolve, reduced ? 40 : 190))
  const key = (el, value, options = {}) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options }))
  function open() { q('[data-search]').focus(); q('[data-search]').click() }
  function query(value) { q('.search-field input').value = value; q('.search-field input').dispatchEvent(new w.Event('input')) }
  async function navigate(href) {
    const a = d.createElement('a'); a.href = href; d.body.appendChild(a); a.click(); a.remove(); await settle()
  }
  function scroll(top) { y = top; w.dispatchEvent(new w.Event('scroll')) }

  assert.equal(q('#custom-posts').getAttribute('aria-current'), 'page', 'configured nav routes work independently of legacy keys')
  assert(!q('#custom-home').hasAttribute('aria-current'), 'the configured root route does not match every page')
  assert(!q('#custom-override').hasAttribute('aria-current'), 'configured routes take precedence over legacy keys')
  open()
  assert(q('.app-shell').inert, 'search makes the background inert')
  assert(!q('.search-mask').inert, 'opening makes the dialog interactive immediately')
  assert.equal(q('.search-mask').classList.contains('is-entering'), !reduced, 'only normal motion gets the initial directory reveal')
  assert.equal(d.activeElement, q('.search-field input'))
  assert.equal(q('.search-mask').getAttribute('aria-label'), '博客目录与搜索')
  assert.deepEqual(Array.from(d.querySelectorAll('.search-hit'), a => a.getAttribute('href')), directoryRoutes.map(route => '#' + route), 'empty search exposes every available directory route in reading order')
  assert.equal(d.querySelectorAll('.search-directory-group').length, 5)
  assert(Array.from(d.querySelectorAll('.search-hit > span')).every(title => /[\u4e00-\u9fff]/.test(title.textContent)), 'directory labels are Chinese')
  assert(!q('.search-hit[href^="javascript:"]'))
  key(d.activeElement, 'ArrowUp')
  assert(!q('.search-mask').classList.contains('is-entering'), 'keyboard selection reveals the requested option immediately')
  assert.equal(q('.search-hit[aria-selected=true]').getAttribute('href'), '#/collective')
  key(d.activeElement, 'ArrowDown')
  assert.equal(q('.search-hit[aria-selected=true]').getAttribute('href'), '#/')
  key(d.activeElement, 'Tab')
  assert.equal(d.activeElement, q('.search-close'))
  key(d.activeElement, 'Tab', { shiftKey: true })
  assert.equal(d.activeElement, q('.search-field input'))
  key(d.activeElement, 'Escape')
  assert(!q('.app-shell').inert)
  assert.equal(d.activeElement, q('[data-search]'))
  assert(q('.search-mask').inert, 'the fading dialog cannot take focus after closing')
  assert(!q('.search-mask').classList.contains('is-entering'), 'closing cancels the entrance')

  open(); query('literalmarkup')
  assert(!q('.search-mask').classList.contains('is-entering'), 'typing interrupts the reveal so new search results do not replay it')
  assert(!q('.search-hit img'), 'indexed titles are rendered as text, not markup')
  assert.equal(q('.search-hit span').textContent, '<img src=x onerror=alert(1)>')
  query('onlybody 关键词')
  assert.equal(d.querySelectorAll('.search-hit').length, 1, 'search finds multiple words in article bodies')
  assert.equal(q('.search-hit span').textContent, '山间来信')
  assert(q('.search-hit p').textContent.includes('onlybody'))
  key(d.activeElement, 'Enter', { isComposing: true })
  assert.equal(w.location.hash, '#/posts', 'IME confirmation does not trigger a route')
  key(d.activeElement, 'Enter'); await settle()
  assert.equal(w.location.hash, '#/posts/story')
  assert.equal(q('#custom-posts').getAttribute('aria-current'), 'page', 'configured navigation remains active on nested routes')
  assert(!q('.search-mask').classList.contains('is-open'))
  assert(!q('.app-shell').inert)
  assert.equal(d.activeElement, q('#view'), 'route changes move reading focus to content')
  const chapter = q('#chapter')
  q('#anchor-link').click()
  assert.equal(lastScrolled, chapter, 'normal in-page anchors keep working without a route render')
  assert.equal(q('#chapter'), chapter)

  scroll(500)
  await navigate('#/posts')
  assert.equal(y, 0, 'explicit navigation starts the new page at the top')
  scroll(360)
  await navigate('#/posts/story')
  assert.equal(y, 0)
  w.history.back(); await settle()
  assert.equal(w.location.hash, '#/posts')
  assert.equal(y, 360, 'browser Back restores the list position')
  w.history.forward(); await settle()
  assert.equal(w.location.hash, '#/posts/story')
  assert.equal(y, 0, 'browser Forward restores the article position')

  open(); query('不存在的关键词')
  assert.equal(d.querySelectorAll('.search-hit').length, 0)
  assert(q('.search-status').textContent.includes('没有找到'))
  query('山间来信'); key(d.activeElement, 'Enter'); await settle()
  assert(!q('.search-mask').classList.contains('is-open'), 'selecting the current route also closes search')
  await navigate('#/guestbook')
  q('#draft').focus()
  key(d.activeElement, 'k', { ctrlKey: true })
  assert.equal(q('#draft').value, '未完成的草稿')
  key(d.activeElement, 'Escape')
  assert.equal(d.activeElement, q('#draft'))
  assert.equal(guestbookMounts, 1, 'search never remounts or replaces an active guestbook draft')

  const draft = q('#draft')
  dirty = true
  await navigate('#/photos')
  assert.equal(leavePrompts, 1)
  assert.equal(w.location.hash, '#/guestbook')
  assert.equal(q('#draft'), draft, 'canceling link navigation preserves the same live draft DOM')
  w.location.hash = '#/projects'; await settle()
  assert.equal(leavePrompts, 2)
  assert.equal(w.location.hash, '#/guestbook', 'a rejected hash change restores the visible wall URL')
  assert.equal(q('#draft'), draft)
  w.history.back(); await settle()
  assert.equal(w.location.hash, '#/guestbook', 'browser Back cancellation keeps the active wall')
  assert.equal(q('#draft'), draft)
  assert.equal(guestbookMounts, 1, 'canceling leave never remounts the guestbook')
  allowLeave = true
  const beforeBack = leavePrompts
  w.history.back(); await settle()
  assert.equal(w.location.hash, '#/projects', 'Back can be retried and approved after cancellation')
  assert.equal(leavePrompts, beforeBack + 1)
  await navigate('#/guestbook')
  const beforeLink = leavePrompts
  await navigate('#/photos')
  assert.equal(leavePrompts, beforeLink + 1, 'approved links do not prompt again at hashchange')
  dirty = false
  await navigate('#/guestbook')
  const emptyPrompts = leavePrompts
  await navigate('#/photos')
  assert.equal(leavePrompts, emptyPrompts, 'an empty tool does not show a leave prompt')
  q('#photo-trigger').focus(); q('.photo-grid img').click()
  assert(q('.app-shell').inert)
  assert.equal(q('.lightbox-count').textContent, '1 / 2')
  assert(q('.lightbox-previous').disabled)
  key(d.activeElement, 'Tab')
  assert.equal(d.activeElement, q('.lightbox-next'))
  q('.lightbox-next').click()
  assert(q('.lightbox').classList.contains('is-open'), 'photo controls do not bubble into backdrop dismissal')
  assert.equal(q('.lightbox-count').textContent, '2 / 2')
  assert(q('.lightbox-next').disabled)
  q('.lightbox-previous').click()
  assert.equal(q('.lightbox-count').textContent, '1 / 2')
  key(d.activeElement, 'Escape')
  assert(!q('.app-shell').inert)
  assert.equal(d.activeElement, q('#photo-trigger'))
  await navigate('#/projects')
  assert.equal(q('#custom-override').getAttribute('aria-current'), 'page')
  await navigate('#/postscripts')
  assert(!q('#custom-posts').hasAttribute('aria-current'), 'a shared prefix without a slash is not a nested route')
  await navigate('#/')
  assert.equal(q('#custom-home').getAttribute('aria-current'), 'page')
  for (const route of ['/talks', '/talks/legacy', '/giving-talks']) {
    await navigate('#' + route)
    assert.equal(q('#view h1').textContent, '404', 'retired module cannot render even if stale content is loaded')
  }
  open()
  assert.equal(q('.search-mask').classList.contains('is-entering'), !reduced, 'reopening starts a fresh, optional reveal')
  if (!reduced) {
    await new Promise(resolve => setTimeout(resolve, 750))
    assert(!q('.search-mask').classList.contains('is-entering'), 'the reveal ends and leaves a still reading surface')
    assert(q('.search-mask').classList.contains('is-open'), 'finishing an entrance never dismisses the directory')
  }
  query(''); assert(!q('.search-mask').classList.contains('is-entering'), 'clearing a query does not replay the opening sequence')
  query('Retired talks')
  assert.equal(d.querySelectorAll('.search-hit').length, 0, 'retired module is absent from search')
  w.close()
  console.log('PASS', directory, reduced ? '(reduced motion)' : '(normal motion)', ': safe body search, empty state, keyboard/IME, modal focus, history positions, anchors, guestbook draft isolation and leave protection, visible photo navigation')
}

(async () => {
  for (const directory of process.argv.length > 2 ? process.argv.slice(2) : [path.join(__dirname, '../public')]) for (const reduced of [true, false]) await check(directory, reduced)
})().catch(error => { console.error(error); process.exit(1) })
