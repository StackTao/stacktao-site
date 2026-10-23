import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import matter from 'gray-matter'

// Read only scoped Halo content exports, never the complete extensions table (which contains secrets).
export function restoreSnapshot(id, snapshots, seen = new Set()) {
  if (seen.has(id)) throw new Error(`Snapshot cycle: ${id}`)
  const item = snapshots.get(id)
  if (!item) throw new Error(`Missing snapshot: ${id}`)
  seen.add(id)
  const s = item.spec
  if (!s.parentSnapshotName || item.metadata.annotations?.['content.halo.run/keep-raw'] === 'true') return s.rawPatch || ''
  const original = restoreSnapshot(s.parentSnapshotName, snapshots, seen)
  const patches = JSON.parse(s.rawPatch)
  if (!Array.isArray(patches)) throw new Error(`Invalid snapshot patch: ${id}`)
  if (!patches.length) return original
  const lines = original.split('\n')
  for (const patch of [...patches].sort((a, b) => b.source.position - a.source.position)) {
    const { source, target } = patch
    if (JSON.stringify(lines.slice(source.position, source.position + source.lines.length)) !== JSON.stringify(source.lines)) throw new Error(`Snapshot patch mismatch: ${id}`)
    lines.splice(source.position, source.lines.length, ...target.lines)
  }
  return lines.join('\n')
}

export async function importHalo(rows, destination, images = []) {
  const snapshots = new Map(rows.filter(r => r.kind === 'Snapshot').map(r => [r.metadata.name, r]))
  const labels = new Map(rows.filter(r => ['Category', 'Tag'].includes(r.kind)).map(r => [`${r.kind}:${r.metadata.name}`, r.spec.displayName]))
  const posts = rows.filter(r => r.kind === 'Post' && !r.spec.deleted && !r.metadata.deletionTimestamp)
  const slugs = new Set(), redirects = new Map(), report = { published: 0, drafts: 0, skippedDeleted: rows.filter(r => r.kind === 'Post').length - posts.length, articles: [] }
  const plans = posts.map(p => {
    const s = p.spec, id = p.metadata.name
    const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug) && s.slug.length <= 100 ? s.slug : `halo-${id}`
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slugs.has(slug)) throw new Error(`Invalid or duplicate slug: ${slug}`)
    slugs.add(slug)
    const published = s.publish === true && s.visible === 'PUBLIC'
    const snapshotId = published ? s.releaseSnapshot : (s.headSnapshot || s.releaseSnapshot)
    const body = restoreSnapshot(snapshotId, snapshots)
    const permalink = p.status?.permalink || `/archives/${s.slug}`
    if (published) redirects.set(permalink, `/#/posts/${slug}`)
    return { p, slug, published, snapshotId, body, permalink }
  })
  // Refuse an existing output; imports are staged and never overwrite live content.
  await fs.mkdir(destination)
  for (const { p, slug, published, snapshotId, body, permalink } of plans) {
    const s = p.spec
    const timestamp = s.publishTime || p.metadata.creationTimestamp
    const date = new Date(timestamp).toISOString().slice(0, 10)
    const categories = (s.categories || []).map(id => labels.get(`Category:${id}`)).filter(Boolean)
    const tags = [...new Set([...(s.tags || []).map(id => labels.get(`Tag:${id}`)).filter(Boolean), ...categories])]
    const directory = path.join(destination, 'posts', date.slice(0, 4), slug)
    await fs.mkdir(directory, { recursive: true })
    let markdown = body, cover = s.cover || '', copied = 0
    for (const image of images) {
      if (!image.file || (!markdown.includes(image.url) && cover !== image.url)) continue
      const filename = crypto.createHash('sha256').update(image.url).digest('hex').slice(0, 16) + path.extname(image.file)
      await fs.mkdir(path.join(directory, 'images'), { recursive: true })
      await fs.copyFile(image.file, path.join(directory, 'images', filename))
      markdown = markdown.split(image.url).join(`images/${filename}`)
      if (cover === image.url) cover = `images/${filename}`
      copied++
    }
    for (const [old, route] of redirects) {
      for (const prefix of ['https://stacktao.cn', 'https://sutao.site', 'https://blog.sutao.site', '']) {
        // Rewrite only complete link attributes/Markdown destinations, not arbitrary prose or code.
        const from = prefix + old
        markdown = markdown.split(`href="${from}"`).join(`href="${route}"`).split(`](${from})`).join(`](${route})`)
      }
    }
    const metadata = { title: s.title, slug, date, summary: s.excerpt?.raw || p.status?.excerpt || '', tags, categories,
      cover, format: snapshots.get(snapshotId).spec.rawType.toLowerCase() === 'html' ? 'html' : 'markdown', draft: !published, featured: !!s.pinned, haloId: p.metadata.name, haloSlug: s.slug,
      haloPermalink: permalink, haloPublishedAt: timestamp, haloSnapshot: snapshotId, haloFormat: snapshots.get(snapshotId).spec.rawType }
    await fs.writeFile(path.join(directory, 'index.md'), matter.stringify(markdown, metadata), { flag: 'wx' })
    report[published ? 'published' : 'drafts']++
    report.articles.push({ id: p.metadata.name, title: s.title, slug, date, published, characters: body.length, copiedImages: copied, permalink })
  }
  const nginx = [...redirects].map(([encoded, route]) => {
    const old = decodeURIComponent(encoded)
    if (!old.startsWith('/') || /["\\$\r\n]/.test(old)) throw new Error(`Unsafe redirect: ${old}`)
    return `location = "${old}" { return 301 "${route}"; }`
  }).join('\n') + '\n'
  await fs.writeFile(path.join(destination, 'halo-redirects.conf'), nginx)
  await fs.writeFile(path.join(destination, 'report.json'), JSON.stringify(report, null, 2))
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [source, destination, imageManifest] = process.argv.slice(2)
  if (!source || !destination) throw new Error('Usage: node scripts/import-halo.mjs CONTENT.ndjson NEW_OUTPUT [IMAGE_RESULTS.json]')
  const rows = (await fs.readFile(source, 'utf8')).trim().split('\n').map(line => JSON.parse(line))
  const images = imageManifest ? JSON.parse(await fs.readFile(imageManifest, 'utf8')).map(i => ({ ...i, file: i.file && path.resolve(path.dirname(imageManifest), i.file) })) : []
  const report = await importHalo(rows, destination, images)
  console.log(`Imported ${report.published} public posts, ${report.drafts} drafts; skipped ${report.skippedDeleted} deleted posts.`)
}
