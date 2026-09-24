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
      var configuredRoute = a.getAttribute('data-route')
      var active = configuredRoute
        ? route === configuredRoute || (configuredRoute !== '/' && route.indexOf(configuredRoute + '/') === 0)
        : false
      if (!configuredRoute && key === 'blog') active = route === '/posts' || route.indexOf('/posts/') === 0 || route === '/notes' || route.indexOf('/notes/') === 0 || route === '/podcasts' || route === '/streams'
      if (!configuredRoute && key === 'projects') active = route === '/projects'
      if (!configuredRoute && key === 'talks') active = route === '/talks' || route.indexOf('/talks/') === 0
      if (!configuredRoute && key === 'photos') active = route === '/photos'
      if (!configuredRoute && key === 'sponsors') active = route === '/sponsors' || route === '/collective'
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
    if (route === '/podcasts' && main) {
      main.classList.add('podcast-page')
      main.classList.toggle('is-motion-paused', document.hidden)
      main.querySelectorAll(':scope > [data-lang]').forEach(function (episode, index) {
        episode.classList.add('podcast-episode')
        episode.style.setProperty('--episode-stage', Math.min(index, 5))
      })
    }
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

  document.addEventListener('visibilitychange', function () {
    var podcasts = view.querySelector('.podcast-page')
    if (podcasts) podcasts.classList.toggle('is-motion-paused', document.hidden)
  })

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
    var context = canvas.getContext('2d')
    var width = 1
    var height = 1
    var ratio = 1
    var strokes = []
    var elapsed = 0
    var previousTime = 0
    var lastPaint = 0
    var frame = 0
    var resizeTimer = 0
    var generation = 0

    function randomBetween(min, max) {
      return min + Math.random() * (max - min)
    }

    function veinPath(from, to, spread, levels) {
      var points = [from, to]
      for (var level = 0; level < levels; level++) {
        var divided = [points[0]]
        for (var i = 1; i < points.length; i++) {
          var a = points[i - 1]
          var b = points[i]
          var angle = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2
          var offset = randomBetween(-spread, spread)
          divided.push({ x: (a.x + b.x) / 2 + Math.cos(angle) * offset, y: (a.y + b.y) / 2 + Math.sin(angle) * offset })
          divided.push(b)
        }
        points = divided
        spread *= 0.5
      }
      // 保留自然弯折，柔化细碎尖角；起点和终点保持不变。
      return points.map(function (point, index) {
        if (!index || index === points.length - 1) return point
        return {
          x: points[index - 1].x * 0.2 + point.x * 0.6 + points[index + 1].x * 0.2,
          y: points[index - 1].y * 0.2 + point.y * 0.6 + points[index + 1].y * 0.2,
        }
      })
    }

    function makeStroke(side, start) {
      var mobile = width < 760
      var left = width >= 1024 ? 164 : 0
      var span = width - left
      var upward = Math.random() < 0.8
      var fromX = side === 0 ? left + span * randomBetween(0.04, 0.13) : width * randomBetween(0.92, 0.99)
      var toX = side === 0 ? left + span * randomBetween(0.06, 0.18) : width * randomBetween(0.87, 0.98)
      if (mobile) {
        fromX = width * (side === 0 ? randomBetween(0.1, 0.3) : randomBetween(0.7, 0.9))
        toX = fromX + randomBetween(-width * 0.18, width * 0.18)
      }
      var from = { x: fromX, y: upward ? height + 12 : -12 }
      var to = { x: toX, y: height * (upward ? randomBetween(0.08, 0.4) : randomBetween(0.6, 0.92)) }
      var points = veinPath(from, to, Math.min(mobile ? 32 : 65, height * 0.085), 5)
      var branches = []
      var branchCount = Math.floor(randomBetween(mobile ? 2 : 4, mobile ? 4 : 8))
      for (var b = 0; b < branchCount; b++) {
        var at = b === 0 ? randomBetween(0.12, 0.23) : 0.22 + Math.sqrt(Math.random()) * 0.55
        var index = Math.floor(at * (points.length - 2))
        var anchor = points[index]
        var tangent = Math.atan2(points[index + 1].y - anchor.y, points[index + 1].x - anchor.x)
        var direction = Math.random() < 0.5 ? -1 : 1
        var angle = tangent + direction * randomBetween(0.5, 1.15)
        var length = randomBetween(mobile ? 30 : 60, mobile ? 80 : 160)
        var tip = { x: anchor.x + Math.cos(angle) * length, y: anchor.y + Math.sin(angle) * length }
        var branch = {
          points: veinPath(anchor, tip, length * 0.15, 4),
          at: index / (points.length - 1),
          delay: randomBetween(220, 650),
          duration: randomBetween(1500, 3000),
          opacity: randomBetween(0.45, 0.75),
          weight: 0.6,
          bud: Math.random() < 0.7,
          budSize: randomBetween(mobile ? 4 : 5, mobile ? 6 : 9),
          phase: randomBetween(0, Math.PI * 2),
        }
        branches.push(branch)
        if (!mobile && Math.random() < 0.35) {
          var forkIndex = Math.floor(branch.points.length * 0.6)
          var fork = branch.points[forkIndex]
          var forkAngle = angle - direction * randomBetween(0.4, 0.8)
          branches.push({
            points: veinPath(fork, { x: fork.x + Math.cos(forkAngle) * length * 0.4, y: fork.y + Math.sin(forkAngle) * length * 0.4 }, length * 0.04, 3),
            at: branch.at,
            delay: branch.delay + branch.duration * forkIndex / (branch.points.length - 1) + 180,
            duration: randomBetween(1000, 1800),
            opacity: branch.opacity * 0.7,
            weight: 0.4,
            bud: true,
            budSize: randomBetween(3.5, 6),
            phase: randomBetween(0, Math.PI * 2),
          })
        }
      }
      return {
        side: side,
        points: points,
        branches: branches,
        start: start,
        grow: randomBetween(8000, 14000),
        rest: randomBetween(4000, 6000),
        fade: randomBetween(8000, 12000),
        weight: randomBetween(0.9, 1.25),
        opacity: randomBetween(0.7, 1),
      }
    }

    function tracePen(points, progress) {
      var end = Math.max(0, Math.min(1, progress)) * (points.length - 1)
      var whole = Math.floor(end)
      var weight = context.lineWidth
      context.beginPath()
      context.moveTo(points[0].x, points[0].y)
      for (var p = 1; p <= whole; p++) {
        context.lineTo(points[p].x, points[p].y)
        if (p % 4 === 0) {
          context.lineWidth = weight * (1 - p / (points.length - 1) * 0.65)
          context.stroke()
          context.beginPath()
          context.moveTo(points[p].x, points[p].y)
        }
      }
      // 笔尖连续前进，笔重沿生长方向渐细。
      if (whole < points.length - 1) {
        var from = points[whole]
        var to = points[whole + 1]
        context.lineTo(from.x + (to.x - from.x) * (end - whole), from.y + (to.y - from.y) * (end - whole))
      }
      context.lineWidth = weight * (1 - progress * 0.65)
      context.stroke()
      context.lineWidth = weight
    }

    function drawBud(branch, progress, ink, reduced) {
      if (!branch.bud || progress <= 0) return
      var points = branch.points
      var tip = points[points.length - 1]
      var before = points[points.length - 2]
      var opening = progress * progress * (3 - 2 * progress)
      var size = branch.budSize * opening
      var sway = reduced ? 0 : Math.sin(elapsed * 0.0012 + branch.phase) * 0.12
      context.save()
      context.translate(tip.x, tip.y)
      context.rotate(Math.atan2(tip.y - before.y, tip.x - before.x) + sway)
      context.globalAlpha = ink * opening
      context.fillStyle = document.documentElement.classList.contains('dark')
        ? 'rgba(151,170,124,0.62)'
        : 'rgba(101,130,80,0.58)'
      // 两片叶芽从同一个枝尖展开，根部固定，只有叶片轻轻摆动。
      for (var side = -1; side <= 1; side += 2) {
        var length = size * (side < 0 ? 0.8 : 1)
        context.beginPath()
        context.moveTo(0, 0)
        context.bezierCurveTo(length * 0.15, side * length * 0.55, length * 0.6, side * length * 0.55, length, side * length * 0.36)
        context.bezierCurveTo(length * 0.75, side * length * 0.02, length * 0.3, side * length * 0.05, 0, 0)
        context.fill()
      }
      context.restore()
    }

    function drawArt(reduced) {
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.strokeStyle = document.documentElement.classList.contains('dark')
        ? 'rgba(165,173,171,0.42)'
        : 'rgba(111,117,112,0.4)'
      var entry = reduced ? 1 : Math.min(1, elapsed / 1800)
      for (var s = 0; s < strokes.length; s++) {
        var stroke = strokes[s]
        var age = elapsed - stroke.start
        var life = stroke.grow + stroke.rest + stroke.fade
        if (!reduced && age > life) {
          stroke = strokes[s] = makeStroke(stroke.side, elapsed + randomBetween(600, 1800))
          generation++
          age = elapsed - stroke.start
        }
        if (!reduced && age < 0) continue
        var growth = reduced ? 1 : Math.min(1, age / stroke.grow)
        var fade = reduced ? 0 : Math.max(0, (age - stroke.grow - stroke.rest) / stroke.fade)
        var alpha = 1 - fade * fade * (3 - 2 * fade)
        var ink = entry * stroke.opacity * alpha
        context.globalAlpha = ink
        context.lineWidth = stroke.weight
        tracePen(stroke.points, growth)
        stroke.branches.forEach(function (branch) {
          var reveal = reduced ? 1 : Math.max(0, Math.min(1, (age - stroke.grow * branch.at - branch.delay) / branch.duration))
          if (!reveal) return
          context.globalAlpha = ink * branch.opacity * Math.min(1, reveal * 4)
          context.lineWidth = stroke.weight * branch.weight
          tracePen(branch.points, reveal)
          var sprout = reduced ? 1 : Math.max(0, Math.min(1, (age - stroke.grow * branch.at - branch.delay - branch.duration) / 1600))
          drawBud(branch, sprout, ink * 0.85, reduced)
        })

      }
      context.globalAlpha = 1
      canvas.dataset.ambientState = reduced ? 'still' : 'flowing'
      canvas.dataset.ambientGeneration = String(generation)
    }

    function animateArt(now) {
      frame = 0
      if (document.hidden || prefersReducedMotion()) return
      if (previousTime) elapsed += Math.min(80, now - previousTime)
      previousTime = now
      if (now - lastPaint >= 1000 / 30) {
        lastPaint = now
        drawArt(false)
      }
      frame = requestAnimationFrame(animateArt)
    }

    function syncArt() {
      cancelAnimationFrame(frame)
      frame = 0
      previousTime = 0
      if (document.hidden) {
        canvas.dataset.ambientState = 'paused'
        return
      }
      drawArt(prefersReducedMotion())
      if (!prefersReducedMotion()) frame = requestAnimationFrame(animateArt)
    }

    function resetArt() {
      cancelAnimationFrame(frame)
      width = Math.max(1, innerWidth)
      height = Math.max(1, innerHeight)
      ratio = Math.min(devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      strokes = []
      elapsed = 0
      lastPaint = 0
      generation = 0
      var count = width < 760 ? 2 : 4
      for (var i = 0; i < count; i++) {
        // 首次从空白错时起笔，随后独立生长、停留和淡去。
        strokes.push(makeStroke(i % 2, i * 2200))
      }
      syncArt()
    }

    window.addEventListener('resize', function () {
      if (width === innerWidth && height === innerHeight && ratio === Math.min(devicePixelRatio || 1, 1.5)) return
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(resetArt, 180)
    }, { passive: true })
    window.addEventListener('hashchange', resetArt)
    document.addEventListener('visibilitychange', syncArt)
    if (motionQuery) {
      if (motionQuery.addEventListener) motionQuery.addEventListener('change', syncArt)
      else motionQuery.addListener(syncArt)
    }
    new MutationObserver(syncArt).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    resetArt()
  }

  if (!location.hash) location.replace('#/')
  else render(currentRoute(), false)
})()
