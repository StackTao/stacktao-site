(function () {
  window.__SPA__ = true

  function applyDark(on) {
    document.documentElement.classList.toggle('dark', on)
    localStorage.setItem('color-scheme', on ? 'dark' : 'light')
  }

  var motionQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

  function prefersReducedMotion() {
    return !!(motionQuery && motionQuery.matches)
  }

  if (!document.documentElement.classList.contains('dark')) {
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    var setting = localStorage.getItem('color-scheme') || localStorage.getItem('vueuse-color-scheme') || 'auto'
    if (setting === 'dark' || (prefersDark && setting !== 'light'))
      document.documentElement.classList.add('dark')
  }

  window.toggleDark = function (event) {
    var next = !document.documentElement.classList.contains('dark')
    if (!document.startViewTransition || prefersReducedMotion()) {
      applyDark(next)
      return
    }
    var x = event && event.clientX != null ? event.clientX : innerWidth / 2
    var y = event && event.clientY != null ? event.clientY : innerHeight / 2
    var endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    var transition = document.startViewTransition(function () { applyDark(next) })
    transition.ready.then(function () {
      var clipPath = ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + endRadius + 'px at ' + x + 'px ' + y + 'px)']
      document.documentElement.animate(
        { clipPath: next ? clipPath.slice().reverse() : clipPath },
        {
          duration: 400,
          easing: 'ease-out',
          fill: 'forwards',
          pseudoElement: next ? '::view-transition-old(root)' : '::view-transition-new(root)',
        },
      )
    }).catch(function () {
      // 快速路由切换会主动取消主题过渡；主题状态已经写入，无需重试。
    })
  }

  var nprogress = document.getElementById('nprogress')
  var nbar = nprogress && nprogress.querySelector('.bar')
  var nTimer = 0
  var nValue = 0

  function nStart() {
    if (!nbar) return
    clearTimeout(nTimer)
    nValue = 0.08
    nprogress.style.opacity = '1'
    nbar.style.transition = 'none'
    nbar.style.width = '0%'
    void nbar.offsetWidth
    nbar.style.transition = 'width .2s ease'
    nbar.style.width = '18%'
    var tick = function () {
      nValue += (0.92 - nValue) * 0.08
      nbar.style.width = nValue * 100 + '%'
      nTimer = setTimeout(tick, 180)
    }
    nTimer = setTimeout(tick, 80)
  }

  function nDone() {
    if (!nbar) return
    clearTimeout(nTimer)
    nbar.style.transition = 'width .2s ease'
    nbar.style.width = '100%'
    nTimer = setTimeout(function () {
      nprogress.style.opacity = '0'
      setTimeout(function () {
        nbar.style.transition = 'none'
        nbar.style.width = '0%'
      }, 280)
    }, 220)
  }

  function hrefToRoute(href) {
    if (!href) return null
    if (/^(https?:|mailto:|javascript:)/i.test(href)) return null
    if (href.indexOf('://') !== -1) return null
    if (href.charAt(0) === '#' && href.indexOf('#/') !== 0) return href
    var clean = href.split('#')[0]
    if (href.indexOf('#/') === 0) {
      var hashRoute = href.slice(1).replace(/\/$/, '') || '/'
      return hashRoute
    }
    clean = clean.replace(/^\.\.\//, '').replace(/^\.\//, '')
    if (!clean || clean === 'index.html') return '/'
    clean = clean.replace(/\.html$/, '')
    if (clean.charAt(0) !== '/') clean = '/' + clean
    return clean
  }

  function currentRoute() {
    var hash = location.hash || '#/'
    if (hash.indexOf('#/') !== 0) return '/'
    var route = hash.slice(1).replace(/\/$/, '') || '/'
    return route
  }

  function animateElementIn(element, distance) {
    if (!element || prefersReducedMotion() || !element.animate) return
    var offset = distance == null ? 4 : distance
    element.animate(
      [
        { opacity: 0, transform: 'translateY(' + offset + 'px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 220, easing: 'ease-out' },
    )
  }

  function updateNav(route) {
    document.querySelectorAll('.nav-right a[data-nav]').forEach(function (a) {
      var key = a.getAttribute('data-nav')
      var active = false
      if (key === 'blog') active = route === '/posts' || route.indexOf('/posts/') === 0 || route === '/notes' || route.indexOf('/notes/') === 0 || route === '/podcasts' || route === '/streams'
      if (key === 'projects') active = route === '/projects'
      if (key === 'talks') active = route === '/talks' || route.indexOf('/talks/') === 0
      if (key === 'photos') active = route === '/photos'
      if (key === 'sponsors') active = route === '/sponsors' || route === '/collective'
      a.classList.toggle('nav-active', active)
      if (active) a.setAttribute('aria-current', 'page')
      else a.removeAttribute('aria-current')
    })
  }

  var cyclicalYears = {
    2021: '辛丑',
    2022: '壬寅',
    2023: '癸卯',
    2024: '甲辰',
    2025: '乙巳',
    2026: '丙午',
  }
  var chineseDigits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  var chineseMonths = {
    Jan: '一月',
    Feb: '二月',
    Mar: '三月',
    Apr: '四月',
    May: '五月',
    Jun: '六月',
    Jul: '七月',
    Aug: '八月',
    Sep: '九月',
    Oct: '十月',
    Nov: '十一月',
    Dec: '十二月',
  }

  function chineseYear(year) {
    return String(year).split('').map(function (digit) {
      return chineseDigits[Number(digit)]
    }).join('')
  }

  function editorialYear(year) {
    return (cyclicalYears[year] ? cyclicalYears[year] + ' · ' : '') + chineseYear(year)
  }

  function chineseNumber(value) {
    var number = Number(value)
    if (number < 10) return chineseDigits[number]
    if (number === 10) return '十'
    if (number < 20) return '十' + chineseDigits[number - 10]
    if (number < 100) {
      var ones = number % 10
      return chineseDigits[Math.floor(number / 10)] + '十' + (ones ? chineseDigits[ones] : '')
    }
    return String(value)
  }

  function chineseDay(value) {
    var day = Number(value)
    if (day <= 10) return '初' + chineseNumber(day)
    if (day < 20) return chineseNumber(day)
    if (day === 20) return '二十'
    if (day < 30) return '廿' + chineseDigits[day - 20]
    if (day === 30) return '三十'
    return '三十一'
  }

  function formatEditorialMeta(value, yearOverride) {
    var article = value.match(/^([A-Z][a-z]{2})\s+(\d+),\s+(\d{4})\s*·\s*(\d+)min(.*)$/)
    if (article && chineseMonths[article[1]]) {
      var year = Number(article[3])
      var yearName = cyclicalYears[year] || chineseYear(year)
      return yearName + '年' + chineseMonths[article[1]] + chineseDay(article[2]) + ' · 约' + chineseNumber(article[4]) + '分钟' + article[5]
    }
    var list = value.match(/^([A-Z][a-z]{2})\s+(\d+)\s*·\s*(\d+)min(.*)$/)
    if (list && chineseMonths[list[1]]) {
      var yearPrefix = yearOverride ? (cyclicalYears[yearOverride] || chineseYear(yearOverride)) + '年' : ''
      return yearPrefix + chineseMonths[list[1]] + chineseDay(list[2]) + ' · 约' + chineseNumber(list[3]) + '分钟' + list[4]
    }
    return value
  }

  function findRouteYear(route) {
    var pageKeys = ['/posts', '/notes']
    for (var pageIndex = 0; pageIndex < pageKeys.length; pageIndex++) {
      var html = (window.PAGES || {})[pageKeys[pageIndex]]
      if (!html) continue
      var template = document.createElement('template')
      template.innerHTML = html
      var links = template.content.querySelectorAll('.post-row')
      for (var linkIndex = 0; linkIndex < links.length; linkIndex++) {
        if (hrefToRoute(links[linkIndex].getAttribute('href')) !== route) continue
        var group = links[linkIndex].closest('[data-year-group]')
        var label = group && group.querySelector('.year-label')
        var year = label && Number(label.textContent.trim())
        if (year) return year
      }
    }
    return 0
  }

  function makeSignature(className) {
    var signature = document.createElement('div')
    signature.className = className
    var name = document.createElement('span')
    name.textContent = 'StackTao'
    var seal = document.createElement('span')
    seal.className = 'seal-mark'
    seal.textContent = 'ST'
    seal.setAttribute('aria-hidden', 'true')
    signature.appendChild(name)
    signature.appendChild(seal)
    return signature
  }

  function decorateSubnav(root) {
    root.querySelectorAll('.subnav').forEach(function (subnav) {
      subnav.remove()
    })
  }

  var sidebarOutlineHeadings = []
  var sidebarOutlineButtons = []

  function updateSidebarOutlineActive() {
    if (!sidebarOutlineButtons.length) return
    var active = 0
    var threshold = Math.min(innerHeight * 0.32, 240)
    for (var i = 0; i < sidebarOutlineHeadings.length; i++) {
      if (sidebarOutlineHeadings[i].getBoundingClientRect().top <= threshold) active = i
      else break
    }
    sidebarOutlineButtons.forEach(function (button, index) {
      button.classList.toggle('is-active', index === active)
      if (index === active) button.setAttribute('aria-current', 'location')
      else button.removeAttribute('aria-current')
    })
  }

  function decorateSidebarOutline(article) {
    var profile = document.querySelector('.nav-profile')
    if (!profile) return
    var existing = profile.querySelector('.nav-profile-outline')
    if (existing) existing.remove()
    profile.classList.toggle('is-article-outline', !!article)
    profile.setAttribute('aria-label', article ? '文章大纲' : '个人简介')
    sidebarOutlineHeadings = []
    sidebarOutlineButtons = []
    if (!article) return

    var outline = document.createElement('nav')
    outline.className = 'nav-profile-outline'
    outline.setAttribute('aria-label', '文章大纲')
    var label = document.createElement('div')
    label.className = 'nav-outline-label'
    label.textContent = '本文 · 目录'
    var list = document.createElement('div')
    list.className = 'nav-outline-list'
    outline.appendChild(label)
    outline.appendChild(list)

    sidebarOutlineHeadings = Array.prototype.slice.call(article.querySelectorAll('h2, h3'))
    if (!sidebarOutlineHeadings.length) sidebarOutlineHeadings = [article]
    sidebarOutlineHeadings.forEach(function (heading, index) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'nav-outline-item' + (heading.tagName === 'H3' ? ' is-subsection' : '')
      var text = heading === article ? '全文' : heading.textContent.trim().replace(/^#\s*/, '')
      button.textContent = text
      button.addEventListener('click', function () {
        heading.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
      })
      list.appendChild(button)
      sidebarOutlineButtons.push(button)
    })

    var reading = profile.querySelector('.nav-profile-live')
    profile.insertBefore(outline, reading || null)
    updateSidebarOutlineActive()
  }

  function decorateYearGroups(root) {
    root.querySelectorAll('[data-year-group]').forEach(function (group) {
      var label = group.querySelector('.year-label')
      var year = label && Number(label.textContent.trim())
      if (label && year) label.textContent = editorialYear(year)
      group.querySelectorAll('.post-row .meta').forEach(function (meta) {
        meta.textContent = formatEditorialMeta(meta.textContent.trim())
      })
    })
  }

  function decorateHome(main) {
    main.classList.add('home-page')
    var anchor = null
    for (var i = 0; i < main.children.length; i++) {
      if (main.children[i].tagName === 'HR') {
        anchor = main.children[i]
        break
      }
    }
    if (!anchor) return

    var heading = main.querySelector(':scope > h1:first-child')
    var introParagraphs = []
    var deferredHomeParagraphs = []
    for (var paragraphIndex = 0; paragraphIndex < main.children.length; paragraphIndex++) {
      var child = main.children[paragraphIndex]
      if (child === anchor) break
      if (child.tagName === 'P') introParagraphs.push(child)
    }
    if (heading && introParagraphs.length) {
      var intro = document.createElement('section')
      intro.className = 'home-intro'
      var masthead = document.createElement('div')
      masthead.className = 'home-masthead'
      var story = document.createElement('div')
      story.className = 'home-story'
      main.insertBefore(intro, heading)
      intro.appendChild(masthead)
      intro.appendChild(story)
      masthead.appendChild(heading)
      introParagraphs[0].classList.add('home-deck')
      masthead.appendChild(introParagraphs[0])
      masthead.appendChild(makeSignature('signature-line'))
      for (var introIndex = 1; introIndex < introParagraphs.length; introIndex++) {
        if (introIndex < 3) story.appendChild(introParagraphs[introIndex])
        else deferredHomeParagraphs.push(introParagraphs[introIndex])
      }
    }
    else main.insertBefore(makeSignature('signature-line'), anchor)

    var postsPage = (window.PAGES || {})['/posts']
    if (!postsPage) return
    var template = document.createElement('template')
    template.innerHTML = postsPage
    var source = template.content.querySelector('[data-year-group]')
    if (!source) return
    var recent = source.cloneNode(true)
    recent.classList.add('home-recent')
    var rows = recent.querySelectorAll('.post-row')
    for (var rowIndex = rows.length - 1; rowIndex >= 3; rowIndex--) rows[rowIndex].remove()
    main.insertBefore(recent, anchor)

    var tail = document.createElement('section')
    tail.className = 'home-tail'
    main.insertBefore(tail, anchor)
    for (var deferredIndex = 0; deferredIndex < deferredHomeParagraphs.length; deferredIndex++) {
      tail.appendChild(deferredHomeParagraphs[deferredIndex])
    }
    var tailNode = anchor
    while (tailNode) {
      var nextTailNode = tailNode.nextSibling
      tail.appendChild(tailNode)
      tailNode = nextTailNode
    }
  }

  function decorateArticle(article, route) {
    article.classList.add('article-prose')
    var title = article.querySelector('h1')
    var meta = article.querySelector('.post-meta')
    var originalMeta = meta ? meta.textContent.trim() : ''
    var yearMatch = originalMeta.match(/\b(\d{4})\b/)
    var year = yearMatch ? Number(yearMatch[1]) : findRouteYear(route)
    if (title && year) {
      var kicker = document.createElement('div')
      kicker.className = 'article-kicker'
      kicker.textContent = (route.indexOf('/notes/') === 0 ? '札记' : '文章') + ' · ' + chineseYear(year)
      article.insertBefore(kicker, title)
    }
    if (meta) meta.textContent = formatEditorialMeta(originalMeta, year)
    var firstParagraph = null
    for (var i = 0; i < article.children.length; i++) {
      if (article.children[i].tagName === 'P' && !article.children[i].classList.contains('share-line')) {
        firstParagraph = article.children[i]
        break
      }
    }
    if (firstParagraph && /^[\u3400-\u9fff\uf900-\ufaff]/.test(firstParagraph.textContent.trim())) {
      article.classList.add('has-cjk-lead')
    }
    var share = article.querySelector('.share-line')
    if (share) article.insertBefore(makeSignature('article-colophon'), share)
  }

  function decoratePage(route) {
    var main = view.querySelector('main')
    var article = view.querySelector('article.prose')
    var routeKind = route === '/' ? 'home' : article ? 'article' : 'page'
    var isIndexPage = !!(main && main.querySelector('[data-year-group]'))
    document.body.setAttribute('data-route-kind', routeKind)
    if (main && routeKind === 'page' && !isIndexPage) main.classList.add('menu-page')
    if (isIndexPage) main.classList.add('index-page')
    decorateSubnav(view)
    if (route === '/' && main) decorateHome(main)
    if (article) decorateArticle(article, route)
    decorateSidebarOutline(article)
    decorateYearGroups(view)
  }

  var light = document.querySelector('.lightbox')
  var lightImg = light && light.querySelector('img')
  var lightCap = light && light.querySelector('.lightbox-cap')
  var photoNodes = []
  var photoIndex = -1

  function syncOverlayLock() {
    document.body.classList.toggle('overlay-open', !!document.querySelector('.search-mask.is-open, .lightbox.is-open'))
  }

  function showPhoto(i) {
    if (!light || !photoNodes[i]) return
    photoIndex = i
    var img = photoNodes[i]
    lightImg.src = img.src
    lightCap.textContent = (img.alt || '') + (img.getAttribute('data-place') ? ' · ' + img.getAttribute('data-place') : '')
    light.classList.add('is-open')
    light.setAttribute('aria-hidden', 'false')
    syncOverlayLock()
  }

  function closeLightbox() {
    if (light) {
      light.classList.remove('is-open')
      light.setAttribute('aria-hidden', 'true')
    }
    photoIndex = -1
    syncOverlayLock()
  }

  function bindPage() {
    photoNodes = Array.prototype.slice.call(document.querySelectorAll('.photo-grid img'))
    photoNodes.forEach(function (img, i) {
      img.onclick = function () { showPhoto(i) }
    })
    var gallery = localStorage.getItem('yunfeng-gallery-view') || 'cover'
    photoNodes.forEach(function (img) { img.style.objectFit = gallery })
    document.querySelectorAll('[data-gallery]').forEach(function (btn) {
      btn.style.opacity = btn.getAttribute('data-gallery') === gallery ? '1' : '0.4'
      btn.onclick = function () {
        gallery = btn.getAttribute('data-gallery')
        localStorage.setItem('yunfeng-gallery-view', gallery)
        photoNodes.forEach(function (img) {
          img.style.objectFit = gallery
          animateElementIn(img, 0)
        })
        document.querySelectorAll('[data-gallery]').forEach(function (b) {
          b.style.opacity = b === btn ? '1' : '0.4'
        })
      }
    })

    document.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.onclick = function () {
        var name = btn.getAttribute('data-tab')
        var activePanel = null
        document.querySelectorAll('[data-tab]').forEach(function (b) { b.classList.toggle('active', b === btn) })
        document.querySelectorAll('[data-tab-panel]').forEach(function (p) {
          var active = p.getAttribute('data-tab-panel') === name
          p.style.display = active ? '' : 'none'
          if (active) activePanel = p
        })
        animateElementIn(activePanel, 4)
      }
    })
  }

  function playEnter(view) {
    var content = view.querySelector('.slide-enter-content') || view.firstElementChild
    if (!content) return
    content.querySelectorAll('.post-row').forEach(function (row, index) {
      row.style.setProperty('--row-stage', index)
    })
    content.classList.remove('slide-enter-content')
    void content.offsetWidth
    content.classList.add('slide-enter-content')
    var kids = content.children
    for (var i = 0; i < kids.length; i++) {
      kids[i].style.animation = 'none'
      void kids[i].offsetWidth
      kids[i].style.animation = ''
    }
  }

  var view = document.getElementById('view')
  var lastRoute = ''
  var routeRenderTimer = 0
  var routeRenderToken = 0

  function commitRender(route) {
    var pages = window.PAGES || {}
    var titles = window.PAGE_TITLES || {}
    var html = pages[route] || pages['/404'] || '<main class="page prose"><h1>404</h1></main>'
    closeSearch()
    view.innerHTML = html
    decoratePage(route)
    document.title = titles[route] || 'StackTao'
    updateNav(route)
    bindPage()
    window.scrollTo(0, 0)
    updateReadingStatus(route)
    playEnter(view)
    lastRoute = route
    if (location.hash && location.hash.indexOf('#/') !== 0 && document.querySelector(location.hash)) {
      document.querySelector(location.hash).scrollIntoView()
    }
  }

  function render(route, withBar) {
    if (withBar) nStart()
    closeSearch()

    if (!withBar || !lastRoute || prefersReducedMotion()) {
      commitRender(route)
      if (withBar) setTimeout(nDone, 280)
      return
    }

    var token = ++routeRenderToken
    clearTimeout(routeRenderTimer)
    view.classList.add('is-route-leaving')
    routeRenderTimer = setTimeout(function () {
      if (token !== routeRenderToken) return
      commitRender(route)
      requestAnimationFrame(function () {
        if (token !== routeRenderToken) return
        view.classList.remove('is-route-leaving')
      })
      setTimeout(nDone, 360)
    }, 140)
  }

  function go(route, replace) {
    if (!route) route = '/'
    if (route.charAt(0) === '#' && route.charAt(1) !== '/') {
      var el = document.querySelector(route)
      if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
      return
    }
    var next = '#/' + route.replace(/^\//, '')
    if (route === '/') next = '#/'
    if ((location.hash || '#/') === next) {
      if (route === lastRoute) {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
        return
      }
      render(route, true)
      return
    }
    if (replace) location.replace(next)
    else location.hash = next
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a')
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    var href = a.getAttribute('href')
    var route = hrefToRoute(href)
    if (route == null) return
    e.preventDefault()
    go(route)
  })

  window.addEventListener('hashchange', function () {
    render(currentRoute(), true)
  })

  var searchMask = document.querySelector('.search-mask')
  var searchPanel = document.querySelector('.search-panel')
  var searchInput = document.querySelector('.search-panel input')
  var searchHits = document.querySelector('.search-hits')
  var searchTrigger = null

  function openSearch() {
    if (!searchMask) return
    searchTrigger = document.activeElement
    searchMask.classList.add('is-open')
    searchMask.setAttribute('aria-hidden', 'false')
    syncOverlayLock()
    if (searchInput) {
      searchInput.value = ''
      searchInput.setAttribute('aria-expanded', 'false')
      searchInput.focus()
    }
    if (searchPanel) searchPanel.classList.remove('has-query')
    if (searchHits) searchHits.innerHTML = ''
  }
  function closeSearch() {
    if (!searchMask || !searchMask.classList.contains('is-open')) return
    searchMask.classList.remove('is-open')
    searchMask.setAttribute('aria-hidden', 'true')
    if (searchPanel) searchPanel.classList.remove('has-query')
    if (searchInput) searchInput.setAttribute('aria-expanded', 'false')
    syncOverlayLock()
    if (searchTrigger && searchTrigger.focus) searchTrigger.focus()
    searchTrigger = null
  }
  document.querySelectorAll('[data-search]').forEach(function (btn) {
    btn.addEventListener('click', openSearch)
  })
  if (searchMask) {
    searchMask.addEventListener('click', function (e) {
      if (e.target === searchMask) closeSearch()
    })
  }
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      openSearch()
    }
    if (e.key === 'Escape') {
      closeSearch()
      closeLightbox()
    }
    if (photoIndex >= 0 && e.key === 'ArrowRight') showPhoto(Math.min(photoNodes.length - 1, photoIndex + 1))
    if (photoIndex >= 0 && e.key === 'ArrowLeft') showPhoto(Math.max(0, photoIndex - 1))
  })
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = searchInput.value.trim().toLowerCase()
      var items = window.SEARCH_INDEX || []
      var html = ''
      var hasQuery = !!q
      if (searchPanel) searchPanel.classList.toggle('has-query', hasQuery)
      searchInput.setAttribute('aria-expanded', String(hasQuery))
      if (q) {
        items.forEach(function (item) {
          var kindLabel = { Blog: '文章', Note: '札记', Talk: '演讲', Page: '页面' }[item.kind] || item.kind || ''
          if ((item.title + ' ' + (item.kind || '') + ' ' + kindLabel).toLowerCase().indexOf(q) === -1) return
          html += '<a class="search-hit" href="' + item.href + '">' + item.title + (kindLabel ? '<small>' + kindLabel + '</small>' : '') + '</a>'
        })
        if (!html) html = '<div class="search-hit op50">没有找到相关内容</div>'
      }
      searchHits.innerHTML = html
    })
  }
  if (light) light.addEventListener('click', closeLightbox)

  var readingStatus = document.querySelector('[data-reading-status]')
  var readingLabel = readingStatus && readingStatus.querySelector('[data-reading-label]')
  var readingValue = readingStatus && readingStatus.querySelector('[data-reading-value]')
  var readingBar = readingStatus && readingStatus.querySelector('[data-reading-bar]')
  var readingFrame = 0

  function updateReadingProgress() {
    readingFrame = 0
    if (!readingStatus || !readingValue || !readingBar) return
    var root = document.documentElement
    var maxScroll = Math.max(0, root.scrollHeight - innerHeight)
    var ratio = maxScroll ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0
    var percentage = Math.round(ratio * 100)
    readingValue.textContent = String(percentage).padStart(2, '0') + '%'
    readingBar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')'
    readingStatus.setAttribute('aria-valuenow', String(percentage))
    updateSidebarOutlineActive()
  }

  function queueReadingProgress() {
    if (readingFrame) return
    readingFrame = requestAnimationFrame(updateReadingProgress)
  }

  function updateReadingStatus(route) {
    if (!readingStatus) return
    var routeKind = document.body.getAttribute('data-route-kind')
    if (readingLabel) readingLabel.textContent = routeKind === 'article' ? 'Reading' : route === '/' ? 'Index' : 'Page'
    readingStatus.classList.remove('is-route-updating')
    if (!prefersReducedMotion()) {
      void readingStatus.offsetWidth
      readingStatus.classList.add('is-route-updating')
    }
    updateReadingProgress()
  }

  window.addEventListener('scroll', queueReadingProgress, { passive: true })
  window.addEventListener('resize', queueReadingProgress, { passive: true })

  var backToTop = document.querySelector('[data-back-to-top]')
  var scrollFrame = 0

  function updateBackToTop() {
    scrollFrame = 0
    if (backToTop) backToTop.classList.toggle('is-visible', window.scrollY > 320)
  }

  if (backToTop) {
    backToTop.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
    })
    window.addEventListener('scroll', function () {
      if (scrollFrame) return
      scrollFrame = requestAnimationFrame(updateBackToTop)
    }, { passive: true })
    updateBackToTop()
  }

  var canvas = document.querySelector('.art-canvas')
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d')
    var staticCanvas = document.createElement('canvas')
    var staticCtx = staticCanvas.getContext('2d')
    // 揭示期的两层累积画布：已完成的笔画烘焙进来，每帧只重画还在生长的那几笔。
    // 分成两层是为了保住「所有洗染在所有轮廓之下」这个层序，层内允许按完成顺序烘焙。
    // 定格后两层合入 staticCanvas 并立即释放。
    var washAccum = document.createElement('canvas')
    var washAccumCtx = washAccum.getContext('2d')
    var fragAccum = document.createElement('canvas')
    var fragAccumCtx = fragAccum.getContext('2d')
    var inkWidth = 1
    var inkHeight = 1
    var inkDpr = 1
    var inkFrame = 0
    var inkResizeTimer = 0
    var inkThemeFrame = 0
    var inkLastFrame = 0
    var inkHiddenAt = 0
    var inkMasses = []
    var inkMistMasks = []
    var inkMistBands = []
    var inkBirdEvent = null
    var inkBirdTimer = 0
    var inkBirdSequence = 0
    var inkDaySky = null
    var inkNightSky = null
    var inkRandom = null
    var inkSceneStarted = 0
    var inkStaticReady = false
    var inkSettled = false
    var inkRevealEnd = 5200
    // 飞鸟使用低频事件而不是常驻循环：飞行时启动 rAF，离场后只保留一个长间隔计时器。
    var inkBirdsEnabled = true
    var inkSceneSeed = (function () {
      if (window.crypto && window.crypto.getRandomValues) {
        var seedValue = new Uint32Array(1)
        window.crypto.getRandomValues(seedValue)
        return seedValue[0] || 1
      }
      return ((Date.now() & 0xffffffff) ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
    })()

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value))
    }

    function smoothstep(value) {
      value = clamp(value, 0, 1)
      return value * value * (3 - 2 * value)
    }

    function easeOutCubic(value) {
      value = clamp(value, 0, 1)
      return 1 - Math.pow(1 - value, 3)
    }

    // 把每一笔的显现窗口收进揭示区间内。否则 elapsed 到达 inkRevealEnd 时，还在半途
    // 的笔画会被 complete=true 一帧补全，交接处出现可见跳变。
    function clampReveal(stroke) {
      stroke.revealAt = Math.min(stroke.revealAt, inkRevealEnd - 260)
      stroke.revealDuration = Math.min(stroke.revealDuration, inkRevealEnd - stroke.revealAt)
      return stroke
    }

    function seededRandom(seed) {
      return function () {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        return seed / 4294967296
      }
    }

    function clearInkCanvas() {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(inkDpr, 0, 0, inkDpr, 0, 0)
    }

    function clearStaticCanvas() {
      staticCtx.setTransform(1, 0, 0, 1, 0, 0)
      staticCtx.clearRect(0, 0, staticCanvas.width, staticCanvas.height)
      staticCtx.setTransform(inkDpr, 0, 0, inkDpr, 0, 0)
    }

    function sizeAccumulator(target, targetCtx) {
      target.width = canvas.width
      target.height = canvas.height
      targetCtx.setTransform(inkDpr, 0, 0, inkDpr, 0, 0)
    }

    function clearAccumulators() {
      sizeAccumulator(washAccum, washAccumCtx)
      sizeAccumulator(fragAccum, fragAccumCtx)
      for (var i = 0; i < inkMasses.length; i++) {
        inkMasses[i].washBaked = 0
        inkMasses[i].fragBaked = 0
      }
    }

    // 定格后累积画布再无用处，立刻归零释放显存。
    function releaseAccumulators() {
      washAccum.width = 0
      washAccum.height = 0
      fragAccum.width = 0
      fragAccum.height = 0
    }

    function fitInkCanvas() {
      inkWidth = Math.max(1, Math.round(innerWidth))
      inkHeight = Math.max(1, Math.round(innerHeight))
      // 山体皴擦与轮廓大量使用 0.2–0.6px 的细笔。DPR 压到 1.5 时这些笔画落在亚像素
      // 上，抗锯齿会把它们糊成断续的锯齿。山体只绘制一次并缓存，提到 2 是划算的；
      // 超大视口再退回 1.5 控制内存。
      inkDpr = Math.min(window.devicePixelRatio || 1, inkWidth * inkHeight > 3600000 ? 1.5 : 2)
      canvas.width = Math.round(inkWidth * inkDpr)
      canvas.height = Math.round(inkHeight * inkDpr)
      staticCanvas.width = canvas.width
      staticCanvas.height = canvas.height
      canvas.style.width = inkWidth + 'px'
      canvas.style.height = inkHeight + 'px'
      clearInkCanvas()
      clearStaticCanvas()
      sizeAccumulator(washAccum, washAccumCtx)
      sizeAccumulator(fragAccum, fragAccumCtx)
    }

    function inkColor(alpha) {
      var dark = document.documentElement.classList.contains('dark')
      var rgb = dark ? [207, 201, 187] : [59, 56, 51]
      var themeScale = dark ? 0.82 : 1
      return 'rgba(' + rgb.join(',') + ',' + clamp(alpha * themeScale, 0, 0.42) + ')'
    }

    function skyColor(alpha, dark) {
      var rgb = dark ? [234, 229, 217] : [83, 78, 70]
      return 'rgba(' + rgb.join(',') + ',' + clamp(alpha, 0, dark ? 0.52 : 0.34) + ')'
    }

    function hashNoise(index, seed) {
      var value = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453123
      return (value - Math.floor(value)) * 2 - 1
    }

    function valueNoise(value, frequency, seed) {
      var scaled = value * frequency
      var left = Math.floor(scaled)
      var mix = smoothstep(scaled - left)
      var a = hashNoise(left, seed)
      var b = hashNoise(left + 1, seed)
      return a + (b - a) * mix
    }

    function ridgeAt(anchors, position) {
      var segment = 0
      while (segment < anchors.length - 2 && position > anchors[segment + 1].x) segment++
      var p0 = anchors[Math.max(0, segment - 1)]
      var p1 = anchors[segment]
      var p2 = anchors[Math.min(anchors.length - 1, segment + 1)]
      var p3 = anchors[Math.min(anchors.length - 1, segment + 2)]
      var span = Math.max(0.0001, p2.x - p1.x)
      var t = clamp((position - p1.x) / span, 0, 1)
      var t2 = t * t
      var t3 = t2 * t
      var value = 0.5 * (
        2 * p1.y
        + (-p0.y + p2.y) * t
        + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
        + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      )
      return clamp(value, Math.min(p1.y, p2.y) - 0.075, Math.max(p1.y, p2.y) + 0.075)
    }

    function curveSegments(points, mountainHeight) {
      var segments = []
      var tension = 0.62 / 6
      for (var i = 0; i < points.length - 1; i++) {
        var p0 = points[Math.max(0, i - 1)]
        var p1 = points[i]
        var p2 = points[i + 1]
        var p3 = points[Math.min(points.length - 1, i + 2)]
        var localMin = Math.min(p0.y, p1.y, p2.y, p3.y) - mountainHeight * 0.025
        var localMax = Math.max(p0.y, p1.y, p2.y, p3.y) + mountainHeight * 0.025
        segments.push({
          p0: p1,
          c1: {
            x: clamp(p1.x + (p2.x - p0.x) * tension, p1.x, p2.x),
            y: clamp(p1.y + (p2.y - p0.y) * tension, localMin, localMax),
          },
          c2: {
            x: clamp(p2.x - (p3.x - p1.x) * tension, p1.x, p2.x),
            y: clamp(p2.y - (p3.y - p1.y) * tension, localMin, localMax),
          },
          p1: p2,
        })
      }
      return segments
    }

    function buildFragments(mass) {
      var fragments = []
      var segments = mass.segments
      var mainPeak = 0
      for (var p = 1; p < mass.points.length; p++) {
        if (mass.points[p].y < mass.points[mainPeak].y) mainPeak = p
      }

      var i = 0
      while (i < segments.length) {
        if (inkRandom() < 0.22) {
          i += 1 + Math.floor(inkRandom() * 2)
          continue
        }
        var count = Math.min(1 + Math.floor(inkRandom() * 2), segments.length - i)
        var center = i + count * 0.5
        var distance = Math.abs(center - mainPeak) / Math.max(1, segments.length)
        fragments.push({
          type: 'curve',
          first: i,
          count: count,
          offset: (inkRandom() - 0.5) * 0.85,
          width: mass.width * (0.72 + inkRandom() * 0.58),
          tone: mass.tone * (0.88 + inkRandom() * 0.18),
          dry: inkRandom(),
          revealAt: 680 + mass.delay + distance * 2050 + inkRandom() * 660,
          revealDuration: 430 + inkRandom() * 420,
        })
        i += count + 1 + (inkRandom() < 0.34 ? 1 : 0)
      }

      var contourCount = mass.tone > 0.25 ? 3 : 2
      for (var contour = 0; contour < contourCount; contour++) {
        var offset = 10 + contour * (9 + inkRandom() * 5)
        for (var c = contour + 1; c < segments.length; c += 3 + Math.floor(inkRandom() * 4)) {
          if (inkRandom() < 0.38) continue
          var contourSpan = Math.min(1 + Math.floor(inkRandom() * 3), segments.length - c)
          fragments.push({
            type: 'curve',
            first: c,
            count: contourSpan,
            offset: offset + (inkRandom() - 0.5) * 2.4,
            width: 0.28 + inkRandom() * 0.34,
            tone: mass.tone * (0.24 + inkRandom() * 0.16),
            dry: 0.62 + inkRandom() * 0.38,
            revealAt: 1700 + mass.delay + inkRandom() * 2350,
            revealDuration: 520 + inkRandom() * 420,
          })
        }
      }

      for (var hatch = 3; hatch < mass.points.length - 3; hatch += 4 + Math.floor(inkRandom() * 5)) {
        if (inkRandom() < 0.3) continue
        var start = mass.points[hatch]
        var side = hatch < mainPeak ? -1 : 1
        var length = 12 + inkRandom() * Math.min(32, mass.height * 0.2)
        fragments.push({
          type: 'hatch',
          x1: start.x + (inkRandom() - 0.5) * 3,
          y1: start.y + 8 + inkRandom() * 8,
          x2: start.x + side * (5 + inkRandom() * 13) + (inkRandom() - 0.5) * 3,
          y2: Math.min(mass.baseY - 8, start.y + length),
          width: 0.32 + inkRandom() * 0.42,
          tone: mass.tone * (0.26 + inkRandom() * 0.2),
          dry: 0.7 + inkRandom() * 0.3,
          revealAt: 1600 + mass.delay + inkRandom() * 2500,
          revealDuration: 560 + inkRandom() * 380,
        })
      }

      var shoulderDistance = Math.max(4, Math.round(segments.length * (0.1 + inkRandom() * 0.06)))
      var shoulderAnchors = [
        clamp(mainPeak - shoulderDistance, 2, mass.points.length - 3),
        clamp(mainPeak + shoulderDistance, 2, mass.points.length - 3),
      ]
      for (var shoulder = 0; shoulder < shoulderAnchors.length; shoulder++) {
        var anchorIndex = shoulderAnchors[shoulder]
        var anchor = mass.points[anchorIndex]
        var shoulderSide = anchorIndex < mainPeak ? -1 : 1
        var baseLength = 18 + inkRandom() * Math.min(30, mass.height * 0.18)
        var lengthScales = [1, 0.68, 0.42]
        var toneScales = [0.34, 0.24, 0.16]
        for (var cluster = 0; cluster < 3; cluster++) {
          var clusterX = shoulderSide * cluster * (3 + inkRandom() * 4)
          var clusterLength = baseLength * lengthScales[cluster]
          fragments.push({
            type: 'hatch',
            x1: anchor.x + clusterX + (inkRandom() - 0.5) * 2,
            y1: anchor.y + 10 + cluster * 2 + inkRandom() * 5,
            x2: anchor.x + clusterX + shoulderSide * (6 + inkRandom() * 11),
            y2: Math.min(mass.baseY - 8, anchor.y + 10 + clusterLength),
            width: cluster === 0 ? 0.55 + inkRandom() * 0.25 : 0.28 + inkRandom() * 0.27,
            tone: mass.tone * toneScales[cluster],
            dry: 0.64 + inkRandom() * 0.3,
            revealAt: 1750 + mass.delay + shoulder * 230 + cluster * 150 + inkRandom() * 540,
            revealDuration: 520 + inkRandom() * 360,
          })
        }
      }

      for (var fragmentIndex = 0; fragmentIndex < fragments.length; fragmentIndex++) {
        var fragment = fragments[fragmentIndex]
        fragment.revealAt = Math.min(4380, fragment.revealAt)
        fragment.revealDuration = Math.min(fragment.revealDuration, Math.max(300, inkRevealEnd - fragment.revealAt))
        fragment.dash = [
          1.2 + inkRandom() * 2.8,
          0.45 + inkRandom() * 1.4,
          3.2 + inkRandom() * 4.8,
          0.6 + inkRandom() * 1.8,
        ]
        fragment.dashOffset = inkRandom() * 9
        fragment.samples = sampleFragment(mass, fragment)
      }
      fragments.sort(function (a, b) { return a.revealAt - b.revealAt })
      return fragments
    }

    function buildMountain(config, index) {
      var x0 = inkWidth * config.x
      var x1 = x0 + inkWidth * config.width
      var baseY = inkHeight * config.base
      var height = inkHeight * config.height
      var pointCount = Math.max(18, Math.ceil((x1 - x0) / clamp(inkWidth / 145, 8, 12)))
      var noiseSeed = 19 + index * 37 + Math.floor(inkRandom() * 900)
      var mainCenter = 0.27 + inkRandom() * 0.42
      var ridgeAnchors = []
      if (config.range) {
        var rangePeaks = Math.max(3, config.peaks)
        var highestAnchor = null
        ridgeAnchors.push({ x: 0, y: 0 })
        for (var rangeIndex = 0; rangeIndex < rangePeaks; rangeIndex++) {
          var cellStart = rangeIndex / rangePeaks
          var peakX = cellStart + (0.28 + inkRandom() * 0.2) / rangePeaks
          var valleyX = cellStart + (0.74 + inkRandom() * 0.14) / rangePeaks
          var edgeScale = rangeIndex === 0 || rangeIndex === rangePeaks - 1 ? 0.78 : 1
          var peakY = (0.48 + inkRandom() * 0.38) * edgeScale
          var peakAnchor = { x: peakX, y: peakY }
          ridgeAnchors.push(peakAnchor)
          if (!highestAnchor || peakY > highestAnchor.y) highestAnchor = peakAnchor
          if (valleyX < 0.98) ridgeAnchors.push({
            x: valleyX,
            y: 0.13 + inkRandom() * 0.2,
          })
        }
        ridgeAnchors.push({ x: 1, y: 0 })
        if (highestAnchor) mainCenter = highestAnchor.x
      }
      else {
        var leftMid = mainCenter * (0.43 + inkRandom() * 0.12)
        var leftShoulder = mainCenter * (0.73 + inkRandom() * 0.12)
        var rightShoulder = mainCenter + (1 - mainCenter) * (0.16 + inkRandom() * 0.1)
        var rightMid = mainCenter + (1 - mainCenter) * (0.48 + inkRandom() * 0.15)
        ridgeAnchors = [
          { x: 0, y: 0 },
          { x: 0.055 + inkRandom() * 0.035, y: 0.07 + inkRandom() * 0.1 },
          { x: leftMid, y: 0.28 + inkRandom() * 0.2 },
          { x: leftShoulder, y: 0.66 + inkRandom() * 0.18 },
          { x: mainCenter, y: 0.91 + inkRandom() * 0.075 },
          { x: rightShoulder, y: 0.64 + inkRandom() * 0.2 },
          { x: rightMid, y: 0.25 + inkRandom() * 0.24 },
          { x: 0.92 + inkRandom() * 0.035, y: 0.06 + inkRandom() * 0.11 },
          { x: 1, y: 0 },
        ]
      }
      var sidePeaks = []
      for (var peak = 1; peak < (config.range ? 1 : config.peaks); peak++) {
        var peakCenter = 0.12 + inkRandom() * 0.76
        if (Math.abs(peakCenter - mainCenter) < 0.15)
          peakCenter = clamp(peakCenter + (peakCenter < mainCenter ? -0.16 : 0.16), 0.1, 0.9)
        sidePeaks.push({
          center: peakCenter,
          radius: 0.075 + inkRandom() * 0.105,
          height: 0.055 + inkRandom() * 0.15,
        })
      }

      var points = []
      for (var n = 0; n <= pointCount; n++) {
        var position = n / pointCount
        var smoothMass = ridgeAt(ridgeAnchors, position)
        for (var peakIndex = 0; peakIndex < sidePeaks.length; peakIndex++) {
          var currentPeak = sidePeaks[peakIndex]
          var distance = Math.abs(position - currentPeak.center) / currentPeak.radius
          if (distance < 1) {
            var bump = 0.5 + 0.5 * Math.cos(Math.PI * distance)
            smoothMass += currentPeak.height * Math.pow(bump, 1.35)
          }
        }
        var envelope = Math.pow(Math.max(0, Math.sin(Math.PI * position)), 0.62)
        var grain = valueNoise(position, 2.25, noiseSeed) * 0.046
          + valueNoise(position, 7.4, noiseSeed + 11) * 0.022
          + valueNoise(position, 19.6, noiseSeed + 29) * 0.0065
        var grainWeight = 0.34 + 0.66 * (1 - Math.pow(clamp(smoothMass, 0, 1), 1.35))
        grain *= grainWeight
        points.push({
          x: x0 + (x1 - x0) * position,
          y: baseY - height * clamp(smoothMass * envelope + grain * envelope, 0, 1.06),
        })
      }

      var washBlooms = []
      var washBloomCount = config.tone > 0.25 ? 16 : 9
      for (var bloomIndex = 0; bloomIndex < washBloomCount; bloomIndex++) {
        var bloomPosition = 0.045 + inkRandom() * 0.91
        var bloomPointIndex = Math.min(points.length - 1, Math.round(bloomPosition * pointCount))
        var bloomRidgeY = points[bloomPointIndex].y
        var bloomDepth = Math.max(10, baseY - bloomRidgeY)
        var bloomLobes = []
        for (var lobeIndex = 0; lobeIndex < 3; lobeIndex++) {
          bloomLobes.push({
            dx: (inkRandom() - 0.5) * 0.7,
            dy: (inkRandom() - 0.5) * 0.62,
            sx: 0.48 + inkRandom() * 0.5,
            sy: 0.5 + inkRandom() * 0.55,
            tone: 0.62 + inkRandom() * 0.38,
          })
        }
        washBlooms.push({
          x: points[bloomPointIndex].x + (inkRandom() - 0.5) * 18,
          y: bloomRidgeY + bloomDepth * (0.16 + inkRandom() * 0.68),
          rx: 12 + inkRandom() * Math.min(28, (x1 - x0) * 0.075),
          ry: 17 + inkRandom() * Math.min(38, bloomDepth * 0.4),
          tone: config.wash * (0.24 + inkRandom() * 0.34),
          lobes: bloomLobes,
          revealAt: 260 + config.delay + inkRandom() * 2050,
          revealDuration: 780 + inkRandom() * 850,
        })
      }

      var washStrokes = []
      var washStrokeCount = config.tone > 0.25 ? 9 : 5
      for (var washIndex = 0; washIndex < washStrokeCount; washIndex++) {
        var washPosition = 0.08 + inkRandom() * 0.84
        var pointIndex = Math.min(points.length - 1, Math.round(washPosition * pointCount))
        var ridgeY = points[pointIndex].y
        var washLength = Math.min(baseY - ridgeY, height * (0.08 + inkRandom() * 0.14))
        var washSide = pointIndex < pointCount * mainCenter ? -1 : 1
        washStrokes.push({
          x1: x0 + (x1 - x0) * washPosition,
          y1: ridgeY + 6 + inkRandom() * 16,
          x2: x0 + (x1 - x0) * washPosition + washSide * (14 + inkRandom() * 28),
          y2: ridgeY + 8 + washLength,
          width: 3 + inkRandom() * 7,
          tone: config.wash * (0.18 + inkRandom() * 0.3),
          revealAt: 850 + config.delay + inkRandom() * 2300,
          revealDuration: 620 + inkRandom() * 680,
        })
      }

      var rubStrokes = []
      var rubStrokeCount = config.tone > 0.25 ? 10 : 6
      for (var rubIndex = 0; rubIndex < rubStrokeCount; rubIndex++) {
        var rubSide = inkRandom() < 0.5 ? -1 : 1
        var rubDistance = 0.055 + Math.pow(inkRandom(), 0.72) * 0.3
        var rubPosition = clamp(mainCenter + rubSide * rubDistance, 0.06, 0.94)
        var rubPointIndex = Math.min(points.length - 2, Math.max(1, Math.round(rubPosition * pointCount)))
        var rubRidgeY = points[rubPointIndex].y
        var availableDepth = Math.max(12, baseY - rubRidgeY)
        var rubLength = Math.min(18 + inkRandom() * 37, availableDepth * (0.28 + inkRandom() * 0.24))
        var rubX1 = points[rubPointIndex].x + (inkRandom() - 0.5) * 8
        var rubY1 = Math.min(baseY - 10, rubRidgeY + 10 + inkRandom() * Math.min(28, availableDepth * 0.22))
        var rubShift = rubSide * (8 + inkRandom() * 20)
        var rubY2 = Math.min(baseY - 5, rubY1 + rubLength)
        var rubStroke = {
          x1: rubX1,
          y1: rubY1,
          cx: rubX1 + rubShift * (0.38 + inkRandom() * 0.18) + (inkRandom() - 0.5) * 3,
          cy: rubY1 + rubLength * (0.42 + inkRandom() * 0.14),
          x2: rubX1 + rubShift,
          y2: rubY2,
          width: 1.4 + inkRandom() * 3.2,
          tone: config.tone * (0.028 + inkRandom() * 0.037),
          dash: [
            2.2 + inkRandom() * 4.6,
            0.9 + inkRandom() * 2.2,
            5.5 + inkRandom() * 7.5,
            1.2 + inkRandom() * 3.2,
          ],
          dashOffset: inkRandom() * 12,
          revealAt: 1700 + config.delay + inkRandom() * 2300,
          revealDuration: 560 + inkRandom() * 760,
        }
        if (availableDepth >= 28 && rubY2 > rubY1 + 4) rubStrokes.push(rubStroke)
      }

      var grainStrokes = []
      var grainStrokeCount = config.tone > 0.25 ? 32 : 15
      for (var grainIndex = 0; grainIndex < grainStrokeCount; grainIndex++) {
        var grainPosition = 0.04 + inkRandom() * 0.92
        var grainPointIndex = Math.min(points.length - 2, Math.max(1, Math.round(grainPosition * pointCount)))
        var grainRidge = points[grainPointIndex]
        var grainDepth = Math.max(10, baseY - grainRidge.y)
        var grainSide = grainPointIndex < pointCount * mainCenter ? -1 : 1
        var grainLength = 5 + inkRandom() * Math.min(19, grainDepth * 0.23)
        var grainY1 = grainRidge.y + 7 + inkRandom() * Math.min(34, grainDepth * 0.54)
        grainStrokes.push({
          x1: grainRidge.x + (inkRandom() - 0.5) * 9,
          y1: grainY1,
          x2: grainRidge.x + grainSide * (3 + inkRandom() * 11),
          y2: Math.min(baseY - 5, grainY1 + grainLength),
          width: 0.2 + inkRandom() * 0.42,
          tone: config.tone * (0.07 + inkRandom() * 0.09),
          dash: [0.8 + inkRandom() * 2.2, 0.65 + inkRandom() * 1.6],
          dashOffset: inkRandom() * 5,
          revealAt: 2050 + config.delay + inkRandom() * 2050,
          revealDuration: 420 + inkRandom() * 620,
        })
      }

      var timedGroups = [washBlooms, washStrokes, rubStrokes, grainStrokes]
      for (var groupIdx = 0; groupIdx < timedGroups.length; groupIdx++) {
        for (var strokeIdx = 0; strokeIdx < timedGroups[groupIdx].length; strokeIdx++) {
          clampReveal(timedGroups[groupIdx][strokeIdx])
        }
      }

      var mass = {
        points: points,
        segments: curveSegments(points, height),
        washBlooms: washBlooms,
        washStrokes: washStrokes,
        rubStrokes: rubStrokes,
        grainStrokes: grainStrokes,
        baseY: baseY,
        height: height,
        tone: config.tone,
        wash: config.wash,
        width: config.lineWidth,
        delay: config.delay,
        fragments: [],
      }
      mass.fragments = buildFragments(mass)
      return mass
    }

    function buildInkScene() {
      var mobile = inkWidth <= 760
      var templates = mobile
        ? [
            [
              { range: true, x: -0.18, width: 1.36, base: 0.69, height: 0.14, peaks: 5, tone: 0.1, wash: 0.014, lineWidth: 0.5, delay: 20 },
              { range: true, x: -0.2, width: 1.38, base: 0.9, height: 0.27, peaks: 4, tone: 0.22, wash: 0.038, lineWidth: 0.8, delay: 260 },
              { x: -0.34, width: 0.62, base: 1.02, height: 0.35, peaks: 4, tone: 0.31, wash: 0.052, lineWidth: 0.98, delay: 430 },
            ],
            [
              { range: true, x: -0.16, width: 1.34, base: 0.67, height: 0.13, peaks: 6, tone: 0.09, wash: 0.013, lineWidth: 0.48, delay: 30 },
              { range: true, x: -0.18, width: 1.36, base: 0.91, height: 0.29, peaks: 4, tone: 0.23, wash: 0.04, lineWidth: 0.82, delay: 250 },
              { x: 0.73, width: 0.61, base: 1.01, height: 0.36, peaks: 4, tone: 0.32, wash: 0.054, lineWidth: 1, delay: 420 },
            ],
          ]
        : [
            [
              { range: true, x: -0.12, width: 1.24, base: 0.6, height: 0.12, peaks: 7, tone: 0.075, wash: 0.01, lineWidth: 0.42, delay: 10 },
              { range: true, x: -0.11, width: 1.23, base: 0.74, height: 0.18, peaks: 6, tone: 0.14, wash: 0.021, lineWidth: 0.58, delay: 150 },
              { range: true, x: -0.14, width: 1.28, base: 0.92, height: 0.28, peaks: 5, tone: 0.22, wash: 0.038, lineWidth: 0.8, delay: 310 },
              { x: -0.18, width: 0.46, base: 1.02, height: 0.4, peaks: 4, tone: 0.34, wash: 0.06, lineWidth: 1.04, delay: 470 },
            ],
            [
              { range: true, x: -0.13, width: 1.26, base: 0.58, height: 0.11, peaks: 6, tone: 0.07, wash: 0.009, lineWidth: 0.4, delay: 20 },
              { range: true, x: -0.1, width: 1.22, base: 0.73, height: 0.19, peaks: 5, tone: 0.145, wash: 0.022, lineWidth: 0.6, delay: 150 },
              { range: true, x: -0.15, width: 1.3, base: 0.93, height: 0.3, peaks: 5, tone: 0.23, wash: 0.04, lineWidth: 0.82, delay: 300 },
              { x: 0.72, width: 0.47, base: 1.01, height: 0.39, peaks: 4, tone: 0.34, wash: 0.06, lineWidth: 1.04, delay: 480 },
            ],
            [
              { range: true, x: -0.14, width: 1.28, base: 0.61, height: 0.13, peaks: 7, tone: 0.08, wash: 0.011, lineWidth: 0.43, delay: 15 },
              { range: true, x: -0.12, width: 1.25, base: 0.76, height: 0.2, peaks: 6, tone: 0.15, wash: 0.023, lineWidth: 0.62, delay: 145 },
              { range: true, x: -0.15, width: 1.3, base: 0.91, height: 0.27, peaks: 4, tone: 0.215, wash: 0.037, lineWidth: 0.79, delay: 315 },
              { x: 0.68, width: 0.52, base: 1.03, height: 0.42, peaks: 5, tone: 0.36, wash: 0.064, lineWidth: 1.08, delay: 470 },
            ],
          ]
      var configs = templates[Math.floor(inkRandom() * templates.length)].map(function (config) {
        return {
          range: config.range,
          x: config.x + (inkRandom() - 0.5) * 0.025,
          width: config.width * (0.95 + inkRandom() * 0.1),
          base: config.base + (inkRandom() - 0.5) * 0.024,
          height: config.height * (0.92 + inkRandom() * 0.16),
          peaks: config.peaks,
          tone: config.tone * (0.92 + inkRandom() * 0.16),
          wash: config.wash * (0.9 + inkRandom() * 0.2),
          lineWidth: config.lineWidth,
          delay: config.delay,
        }
      })
      inkMasses = []
      for (var i = 0; i < configs.length; i++) inkMasses.push(buildMountain(configs[i], i))
      buildRevealQueues()
      buildMistMasks()
      buildSkyScenes()
      inkBirdEvent = null
      if (inkBirdsEnabled && !scheduleBirdEvent(1100 + inkRandom() * 900)) {
        queueNextBirdEvent(7000, 15000)
      }
    }

    function cubicPoint(segment, position) {
      var inverse = 1 - position
      var inverse2 = inverse * inverse
      var position2 = position * position
      return {
        x: inverse2 * inverse * segment.p0.x
          + 3 * inverse2 * position * segment.c1.x
          + 3 * inverse * position2 * segment.c2.x
          + position2 * position * segment.p1.x,
        y: inverse2 * inverse * segment.p0.y
          + 3 * inverse2 * position * segment.c1.y
          + 3 * inverse * position2 * segment.c2.y
          + position2 * position * segment.p1.y,
      }
    }

    function quadraticPoint(start, control, end, position) {
      var inverse = 1 - position
      return {
        x: inverse * inverse * start.x + 2 * inverse * position * control.x + position * position * end.x,
        y: inverse * inverse * start.y + 2 * inverse * position * control.y + position * position * end.y,
      }
    }

    function pointDistance(a, b) {
      var x = b.x - a.x
      var y = b.y - a.y
      return Math.sqrt(x * x + y * y)
    }

    function sampleFragment(mass, fragment) {
      var samples = []
      var offset = fragment.offset || 0
      if (fragment.type === 'hatch') {
        var start = { x: fragment.x1, y: fragment.y1 + offset }
        var end = { x: fragment.x2, y: fragment.y2 + offset }
        var control = {
          x: fragment.cx == null ? (fragment.x1 + fragment.x2) * 0.5 + 1.5 : fragment.cx,
          y: (fragment.cy == null ? (fragment.y1 + fragment.y2) * 0.5 : fragment.cy) + offset,
        }
        var hatchLength = pointDistance(start, control) + pointDistance(control, end)
        var hatchSteps = clamp(Math.ceil(hatchLength / 4), 5, 14)
        for (var hatchStep = 0; hatchStep <= hatchSteps; hatchStep++) {
          samples.push(quadraticPoint(start, control, end, hatchStep / hatchSteps))
        }
        return samples
      }

      for (var segmentIndex = fragment.first; segmentIndex < fragment.first + fragment.count; segmentIndex++) {
        var segment = mass.segments[segmentIndex]
        if (!segment) break
        var estimatedLength = pointDistance(segment.p0, segment.c1)
          + pointDistance(segment.c1, segment.c2)
          + pointDistance(segment.c2, segment.p1)
        var steps = clamp(Math.ceil(estimatedLength / 4.1), 4, 12)
        for (var step = samples.length ? 1 : 0; step <= steps; step++) {
          var point = cubicPoint(segment, step / steps)
          point.y += offset
          samples.push(point)
        }
      }
      return samples
    }

    function drawPressureStroke(target, fragment, widthScale, strokeStyle, extraOffset, dashShift, progress) {
      var samples = fragment.samples
      if (!samples || samples.length < 2) return
      progress = progress == null ? 1 : clamp(progress, 0, 1)
      if (progress <= 0) return
      var limit = progress * (samples.length - 1)
      var travelled = 0
      target.strokeStyle = strokeStyle
      var useDryDash = fragment.dry > 0.48
      target.lineCap = useDryDash ? 'butt' : 'round'
      target.setLineDash(useDryDash ? (fragment.dash || []) : [])
      for (var i = 1; i < samples.length && i - 1 < limit; i++) {
        var previous = samples[i - 1]
        var current = samples[i]
        var segmentProgress = clamp(limit - (i - 1), 0, 1)
        if (segmentProgress < 1) {
          current = {
            x: previous.x + (current.x - previous.x) * segmentProgress,
            y: previous.y + (current.y - previous.y) * segmentProgress,
          }
        }
        var position = (i - 1 + segmentProgress * 0.5) / Math.max(1, samples.length - 1)
        var pressure = Math.pow(
          Math.sin(Math.PI * clamp(position, 0, 1)),
          0.58
        )
        target.lineWidth = Math.max(0.14, fragment.width * widthScale * (0.12 + pressure * 0.88))
        target.lineDashOffset = (fragment.dashOffset || 0) + (dashShift || 0) - travelled
        target.beginPath()
        target.moveTo(previous.x, previous.y + (extraOffset || 0))
        target.lineTo(current.x, current.y + (extraOffset || 0))
        target.stroke()
        travelled += pointDistance(previous, current)
      }
      target.setLineDash([])
      target.lineDashOffset = 0
    }

    function drawFragment(target, mass, fragment, progress) {
      if (progress <= 0) return
      target.save()
      target.lineCap = 'round'
      target.lineJoin = 'round'

      drawPressureStroke(
        target,
        fragment,
        3.1 + fragment.dry * 1.1,
        inkColor(fragment.tone * (0.075 + fragment.dry * 0.035)),
        0,
        0,
        progress
      )
      drawPressureStroke(target, fragment, 1, inkColor(fragment.tone), 0, 0, progress)

      if (fragment.dry > 0.78) {
        drawPressureStroke(
          target,
          fragment,
          0.18,
          inkColor(fragment.tone * 0.42),
          fragment.width * 0.32,
          fragment.dash[0] * 0.46,
          progress
        )
      }
      target.restore()
    }

    function traceMass(target, mass) {
      if (!mass.segments.length) return
      target.beginPath()
      target.moveTo(mass.segments[0].p0.x, mass.segments[0].p0.y)
      for (var i = 0; i < mass.segments.length; i++) {
        var segment = mass.segments[i]
        target.bezierCurveTo(
          segment.c1.x, segment.c1.y,
          segment.c2.x, segment.c2.y,
          segment.p1.x, segment.p1.y
        )
      }
      target.lineTo(mass.points[mass.points.length - 1].x, mass.baseY + mass.height * 0.2)
      target.lineTo(mass.points[0].x, mass.baseY + mass.height * 0.2)
      target.closePath()
    }

    // 以下五个函数把原先揉在 drawWash 里的各类笔画拆成可以单独绘制的单位，让揭示期
    // 能够按完成时间逐笔烘焙。每个函数都显式设置自己的 lineCap 与虚线，不依赖调用顺序。
    function paintWashBase(target, mass, progress) {
      if (progress <= 0) return
      var top = mass.baseY - mass.height
      var gradient = target.createLinearGradient(0, top, 0, mass.baseY + mass.height * 0.2)
      gradient.addColorStop(0, inkColor(mass.wash * 0.26 * progress))
      gradient.addColorStop(0.48, inkColor(mass.wash * 0.42 * progress))
      gradient.addColorStop(1, inkColor(0))
      target.fillStyle = gradient
      target.fillRect(mass.points[0].x, top, mass.points[mass.points.length - 1].x - mass.points[0].x, mass.baseY + mass.height * 0.2 - top)
    }

    function paintWashBloom(target, bloom, progress) {
      if (progress <= 0) return
      target.save()
      target.translate(bloom.x, bloom.y)
      var bloomScale = 0.28 + progress * 0.72
      for (var lobeIndex = 0; lobeIndex < bloom.lobes.length; lobeIndex++) {
        var lobe = bloom.lobes[lobeIndex]
        target.save()
        target.translate(lobe.dx * bloom.rx * bloomScale, lobe.dy * bloom.ry * bloomScale)
        target.scale(bloom.rx * lobe.sx * bloomScale, bloom.ry * lobe.sy * bloomScale)
        var bloomGradient = target.createRadialGradient(0, 0, 0, 0, 0, 1)
        bloomGradient.addColorStop(0, inkColor(bloom.tone * lobe.tone * (0.72 + progress * 0.28)))
        bloomGradient.addColorStop(0.48, inkColor(bloom.tone * lobe.tone * 0.36))
        bloomGradient.addColorStop(1, inkColor(0))
        target.fillStyle = bloomGradient
        target.fillRect(-1, -1, 2, 2)
        target.restore()
      }
      target.restore()
    }

    function paintWashStroke(target, washStroke, progress) {
      if (progress <= 0) return
      target.lineCap = 'round'
      target.setLineDash([])
      target.lineDashOffset = 0
      target.beginPath()
      target.moveTo(washStroke.x1, washStroke.y1)
      target.quadraticCurveTo(
        (washStroke.x1 + washStroke.x2) * 0.5 + (washStroke.x2 - washStroke.x1) * 0.18,
        (washStroke.y1 + washStroke.y2) * 0.5,
        washStroke.x1 + (washStroke.x2 - washStroke.x1) * progress,
        washStroke.y1 + (washStroke.y2 - washStroke.y1) * progress
      )
      target.lineWidth = washStroke.width * (0.72 + progress * 0.28)
      target.strokeStyle = inkColor(washStroke.tone)
      target.stroke()
    }

    function paintRubStroke(target, rubStroke, progress) {
      if (progress <= 0) return
      target.lineCap = 'butt'
      target.beginPath()
      target.moveTo(rubStroke.x1, rubStroke.y1)
      target.quadraticCurveTo(
        rubStroke.x1 + (rubStroke.cx - rubStroke.x1) * progress,
        rubStroke.y1 + (rubStroke.cy - rubStroke.y1) * progress,
        rubStroke.x1 + (rubStroke.x2 - rubStroke.x1) * progress,
        rubStroke.y1 + (rubStroke.y2 - rubStroke.y1) * progress
      )
      target.lineWidth = rubStroke.width
      target.strokeStyle = inkColor(rubStroke.tone)
      target.setLineDash(rubStroke.dash)
      target.lineDashOffset = rubStroke.dashOffset
      target.stroke()
      target.setLineDash([])
      target.lineDashOffset = 0
    }

    function paintGrainStroke(target, grainStroke, progress) {
      if (progress <= 0) return
      target.lineCap = 'butt'
      target.beginPath()
      target.moveTo(grainStroke.x1, grainStroke.y1)
      target.lineTo(
        grainStroke.x1 + (grainStroke.x2 - grainStroke.x1) * progress,
        grainStroke.y1 + (grainStroke.y2 - grainStroke.y1) * progress
      )
      target.lineWidth = grainStroke.width
      target.strokeStyle = inkColor(grainStroke.tone)
      target.setLineDash(grainStroke.dash)
      target.lineDashOffset = grainStroke.dashOffset
      target.stroke()
      target.setLineDash([])
      target.lineDashOffset = 0
    }

    function paintWashEntry(target, mass, entry, progress) {
      if (entry.kind === 'base') paintWashBase(target, mass, progress)
      else if (entry.kind === 'bloom') paintWashBloom(target, entry.item, progress)
      else if (entry.kind === 'wash') paintWashStroke(target, entry.item, progress)
      else if (entry.kind === 'rub') paintRubStroke(target, entry.item, progress)
      else paintGrainStroke(target, entry.item, progress)
    }

    // 从零重绘的路径：减少动态效果、主题切换时使用。绘制顺序与拆分前完全一致。
    function drawWash(target, mass, elapsed, complete) {
      var baseProgress = complete ? 1 : easeOutCubic((elapsed - mass.delay * 0.35) / 2350)
      if (baseProgress <= 0) return
      target.save()
      traceMass(target, mass)
      target.clip()
      paintWashBase(target, mass, baseProgress)
      for (var bloomIndex = 0; bloomIndex < mass.washBlooms.length; bloomIndex++) {
        var bloom = mass.washBlooms[bloomIndex]
        paintWashBloom(target, bloom, complete ? 1 : smoothstep((elapsed - bloom.revealAt) / bloom.revealDuration))
      }
      for (var i = 0; i < mass.washStrokes.length; i++) {
        var washStroke = mass.washStrokes[i]
        paintWashStroke(target, washStroke, complete ? 1 : smoothstep((elapsed - washStroke.revealAt) / washStroke.revealDuration))
      }
      for (var rubIndex = 0; rubIndex < mass.rubStrokes.length; rubIndex++) {
        var rubStroke = mass.rubStrokes[rubIndex]
        paintRubStroke(target, rubStroke, complete ? 1 : smoothstep((elapsed - rubStroke.revealAt) / rubStroke.revealDuration))
      }
      for (var grainIndex = 0; grainIndex < mass.grainStrokes.length; grainIndex++) {
        var grainStroke = mass.grainStrokes[grainIndex]
        paintGrainStroke(target, grainStroke, complete ? 1 : smoothstep((elapsed - grainStroke.revealAt) / grainStroke.revealDuration))
      }
      target.restore()
    }

    function drawMountains(target, elapsed, complete) {
      for (var massIndex = 0; massIndex < inkMasses.length; massIndex++) {
        var mass = inkMasses[massIndex]
        drawWash(target, mass, elapsed, complete)
      }
      for (var groupIndex = 0; groupIndex < inkMasses.length; groupIndex++) {
        var currentMass = inkMasses[groupIndex]
        for (var fragmentIndex = 0; fragmentIndex < currentMass.fragments.length; fragmentIndex++) {
          var fragment = currentMass.fragments[fragmentIndex]
          if (!complete && fragment.revealAt > elapsed) break
          var fragmentProgress = complete ? 1 : smoothstep((elapsed - fragment.revealAt) / fragment.revealDuration)
          drawFragment(target, currentMass, fragment, fragmentProgress)
        }
      }
    }

    function buildRevealQueues() {
      var byEnd = function (a, b) { return a.end - b.end }
      for (var m = 0; m < inkMasses.length; m++) {
        var mass = inkMasses[m]
        var wash = [{ kind: 'base', item: null, at: mass.delay * 0.35, end: mass.delay * 0.35 + 2350 }]
        var groups = [
          ['bloom', mass.washBlooms],
          ['wash', mass.washStrokes],
          ['rub', mass.rubStrokes],
          ['grain', mass.grainStrokes],
        ]
        for (var g = 0; g < groups.length; g++) {
          var list = groups[g][1]
          for (var i = 0; i < list.length; i++) {
            wash.push({
              kind: groups[g][0],
              item: list[i],
              at: list[i].revealAt,
              end: list[i].revealAt + list[i].revealDuration,
            })
          }
        }
        var frag = []
        for (var f = 0; f < mass.fragments.length; f++) {
          var fragment = mass.fragments[f]
          frag.push({
            item: fragment,
            at: fragment.revealAt,
            end: fragment.revealAt + fragment.revealDuration,
          })
        }
        wash.sort(byEnd)
        frag.sort(byEnd)
        mass.washQueue = wash
        mass.fragQueue = frag
        mass.washBaked = 0
        mass.fragBaked = 0
      }
    }

    // 把已完成的笔画永久烘焙进累积画布。队列按结束时间排序，指针只前进，因此每一笔
    // 一生只绘制一次。单帧成本从「重画全部已显现笔画」降到「重画正在生长的那几笔」，
    // 揭示末段原本约 6000 次 stroke 调用，现在只剩几十次。
    function bakeRevealed(elapsed) {
      for (var m = 0; m < inkMasses.length; m++) {
        var mass = inkMasses[m]
        var wash = mass.washQueue
        if (mass.washBaked < wash.length && wash[mass.washBaked].end <= elapsed) {
          washAccumCtx.save()
          traceMass(washAccumCtx, mass)
          washAccumCtx.clip()
          while (mass.washBaked < wash.length && wash[mass.washBaked].end <= elapsed) {
            paintWashEntry(washAccumCtx, mass, wash[mass.washBaked], 1)
            mass.washBaked++
          }
          washAccumCtx.restore()
        }
        var frag = mass.fragQueue
        while (mass.fragBaked < frag.length && frag[mass.fragBaked].end <= elapsed) {
          drawFragment(fragAccumCtx, mass, frag[mass.fragBaked].item, 1)
          mass.fragBaked++
        }
      }
    }

    function blitLayer(layer) {
      if (!layer.width) return
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(layer, 0, 0)
      ctx.restore()
    }

    function drawActiveWash(elapsed) {
      for (var m = 0; m < inkMasses.length; m++) {
        var mass = inkMasses[m]
        var queue = mass.washQueue
        var opened = false
        for (var i = mass.washBaked; i < queue.length; i++) {
          var entry = queue[i]
          if (entry.at > elapsed) continue
          if (!opened) {
            ctx.save()
            traceMass(ctx, mass)
            ctx.clip()
            opened = true
          }
          paintWashEntry(ctx, mass, entry, entry.kind === 'base'
            ? easeOutCubic((elapsed - entry.at) / 2350)
            : smoothstep((elapsed - entry.at) / (entry.end - entry.at)))
        }
        if (opened) ctx.restore()
      }
    }

    function drawActiveFragments(elapsed) {
      for (var m = 0; m < inkMasses.length; m++) {
        var mass = inkMasses[m]
        var queue = mass.fragQueue
        for (var i = mass.fragBaked; i < queue.length; i++) {
          var entry = queue[i]
          if (entry.at > elapsed) continue
          drawFragment(ctx, mass, entry.item, smoothstep((elapsed - entry.at) / (entry.end - entry.at)))
        }
      }
    }

    function drawRevealFrame(elapsed) {
      bakeRevealed(elapsed)
      blitLayer(washAccum)
      drawActiveWash(elapsed)
      blitLayer(fragAccum)
      drawActiveFragments(elapsed)
    }

    // 揭示结束：两层累积画布合成为最终静止位图，雾气一次性擦入。
    // 每张累积画布用完立刻归零，避免出现四张全尺寸画布同时存活的内存峰值。
    function sealStaticScene() {
      clearStaticCanvas()
      staticCtx.save()
      staticCtx.setTransform(1, 0, 0, 1, 0, 0)
      staticCtx.drawImage(washAccum, 0, 0)
      washAccum.width = 0
      washAccum.height = 0
      staticCtx.drawImage(fragAccum, 0, 0)
      fragAccum.width = 0
      fragAccum.height = 0
      staticCtx.restore()
      cutMistInto(staticCtx)
      inkStaticReady = true
    }

    // 从零重绘：减少动态效果、主题切换后使用。只会在定格状态下被调用，
    // 因此同样可以释放累积画布。
    function buildStaticScene() {
      clearStaticCanvas()
      drawMountains(staticCtx, inkRevealEnd, true)
      cutMistInto(staticCtx)
      releaseAccumulators()
      inkStaticReady = true
    }

    function makeMistMask(seed) {
      var mask = document.createElement('canvas')
      mask.width = 640
      mask.height = 128
      var maskCtx = mask.getContext('2d')
      var random = seededRandom(seed)
      for (var i = 0; i < 7; i++) {
        var x = 52 + i * 88 + (random() - 0.5) * 58
        var y = 54 + (random() - 0.5) * 25
        var radius = 45 + random() * 66
        var gradient = maskCtx.createRadialGradient(x, y, 0, x, y, radius)
        gradient.addColorStop(0, 'rgba(255,255,255,' + (0.58 + random() * 0.22) + ')')
        gradient.addColorStop(0.55, 'rgba(255,255,255,0.38)')
        gradient.addColorStop(1, 'rgba(255,255,255,0)')
        maskCtx.fillStyle = gradient
        maskCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
      }
      return mask
    }

    function buildMistMasks() {
      inkMistMasks = [makeMistMask(801), makeMistMask(2203)]
      inkMistBands = inkWidth <= 760
        ? [
            { mask: 0, x: 0.5, y: 0.7, width: 0.86, height: 0.075, settled: 0.115 },
            { mask: 1, x: 0.18, y: 0.84, width: 0.5, height: 0.085, settled: 0.1 },
          ]
        : [
            { mask: 0, x: 0.5, y: 0.68, width: 0.9, height: 0.068, settled: 0.13 },
            { mask: 1, x: 0.55, y: 0.82, width: 0.74, height: 0.076, settled: 0.105 },
            { mask: 0, x: 0.14, y: 0.9, width: 0.34, height: 0.082, settled: 0.09 },
          ]
    }

    function mistBandBox(band) {
      var width = inkWidth * band.width
      var height = Math.max(36, inkHeight * band.height)
      return {
        x: inkWidth * band.x - width * 0.5,
        y: inkHeight * band.y - height * 0.5,
        width: width,
        height: height,
      }
    }

    // 定格后的雾气：一次性擦入静态位图，此后不再改变。
    function cutMistInto(target) {
      target.save()
      target.globalCompositeOperation = 'destination-out'
      for (var i = 0; i < inkMistBands.length; i++) {
        var band = inkMistBands[i]
        var box = mistBandBox(band)
        target.globalAlpha = clamp(band.settled, 0, 0.46)
        target.drawImage(inkMistMasks[band.mask], box.x, box.y, box.width, box.height)
      }
      target.restore()
    }

    // 揭示期的雾气：只多一层随时间抬起的薄纱，不漂移。4.7 秒时薄纱归零，
    // 此刻的透明度与 cutMistInto 烘焙的值完全一致，交接处没有跳变。
    function cutMistLive(elapsed) {
      var veil = (1 - easeOutCubic(elapsed / 4700)) * 0.17
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      for (var i = 0; i < inkMistBands.length; i++) {
        var band = inkMistBands[i]
        var box = mistBandBox(band)
        ctx.globalAlpha = clamp(band.settled + veil, 0, 0.46)
        ctx.drawImage(inkMistMasks[band.mask], box.x, box.y, box.width, box.height)
      }
      ctx.restore()
    }

    function skySidePosition(random, inset) {
      var left = random() < 0.5
      return left
        ? inset + random() * 0.17
        : 1 - inset - random() * 0.17
    }

    function buildClouds(random, count, night) {
      var clouds = []
      for (var i = 0; i < count; i++) {
        var lobeCount = 5 + Math.floor(random() * 3)
        var lobes = []
        for (var lobe = 0; lobe < lobeCount; lobe++) {
          lobes.push({
            x: -0.42 + lobe / Math.max(1, lobeCount - 1) * 0.84 + (random() - 0.5) * 0.08,
            y: (random() - 0.5) * 0.34,
            radius: 0.13 + random() * 0.12,
            stretch: 0.18 + random() * 0.22,
            tone: 0.6 + random() * 0.4,
          })
        }
        clouds.push({
          x: skySidePosition(random, 0.08),
          y: 0.15 + random() * 0.24,
          width: (inkWidth <= 760 ? 72 : 105) + random() * (inkWidth <= 760 ? 62 : 105),
          height: 24 + random() * 22,
          opacity: (night ? 0.026 : 0.034) + random() * (night ? 0.018 : 0.024),
          drift: 4 + random() * 8,
          period: 72000 + random() * 52000,
          phase: random() * Math.PI * 2,
          delay: 1200 + random() * 2600,
          lobes: lobes,
        })
      }
      return clouds
    }

    function buildStars(random, count, moon) {
      var stars = []
      var attempts = 0
      while (stars.length < count && attempts < count * 8) {
        attempts++
        var x = skySidePosition(random, 0.055)
        var y = 0.075 + random() * 0.31
        if (moon) {
          var moonDistanceX = (x - moon.x) * inkWidth
          var moonDistanceY = (y - moon.y) * inkHeight
          if (Math.sqrt(moonDistanceX * moonDistanceX + moonDistanceY * moonDistanceY) < moon.radius * 2.2) continue
        }
        stars.push({
          x: x,
          y: y,
          radius: 0.42 + random() * 0.88,
          alpha: 0.17 + random() * 0.2,
          phase: random() * Math.PI * 2,
          period: 4800 + random() * 7600,
          cross: random() < 0.12,
        })
      }
      return stars
    }

    function buildConstellation(random) {
      var templates = [
        {
          points: [[0, 0.34], [0.16, 0.22], [0.35, 0.31], [0.51, 0.2], [0.63, 0.05], [0.81, 0.08], [1, 0]],
          links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
        },
        {
          points: [[0.18, 0], [0.04, 0.38], [0.42, 0.42], [0.58, 0.45], [0.74, 0.48], [0.96, 0.18], [1, 0.86], [0.2, 1]],
          links: [[0, 2], [1, 2], [2, 3], [3, 4], [4, 5], [4, 6], [3, 7]],
        },
        {
          points: [[0.5, 0], [0.5, 0.38], [0.5, 1], [0, 0.48], [1, 0.48], [0.22, 0.29], [0.82, 0.7]],
          links: [[0, 1], [1, 2], [3, 1], [1, 4], [3, 5], [4, 6]],
        },
      ]
      var template = templates[Math.floor(random() * templates.length)]
      return {
        x: skySidePosition(random, 0.09),
        y: 0.1 + random() * 0.12,
        width: (inkWidth <= 760 ? 68 : 92) + random() * (inkWidth <= 760 ? 24 : 52),
        height: (inkWidth <= 760 ? 48 : 62) + random() * (inkWidth <= 760 ? 20 : 36),
        phase: random() * 36000,
        points: template.points,
        links: template.links,
      }
    }

    // 当前构图要求定格后画面完全安静，天空最多只保留一个天体。星、云、星座的
    // 生成代码原样保留，把这三个常量调回非零即可恢复（原值：云 1–3、星 3–21、
    // 星座 0.46 / 0.11）。
    var INK_CLOUD_COUNT = 0
    var INK_STAR_COUNT = 0
    var INK_CONSTELLATION_CHANCE = 0

    function buildSkyScenes() {
      var dayRandom = seededRandom((inkSceneSeed ^ 0x5f356495 ^ (inkWidth <= 760 ? 4099 : 0)) >>> 0)
      // 日轮是白天唯一的天象，出现概率从 38% 提到 52%，否则多数刷新会得到空白天空。
      var sun = dayRandom() < 0.52 ? {
        x: skySidePosition(dayRandom, 0.1),
        y: 0.13 + dayRandom() * 0.16,
        radius: (inkWidth <= 760 ? 9 : 13) + dayRandom() * (inkWidth <= 760 ? 5 : 7),
        phase: dayRandom() * Math.PI * 2,
        textureSeed: Math.floor(dayRandom() * 0xffffffff) >>> 0,
      } : null
      inkDaySky = {
        profile: sun ? 'clear-day' : 'plain-day',
        sun: sun,
        clouds: buildClouds(dayRandom, INK_CLOUD_COUNT, false),
        birdDensity: 1.12,
      }

      var nightRandom = seededRandom((inkSceneSeed ^ 0x9e3779b9 ^ (inkWidth <= 760 ? 6151 : 0)) >>> 0)
      var moonVisible = nightRandom() < 0.72
      var moonPhaseRoll = nightRandom()
      var moonPhase = moonPhaseRoll < 0.1
        ? 0
        : moonPhaseRoll < 0.45 ? 1 : moonPhaseRoll < 0.77 ? 2 : 3
      var moon = moonVisible ? {
        x: skySidePosition(nightRandom, 0.1),
        y: 0.12 + nightRandom() * 0.17,
        radius: (inkWidth <= 760 ? 10 : 14) + nightRandom() * (inkWidth <= 760 ? 6 : 8),
        phase: moonPhase,
        phaseName: ['full', 'crescent', 'half', 'gibbous'][moonPhase],
        cutDirection: nightRandom() < 0.5 ? -1 : 1,
        textureSeed: Math.floor(nightRandom() * 0xffffffff) >>> 0,
      } : null
      inkNightSky = {
        profile: moon ? 'moonlit-night' : 'deep-night',
        moon: moon,
        stars: buildStars(nightRandom, INK_STAR_COUNT, moon),
        constellation: nightRandom() < INK_CONSTELLATION_CHANCE ? buildConstellation(nightRandom) : null,
        clouds: buildClouds(nightRandom, INK_CLOUD_COUNT, true),
        birdDensity: 0.2,
      }
    }

    function drawClouds(clouds, elapsed, reduced, dark) {
      for (var i = 0; i < clouds.length; i++) {
        var cloud = clouds[i]
        var reveal = reduced ? 1 : smoothstep((elapsed - cloud.delay) / 2200)
        if (reveal <= 0) continue
        var drift = reduced ? 0 : Math.sin(elapsed / cloud.period * Math.PI * 2 + cloud.phase) * cloud.drift
        var breath = reduced ? 1 : 0.92 + Math.sin(elapsed / 18000 * Math.PI * 2 + cloud.phase) * 0.08
        var centerX = inkWidth * cloud.x + drift
        var centerY = inkHeight * cloud.y
        ctx.save()
        ctx.globalAlpha = reveal * breath
        for (var lobeIndex = 0; lobeIndex < cloud.lobes.length; lobeIndex++) {
          var lobe = cloud.lobes[lobeIndex]
          var x = centerX + lobe.x * cloud.width
          var y = centerY + lobe.y * cloud.height
          var radius = cloud.width * lobe.radius
          ctx.save()
          ctx.translate(x, y)
          ctx.scale(1, lobe.stretch)
          var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
          gradient.addColorStop(0, skyColor(cloud.opacity * lobe.tone, dark))
          gradient.addColorStop(0.42, skyColor(cloud.opacity * lobe.tone * 0.36, dark))
          gradient.addColorStop(1, skyColor(0, dark))
          ctx.fillStyle = gradient
          ctx.fillRect(-radius, -radius, radius * 2, radius * 2)
          ctx.restore()
        }
        ctx.strokeStyle = skyColor(cloud.opacity * 0.72, dark)
        ctx.lineWidth = 0.4
        ctx.beginPath()
        ctx.moveTo(centerX - cloud.width * 0.46, centerY + cloud.height * 0.12)
        ctx.bezierCurveTo(
          centerX - cloud.width * 0.16,
          centerY + cloud.height * 0.28,
          centerX + cloud.width * 0.2,
          centerY - cloud.height * 0.05,
          centerX + cloud.width * 0.46,
          centerY + cloud.height * 0.08
        )
        ctx.stroke()
        ctx.strokeStyle = skyColor(cloud.opacity * 0.38, dark)
        ctx.lineWidth = 0.32
        ctx.beginPath()
        ctx.moveTo(centerX - cloud.width * 0.34, centerY - cloud.height * 0.06)
        ctx.bezierCurveTo(
          centerX - cloud.width * 0.08,
          centerY - cloud.height * 0.18,
          centerX + cloud.width * 0.14,
          centerY + cloud.height * 0.12,
          centerX + cloud.width * 0.36,
          centerY - cloud.height * 0.02
        )
        ctx.stroke()
        ctx.restore()
      }
    }

    function organicDiscPath(target, x, y, radius, random, xScale, yScale) {
      var points = []
      var count = 34
      for (var i = 0; i < count; i++) {
        var angle = i / count * Math.PI * 2
        var uneven = 0.955 + random() * 0.065
        points.push({
          x: x + Math.cos(angle) * radius * uneven * (xScale || 1),
          y: y + Math.sin(angle) * radius * uneven * (yScale || 1),
        })
      }
      var first = points[0]
      var last = points[points.length - 1]
      target.beginPath()
      target.moveTo((last.x + first.x) * 0.5, (last.y + first.y) * 0.5)
      for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
        var point = points[pointIndex]
        var next = points[(pointIndex + 1) % points.length]
        target.quadraticCurveTo(point.x, point.y, (point.x + next.x) * 0.5, (point.y + next.y) * 0.5)
      }
      target.closePath()
    }

    // 日轮与月轮的几何完全由 textureSeed 决定，每帧重算上百条曲线是纯浪费。缓存到离屏
    // 画布后每帧只剩一次 drawImage，逐帧飞鸟才负担得起。月轮还有一个额外收益：它的相位
    // 缺口与雾痕靠 destination-out 擦除，画在主画布上会连同下方的星与星座一起擦出空洞，
    // 移到独立图层后擦除只作用于月面本身。
    function makeOrbCache(orb, paint) {
      var size = Math.ceil((orb.radius * 1.45 + 6) * 2)
      var orbCanvas = document.createElement('canvas')
      orbCanvas.width = Math.max(1, Math.round(size * inkDpr))
      orbCanvas.height = orbCanvas.width
      var orbCtx = orbCanvas.getContext('2d')
      orbCtx.setTransform(inkDpr, 0, 0, inkDpr, 0, 0)
      paint(orbCtx, size * 0.5, size * 0.5)
      return { canvas: orbCanvas, size: size }
    }

    function drawOrbCache(cache, centerX, centerY, alpha) {
      ctx.save()
      ctx.globalAlpha = clamp(alpha, 0, 1)
      ctx.drawImage(
        cache.canvas,
        centerX - cache.size * 0.5,
        centerY - cache.size * 0.5,
        cache.size,
        cache.size
      )
      ctx.restore()
    }

    function paintSun(target, sun, x, y) {
      var random = seededRandom(sun.textureSeed)
      for (var layer = 0; layer < 4; layer++) {
        organicDiscPath(
          target,
          x + (random() - 0.5) * 1.8,
          y + (random() - 0.5) * 1.5,
          sun.radius * (0.93 + random() * 0.09),
          random,
          0.98 + random() * 0.035,
          0.98 + random() * 0.035
        )
        target.fillStyle = 'rgba(168,64,47,' + (0.017 + random() * 0.014) + ')'
        target.fill()
      }
      organicDiscPath(target, x, y, sun.radius, random, 1, 0.99)
      target.strokeStyle = 'rgba(168,64,47,0.12)'
      target.lineWidth = 0.46
      target.setLineDash([
        sun.radius * (0.34 + random() * 0.24),
        sun.radius * (0.16 + random() * 0.22),
        sun.radius * (0.2 + random() * 0.22),
        sun.radius * (0.12 + random() * 0.18),
      ])
      target.lineDashOffset = random() * sun.radius
      target.stroke()
      target.setLineDash([])
      for (var wash = 0; wash < 5; wash++) {
        target.fillStyle = 'rgba(168,64,47,' + (0.012 + random() * 0.016) + ')'
        target.beginPath()
        target.ellipse(
          x + (random() - 0.5) * sun.radius * 0.8,
          y + (random() - 0.5) * sun.radius * 0.7,
          sun.radius * (0.18 + random() * 0.34),
          sun.radius * (0.08 + random() * 0.2),
          random() * Math.PI,
          0,
          Math.PI * 2
        )
        target.fill()
      }
    }

    function drawSun(sun, elapsed, reduced) {
      if (!sun) return
      var reveal = reduced ? 1 : smoothstep((elapsed - 900) / 2400)
      if (reveal <= 0) return
      if (!sun.cache) {
        sun.cache = makeOrbCache(sun, function (target, cx, cy) { paintSun(target, sun, cx, cy) })
      }
      var breath = reduced ? 1 : 0.94 + Math.sin(elapsed / 14000 * Math.PI * 2 + sun.phase) * 0.06
      drawOrbCache(sun.cache, inkWidth * sun.x, inkHeight * sun.y, reveal * breath)
    }

    function drawStars(stars, elapsed, reduced) {
      var reveal = reduced ? 1 : smoothstep((elapsed - 1500) / 3200)
      if (reveal <= 0) return
      for (var i = 0; i < stars.length; i++) {
        var star = stars[i]
        var twinkle = reduced
          ? 0.88
          : 0.84
            + Math.sin(elapsed / star.period * Math.PI * 2 + star.phase) * 0.12
            + Math.sin(elapsed / (star.period * 0.43) * Math.PI * 2 + star.phase * 2.3) * 0.045
        var x = inkWidth * star.x
        var y = inkHeight * star.y
        var alpha = star.alpha * reveal * twinkle
        ctx.fillStyle = skyColor(alpha, true)
        ctx.beginPath()
        ctx.arc(x, y, star.radius, 0, Math.PI * 2)
        ctx.fill()
        if (star.cross) {
          ctx.strokeStyle = skyColor(alpha * 0.42, true)
          ctx.lineWidth = 0.4
          ctx.beginPath()
          ctx.moveTo(x - star.radius * 2.3, y)
          ctx.lineTo(x + star.radius * 2.3, y)
          ctx.moveTo(x, y - star.radius * 2.3)
          ctx.lineTo(x, y + star.radius * 2.3)
          ctx.stroke()
        }
      }
    }

    function drawConstellation(constellation, elapsed, reduced) {
      if (!constellation) return
      var cycle = reduced ? 0.42 : ((elapsed + constellation.phase) % 36000) / 36000
      var fade = cycle < 0.2
        ? smoothstep(cycle / 0.2)
        : cycle < 0.66 ? 1 : cycle < 0.9 ? smoothstep((0.9 - cycle) / 0.24) : 0
      fade *= reduced ? 0.72 : smoothstep((elapsed - 3600) / 2600)
      if (fade <= 0) return
      var originX = inkWidth * constellation.x - constellation.width * 0.5
      var originY = inkHeight * constellation.y
      ctx.save()
      ctx.strokeStyle = skyColor(0.115 * fade, true)
      ctx.lineWidth = 0.46
      ctx.setLineDash([1.5, 2.8])
      ctx.beginPath()
      for (var linkIndex = 0; linkIndex < constellation.links.length; linkIndex++) {
        var link = constellation.links[linkIndex]
        var from = constellation.points[link[0]]
        var to = constellation.points[link[1]]
        ctx.moveTo(originX + from[0] * constellation.width, originY + from[1] * constellation.height)
        ctx.lineTo(originX + to[0] * constellation.width, originY + to[1] * constellation.height)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = skyColor(0.4 * fade, true)
      for (var pointIndex = 0; pointIndex < constellation.points.length; pointIndex++) {
        var point = constellation.points[pointIndex]
        ctx.beginPath()
        ctx.arc(
          originX + point[0] * constellation.width,
          originY + point[1] * constellation.height,
          pointIndex % 3 === 0 ? 1.05 : 0.72,
          0,
          Math.PI * 2
        )
        ctx.fill()
      }
      ctx.restore()
    }

    function paintMoon(target, moon, x, y) {
      var random = seededRandom(moon.textureSeed)
      for (var layer = 0; layer < 5; layer++) {
        organicDiscPath(
          target,
          x + (random() - 0.5) * 1.6,
          y + (random() - 0.5) * 1.4,
          moon.radius * (0.94 + random() * 0.075),
          random,
          0.985 + random() * 0.025,
          0.985 + random() * 0.025
        )
        target.fillStyle = skyColor(0.012 + random() * 0.009, true)
        target.fill()
      }
      for (var wash = 0; wash < 5; wash++) {
        target.fillStyle = 'rgba(19,18,16,' + (0.016 + random() * 0.018) + ')'
        target.beginPath()
        target.ellipse(
          x + (random() - 0.5) * moon.radius * 0.9,
          y + (random() - 0.5) * moon.radius * 0.8,
          moon.radius * (0.13 + random() * 0.28),
          moon.radius * (0.06 + random() * 0.16),
          random() * Math.PI,
          0,
          Math.PI * 2
        )
        target.fill()
      }
      if (moon.phase !== 0) {
        var cutScale = moon.phase === 1 ? 0.38 : moon.phase === 2 ? 0.68 : 0.9
        target.globalCompositeOperation = 'destination-out'
        target.globalAlpha = 0.88
        target.fillStyle = 'rgba(0,0,0,1)'
        organicDiscPath(
          target,
          x + moon.cutDirection * moon.radius * cutScale,
          y - moon.radius * 0.045,
          moon.radius * 1.015,
          random,
          1,
          0.99
        )
        target.fill()
      }
      target.globalCompositeOperation = 'destination-out'
      target.strokeStyle = 'rgba(0,0,0,0.42)'
      target.lineCap = 'round'
      for (var mist = 0; mist < 3; mist++) {
        var mistY = y + (mist - 1) * moon.radius * 0.26 + (random() - 0.5) * moon.radius * 0.18
        target.globalAlpha = 0.58 + random() * 0.2
        target.lineWidth = moon.radius * (0.14 + random() * 0.16)
        target.setLineDash([
          moon.radius * (0.45 + random() * 0.45),
          moon.radius * (0.18 + random() * 0.28),
          moon.radius * (0.24 + random() * 0.36),
        ])
        target.lineDashOffset = random() * moon.radius
        target.beginPath()
        target.moveTo(x - moon.radius * 1.16, mistY)
        target.bezierCurveTo(
          x - moon.radius * 0.36,
          mistY - moon.radius * (0.08 + random() * 0.15),
          x + moon.radius * 0.34,
          mistY + moon.radius * (0.08 + random() * 0.15),
          x + moon.radius * 1.16,
          mistY
        )
        target.stroke()
      }
      target.globalCompositeOperation = 'source-over'
      target.globalAlpha = 1
      organicDiscPath(target, x, y, moon.radius, random, 1, 0.99)
      target.strokeStyle = skyColor(0.06, true)
      target.lineWidth = 0.46
      target.setLineDash([
        moon.radius * (0.28 + random() * 0.24),
        moon.radius * (0.2 + random() * 0.28),
        moon.radius * (0.2 + random() * 0.22),
        moon.radius * (0.16 + random() * 0.22),
      ])
      target.lineDashOffset = random() * moon.radius
      target.stroke()
      target.setLineDash([])
    }

    function drawMoon(moon, elapsed, reduced) {
      if (!moon) return
      var reveal = reduced ? 1 : smoothstep((elapsed - 800) / 2600)
      if (reveal <= 0) return
      if (!moon.cache) {
        moon.cache = makeOrbCache(moon, function (target, cx, cy) { paintMoon(target, moon, cx, cy) })
      }
      drawOrbCache(moon.cache, inkWidth * moon.x, inkHeight * moon.y, reveal)
    }

    function drawSky(elapsed, reduced) {
      var dark = document.documentElement.classList.contains('dark')
      var sky = dark ? inkNightSky : inkDaySky
      if (!sky) return
      if (canvas.dataset.skyProfile !== sky.profile) canvas.dataset.skyProfile = sky.profile
      var features = dark
        ? []
            .concat(sky.moon ? ['moon:' + sky.moon.phaseName] : [])
            .concat(sky.stars.length ? ['stars:' + sky.stars.length] : [])
            .concat(sky.constellation ? ['constellation'] : [])
            .concat(sky.clouds.length ? ['clouds:' + sky.clouds.length] : [])
        : []
            .concat(sky.sun ? ['sun'] : [])
            .concat(sky.clouds.length ? ['clouds:' + sky.clouds.length] : [])
      var featureLabel = features.join(',')
      if (canvas.dataset.skyFeatures !== featureLabel) canvas.dataset.skyFeatures = featureLabel
      if (dark) {
        drawStars(sky.stars, elapsed, reduced)
        drawConstellation(sky.constellation, elapsed, reduced)
        drawMoon(sky.moon, elapsed, reduced)
      }
      else drawSun(sky.sun, elapsed, reduced)
      drawClouds(sky.clouds, elapsed, reduced, dark)
    }

    function scheduleBirdEvent(start) {
      var mobile = inkWidth <= 760
      var dark = document.documentElement.classList.contains('dark')
      var eventSeed = (
        inkSceneSeed
        ^ Math.imul(++inkBirdSequence, 0x9e3779b1)
        ^ Math.floor(performance.now() * 1000)
        ^ Math.floor(Math.random() * 0xffffffff)
      ) >>> 0
      var random = seededRandom(eventSeed || 1)
      var countRoll = random()
      var count = dark
        ? (countRoll < 0.56 ? 0 : 1 + Math.floor(random() * (mobile ? 2 : 3)))
        : (countRoll < 0.1 ? 0 : mobile ? 1 + Math.floor(random() * 4) : 2 + Math.floor(random() * 7))
      var direction = random() < 0.5 ? -1 : 1
      var formation = Math.floor(random() * 3)
      var spacingX = 18 + random() * 22
      var spacingY = 6 + random() * 14
      var birds = []
      for (var i = 0; i < count; i++) {
        var ring = Math.ceil(i / 2)
        var formationSide = i % 2 ? -1 : 1
        var depth = i === 0 ? 0.86 + random() * 0.14 : 0.55 + random() * 0.32
        var offsetX = 0
        var offsetY = 0
        if (formation === 0) {
          offsetX = -direction * ring * (spacingX + random() * 9)
          offsetY = i === 0 ? 0 : formationSide * (spacingY + random() * 7)
        }
        else if (formation === 1) {
          offsetX = -direction * i * (spacingX * 0.72 + random() * 7)
          offsetY = formationSide * i * (2.5 + random() * 4.2)
        }
        else {
          offsetX = -direction * (8 + random() * (spacingX * 2.4))
          offsetY = (random() - 0.5) * (spacingY * 3.2)
        }
        birds.push({
          offsetX: offsetX,
          offsetY: offsetY,
          scale: i === 0 ? 1.55 + random() * 0.3 : 1.08 + random() * 0.55,
          phase: i === 0 ? random() * 0.035 : 0.12 + (i - 1) * 0.13 + random() * 0.055,
          tilt: (random() - 0.5) * 0.16 + formationSide * ring * 0.018,
          wingBias: (random() - 0.5) * 0.14,
          tone: 0.88 + random() * 0.12,
          depth: depth,
          speedBias: (random() - 0.5) * 7,
          flapScale: 0.91 + random() * 0.18,
        })
      }
      var startY = 0.055 + random() * 0.105
      var endY = clamp(startY + (random() - 0.5) * 0.12, 0.045, 0.19)
      var zoneRoll = random()
      var zone = zoneRoll < 0.38 ? 'left-sky' : zoneRoll < 0.76 ? 'right-sky' : 'high-crossing'
      var lowX = zone === 'left-sky'
        ? -0.04 + random() * 0.06
        : zone === 'right-sky' ? 0.62 + random() * 0.1 : -0.08 + random() * 0.06
      var highX = zone === 'left-sky'
        ? 0.32 + random() * 0.13
        : zone === 'right-sky' ? 1.02 + random() * 0.08 : 1.02 + random() * 0.08
      var x0 = direction > 0 ? lowX : highX
      var x3 = direction > 0 ? highX : lowX
      var horizontalSpan = x3 - x0
      var duration = 7200 + random() * 2600
      canvas.dataset.birdProfile = [
        'count:' + count,
        'lane:' + startY.toFixed(3) + '-' + endY.toFixed(3),
        'zone:' + zone,
        'direction:' + (direction > 0 ? 'right' : 'left'),
        'duration:' + Math.round(duration),
      ].join(',')
      if (!count) {
        inkBirdEvent = null
        return false
      }
      inkBirdEvent = {
        start: start,
        duration: duration,
        direction: direction,
        path: {
          x0: x0,
          y0: startY,
          x1: x0 + horizontalSpan * (0.22 + random() * 0.16),
          y1: clamp(startY + (random() - 0.5) * 0.1, 0.035, 0.21),
          x2: x0 + horizontalSpan * (0.62 + random() * 0.18),
          y2: clamp(endY + (random() - 0.5) * 0.1, 0.035, 0.21),
          x3: x3,
          y3: endY,
        },
        flapPeriod: 1700 + random() * 1300,
        birds: birds,
      }
      return true
    }

    function queueNextBirdEvent(minDelay, maxDelay) {
      if (!inkBirdsEnabled || prefersReducedMotion() || inkBirdTimer) return
      var dark = document.documentElement.classList.contains('dark')
      var minimum = minDelay == null ? (dark ? 28000 : 18000) : minDelay
      var maximum = maxDelay == null ? (dark ? 54000 : 38000) : maxDelay
      inkBirdTimer = setTimeout(function () {
        inkBirdTimer = 0
        if (document.hidden || prefersReducedMotion()) {
          queueNextBirdEvent(minimum, maximum)
          return
        }
        var elapsed = Math.max(0, performance.now() - inkSceneStarted)
        if (!scheduleBirdEvent(elapsed + 180 + Math.random() * 420)) {
          queueNextBirdEvent(7000, 16000)
          return
        }
        startInkFrame()
      }, minimum + Math.random() * Math.max(0, maximum - minimum))
    }

    function cubicValue(a, b, c, d, position) {
      var inverse = 1 - position
      return inverse * inverse * inverse * a
        + 3 * inverse * inverse * position * b
        + 3 * inverse * position * position * c
        + position * position * position * d
    }

    // 下压快、回收慢、再进入长滑翔，接近真实的鸟类拍翅节律。三段的首尾斜率都为零，
    // 整个循环处处一阶连续，翅膀换向时不会出现可察觉的顿挫。
    function birdWingMotion(cycle) {
      if (cycle < 0.16) return -0.18 + smoothstep(cycle / 0.16) * 0.48
      if (cycle < 0.42) return 0.3 - smoothstep((cycle - 0.16) / 0.26) * 0.48
      return -0.18 + (1 - Math.cos((cycle - 0.42) / 0.58 * Math.PI * 2)) * 0.028
    }

    function drawBirds(elapsed) {
      if (!inkBirdEvent || elapsed < inkBirdEvent.start) return
      if (elapsed >= inkBirdEvent.start + inkBirdEvent.duration) {
        inkBirdEvent = null
        canvas.dataset.birdActive = 'false'
        queueNextBirdEvent()
        return
      }
      canvas.dataset.birdActive = 'true'
      var progress = (elapsed - inkBirdEvent.start) / inkBirdEvent.duration
      var fadeSpan = Math.min(0.24, 1600 / inkBirdEvent.duration)
      var fade = smoothstep(progress / fadeSpan) * smoothstep((1 - progress) / fadeSpan)
      if (fade <= 0) return

      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (var i = 0; i < inkBirdEvent.birds.length; i++) {
        var bird = inkBirdEvent.birds[i]
        var path = inkBirdEvent.path
        var groupX = inkWidth * cubicValue(path.x0, path.x1, path.x2, path.x3, progress)
        var groupY = inkHeight * cubicValue(path.y0, path.y1, path.y2, path.y3, progress)
        // 每只鸟的拍翅周期略有出入，整群才不会像齿轮一样同步。
        var cycle = (elapsed / (inkBirdEvent.flapPeriod * bird.flapScale) + bird.phase) % 1
        var wing = birdWingMotion(cycle) + bird.wingBias
        // 真实的鸟在下压时获得升力与推力。把起伏挂在拍翅上而不是挂在整段航线上，
        // 是让飞行摆脱「贴图平移」感的关键。
        var beat = (wing + 0.18) / 0.48
        var x = groupX
          + bird.offsetX
          + bird.speedBias * Math.sin(Math.PI * progress)
          + beat * 1.5 * bird.scale * inkBirdEvent.direction
        var y = groupY
          + bird.offsetY
          + Math.sin(progress * Math.PI * 2 + bird.phase * Math.PI) * 1.2
          - beat * 0.9 * bird.scale
        var bodyLength = 5.8 * bird.scale
        var wingSpan = 9.8 * bird.scale
        var nearRootX = -bodyLength * 0.08
        var nearRootY = -bodyLength * 0.015
        var nearControlX = -wingSpan * 0.42
        var nearControlY = -wingSpan * (0.42 + wing * 0.16)
        var nearTipX = -wingSpan
        var nearTipY = -wingSpan * (0.18 + wing * 0.12)
        var farRootX = bodyLength * 0.04
        var farRootY = bodyLength * 0.02
        var farControlX = wingSpan * 0.3
        var farControlY = -wingSpan * (0.28 - wing * 0.12)
        var farTipX = wingSpan * 0.76
        var farTipY = -wingSpan * (0.12 - wing * 0.07)

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(bird.tilt + Math.sin(progress * Math.PI * 2) * 0.025 + beat * 0.03 * inkBirdEvent.direction)
        if (inkBirdEvent.direction > 0) ctx.scale(-1, 1)
        var themeOpacity = document.documentElement.classList.contains('dark') ? 0.66 : 1
        ctx.globalAlpha = fade * themeOpacity * (0.78 + bird.depth * 0.18)

        ctx.strokeStyle = inkColor(0.48 * bird.tone)
        ctx.lineWidth = Math.max(0.54, 0.62 * bird.scale)
        ctx.beginPath()
        ctx.moveTo(-bodyLength * 0.38, -bodyLength * 0.035)
        ctx.quadraticCurveTo(
          -bodyLength * 0.02,
          bodyLength * 0.11,
          bodyLength * 0.56,
          bodyLength * 0.035
        )
        ctx.stroke()

        ctx.fillStyle = inkColor(0.49 * bird.tone)
        ctx.beginPath()
        ctx.arc(-bodyLength * 0.46, -bodyLength * 0.045, Math.max(0.54, 0.56 * bird.scale), 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = inkColor(0.28 * bird.tone)
        ctx.lineWidth = Math.max(0.3, 0.34 * bird.scale)
        ctx.beginPath()
        ctx.moveTo(bodyLength * 0.44, bodyLength * 0.035)
        ctx.lineTo(bodyLength * 0.72, -bodyLength * 0.1)
        ctx.moveTo(bodyLength * 0.44, bodyLength * 0.035)
        ctx.lineTo(bodyLength * 0.7, bodyLength * 0.17)
        ctx.stroke()

        var nearThickness = Math.max(0.62, 0.72 * bird.scale)
        ctx.fillStyle = inkColor(0.56 * bird.tone)
        ctx.beginPath()
        ctx.moveTo(nearRootX, nearRootY)
        ctx.quadraticCurveTo(
          nearControlX,
          nearControlY,
          nearTipX,
          nearTipY
        )
        ctx.quadraticCurveTo(
          nearControlX * 0.98,
          nearControlY + nearThickness,
          nearRootX + nearThickness * 0.22,
          nearRootY + nearThickness * 0.36
        )
        ctx.closePath()
        ctx.fill()

        ctx.strokeStyle = inkColor(0.23 * bird.tone)
        ctx.lineWidth = Math.max(0.24, 0.28 * bird.scale)
        ctx.beginPath()
        ctx.moveTo(nearRootX - nearThickness * 0.08, nearRootY)
        ctx.quadraticCurveTo(
          nearControlX * 0.78,
          nearControlY * 0.78,
          nearTipX * 0.78,
          nearTipY * 0.78
        )
        ctx.stroke()

        var farThickness = Math.max(0.4, 0.48 * bird.scale)
        ctx.fillStyle = inkColor(0.34 * bird.tone)
        ctx.beginPath()
        ctx.moveTo(farRootX, farRootY)
        ctx.quadraticCurveTo(
          farControlX,
          farControlY,
          farTipX,
          farTipY
        )
        ctx.quadraticCurveTo(
          farControlX * 0.98,
          farControlY + farThickness,
          farRootX - farThickness * 0.16,
          farRootY + farThickness * 0.3
        )
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
      ctx.restore()
    }

    function compositeFrame(now, reduced) {
      var elapsed = reduced ? inkRevealEnd + 1000 : Math.max(0, now - inkSceneStarted)
      clearInkCanvas()
      drawSky(elapsed, reduced)

      if (elapsed >= inkRevealEnd || reduced) {
        if (!inkStaticReady) {
          if (!reduced && washAccum.width) {
            // 累积画布已经持有全部笔画，补烘焙剩余的几笔后直接封存，
            // 避免在定格瞬间做一次从零全量重绘造成卡顿。
            bakeRevealed(inkRevealEnd)
            sealStaticScene()
          }
          else buildStaticScene()
        }
        blitLayer(staticCanvas)
        inkSettled = true
      }
      else {
        drawRevealFrame(elapsed)
        cutMistLive(elapsed)
      }

      if (!reduced) drawBirds(elapsed)
    }

    function runInkFrame(now) {
      inkFrame = 0
      if (document.hidden || prefersReducedMotion()) return
      var elapsed = Math.max(0, now - inkSceneStarted)
      var birdActive = inkBirdEvent
        && inkBirdEvent.birds.length
        && elapsed >= inkBirdEvent.start
        && elapsed < inkBirdEvent.start + inkBirdEvent.duration
      // 揭示结束且没有飞鸟排程时画面永久静止：画完最后一帧就不再申请 rAF，
      // 此后整个页面零后台开销。
      if (elapsed >= inkRevealEnd && !inkBirdEvent) {
        compositeFrame(now, false)
        return
      }
      // 增量烘焙之后单帧只重画正在生长的笔画，揭示期不再需要节流。
      var interval = elapsed < inkRevealEnd || birdActive ? 0 : 42
      if (now - inkLastFrame >= interval) {
        inkLastFrame = now
        compositeFrame(now, false)
      }
      inkFrame = requestAnimationFrame(runInkFrame)
    }

    function startInkFrame() {
      if (inkSettled && !inkBirdEvent) return
      if (!inkFrame && !document.hidden && !prefersReducedMotion()) {
        inkFrame = requestAnimationFrame(runInkFrame)
      }
    }

    function rebuildInkScene() {
      if (inkFrame) cancelAnimationFrame(inkFrame)
      if (inkBirdTimer) clearTimeout(inkBirdTimer)
      inkFrame = 0
      inkBirdTimer = 0
      inkLastFrame = 0
      fitInkCanvas()
      inkRandom = seededRandom((inkSceneSeed + (inkWidth <= 760 ? 104729 : 0)) >>> 0)
      inkStaticReady = false
      inkSettled = false
      buildInkScene()
      inkSceneStarted = performance.now()
      if (document.hidden) inkHiddenAt = inkSceneStarted
      if (prefersReducedMotion()) compositeFrame(inkSceneStarted, true)
      else {
        compositeFrame(inkSceneStarted, false)
        startInkFrame()
      }
    }

    function scheduleInkResize() {
      if (inkResizeTimer) clearTimeout(inkResizeTimer)
      inkResizeTimer = setTimeout(function () {
        inkResizeTimer = 0
        rebuildInkScene()
      }, 180)
    }

    function scheduleInkThemeRedraw() {
      if (inkThemeFrame) return
      inkThemeFrame = requestAnimationFrame(function () {
        inkThemeFrame = 0
        inkStaticReady = false
        var elapsed = Math.max(0, performance.now() - inkSceneStarted)
        // 累积画布里烘焙的是旧主题的墨色，主题一换必须整体作废重来。
        if (elapsed < inkRevealEnd) clearAccumulators()
        compositeFrame(performance.now(), prefersReducedMotion())
        if (!inkBirdEvent && !prefersReducedMotion()) {
          if (inkBirdTimer) clearTimeout(inkBirdTimer)
          inkBirdTimer = 0
          queueNextBirdEvent()
        }
        startInkFrame()
      })
    }

    rebuildInkScene()

    // 远景只在用户输入时响应，不开启常驻动画循环。CSS 的长尾缓动模拟纸面上的惯性。
    var inkDriftFrame = 0
    var inkPointerX = 0
    var inkPointerY = 0

    function applyInkDrift() {
      inkDriftFrame = 0
      canvas.style.setProperty('--ink-drift-x', inkPointerX.toFixed(2) + 'px')
      canvas.style.setProperty('--ink-drift-y', inkPointerY.toFixed(2) + 'px')
      canvas.style.setProperty('--ink-scroll-y', Math.max(-8, -window.scrollY * 0.012).toFixed(2) + 'px')
    }

    function queueInkDrift() {
      if (prefersReducedMotion() || inkDriftFrame) return
      inkDriftFrame = requestAnimationFrame(applyInkDrift)
    }

    if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      window.addEventListener('pointermove', function (event) {
        inkPointerX = (event.clientX / Math.max(1, innerWidth) - 0.5) * -8
        inkPointerY = (event.clientY / Math.max(1, innerHeight) - 0.5) * -5
        queueInkDrift()
      }, { passive: true })
      document.documentElement.addEventListener('mouseleave', function () {
        inkPointerX = 0
        inkPointerY = 0
        queueInkDrift()
      })
    }
    window.addEventListener('scroll', queueInkDrift, { passive: true })
    window.addEventListener('resize', scheduleInkResize, { passive: true })
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        inkHiddenAt = performance.now()
        if (inkFrame) cancelAnimationFrame(inkFrame)
        if (inkBirdTimer) clearTimeout(inkBirdTimer)
        inkFrame = 0
        inkBirdTimer = 0
      }
      else {
        if (inkHiddenAt) inkSceneStarted += performance.now() - inkHiddenAt
        inkHiddenAt = 0
        if (prefersReducedMotion()) compositeFrame(performance.now(), true)
        else {
          if (!inkBirdEvent) queueNextBirdEvent()
          startInkFrame()
        }
      }
    })
    if (motionQuery) {
      var onMotionChange = function () {
        if (prefersReducedMotion()) {
          if (inkFrame) cancelAnimationFrame(inkFrame)
          if (inkBirdTimer) clearTimeout(inkBirdTimer)
          inkFrame = 0
          inkBirdTimer = 0
          compositeFrame(performance.now(), true)
        }
        else {
          inkSceneStarted = performance.now() - inkRevealEnd
          inkLastFrame = 0
          compositeFrame(performance.now(), false)
          queueNextBirdEvent(2500, 7000)
          startInkFrame()
        }
      }
      if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange)
      else if (motionQuery.addListener) motionQuery.addListener(onMotionChange)
    }
    new MutationObserver(scheduleInkThemeRedraw).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }

  if (!location.hash) location.replace('#/')
  else render(currentRoute(), false)
})()
