import {
  ArrowUp,
  ArrowUpRight,
  Menu,
  Moon,
  Search,
  Sun,
  X,
  createIcons,
} from 'lucide'
import './style.css'
import { initInkScene } from './inkscape.js'

const content = document.querySelector('#content')
const shell = document.querySelector('[data-shell]')
const outline = document.querySelector('[data-outline]')
const searchDialog = document.querySelector('[data-search-dialog]')
const searchInput = document.querySelector('[data-search-input]')
const searchResults = document.querySelector('[data-search-results]')
const drawer = document.querySelector('[data-mobile-drawer]')
const backToTop = document.querySelector('[data-back-to-top]')
const articleCache = new Map()
let manifest = null
let outlineHeadings = []
let searchItems = []
let lastRoute = ''

function icons() {
  createIcons({
    icons: { ArrowUp, ArrowUpRight, Menu, Moon, Search, Sun, X },
    attrs: { 'stroke-width': 1.55 },
  })
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '#'
  } catch {
    return '#'
  }
}

function routePath() {
  const route = window.location.pathname.replace(/\/+$/, '')
  return route || '/'
}

function dateParts(value) {
  const [year, month, day] = value.split('-').map(Number)
  return { year, month, day }
}

const chineseDigits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九']

function chineseYear(year) {
  return String(year).split('').map((digit) => chineseDigits[Number(digit)]).join('')
}

function chineseNumber(value) {
  if (value < 10) return chineseDigits[value]
  if (value === 10) return '十'
  if (value < 20) return `十${chineseDigits[value % 10]}`
  return `${chineseDigits[Math.floor(value / 10)]}十${value % 10 ? chineseDigits[value % 10] : ''}`
}

function editorialDate(value) {
  const { year, month, day } = dateParts(value)
  return `${chineseYear(year)}年${chineseNumber(month)}月${chineseNumber(day)}日`
}

function renderArticleRows(articles) {
  return articles.map((article) => `
    <a class="post-row" href="${article.route}" data-link>
      <span class="post-index" aria-hidden="true"></span>
      <span class="post-copy">
        <strong>${escapeHtml(article.title)}</strong>
        <small>${escapeHtml(article.summary)}</small>
      </span>
      <span class="post-date">${String(dateParts(article.date).month).padStart(2, '0')}.${String(dateParts(article.date).day).padStart(2, '0')}</span>
    </a>
  `).join('')
}

function homeView() {
  const site = manifest.site
  const featured = manifest.articles.filter((article) => article.featured)
  const articles = (featured.length ? featured : manifest.articles).slice(0, 4)
  return `
    <section class="home-hero">
      <p class="eyebrow">StackTao · Index</p>
      <h1>${escapeHtml(site.title)}</h1>
      <span class="title-rule" aria-hidden="true"></span>
      <p class="hero-intro">${escapeHtml(site.description)}</p>
      <div class="hero-signature">
        <span>StackTao</span>
        <span class="seal" aria-label="StackTao 印章">ST</span>
      </div>
    </section>
    <section class="home-section">
      <div class="section-label"><span>近日写作 · ${chineseYear(new Date().getFullYear())}</span></div>
      <div class="post-list">${renderArticleRows(articles)}</div>
      <a class="text-command" href="/posts" data-link>查看全部文章 <i data-lucide="arrow-up-right" aria-hidden="true"></i></a>
    </section>
  `
}

function postsView() {
  const grouped = manifest.articles.reduce((groups, article) => {
    const year = dateParts(article.date).year
    if (!groups.has(year)) groups.set(year, [])
    groups.get(year).push(article)
    return groups
  }, new Map())
  const groups = Array.from(grouped.entries()).sort(([a], [b]) => b - a)
  return `
    <section class="page-head">
      <p class="eyebrow">Writing · Archive</p>
      <h1>文章</h1>
      <p>关于工具、界面与长期维护的记录。</p>
    </section>
    <div class="archive">
      ${groups.map(([year, articles]) => `
        <section class="year-group">
          <div class="section-label"><span>丙午 · ${chineseYear(year)}</span></div>
          <div class="post-list">${renderArticleRows(articles)}</div>
        </section>
      `).join('')}
    </div>
  `
}

function projectsView() {
  const projects = manifest.projects || []
  return `
    <section class="page-head">
      <p class="eyebrow">Selected · Work</p>
      <h1>项目</h1>
      <p>做少量值得长期维护的工具。</p>
    </section>
    <div class="project-list">
      ${projects.map((project, index) => `
        <a class="project-row" href="${escapeHtml(safeExternalUrl(project.url))}" target="_blank" rel="noreferrer">
          <span class="project-number">${String(index + 1).padStart(2, '0')}</span>
          <span>
            <strong>${escapeHtml(project.name)}</strong>
            <small>${escapeHtml(project.summary)}</small>
          </span>
          <span class="project-status">${escapeHtml(project.status)}</span>
          <i data-lucide="arrow-up-right" aria-hidden="true"></i>
        </a>
      `).join('') || '<p class="empty-state">项目清单尚未发布。</p>'}
    </div>
  `
}

