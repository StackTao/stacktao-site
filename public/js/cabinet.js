/* Small collections keep their own character; the content is never a hidden panel. */
(function () {
  var disposers = [], pinMotions = new Set(), pinMotionByElement = new WeakMap()
  function el(tag, className, text) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (text != null) node.textContent = text
    return node
  }
  function button(text, className) { var node = el('button', className, text); node.type = 'button'; return node }
  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback } catch (_) { return fallback } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true } catch (_) { return false } }
  function destroy() {
    pinMotions.forEach(function (animation) { animation.cancel() }); pinMotions.clear()
    disposers.splice(0).forEach(function (dispose) { dispose() })
  }
  function snapPin(pin) {
    var previous = pinMotionByElement.get(pin)
    if (previous) { previous.cancel(); pinMotions.delete(previous) }
    if (!pin.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    var animation = pin.animate([
      { transform: 'translateY(6px) scaleY(.88)', offset: 0 },
      { transform: 'translateY(-5px) rotate(-4deg) scaleY(1.04)', offset: .36 },
      { transform: 'translateY(2px) rotate(2deg)', offset: .62 },
      { transform: 'translateY(-1px) rotate(-.8deg)', offset: .82 },
      { transform: 'none', offset: 1 }
    ], { duration: 560, easing: 'cubic-bezier(.2,.7,.25,1)' })
    pinMotionByElement.set(pin, animation); pinMotions.add(animation)
    animation.onfinish = function () { pinMotions.delete(animation) }
  }
  function copyControl(text, label) {
    var control = button(label, 'cabinet-copy'), timer
    control.addEventListener('click', async function () {
      clearTimeout(timer)
      try { await navigator.clipboard.writeText(text); control.textContent = '已复制 ✓' }
      catch (_) { control.textContent = '请选中文字复制' }
      timer = setTimeout(function () { control.textContent = label }, 2000)
    })
    control.setAttribute('aria-live', 'polite')
    disposers.push(function () { clearTimeout(timer) })
    return control
  }
  function bookmarks(main) {
    var source = Array.from(main.querySelectorAll(':scope > div')).filter(function (row) { return row.querySelector('a.item') })
    if (!source.length) return
    var shelf = el('section', 'bookmark-shelf'), bar = el('section', 'cabinet-toolbar')
    var filter = button('只看钉住的', 'bookmark-filter'), status = el('output', 'cabinet-status'), pinnedOnly = false
    status.setAttribute('aria-live', 'polite'); filter.setAttribute('aria-pressed', 'false')
    bar.append(el('span', 'cabinet-label', 'LINKS WORTH KEEPING'), filter, status)
    source[0].before(bar, shelf)
    var key = 'stacktao-pinned-links', stored = read(key, []), pinned = Array.isArray(stored) ? stored : []
    var rows = source.map(function (old, index) {
      var anchor = old.querySelector('a.item'), href = anchor.getAttribute('href'), row = el('article', 'bookmark-file')
      var pin = button('', 'bookmark-pin'), body = el('div', 'bookmark-file-body'), origin = el('span', 'bookmark-origin')
      var label = href.charAt(0) === '#' ? '本站 · 文字' : new URL(href, location.href).hostname.replace(/^www\./, '')
      origin.textContent = label; anchor.removeAttribute('style'); anchor.classList.add('bookmark-title')
      body.append(origin, anchor)
      var note = old.querySelector('p'); if (note) { note.removeAttribute('style'); body.appendChild(note) }
      row.append(el('span', 'bookmark-file-number', String(index + 1).padStart(2, '0')), body, pin)
      pin.addEventListener('click', function () {
        var next = pinned.includes(href) ? pinned.filter(function (item) { return item !== href }) : pinned.concat(href)
        if (!write(key, next)) { status.textContent = '浏览器暂时无法保存钉住的书签'; return }
        pinned = next; update(); if (row.hidden) filter.focus({ preventScroll: true }); else snapPin(pin)
      })
      old.remove(); shelf.appendChild(row)
      return { node: row, pin: pin, href: href, title: anchor.textContent.trim() }
    })
    function update() {
      var total = 0
      rows.forEach(function (row) {
        var selected = pinned.includes(row.href)
        row.pin.setAttribute('aria-pressed', String(selected)); row.pin.setAttribute('aria-label', (selected ? '取消钉住：' : '钉住：') + row.title)
        row.pin.textContent = selected ? '已钉住' : '钉住'; row.node.classList.toggle('is-pinned', selected)
        row.node.hidden = pinnedOnly && !selected; if (!row.node.hidden) total++
      })
      filter.setAttribute('aria-pressed', String(pinnedOnly)); filter.textContent = pinnedOnly ? '显示全部' : '只看钉住的'
      status.textContent = total ? total + ' 条收藏' : '还没有钉住的书签'
    }
    filter.addEventListener('click', function () { pinnedOnly = !pinnedOnly; update() }); update()
  }
  function tools(main) {
    var headings = Array.from(main.querySelectorAll(':scope > h2[id]'))
    if (!headings.length) return
    var original = main.querySelector('.toc-fixed'); if (original) original.remove()
    var layout = el('div', 'tool-inventory'), index = el('nav', 'tool-index'), body = el('div', 'tool-inventory-body')
    index.setAttribute('aria-label', '手边物件目录'); index.appendChild(el('span', 'cabinet-label', 'ON MY DESK'))
    headings[0].before(layout); layout.append(index, body)
    headings.forEach(function (heading, i) {
      var section = el('section', 'tool-section'), next = heading.nextSibling
      section.appendChild(heading)
      while (next && !(next.nodeType === 1 && next.tagName === 'H2')) { var item = next; next = next.nextSibling; section.appendChild(item) }
      body.appendChild(section)
      var jump = el('a', '', String(i + 1).padStart(2, '0') + '  ' + heading.textContent); jump.href = '#' + heading.id
      jump.addEventListener('click', function (event) {
        event.preventDefault(); heading.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
        heading.tabIndex = -1; heading.focus({ preventScroll: true })
      })
      index.appendChild(jump)
    })
    var commands = body.querySelector('#cli')
    if (commands) commands.parentNode.querySelectorAll('li').forEach(function (item) {
      var code = item.querySelector('code'); if (!code) return
      item.classList.add('tool-command'); item.appendChild(copyControl(code.textContent, '复制'))
    })
    var active = null
    function track() {
      var current = headings[0]
      headings.forEach(function (heading) { if (heading.getBoundingClientRect().top <= 200) current = heading })
      if (active === current) return
      active = current
      index.querySelectorAll('a').forEach(function (anchor) {
        if (anchor.getAttribute('href') === '#' + current.id) anchor.setAttribute('aria-current', 'location')
        else anchor.removeAttribute('aria-current')
      })
    }
    window.addEventListener('scroll', track, { passive: true }); track()
    disposers.push(function () { window.removeEventListener('scroll', track) })
  }
  function media(main) {
    var cards = Array.from(main.querySelectorAll('.media-card'))
    if (!cards.length) return
    var shelf = el('section', 'media-shelf'); shelf.setAttribute('aria-label', '书、影像与声音'); cards[0].before(shelf)
    cards.forEach(function (card, index) {
      var kind = (card.querySelector('.op50') || {}).textContent || ''
      card.dataset.mediaKind = kind.toLowerCase(); card.classList.add('media-volume')
      var image = card.querySelector('img')
      if (image) {
        var sleeve = el('div', 'media-sleeve'); image.before(sleeve); sleeve.appendChild(image)
        sleeve.appendChild(el('span', 'media-sleeve-type', kind === 'Book' ? 'READ' : kind === 'Album' ? 'LISTEN' : 'WATCH'))
      }
      card.prepend(el('span', 'media-volume-index', '0' + (index + 1)))
      shelf.appendChild(card)
    })
  }
  function programmes(main, route) {
    var rows = Array.from(main.querySelectorAll(':scope > [data-lang]'))
    if (!rows.length) return
    var series = el('section', route === '/podcasts' ? 'sound-programme' : 'stream-programme')
    rows[0].before(series)
    rows.forEach(function (row, index) {
      var disc = row.querySelector('.podcast-disc'); if (disc) disc.remove()
      row.classList.remove('podcast-sleeve', 'podcast-episode'); row.classList.add('programme-record'); row.removeAttribute('style')
      var meta = row.querySelector('.op50'), title = row.querySelector('a.item')
      if (!title) {
        var textNodes = Array.from(row.childNodes).filter(function (node) { return node.nodeType === 3 && node.textContent.trim() })
        title = el('span', 'programme-title', textNodes.map(function (node) { return node.textContent.trim() }).join(' '))
        textNodes.forEach(function (node) { node.remove() }); row.prepend(title)
      } else { title.classList.add('programme-title'); title.removeAttribute('style') }
      var minutes = 0, match = meta && meta.textContent.match(/(?:(\d+)h\s*)?(\d+)min/)
      if (match) minutes = Number(match[1] || 0) * 60 + Number(match[2])
      var measure = el('div', 'programme-measure'); measure.setAttribute('aria-hidden', 'true')
      measure.appendChild(el('span', 'programme-number', String(index + 1).padStart(2, '0')))
      if (match) {
        measure.style.setProperty('--record-length', Math.max(15, Math.min(100, minutes / (route === '/podcasts' ? 65 : 140) * 100)) + '%')
        measure.appendChild(el('span', 'programme-track'))
      }
      row.prepend(measure)
      if (title.tagName === 'A') row.appendChild(el('span', 'programme-destination', title.getAttribute('href').startsWith('#/posts/') ? '阅读相关文字 ↗' : '打开节目 ↗'))
      else row.appendChild(el('span', 'programme-destination', '节目记录 · 暂无链接'))
      series.appendChild(row)
    })
  }
  function sponsors(main) {
    var circles = main.querySelector('.circles')
    if (!circles) return
    circles.classList.add('sponsor-signatures')
    circles.querySelectorAll('a[title]').forEach(function (anchor) {
      var name = anchor.getAttribute('title'); anchor.textContent = name; anchor.setAttribute('aria-label', name + ' · 查看支持计划')
    })
    main.querySelectorAll('[data-tab]').forEach(function (tab) { tab.textContent = tab.dataset.tab === 'circles' ? '每一个名字' : '支持分组' })
  }
  function chat(main) {
    main.classList.add('conversation-page')
    var alert = main.querySelector('.alert'); if (alert) alert.classList.add('conversation-status')
    main.querySelectorAll('a[href="#/chat"],a[href="#/chat-zh"]').forEach(function (anchor) { anchor.classList.add('conversation-language') })
  }
  function feed(main) {
    var groups = Array.from(main.querySelectorAll(':scope > [data-year-group]'))
    var collections = (groups.length ? groups : [main]).map(function (container) {
      var rows = groups.length ? Array.from(container.querySelectorAll(':scope > a.post-row')) : Array.from(container.querySelectorAll(':scope > div')).filter(function (row) { return row.querySelector('a.item') })
      return { container: container, rows: rows }
    })
    var remaining = collections.reduce(function (total, collection) { return total + collection.rows.length }, 0)
    collections.forEach(function (collection) {
      if (!collection.rows.length) return
      var list = el('section', 'feed-ledger'), year = collection.container.querySelector(':scope > .year-label')
      if (year) list.setAttribute('aria-label', year.textContent.trim() + ' 年更新')
      collection.rows[0].before(list)
      collection.rows.forEach(function (row) {
        var anchor = row.tagName === 'A' ? row : row.querySelector('a.item')
        var meta = row.querySelector('.meta, .op50'), entry = row.tagName === 'A' ? el('div') : row
        entry.classList.add('feed-entry'); entry.removeAttribute('style'); anchor.removeAttribute('style')
        anchor.classList.remove('post-row')
        if (entry !== row) entry.appendChild(anchor)
        entry.prepend(el('span', 'feed-entry-number', String(remaining--).padStart(2, '0')))
        if (meta) { meta.classList.add('feed-entry-date'); entry.appendChild(meta) }
        list.appendChild(entry)
      })
    })
  }
  function decorate(view, route) {
    var main = view.querySelector('main'), map = { '/bookmarks': bookmarks, '/use': tools, '/media': media, '/podcasts': programmes, '/streams': programmes, '/sponsors': sponsors, '/chat': chat, '/chat-zh': chat, '/feed': feed }
    if (!main || !map[route] || main.dataset.cabinet) return
    main.dataset.cabinet = route.slice(1); map[route](main, route)
  }
  window.Cabinet = { decorate: decorate, destroy: destroy }
})()
