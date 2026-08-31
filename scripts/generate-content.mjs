import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { marked } from 'marked'
import * as cheerio from 'cheerio'
import sanitizeHtml from 'sanitize-html'

const projectRoot = path.resolve(import.meta.dirname, '..')
const args = Object.fromEntries(process.argv.slice(2).map((value) => {
  const match = value.match(/^--([^=]+)=(.*)$/)
  return match ? [match[1], match[2]] : [value.replace(/^--/, ''), true]
}))
const sourceDir = path.resolve(projectRoot, args.source || process.env.CONTENT_DIR || 'example-content')
const outputDir = path.resolve(projectRoot, args.out || 'public/content')
const contentScriptPath = path.resolve(projectRoot, args.script || 'public/js/content-generated.js')

const safeTags = [
  'p', 'br', 'hr', 'h2', 'h3', 'h4', 'strong', 'em', 'del', 'blockquote',
  'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub', 'details', 'summary',
]

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section'
}

function assetUrl(value, slug) {
  if (!value || /^(?:[a-z]+:|\/)/i.test(value)) return value
  return `content/assets/${slug}/${value.replace(/^\.\//, '')}`
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function readJsonOptional(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  }
  catch (error) {
    if (error.code === 'ENOENT') return null
    throw new Error(`无法读取 JSON: ${file}\n${error.message}`)
  }
}

function safeHref(value, fallback = '#/') {
  const href = String(value || '').trim()
  if (/^#\/[a-z0-9/_-]*$/i.test(href)) return href
  if (/^\/[a-z0-9/_-]*$/i.test(href)) return `#${href}`
  if (/^(?:https?:|mailto:)/i.test(href)) return href
  return fallback
}

function linkAttributes(value) {
  const href = safeHref(value)
  return `href="${escapeHtml(href)}"${/^https?:/i.test(href) ? ' target="_blank" rel="noreferrer"' : ''}`
}

function safeColor(value) {
  const color = String(value || '')
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#6e6961'
}

function normalizeNavigation(items, includeKey = false) {
  if (!Array.isArray(items)) return []
  return items
    .filter((item) => item && item.enabled !== false && item.label && /^\/[a-z0-9/_-]*$/i.test(String(item.route || '')))
    .map((item) => ({
      label: String(item.label),
      route: String(item.route),
      ...(includeKey ? { key: String(item.key || slugify(item.label)) } : {}),
    }))
}

function editorialDate(value, includeYear = false) {
  const date = new Date(`${value}T00:00:00Z`)
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  const day = date.getUTCDate()
  return `${month} ${day}${includeYear ? `, ${date.getUTCFullYear()}` : ''}`
}

async function findArticleFiles(directory) {
  const files = []
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const target = path.join(current, entry.name)
      if (entry.isDirectory()) await walk(target)
      else if (entry.name === 'index.md') files.push(target)
    }
  }
  await walk(path.join(directory, 'posts'))
  return files
}

function readingMinutes(markdown) {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>|[#>*_`\[\]()!-]/g, '')
  const chinese = (plain.match(/[\p{Script=Han}]/gu) || []).length
  const words = (plain.replace(/[\p{Script=Han}]/gu, ' ').match(/[A-Za-z0-9]+/g) || []).length
  return Math.max(1, Math.ceil(chinese / 350 + words / 220))
}

async function renderArticle(file) {
  const raw = await fs.readFile(file, 'utf8')
  const parsed = matter(raw)
  const data = parsed.data
  const slug = String(data.slug || path.basename(path.dirname(file)))
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`文章目录必须使用英文 slug: ${file}`)
  if (!data.title || !data.date) throw new Error(`文章缺少 title 或 date: ${file}`)

  const $ = cheerio.load(marked.parse(parsed.content, { gfm: true }), null, false)
  const outline = []
  const usedIds = new Map()
  $('h2, h3').each((_, element) => {
    const heading = $(element)
    const text = heading.text().trim()
    const base = slugify(text)
    const seen = usedIds.get(base) || 0
    usedIds.set(base, seen + 1)
    const id = seen ? `${base}-${seen + 1}` : base
    heading.attr('id', id)
    outline.push({ id, text, level: Number(element.tagName.slice(1)) })
  })
  $('img').each((_, element) => {
    const image = $(element)
    image.attr('src', assetUrl(image.attr('src'), slug))
    image.attr('loading', 'lazy')
  })

  const html = sanitizeHtml($.html(), {
    allowedTags: safeTags,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'loading', 'width', 'height'],
      h2: ['id'],
      h3: ['id'],
      h4: ['id'],
      code: ['class'],
      th: ['align'],
      td: ['align'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  })

  const articleDir = path.dirname(file)
  const imagesDir = path.join(articleDir, 'images')
  try {
    await fs.access(imagesDir)
    await fs.mkdir(path.join(outputDir, 'assets', slug), { recursive: true })
    await fs.cp(imagesDir, path.join(outputDir, 'assets', slug, 'images'), { recursive: true })
  } catch {
    // Images are optional.
  }

  const date = new Date(data.date)
  if (Number.isNaN(date.getTime())) throw new Error(`文章日期无效: ${file}`)
  return {
    slug,
    route: `/posts/${slug}`,
    title: String(data.title),
    date: date.toISOString().slice(0, 10),
    updated: data.updated ? new Date(data.updated).toISOString().slice(0, 10) : null,
    summary: String(data.summary || ''),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    lang: String(data.lang || 'zh'),
    cover: assetUrl(data.cover, slug) || null,
    discussion: data.discussion ? String(data.discussion) : '',
    draft: data.draft === true,
    featured: data.featured === true,
    minutes: readingMinutes(parsed.content),
    outline,
    html,
  }
}

