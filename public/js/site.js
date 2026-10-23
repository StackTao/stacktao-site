(function () {
  window.__SPA__ = true

  function retiredRoute(route) { return /^\/(?:talks|giving-talks)(?:\/|$)/.test(route) }
  document.querySelectorAll('.nav-right a, .footer-links a').forEach(function (link) {
    if (retiredRoute((link.getAttribute('href') || '').replace(/^#/, ''))) link.remove()
  })

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
      if (!configuredRoute && key === 'guestbook') active = route === '/guestbook'
      if (!configuredRoute && key === 'photos') active = route === '/photos'
      if (!configuredRoute && key === 'sponsors') active = route === '/sponsors' || route === '/collective'
      a.classList.toggle('nav-active', active)
      if (active) a.setAttribute('aria-current', 'page')
      else a.removeAttribute('aria-current')
    })
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

    var details = document.createElement('details')
    details.className = 'studio-outline'
    details.open = window.innerWidth >= 1280
    var summary = document.createElement('summary')
    summary.textContent = '本文目录'
    details.append(summary, outline)
    var meta = article.querySelector('.post-meta')
    article.insertBefore(details, meta ? meta.nextSibling : article.firstChild)
    updateSidebarOutlineActive()
  }

  function decorateHome(main) {
    if (window.Studio) window.Studio.home(main)
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
      kicker.textContent = (route.indexOf('/notes/') === 0 ? 'NOTES' : 'WRITING') + ' / ' + year
      article.insertBefore(kicker, title)
    }
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
    if (window.Studio) window.Studio.decorate(view, route)
  }

  var light = document.querySelector('.lightbox')
  var lightImg = light && light.querySelector('img')
  var lightCap = light && light.querySelector('.lightbox-cap')
  var lightClose = light && light.querySelector('.lightbox-close')
  var lightReturnFocus = null
  var photoNodes = []
  var photoIndex = -1
  var lightPrevious = null, lightNext = null, lightCount = null
  if (light) {
    lightPrevious = document.createElement('button')
    lightNext = document.createElement('button')
    ;[[lightPrevious, '上一张照片', '←', 'previous'], [lightNext, '下一张照片', '→', 'next']].forEach(function (item) {
      item[0].type = 'button'
      item[0].className = 'lightbox-step lightbox-' + item[3]
      item[0].setAttribute('aria-label', item[1])
      item[0].textContent = item[2]
      light.appendChild(item[0])
    })
    lightCount = document.createElement('output')
    lightCount.className = 'lightbox-count'
    lightCount.setAttribute('aria-label', '照片序号')
    lightCount.setAttribute('aria-live', 'polite')
    light.appendChild(lightCount)
    lightPrevious.addEventListener('click', function () { showPhoto(photoIndex - 1) })
    lightNext.addEventListener('click', function () { showPhoto(photoIndex + 1) })
    if (lightClose) lightClose.addEventListener('click', closeLightbox)
  }

  function syncOverlayLock() {
    var open = !!document.querySelector('.search-mask.is-open, .lightbox.is-open')
    document.body.classList.toggle('overlay-open', open)
    document.querySelector('.app-shell').inert = open
  }

  function showPhoto(i) {
    if (!light || !photoNodes[i]) return
    var opening = photoIndex < 0
    if (opening) lightReturnFocus = document.activeElement
    photoIndex = i
    var img = photoNodes[i]
    lightImg.src = img.src
    lightImg.alt = img.alt || ''
    lightCap.textContent = (img.alt || '') + (img.getAttribute('data-place') ? ' · ' + img.getAttribute('data-place') : '')
    lightCount.textContent = (i + 1) + ' / ' + photoNodes.length
    lightPrevious.disabled = i === 0
    lightNext.disabled = i === photoNodes.length - 1
    light.classList.add('is-open')
    light.setAttribute('aria-hidden', 'false')
    document.querySelector('.app-shell').inert = true
    if (opening && lightClose) lightClose.focus({ preventScroll: true })
    syncOverlayLock()
  }

  function closeLightbox() {
    if (light) {
      light.classList.remove('is-open')
      light.setAttribute('aria-hidden', 'true')
    }
    syncOverlayLock()
    if (photoIndex >= 0 && lightReturnFocus && lightReturnFocus.isConnected) lightReturnFocus.focus({ preventScroll: true })
    lightReturnFocus = null
    photoIndex = -1
  }

  function bindPage() {
    if (window.Guestbook) window.Guestbook.mount(view)
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
  var routePositions = Object.create(null)
  var routeIntent = null
  var routeChanging = false
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

  function rememberRoutePosition() {
    if (lastRoute && !routeChanging) routePositions[lastRoute] = window.scrollY
  }

  function commitRender(route, restoreY) {
    var navigating = !!lastRoute
    if (photoIndex >= 0) closeLightbox()
    var pages = window.PAGES || {}
    var titles = window.PAGE_TITLES || {}
    var pageRoute = retiredRoute(route) ? '/404' : route
    var html = pages[pageRoute] || pages['/404'] || '<main class="page prose"><h1>404</h1></main>'
    closeSearch()
    if (window.Guestbook) window.Guestbook.destroy()
    if (window.Studio) window.Studio.destroy()
    view.innerHTML = html
    decoratePage(route)
    document.title = titles[pageRoute] || 'StackTao'
    updateNav(route)
    bindPage()
    window.scrollTo(0, restoreY || 0)
    updateReadingStatus(route)
    playEnter(view)
    lastRoute = route
    routeChanging = false
    if (navigating && route !== '/guestbook') view.focus({ preventScroll: true })
    if (location.hash && location.hash.indexOf('#/') !== 0 && document.querySelector(location.hash)) {
      document.querySelector(location.hash).scrollIntoView()
    }
  }

  function render(route, withBar, restoreY) {
    if (withBar) nStart()
    closeSearch()

    if (!withBar || !lastRoute || prefersReducedMotion()) {
      clearTimeout(routeRenderTimer)
      routeRenderToken++
      view.classList.remove('is-route-leaving')
      commitRender(route, restoreY)
      if (withBar) setTimeout(nDone, 280)
      return
    }

    var token = ++routeRenderToken
    clearTimeout(routeRenderTimer)
    view.classList.add('is-route-leaving')
    routeRenderTimer = setTimeout(function () {
      if (token !== routeRenderToken) return
      commitRender(route, restoreY)
      requestAnimationFrame(function () {
        if (token !== routeRenderToken) return
        view.classList.remove('is-route-leaving')
      })
      setTimeout(nDone, 360)
    }, 140)
  }

  function confirmRouteLeave(route) {
    return route === lastRoute || lastRoute !== '/guestbook' || !window.Guestbook || !window.Guestbook.confirmLeave || window.Guestbook.confirmLeave()
  }

  function go(route, replace) {
    if (!route) route = '/'
    if (route.charAt(0) === '#' && route.charAt(1) !== '/') {
      var el = document.querySelector(route)
      if (el) {
        el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
        if (route === '#view') el.focus({ preventScroll: true })
      }
      return
    }
    if (!confirmRouteLeave(route)) return
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
    rememberRoutePosition()
    routeIntent = next
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
    var route = currentRoute()
    if (route === lastRoute) { routeIntent = null; return }
    if (routeIntent !== location.hash && !confirmRouteLeave(route)) {
      routeIntent = null
      // Restore the visible wall without remounting it; Back can be tried again after saving.
      history.pushState(history.state, '', '#' + lastRoute)
      return
    }
    rememberRoutePosition()
    var restoreY = routeIntent === location.hash ? 0 : routePositions[route] || 0
    routeIntent = null
    routeChanging = true
    render(route, true, restoreY)
  })
  window.addEventListener('scroll', rememberRoutePosition, { passive: true })

  var searchMask = document.querySelector('.search-mask')
  var searchPanel = document.querySelector('.search-panel')
  var searchInput = document.querySelector('.search-panel input')
  var searchHits = document.querySelector('.search-hits')
  var searchTrigger = null
  var searchOptions = []
  var searchSelected = -1
  var searchCatalog = null
  var searchClose = null
  var searchStatus = null
  var searchEnterTimer = 0
  var siteDirectory = [
    ['/', '首页', '从这里开始'],
    ['/posts', '文字', '读与听'], ['/notes', '随手记', '读与听'], ['/podcasts', '播客 · 展示示例', '读与听'], ['/streams', '直播 · 展示示例', '读与听'],
    ['/projects', '造物', '动手做'], ['/demos', '小实验 · 展示示例', '动手做'],
    ['/photos', '沿途', '看与收藏'], ['/use', '手边工具', '看与收藏'], ['/bookmarks', '书签', '看与收藏'], ['/media', '书影音 · 展示示例', '看与收藏'],
    ['/guestbook', '留言墙', '保持联系'], ['/sponsors', '支持', '保持联系'], ['/chat-zh', '聊聊', '保持联系'], ['/feed', '更新小报', '保持联系'],
    ['/chat', '聊聊 · 英文', '保持联系'], ['/collective', '支持开源', '保持联系'],
  ]

  if (searchMask && searchPanel && searchInput && searchHits) {
    searchMask.setAttribute('aria-label', '博客目录与搜索')
    searchMask.inert = true
    searchInput.setAttribute('role', 'combobox')
    searchInput.setAttribute('aria-autocomplete', 'list')
    searchInput.setAttribute('aria-haspopup', 'listbox')
    searchInput.setAttribute('autocomplete', 'off')
    searchHits.setAttribute('role', 'listbox')
    searchHits.setAttribute('aria-label', '搜索结果')
    searchHits.removeAttribute('aria-live')
    searchClose = document.createElement('button')
    searchClose.type = 'button'
    searchClose.className = 'search-close'
    searchClose.setAttribute('aria-label', '关闭搜索')
    searchClose.textContent = '关闭'
    searchClose.addEventListener('click', closeSearch)
    searchInput.parentNode.appendChild(searchClose)
    searchStatus = document.createElement('p')
    searchStatus.className = 'search-status'
    searchStatus.setAttribute('role', 'status')
    searchPanel.appendChild(searchStatus)
    var searchHelp = document.createElement('p')
    searchHelp.className = 'search-help'
    searchHelp.textContent = '↑ ↓ 选择 · Enter 打开 · Esc 关闭'
    searchPanel.appendChild(searchHelp)
  }

  function getSearchCatalog() {
    if (searchCatalog) return searchCatalog
    var pages = window.PAGES || {}, seen = Object.create(null)
    var entries = siteDirectory.map(function (item) { return { href: '#' + item[0], title: item[1], kind: '页面', group: item[2] } }).concat(window.SEARCH_INDEX || [])
    searchCatalog = entries.filter(function (item) {
      if (!item.href || item.href.indexOf('#/') !== 0 || retiredRoute(item.href.slice(1)) || item.kind === 'Talk' || item.kind === '演讲' || seen[item.href] || !pages[item.href.slice(1)]) return false
      seen[item.href] = true
      return true
    }).map(function (item) {
      var template = document.createElement('template')
      template.innerHTML = pages[item.href.slice(1)]
      var intro = template.content.querySelector('article > p:not(.post-meta):not(.share-line), main > p:not(.post-meta), .project-desc')
      var kind = { Blog: '文章', Note: '札记', Page: '页面' }[item.kind] || item.kind || ''
      var body = template.content.textContent.replace(/\s+/g, ' ').trim()
      return { href: item.href, title: item.title, kind: kind, group: item.group, excerpt: intro ? intro.textContent.trim() : '', match: (item.title + ' ' + kind + ' ' + body).toLowerCase() }
    })
    return searchCatalog
  }

  function selectSearch(index) {
    if (index >= 0) stopSearchEntrance()
    searchSelected = index
    searchOptions.forEach(function (option, i) { option.setAttribute('aria-selected', String(i === index)) })
    if (searchOptions[index]) {
      searchInput.setAttribute('aria-activedescendant', searchOptions[index].id)
      searchOptions[index].scrollIntoView({ block: 'nearest' })
    } else searchInput.removeAttribute('aria-activedescendant')
  }

  function stopSearchEntrance() {
    clearTimeout(searchEnterTimer)
    searchEnterTimer = 0
    if (searchMask) searchMask.classList.remove('is-entering')
  }

  function updateSearch() {
    if (!searchHits || !searchStatus) return
    stopSearchEntrance()
    var q = searchInput.value.trim().toLowerCase()
    var catalog = getSearchCatalog()
    var matches = q ? catalog.filter(function (item) { return q.split(/\s+/).every(function (word) { return item.match.includes(word) }) }).sort(function (a, b) {
      return Number(b.title.toLowerCase().includes(q)) - Number(a.title.toLowerCase().includes(q))
    }) : siteDirectory.map(function (entry) { return catalog.find(function (item) { return item.href === '#' + entry[0] }) }).filter(Boolean)
    searchHits.replaceChildren()
    var directoryGroups = Object.create(null)
    searchOptions = matches.slice(0, 20).map(function (item, index) {
      var hit = document.createElement('a')
      hit.className = 'search-hit'
      hit.href = item.href
      hit.id = 'search-option-' + index
      hit.tabIndex = -1
      hit.setAttribute('role', 'option')
      hit.setAttribute('aria-selected', 'false')
      hit.addEventListener('click', closeSearch)
      var title = document.createElement('span'), kind = document.createElement('small')
      title.textContent = item.title
      kind.textContent = q ? item.kind : '↗'
      hit.append(title, kind)
      if (q && item.excerpt) {
        var excerpt = document.createElement('p')
        excerpt.textContent = item.excerpt.slice(0, 100) + (item.excerpt.length > 100 ? '…' : '')
        hit.appendChild(excerpt)
      }
      var parent = searchHits
      if (!q) {
        if (!directoryGroups[item.group]) {
          parent = document.createElement('div')
          parent.className = 'search-directory-group'
          parent.setAttribute('role', 'group')
          parent.setAttribute('aria-label', item.group)
          var label = document.createElement('p')
          label.className = 'search-directory-label'
          label.setAttribute('aria-hidden', 'true')
          label.textContent = item.group
          parent.appendChild(label)
          directoryGroups[item.group] = parent
          searchHits.appendChild(parent)
        }
        parent = directoryGroups[item.group]
      }
      parent.appendChild(hit)
      return hit
    })
    searchPanel.classList.toggle('has-query', !!q)
    searchPanel.classList.toggle('is-directory', !q)
    searchInput.setAttribute('aria-expanded', String(searchOptions.length > 0))
    searchStatus.textContent = q ? (matches.length ? '找到 ' + matches.length + ' 项' + (matches.length > 20 ? '，先显示前 20 项，请继续输入缩小范围。' : '') : '没有找到相关内容，试试更短的关键词。') : '这是博客的全部栏目。也可以输入关键词，找一段文字。'
    selectSearch(-1)
    searchHits.scrollTop = 0
  }

  function openSearch() {
    if (!searchMask) return
    if (searchMask.classList.contains('is-open')) { searchInput.focus(); return }
    if (photoIndex >= 0) closeLightbox()
    searchTrigger = document.activeElement
    searchMask.inert = false
    searchMask.classList.add('is-open')
    searchMask.setAttribute('aria-hidden', 'false')
    syncOverlayLock()
    if (searchInput) {
      searchInput.value = ''
      searchInput.focus()
    }
    updateSearch()
    if (!prefersReducedMotion()) {
      searchMask.classList.add('is-entering')
      searchEnterTimer = setTimeout(stopSearchEntrance, 720)
    }
  }
  function closeSearch() {
    if (!searchMask || !searchMask.classList.contains('is-open')) return
    stopSearchEntrance()
    searchMask.classList.remove('is-open')
    searchMask.inert = true
    searchMask.setAttribute('aria-hidden', 'true')
    if (searchPanel) searchPanel.classList.remove('has-query')
    if (searchInput) searchInput.setAttribute('aria-expanded', 'false')
    if (searchInput) searchInput.removeAttribute('aria-activedescendant')
    syncOverlayLock()
    if (searchTrigger && searchTrigger.isConnected && searchTrigger.focus) searchTrigger.focus({ preventScroll: true })
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
    if (photoIndex >= 0) {
      if (['Escape', 'Tab', 'ArrowRight', 'ArrowLeft'].includes(e.key)) e.preventDefault()
      if (e.key === 'Escape') closeLightbox()
      else if (e.key === 'ArrowRight') showPhoto(Math.min(photoNodes.length - 1, photoIndex + 1))
      else if (e.key === 'ArrowLeft') showPhoto(Math.max(0, photoIndex - 1))
      else if (e.key === 'Tab') {
        var controls = Array.from(light.querySelectorAll('button:not(:disabled)'))
        var index = controls.indexOf(document.activeElement)
        if (controls.length) controls[(index + (e.shiftKey ? -1 : 1) + controls.length) % controls.length].focus({ preventScroll: true })
      }
      return
    }
    if (searchMask && searchMask.classList.contains('is-open')) {
      if (e.key === 'Escape') { e.preventDefault(); closeSearch(); return }
      if (e.key === 'Tab') {
        e.preventDefault()
        ;(document.activeElement === searchInput ? searchClose : searchInput).focus()
        return
      }
      if (e.target === searchInput && !e.isComposing) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          if (searchOptions.length) selectSearch((searchSelected + (e.key === 'ArrowDown' ? 1 : searchSelected < 0 ? 0 : -1) + searchOptions.length) % searchOptions.length)
          return
        }
        if (e.key === 'Enter' && searchOptions.length) {
          e.preventDefault()
          searchOptions[Math.max(0, searchSelected)].click()
          return
        }
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      openSearch()
    }
    if (e.key === 'Escape') {
      closeSearch()
      closeLightbox()
    }
  })
  if (searchInput) {
    searchInput.addEventListener('input', updateSearch)
  }
  if (light) light.addEventListener('click', function (event) { if (event.target === light) closeLightbox() })

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
    var footer = document.querySelector('.footer')
    var footerVisible = footer && footer.getBoundingClientRect().top < window.innerHeight
    if (backToTop) backToTop.classList.toggle('is-visible', window.scrollY > 320 && !footerVisible)
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

  if (!location.hash) location.replace('#/')
  else render(currentRoute(), false)
})()