function aboutView() {
  const site = manifest.site
  return `
    <section class="page-head">
      <p class="eyebrow">About · StackTao</p>
      <h1>关于</h1>
    </section>
    <article class="about-copy prose">
      <p class="about-lead">${escapeHtml(site.description)}</p>
      <h2>现在</h2>
      <p>${escapeHtml(site.now)}</p>
      <h2>联系</h2>
      <p><a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email)}</a></p>
    </article>
  `
}

async function loadArticle(slug) {
  if (articleCache.has(slug)) return articleCache.get(slug)
  const response = await fetch(`/content/posts/${encodeURIComponent(slug)}.json`)
  if (!response.ok) throw new Error('Article not found')
  const article = await response.json()
  articleCache.set(slug, article)
  return article
}

function articleView(article) {
  const { year } = dateParts(article.date)
  return `
    <article class="article-page">
      <header class="article-head">
        <p class="eyebrow">文章 · ${chineseYear(year)}</p>
        <h1>${escapeHtml(article.title)}</h1>
        <span class="title-rule" aria-hidden="true"></span>
        <div class="article-meta">
          <time datetime="${article.date}">${editorialDate(article.date)}</time>
          <span>约${chineseNumber(article.minutes)}分钟</span>
        </div>
        <p class="article-summary">${escapeHtml(article.summary)}</p>
      </header>
      <div class="prose">${article.html}</div>
      <footer class="article-end">
        <span class="ending-line"></span>
        <span>StackTao</span>
        <span class="seal" aria-label="StackTao 印章">ST</span>
      </footer>
    </article>
  `
}

function notFoundView() {
  return `
    <section class="not-found">
      <p class="eyebrow">Error · 404</p>
      <h1>此页留白</h1>
      <p>这里没有找到内容。</p>
      <a class="text-command" href="/" data-link>回到首页</a>
    </section>
  `
}

function setOutline(items) {
  outlineHeadings = []
  shell.classList.toggle('has-outline', items.length > 0)
  if (!items.length) {
    outline.innerHTML = ''
    return
  }
  outline.innerHTML = `
    <p class="outline-label">本页 · 目录</p>
    <nav>
      ${items.map((item, index) => `
        <a href="#${encodeURIComponent(item.id)}" class="outline-link ${item.level === 3 ? 'is-nested' : ''}" data-outline-link="${escapeHtml(item.id)}" ${index === 0 ? 'aria-current="true"' : ''}>
          <span></span>${escapeHtml(item.text)}
        </a>
      `).join('')}
    </nav>
  `
  outlineHeadings = items.map((item) => document.getElementById(item.id)).filter(Boolean)
}

function updateActiveNav(route) {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const key = link.dataset.nav
    const active = key === 'home' ? route === '/' : route === `/${key}` || route.startsWith(`/${key}/`)
    link.classList.toggle('is-active', active)
    if (active) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  })
}

function updateOutline() {
  if (!outlineHeadings.length) return
  let active = outlineHeadings[0]?.id
  for (const heading of outlineHeadings) {
    if (heading.getBoundingClientRect().top <= 240) active = heading.id
  }
  outline.querySelectorAll('[data-outline-link]').forEach((link) => {
    if (link.dataset.outlineLink === active) link.setAttribute('aria-current', 'true')
    else link.removeAttribute('aria-current')
  })
}

function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0
  const percent = Math.round(progress * 100)
  document.querySelector('[data-reading-line]').style.transform = `scaleX(${progress})`
  document.querySelector('[data-reading-bar]').style.transform = `scaleX(${progress})`
  document.querySelector('[data-reading-value]').value = `${String(percent).padStart(2, '0')}%`
  document.querySelector('.rail-progress').setAttribute('aria-valuenow', String(percent))
  backToTop.classList.toggle('is-visible', window.scrollY > 520)
  updateOutline()
}

function updateSiteData() {
  const site = manifest.site
  document.querySelector('[data-site-role]').textContent = site.role
  document.querySelector('[data-site-bio]').textContent = site.bio
  document.querySelector('[data-site-now]').textContent = site.now
}

async function render({ focus = false } = {}) {
  const route = routePath()
  const changed = route !== lastRoute
  lastRoute = route
  content.classList.remove('is-entering')
  if (changed) content.classList.add('is-leaving')
  if (changed) await new Promise((resolve) => setTimeout(resolve, 110))

  let html
  let title = manifest.site.name
  let toc = []
  try {
    if (route === '/') html = homeView()
    else if (route === '/posts') {
      html = postsView()
      title = `文章 - ${manifest.site.name}`
    } else if (route === '/projects') {
      html = projectsView()
      title = `项目 - ${manifest.site.name}`
    } else if (route === '/about') {
      html = aboutView()
      title = `关于 - ${manifest.site.name}`
    } else if (route.startsWith('/posts/')) {
      const article = await loadArticle(route.slice('/posts/'.length))
      html = articleView(article)
      title = `${article.title} - ${manifest.site.name}`
      toc = article.outline || []
    } else {
      html = notFoundView()
      title = `404 - ${manifest.site.name}`
    }
  } catch {
    html = notFoundView()
    title = `404 - ${manifest.site.name}`
  }

  content.innerHTML = html
  document.title = title
  setOutline(toc)
  updateActiveNav(route)
  content.classList.remove('is-leaving')
  void content.offsetWidth
  content.classList.add('is-entering')
  icons()
  if (changed) window.scrollTo({ top: 0, behavior: 'instant' })
  updateProgress()
  if (focus) content.focus({ preventScroll: true })
}