async function loadAlbums() {
  const albumsDir = path.join(sourceDir, 'albums')
  let entries
  try {
    entries = await fs.readdir(albumsDir, { withFileTypes: true })
  }
  catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }

  const albums = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const directory = path.join(albumsDir, entry.name)
    const data = await readJsonOptional(path.join(directory, 'album.json'))
    if (!data) continue
    const slug = String(data.slug || entry.name)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`相册目录必须使用英文 slug: ${directory}`)
    albums.push({
      title: String(data.title || slug),
      slug,
      date: String(data.date || ''),
      description: String(data.description || ''),
      photos: Array.isArray(data.photos) ? data.photos : [],
      directory,
    })
  }
  return albums.sort((a, b) => b.date.localeCompare(a.date))
}

async function publishAlbumAssets(albums) {
  for (const album of albums) {
    for (const photo of album.photos) {
      const source = String(photo.src || '').replace(/^\.\//, '')
      if (!source || /^(?:https?:)?\/\//i.test(source)) continue
      const sourcePath = path.resolve(album.directory, source)
      const relative = path.relative(album.directory, sourcePath)
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`相册图片路径越界: ${source}`)
      const target = path.join(outputDir, 'assets', 'albums', album.slug, relative)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.copyFile(sourcePath, target)
    }
  }
}

function photoUrl(photo, album) {
  const source = String(photo.src || '').trim()
  if (/^https?:\/\//i.test(source)) return source
  const relative = source.replace(/^\.\//, '').split(path.sep).join('/')
  return `content/assets/albums/${album.slug}/${relative}`
}

function createProjectsPage(data) {
  if (!data || !Array.isArray(data.groups)) return null
  const groups = data.groups.map((group) => {
    const projects = Array.isArray(group.projects) ? group.projects : []
    return `<h4 id="${escapeHtml(slugify(group.title || 'projects'))}">${escapeHtml(group.title || '项目')}</h4>
      <div class="project-grid">${projects.map((project) => `<a class="item" ${linkAttributes(project.url || '#/projects')}>
        <span class="project-icon" style="background:${safeColor(project.color)}"></span>
        <span><span class="project-name">${escapeHtml(project.name)}</span>
          <div class="project-desc">${escapeHtml(project.summary)}${project.status ? ` · ${escapeHtml(project.status)}` : ''}</div>
        </span>
      </a>`).join('')}</div>`
  }).join('')
  return `<main class="page prose slide-enter-content">
    <h1>${escapeHtml(data.title || '项目')}</h1>
    ${data.description ? `<p class="op50">${escapeHtml(data.description)}</p>` : ''}
    ${groups}
  </main>`
}

function createTalksPage(data) {
  if (!data || !Array.isArray(data.talks)) return null
  const talks = data.talks.map((talk) => {
    const events = Array.isArray(talk.events) ? talk.events : []
    return `<div class="talk-block" data-lang="${escapeHtml(talk.lang || 'zh')}">
      ${talk.series ? `<div class="talk-series">${escapeHtml(talk.series)}</div>` : ''}
      <div class="talk-title"><a ${linkAttributes(talk.url || '#/talks')}>${escapeHtml(talk.title)}</a></div>
      ${talk.description ? `<p class="talk-desc">${escapeHtml(talk.description)}</p>` : ''}
      ${events.map((event) => `<div class="talk-pres"><strong>${escapeHtml(event.name)}</strong>${event.language ? ` <span class="lang-tag">${escapeHtml(event.language)}</span>` : ''}
        <div class="op50">${[event.date, event.location].filter(Boolean).map(escapeHtml).join(' · ')}</div>
      </div>
      <div class="pres-links">${(Array.isArray(event.links) ? event.links : []).map((link) => `<a class="btn" ${linkAttributes(link.url)}>${escapeHtml(link.label)}</a>`).join('')}</div>`).join('')}
      <hr>
    </div>`
  }).join('')
  return `<main class="page prose slide-enter-content">
    <h1>${escapeHtml(data.title || '演讲')}</h1>
    ${data.description ? `<p class="op50">${escapeHtml(data.description)}</p>` : ''}
    ${talks}
  </main>`
}

function createPhotosPage(albums) {
  if (!albums.length) return null
  let photoIndex = 0
  const sections = albums.map((album) => `<section class="photo-album">
    <div class="prose">
      <h2>${escapeHtml(album.title)}</h2>
      ${album.description ? `<p class="op50">${escapeHtml(album.description)}</p>` : ''}
    </div>
    <div class="photo-grid photos">${album.photos.map((photo) => {
      photoIndex += 1
      const place = [photo.place, photo.date].filter(Boolean).join(', ')
      return `<img src="${escapeHtml(photoUrl(photo, album))}" alt="${escapeHtml(photo.alt || '')}" data-place="${escapeHtml(place)}" data-photo-index="${photoIndex}" loading="lazy" decoding="async" />`
    }).join('')}</div>
  </section>`).join('')
  return `<main class="page slide-enter-content" style="max-width:1100px;margin:0 auto">
    <div class="prose"><h1>相册</h1><p>记录途中值得停下来的光线与空间。</p></div>
    <div class="photo-toolbar">
      <button data-gallery="cover">裁切</button>
      <button data-gallery="contain">完整</button>
    </div>
    ${sections}
  </main>`
}

function createStructuredPages(projects, talks, albums) {
  const pages = {}
  const titles = {}
  const projectPage = createProjectsPage(projects)
  const talksPage = createTalksPage(talks)
  const photosPage = createPhotosPage(albums)
  if (projectPage) {
    pages['/projects'] = projectPage
    titles['/projects'] = `${projects.title || '项目'} - StackTao`
  }
  if (talksPage) {
    pages['/talks'] = talksPage
    titles['/talks'] = `${talks.title || '演讲'} - StackTao`
  }
  if (photosPage) {
    pages['/photos'] = photosPage
    titles['/photos'] = '相册 - StackTao'
  }
  return { pages, titles }
}

function createStructuredSearch(projects, talks, albums) {
  const projectItems = projects && Array.isArray(projects.groups)
    ? projects.groups.flatMap((group) => Array.isArray(group.projects) ? group.projects : []).map((project) => ({
        title: String(project.name || ''), kind: '项目', href: safeHref(project.url || '/projects'),
      }))
    : []
  const talkItems = talks && Array.isArray(talks.talks)
    ? talks.talks.map((talk) => ({ title: String(talk.title || ''), kind: '演讲', href: safeHref(talk.url || '/talks') }))
    : []
  const albumItems = albums.map((album) => ({ title: album.title, kind: '相册', href: '#/photos' }))
  return projectItems.concat(talkItems, albumItems).filter((item) => item.title)
}

function createPrototypePages(articles) {
  const pages = {}
  const titles = {}

  for (const article of articles) {
    const discussion = article.discussion
      ? `<p class="share-line">&gt; ${escapeHtml(article.discussion)}</p>`
      : ''
    pages[article.route] = `<article class="page prose slide-enter-content">
      <h1>${escapeHtml(article.title)}</h1>
      <p class="post-meta">${editorialDate(article.date, true)} · ${article.minutes}min</p>
      ${article.html}
      ${discussion}
    </article>`
    titles[article.route] = `${article.title} - StackTao`
  }

  const years = new Map()
  for (const article of articles) {
    const year = article.date.slice(0, 4)
    if (!years.has(year)) years.set(year, [])
    years.get(year).push(article)
  }
  const groups = Array.from(years.entries()).map(([year, entries]) => `
    <div data-year-group>
      <div class="year-label">${year}</div>
      ${entries.map((article) => `<a class="post-row item" data-lang="${escapeHtml(article.lang)}" href="#${article.route}">
        <span>${escapeHtml(article.title)}</span>
        <span class="meta">${editorialDate(article.date)} · ${article.minutes}min</span>
      </a>`).join('')}
    </div>`).join('')

  pages['/posts'] = `<main class="page prose slide-enter-content">${groups}</main>`
  titles['/posts'] = '文章 - StackTao'
  return { pages, titles }
}

function createPrototypeContentScript(articles, config, projects, talks, albums) {
  const generated = createPrototypePages(articles)
  const structured = createStructuredPages(projects, talks, albums)
  Object.assign(generated.pages, structured.pages)
  Object.assign(generated.titles, structured.titles)
  const navigation = normalizeNavigation(config.navigation, true)
  const footerNavigation = normalizeNavigation(config.footerNavigation)
  const search = articles.map((article) => ({
    title: article.title,
    kind: '文章',
    href: `#${article.route}`,
  })).concat(createStructuredSearch(projects, talks, albums))
  return `(function () {
  var pages = window.PAGES || {}
  var titles = window.PAGE_TITLES || {}
  var generatedPages = ${JSON.stringify(generated.pages)}
  var generatedTitles = ${JSON.stringify(generated.titles)}
  Object.keys(generatedPages).forEach(function (route) { pages[route] = generatedPages[route] })
  Object.keys(generatedTitles).forEach(function (route) { titles[route] = generatedTitles[route] })
  window.PAGES = pages
  window.PAGE_TITLES = titles
  var existing = (window.SEARCH_INDEX || []).filter(function (item) {
    var managedKind = ['Blog', '文章', 'Project', '项目', 'Talk', '演讲', '相册'].indexOf(item.kind) >= 0
    var managedPage = ['#/projects', '#/talks', '#/photos'].indexOf(item.href) >= 0
    return !managedKind && !managedPage
  })
  window.SEARCH_INDEX = ${JSON.stringify(search)}.concat(existing)
  window.CONTENT_CONFIG = ${JSON.stringify({ site: config.site || {}, navigation, footerNavigation })}

  var headerNav = document.querySelector('.nav-right')
  var generatedNavigation = ${JSON.stringify(navigation)}
  if (headerNav && generatedNavigation.length) {
    Array.prototype.slice.call(headerNav.querySelectorAll('a[data-nav]')).forEach(function (link) { link.remove() })
    var firstControl = headerNav.querySelector('[data-search]')
    generatedNavigation.forEach(function (item) {
      var link = document.createElement('a')
      link.href = '#' + item.route
      link.setAttribute('data-nav', item.key)
      link.setAttribute('data-route', item.route)
      link.setAttribute('aria-label', item.label)
      link.textContent = item.label
      headerNav.insertBefore(link, firstControl)
    })
  }

  var footerNav = document.querySelector('.footer-links')
  var generatedFooterNavigation = ${JSON.stringify(footerNavigation)}
  if (footerNav && generatedFooterNavigation.length) {
    footerNav.textContent = ''
    generatedFooterNavigation.forEach(function (item) {
      var link = document.createElement('a')
      link.href = '#' + item.route
      link.textContent = item.label
      footerNav.appendChild(link)
    })
  }
})()\n`
}

async function main() {
  const configPath = path.join(sourceDir, 'content.config.json')
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
  const [projects, talks, albums] = await Promise.all([
    readJsonOptional(path.join(sourceDir, 'projects', 'projects.json')),
    readJsonOptional(path.join(sourceDir, 'talks', 'talks.json')),
    loadAlbums(),
  ])
  await fs.mkdir(outputDir, { recursive: true })
  await Promise.all([
    fs.rm(path.join(outputDir, 'posts'), { recursive: true, force: true }),
    fs.rm(path.join(outputDir, 'assets'), { recursive: true, force: true }),
  ])
  await fs.mkdir(path.join(outputDir, 'posts'), { recursive: true })
  await publishAlbumAssets(albums)

  const files = await findArticleFiles(sourceDir)
  const rendered = await Promise.all(files.map(renderArticle))
  const articles = rendered
    .filter((article) => !article.draft)
    .sort((a, b) => b.date.localeCompare(a.date))

  await Promise.all(articles.map((article) => fs.writeFile(
    path.join(outputDir, 'posts', `${article.slug}.json`),
    `${JSON.stringify(article, null, 2)}\n`,
  )))

  const summaries = articles.map(({ html, outline, draft, ...article }) => article)
  const manifest = {
    generatedAt: new Date().toISOString(),
    site: config.site,
    navigation: normalizeNavigation(config.navigation, true),
    footerNavigation: normalizeNavigation(config.footerNavigation),
    projects: projects || null,
    talks: talks || null,
    albums: albums.map(({ directory, photos, ...album }) => ({ ...album, photoCount: photos.length })),
    articles: summaries,
  }
  const search = summaries.map((article) => ({
    title: article.title,
    summary: article.summary,
    tags: article.tags,
    route: article.route,
    date: article.date,
  })).concat(createStructuredSearch(projects, talks, albums).map((item) => ({
    title: item.title,
    kind: item.kind,
    route: item.href,
  })))
  const contentScript = createPrototypeContentScript(articles, config, projects, talks, albums)

  await Promise.all([
    fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    fs.writeFile(path.join(outputDir, 'search-index.json'), `${JSON.stringify(search, null, 2)}\n`),
    fs.mkdir(path.dirname(contentScriptPath), { recursive: true })
      .then(() => fs.writeFile(contentScriptPath, contentScript)),
  ])
  console.log(`Generated ${articles.length} articles, ${albums.length} albums, ${projects ? 'projects' : 'no projects'}, and ${talks ? 'talks' : 'no talks'} from ${sourceDir}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
