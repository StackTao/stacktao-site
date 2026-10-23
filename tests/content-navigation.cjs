const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { JSDOM } = require('jsdom')

const project = path.resolve(__dirname, '..')
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'stacktao-content-navigation-'))
const retired = route => /^\/(?:talks|giving-talks)(?:\/|$)/.test(route)
const expectedProjects = JSON.parse(fs.readFileSync(path.join(project, 'example-content/projects/projects.json'))).groups.flatMap(group => group.projects.map(item => item.name))
function write(file, contents) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, contents) }
function json(file, value) { write(file, JSON.stringify(value)) }
try {
  const source = path.join(temporary, 'source'), output = path.join(temporary, 'content'), script = path.join(temporary, 'generated.js')
  json(path.join(source, 'content.config.json'), {
    site: { name: 'StackTao & friends', website: 'https://example.test/blog/', description: '文字与 <生活>' },
    navigation: [{ label: '自定文字', route: '/posts', key: 'writing' }, { label: '旧演讲', route: '/talks', key: 'talks' }, { label: '旧详情', route: '/talks/legacy' }],
    footerNavigation: [{ label: '支持', route: '/sponsors' }, { label: '旧资料', route: '/giving-talks' }],
  })
  write(path.join(source, 'posts/2026/example/index.md'), '---\ntitle: 测试文章\ndate: 2026-10-22\n---\n演讲也是文章中的普通讨论，不应被删除。\n\n![测试配图](images/pixel.png)\n')
  write(path.join(source, 'posts/2026/example/images/pixel.png'), 'test asset')
  write(path.join(source, 'projects/projects.json'), fs.readFileSync(path.join(project, 'example-content/projects/projects.json')))
  json(path.join(source, 'albums/local/album.json'), { title: '本地相册', slug: 'local', photos: [{ src: 'images/pixel.png', alt: '本地图片' }] })
  write(path.join(source, 'albums/local/images/pixel.png'), 'test asset')
  write(path.join(source, 'talks/talks.json'), 'legacy malformed data is intentionally ignored')
  execFileSync(process.execPath, ['scripts/generate-content.mjs', '--source=' + source, '--out=' + output, '--script=' + script], { cwd: project })
  const feed = new JSDOM(fs.readFileSync(path.join(output, 'feed.xml'), 'utf8'), { contentType: 'text/xml' }).window.document
  assert.equal(feed.querySelector('channel > title').textContent, 'StackTao & friends')
  assert.equal(feed.querySelector('channel > description').textContent, '文字与 <生活>')
  assert.equal(feed.querySelectorAll('item').length, 1)
  assert.equal(feed.querySelector('item > link').textContent, 'https://example.test/blog/#/posts/example')
  const generated = fs.readFileSync(script, 'utf8')
  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json')))
  assert(!('talks' in manifest), 'the manifest no longer publishes a talks module')
  assert.deepEqual(manifest.navigation.map(item => item.key), ['writing'], 'custom navigation keys survive retired-route filtering')
  assert.deepEqual(manifest.footerNavigation.map(item => item.route), ['/sponsors'])
  assert.deepEqual(manifest.projects.groups.flatMap(group => group.projects.map(item => item.name)), expectedProjects, 'project generation remains intact')
  assert.equal(manifest.albums.length, 1, 'album generation remains intact')

  for (const base of ['', 'stacktao-site/public/']) {
    const dom = new JSDOM('<nav class="nav-right"><a data-nav="old" href="#/talks">旧演讲</a><button data-search>搜索</button></nav><div class="footer-links"></div><script id="source"></script>', { runScripts: 'outside-only', url: 'https://blog.test/' })
    const w = dom.window, d = w.document, tag = d.querySelector('#source')
    tag.setAttribute('data-content-base', base)
    Object.defineProperty(d, 'currentScript', { value: tag, configurable: true })
    w.PAGES = {
      '/talks': '<main>旧演讲</main>', '/talks/legacy': '<main>旧详情</main>', '/giving-talks': '<main>旧资料</main>',
      '/bookmarks': '<main><a href="#/posts/missing"><strong>保留旧标题</strong></a><a href="#/posts/example">有效文章</a></main>',
    }
    w.PAGE_TITLES = { '/talks': '旧演讲', '/talks/legacy': '旧详情' }
    w.eval(generated)
    assert(!Object.keys(w.PAGES).some(retired), 'legacy loaded talk pages are retired')
    assert(!Object.keys(w.PAGE_TITLES).some(retired))
    assert(w.PAGES['/posts/example'].includes('演讲也是文章中的普通讨论'), 'normal prose is preserved')
    const bookmark = d.createElement('template'); bookmark.innerHTML = w.PAGES['/bookmarks']
    assert.equal(bookmark.content.querySelector('strong').textContent, '保留旧标题')
    assert.equal(bookmark.content.querySelectorAll('a').length, 1, 'only a missing article destination is unlinked')
    assert.equal(bookmark.content.querySelector('a').getAttribute('href'), '#/posts/example')
    assert(w.PAGES['/posts/example'].includes(base + 'content/assets/example/images/pixel.png'))
    assert(w.PAGES['/photos'].includes(base + 'content/assets/albums/local/images/pixel.png'))
    assert(fs.existsSync(path.join(output, 'assets/example/images/pixel.png')))
    assert(fs.existsSync(path.join(output, 'assets/albums/local/images/pixel.png')))
    assert(!Array.from(d.querySelectorAll('a')).some(link => retired(link.getAttribute('href').replace(/^#/, ''))))
    w.close()
  }

  const roots = [project]
  if (fs.existsSync(path.join(path.dirname(project), 'js/pages.js'))) roots.push(path.dirname(project))
  var productionPosts
  for (const root of roots) {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://blog.test/' })
    const d = dom.window.document
    assert.deepEqual(Array.from(d.querySelectorAll('.nav-right a[data-nav]'), a => [a.textContent, a.getAttribute('href')]), [['文字', '#/posts'], ['造物', '#/projects'], ['沿途', '#/photos'], ['留言墙', '#/guestbook']])
    assert(d.querySelector('.footer-links a[href="#/sponsors"]'), 'support remains reachable from the footer')
    assert.equal(d.querySelector('[data-search] span').textContent, '逛逛')
    for (const resource of ['css/collections.css', 'css/cabinet.css', 'css/navigation.css', 'css/typography.css', 'js/cabinet.js']) {
      const link = d.querySelector('[href="' + resource + '?v=folio-37"], [src="' + resource + '?v=folio-37"]')
      assert(link, resource + ' is attached to both entrypoints')
      assert(fs.existsSync(path.join(root === project ? path.join(project, 'public') : root, resource)), resource + ' exists')
    }
    const content = d.querySelector('script[src*="content-generated.js"]')
    assert(content, 'both entrypoints load the same author content')
    const base = root === project ? path.join(project, 'public') : root
    assert(fs.existsSync(path.join(base, content.getAttribute('src').split('?')[0])))
    if (root !== project) assert.equal(content.getAttribute('data-content-base'), 'stacktao-site/public/')
    const w = dom.window
    w.eval(fs.readFileSync(path.join(base, 'js/pages.js'), 'utf8'))
    assert(!Object.keys(w.PAGES).some(retired), 'fallback pages contain no retired route')
    Object.defineProperty(d, 'currentScript', { value: content, configurable: true })
    w.eval(fs.readFileSync(path.join(base, content.getAttribute('src').split('?')[0]), 'utf8'))
    const projects = d.createElement('template'); projects.innerHTML = w.PAGES['/projects']
    assert.deepEqual(Array.from(projects.content.querySelectorAll('.project-name'), n => n.textContent), expectedProjects)
    var posts = Object.keys(w.PAGES).filter(route => route.startsWith('/posts/')).sort()
    if (root === project) { assert(posts.length > 0); productionPosts = posts }
    else assert.deepEqual(posts, productionPosts, 'root and production display the same article collection')
    w.close()
  }
  console.log('PASS: retired talks, preserved prose/config, missing article links, root/production content parity, local asset bases, four primary links and cabinet resources')
} finally {
  fs.rmSync(temporary, { recursive: true, force: true })
}