function navigate(href) {
  const url = new URL(href, window.location.origin)
  if (url.pathname === routePath()) return
  window.history.pushState({}, '', url.pathname)
  render({ focus: true })
  closeDrawer()
}

function openDrawer() {
  drawer.classList.add('is-open')
  drawer.setAttribute('aria-hidden', 'false')
  document.body.classList.add('overlay-open')
}

function closeDrawer() {
  drawer.classList.remove('is-open')
  drawer.setAttribute('aria-hidden', 'true')
  if (!searchDialog.open) document.body.classList.remove('overlay-open')
}

function openSearch() {
  searchDialog.showModal()
  document.body.classList.add('overlay-open')
  searchInput.value = ''
  searchResults.innerHTML = '<p>输入标题、摘要或标签开始搜索。</p>'
  requestAnimationFrame(() => searchInput.focus())
}

function closeSearch() {
  if (searchDialog.open) searchDialog.close()
  document.body.classList.remove('overlay-open')
}

function runSearch(query) {
  const normalized = query.trim().toLocaleLowerCase('zh-CN')
  if (!normalized) {
    searchResults.innerHTML = '<p>输入标题、摘要或标签开始搜索。</p>'
    return
  }
  const hits = searchItems.filter((item) => [item.title, item.summary, ...item.tags]
    .join(' ').toLocaleLowerCase('zh-CN').includes(normalized)).slice(0, 8)
  searchResults.innerHTML = hits.length ? hits.map((item) => `
    <a href="${item.route}" data-link class="search-hit">
      <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.summary)}</small></span>
      <time>${item.date}</time>
    </a>
  `).join('') : '<p>没有找到相关内容。</p>'
}

function toggleTheme(event) {
  const nextDark = !document.documentElement.classList.contains('dark')
  const apply = () => {
    document.documentElement.classList.toggle('dark', nextDark)
    localStorage.setItem('stacktao-theme', nextDark ? 'dark' : 'light')
    document.querySelector('meta[name="theme-color"]').content = nextDark ? '#141310' : '#f5f2ea'
    window.dispatchEvent(new CustomEvent('stacktao:theme'))
  }
  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    apply()
    return
  }
  const x = event.clientX || window.innerWidth - 40
  const y = event.clientY || 40
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const transition = document.startViewTransition(apply)
  transition.ready.then(() => document.documentElement.animate(
    { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
    { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' },
  ))
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-link]')
  if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && link.origin === window.location.origin) {
    event.preventDefault()
    closeSearch()
    navigate(link.href)
    return
  }
  const tocLink = event.target.closest('[data-outline-link]')
  if (tocLink) {
    event.preventDefault()
    document.getElementById(tocLink.dataset.outlineLink)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})

document.querySelector('[data-search-open]').addEventListener('click', openSearch)
document.querySelector('[data-theme-toggle]').addEventListener('click', toggleTheme)
document.querySelector('[data-menu-toggle]').addEventListener('click', openDrawer)
document.querySelectorAll('[data-menu-close]').forEach((button) => button.addEventListener('click', closeDrawer))
searchInput.addEventListener('input', () => runSearch(searchInput.value))
searchDialog.addEventListener('click', (event) => {
  if (event.target === searchDialog) closeSearch()
})
searchDialog.addEventListener('close', () => document.body.classList.remove('overlay-open'))
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
window.addEventListener('popstate', () => render())
window.addEventListener('scroll', updateProgress, { passive: true })
window.addEventListener('resize', updateProgress)
document.addEventListener('keydown', (event) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    if (!searchDialog.open) openSearch()
  } else if (event.key === '/' && !typing && !searchDialog.open) {
    event.preventDefault()
    openSearch()
  } else if (event.key === 'Escape') {
    closeDrawer()
  }
})

async function boot() {
  icons()
  initInkScene(document.querySelector('[data-inkscape]'))
  try {
    const response = await fetch('/content/manifest.json')
    if (!response.ok) throw new Error('Manifest unavailable')
    manifest = await response.json()
    searchItems = manifest.articles
    updateSiteData()
    await render()
  } catch {
    content.innerHTML = `
      <section class="load-error">
        <p class="eyebrow">Content · Offline</p>
        <h1>内容尚未生成</h1>
        <p>请先运行 <code>npm run content</code>。</p>
      </section>
    `
  }
}

boot()
