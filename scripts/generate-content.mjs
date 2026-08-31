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
  return `/content/assets/${slug}/${value.replace(/^\.\//, '')}`
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
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

function createPrototypeContentScript(articles) {
  const generated = createPrototypePages(articles)
  const search = articles.map((article) => ({
    title: article.title,
    kind: '文章',
    href: `#${article.route}`,
  }))
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
    return item.kind !== 'Blog' && item.kind !== '文章'
  })
  window.SEARCH_INDEX = ${JSON.stringify(search)}.concat(existing)
})()\n`
}

async function main() {
  const configPath = path.join(sourceDir, 'content.config.json')
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
  await fs.mkdir(outputDir, { recursive: true })
  await Promise.all([
    fs.rm(path.join(outputDir, 'posts'), { recursive: true, force: true }),
    fs.rm(path.join(outputDir, 'assets'), { recursive: true, force: true }),
  ])
  await fs.mkdir(path.join(outputDir, 'posts'), { recursive: true })

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
    navigation: config.navigation || [],
    projects: config.projects || [],
    articles: summaries,
  }
  const search = summaries.map((article) => ({
    title: article.title,
    summary: article.summary,
    tags: article.tags,
    route: article.route,
    date: article.date,
  }))
  const contentScript = createPrototypeContentScript(articles)

  await Promise.all([
    fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    fs.writeFile(path.join(outputDir, 'search-index.json'), `${JSON.stringify(search, null, 2)}\n`),
    fs.mkdir(path.dirname(contentScriptPath), { recursive: true })
      .then(() => fs.writeFile(contentScriptPath, contentScript)),
  ])
  console.log(`Generated ${articles.length} articles from ${sourceDir}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
