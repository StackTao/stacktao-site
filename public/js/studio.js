(function () {
  var disposers = [], motions = new Set(), motionByElement = new WeakMap()
  function stopMotion(el) {
    var previous = motionByElement.get(el)
    if (previous) { previous.cancel(); motions.delete(previous); motionByElement.delete(el) }
  }
  function motion(el, frames, duration) {
    stopMotion(el)
    if (!el.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    var animation = el.animate(frames, { duration: duration, easing: 'cubic-bezier(.2,.75,.25,1)' })
    motionByElement.set(el, animation); motions.add(animation)
    animation.onfinish = function () { motions.delete(animation) }
    return animation
  }
  function destroy() { if (window.Cabinet) window.Cabinet.destroy(); disposers.forEach(function (dispose) { dispose() }); disposers = []; motions.forEach(function (animation) { animation.cancel() }); motions.clear() }
  function node(tag, className, text) {
    var el = document.createElement(tag)
    if (className) el.className = className
    if (text != null) el.textContent = text
    return el
  }
  function source(route) {
    var template = document.createElement('template')
    template.innerHTML = (window.PAGES || {})[route] || ''
    return template.content
  }
  function link(href, text, className) {
    var el = node('a', className, text)
    el.setAttribute('href', href)
    return el
  }
  // The three objects share pointer cancellation, but keep their own mechanics.
  function grab(handle, start, move, end) {
    var controller = new AbortController(), signal = controller.signal
    var pointer = null, moved = false, suppressClick = false
    function finish(cancelled) {
      if (!pointer) return
      var id = pointer.id
      pointer = null
      suppressClick = moved || cancelled
      handle.classList.remove('is-grabbed')
      if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id)
      end(cancelled, moved)
    }
    handle.addEventListener('pointerdown', function (event) {
      if (pointer || event.button !== 0 || event.isPrimary === false) return
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
      moved = false; suppressClick = false
      start(event)
      handle.setPointerCapture(event.pointerId)
      handle.classList.add('is-grabbed')
    }, { signal: signal })
    handle.addEventListener('pointermove', function (event) {
      if (!pointer || event.pointerId !== pointer.id) return
      if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 4) moved = true
      if (moved) { event.preventDefault(); move(event, pointer) }
    }, { signal: signal })
    handle.addEventListener('pointerup', function (event) { if (pointer && event.pointerId === pointer.id) finish(false) }, { signal: signal })
    ;['pointercancel', 'lostpointercapture'].forEach(function (name) {
      handle.addEventListener(name, function (event) { if (pointer && event.pointerId === pointer.id) finish(true) }, { signal: signal })
    })
    handle.addEventListener('click', function (event) {
      if (suppressClick && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation() }
      suppressClick = false
    }, { capture: true, signal: signal })
    handle.addEventListener('keydown', function (event) { if (event.key === 'Escape') finish(true) }, { signal: signal })
    window.addEventListener('blur', function () { finish(true) }, { signal: signal })
    document.addEventListener('visibilitychange', function () { if (document.hidden) finish(true) }, { signal: signal })
    disposers.push(function () { finish(true); controller.abort() })
  }

  function readingDial(posts) {
    var device = node('aside', 'reading-radio')
    device.setAttribute('aria-label', '站内调频，转动旋钮发现文字、照片和作品')
    var feeds = [{ name: '文字', items: posts.map(function (post) {
      var paragraph = source(post.getAttribute('href').replace(/^#/, '')).querySelector('article > p:not(.post-meta):not(.share-line)')
      return { title: post.querySelector('span').textContent.trim(), href: post.getAttribute('href'), text: paragraph ? paragraph.textContent.trim() : '', action: '读这一篇 ↗' }
    }) }]
    var firstAlbum = source('/photos').querySelector('.photo-grid')
    var photos = firstAlbum ? Array.from(firstAlbum.querySelectorAll('img')) : []
    if (photos.length) feeds.push({ name: '影像', items: photos.map(function (photo, index) { return { title: photo.alt || '沿途的一瞬', href: '#/photos', text: photo.getAttribute('data-place') || '把目光留给远处。', image: photo.getAttribute('src'), photo: index, action: '展开这张照片 ↗' } }) })
    var projects = Array.from(source('/projects').querySelectorAll('.project-grid .item')).slice(0, 6)
    if (projects.length) feeds.push({ name: '造物', items: projects.map(function (project) { return { title: project.querySelector('.project-name').textContent, href: project.getAttribute('href'), text: project.querySelector('.project-desc').textContent, action: '打开这个项目 ↗' } }) })
    var items = feeds[0].items, band = 0
    var stations = node('div', 'radio-stations'); stations.setAttribute('role', 'group'); stations.setAttribute('aria-label', '调频内容')
    var control = node('div', 'radio-control')
    var dial = node('button', 'radio-dial')
    dial.type = 'button'; dial.setAttribute('role', 'slider'); dial.setAttribute('aria-label', '文字旋钮')
    dial.setAttribute('aria-valuemin', '1'); dial.setAttribute('aria-valuemax', String(posts.length))
    var wheel = node('span', 'radio-wheel'); wheel.setAttribute('aria-hidden', 'true')
    wheel.append(node('i', 'radio-needle'), node('span', 'radio-hub', 'ST'))
    dial.appendChild(wheel)
    control.append(node('span', 'radio-station', '站内调频'), dial, node('small', '', '转一转，随便逛逛'))
    var screen = node('div', 'radio-screen')
    var scale = node('div', 'radio-scale'); scale.setAttribute('aria-hidden', 'true')
    for (var n = 0; n < posts.length; n++) scale.appendChild(node('i', '', String(n + 1).padStart(2, '0')))
    var photoPreview = node('img', 'radio-photo'); photoPreview.alt = ''; photoPreview.hidden = true
    var heading = node('h3'), excerpt = node('p', 'radio-excerpt'), content = node('div', 'radio-content')
    var actions = node('div', 'radio-actions'), destination = link('', '读这一篇 ↗')
    var random = node('button', 'radio-random', '随缘调频 ↻'); random.type = 'button'
    content.append(photoPreview, heading, excerpt)
    actions.append(destination, random); screen.append(scale, content, actions)
    device.append(stations, control, screen)
    var angle = 0, chosen = -1, step = 360 / posts.length, last = 0, initial = 0, velocity = 0, time = 0, ready = false
    function tune(value, settle) {
      var direction = value < angle ? -1 : 1
      angle = value
      var index = ((Math.round(angle / step) % items.length) + items.length) % items.length
      if (settle) angle = Math.round(angle / step) * step
      wheel.style.transform = 'rotate(' + angle + 'deg)'
      if (chosen === index) return
      chosen = index
      var item = items[index], title = item.title
      heading.textContent = title
      excerpt.textContent = item.text.slice(0, 120)
      photoPreview.hidden = !item.image
      if (item.image) photoPreview.src = item.image
      else photoPreview.removeAttribute('src')
      destination.href = item.href; destination.textContent = item.action
      if (/^https?:/.test(item.href)) { destination.target = '_blank'; destination.rel = 'noreferrer' }
      else { destination.removeAttribute('target'); destination.removeAttribute('rel') }
      dial.setAttribute('aria-valuenow', String(index + 1)); dial.setAttribute('aria-valuetext', feeds[band].name + ' · 第 ' + (index + 1) + ' 项：' + title)
      Array.from(scale.children).forEach(function (tick, i) { tick.classList.toggle('is-tuned', i === index) })
      scale.style.setProperty('--tuning', items.length > 1 ? index / (items.length - 1) : .5)
      if (ready) motion(content, [{ opacity: .35, transform: 'translateY(' + (direction * 18) + 'px)' }, { opacity: 1, transform: 'translateY(0)' }], 380)
    }
    function bearing(event) {
      var box = dial.getBoundingClientRect()
      return Math.atan2(event.clientY - box.top - box.height / 2, event.clientX - box.left - box.width / 2) * 180 / Math.PI
    }
    grab(dial, function (event) {
      initial = angle
      var transform = getComputedStyle(wheel).transform
      if (transform !== 'none') {
        var matrix = new DOMMatrixReadOnly(transform), visible = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI
        tune(angle + ((visible - angle + 540) % 360 + 360) % 360 - 180, false)
      }
      last = bearing(event); velocity = 0; time = event.timeStamp
    }, function (event) {
      var next = bearing(event), delta = ((next - last + 540) % 360) - 180
      velocity = delta / Math.max(16, event.timeStamp - time)
      last = next; time = event.timeStamp
      tune(angle + delta, false)
    }, function (cancelled, moved) {
      if (cancelled) tune(initial, true)
      else if (moved) tune(angle + (performance.now() - time < 100 ? Math.max(-step, Math.min(step, velocity * 95)) : 0), true)
    })
    dial.addEventListener('click', function () { tune(angle + step, true) })
    dial.addEventListener('keydown', function (event) {
      var delta = ['ArrowRight', 'ArrowUp'].includes(event.key) ? step : ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -step : null
      if (delta !== null) { event.preventDefault(); tune(angle + delta, true) }
      if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); tune(event.key === 'Home' ? 0 : (items.length - 1) * step, true) }
    })
    random.addEventListener('click', function () { tune(angle + step * (1 + Math.floor(Math.random() * Math.max(1, items.length - 1))), true) })
    var stationButtons = feeds.map(function (feed, index) {
      var button = node('button', '', feed.name); button.type = 'button'; button.setAttribute('aria-pressed', String(index === 0))
      button.addEventListener('click', function () {
        if (band === index) return
        band = index; items = feed.items; step = 360 / items.length; chosen = -1
        device.dataset.station = index === 1 && feed.name === '影像' ? 'photos' : 'words'
        scale.replaceChildren()
        scale.classList.toggle('is-dense', items.length > 8)
        items.forEach(function (_, i) { scale.appendChild(node('i', '', String(i + 1).padStart(2, '0'))) })
        dial.setAttribute('aria-valuemax', String(items.length))
        dial.setAttribute('aria-label', feed.name + '旋钮')
        stationButtons.forEach(function (item, i) { item.setAttribute('aria-pressed', String(index === i)) })
        tune(0, true)
      })
      stations.appendChild(button); return button
    })
    destination.addEventListener('click', function () {
      var item = items[chosen]
      if (item.photo != null) try { sessionStorage.setItem('stacktao-photo-entry', String(item.photo)) } catch (_) {}
    })
    tune(0, true); ready = true
    return device
  }

  function home(main) {
    var original = node('div', 'journal-original')
    while (main.firstChild) original.appendChild(main.firstChild)
    var oldTitle = original.querySelector('h1')
    if (oldTitle) oldTitle.replaceWith(node('h2', '', oldTitle.textContent))
    main.className = 'page journal-home'
    var config = (window.CONTENT_CONFIG || {}).site || {}
    var name = config.name || 'StackTao'
    var posts = Array.from(source('/posts').querySelectorAll('.post-row')).slice(0, 6)
    var projects = Array.from(source('/projects').querySelectorAll('.project-grid .item')).slice(0, 3)
    var intro = node('header', 'journal-intro')
    intro.append(node('p', 'journal-overline', '一个人的自留地 / PERSONAL JOURNAL'))
    var title = node('h1')
    title.appendChild(node('span', 'journal-name', name + '.'))
    intro.append(title, node('p', 'journal-bio', config.description || '写代码，也写一些关于工具、设计和日常的观察。这个博客用来存放做过的东西，以及还在慢慢想的问题。'))
    var wandering = node('p', 'journal-wandering')
    wandering.append(document.createTextNode('大多时候在'), link('#/posts', '写字'))
    if (source('/photos').querySelector('.photo-grid img')) wandering.append(document.createTextNode('，偶尔'), link('#/photos', '看看别处'))
    wandering.append(document.createTextNode('。你可以随意逛逛。'))
    intro.appendChild(wandering)
    main.appendChild(intro)

    var letter = node('aside', 'journal-letter')
    var letterButton = node('button', 'journal-letter-toggle')
    letterButton.type = 'button'
    letterButton.setAttribute('aria-expanded', 'false')
    letterButton.setAttribute('aria-controls', 'journal-letter-body')
    var envelope = node('span', 'journal-envelope')
    envelope.setAttribute('aria-hidden', 'true')
    envelope.appendChild(node('i'))
    var letterLabel = node('span', '', '给路过的人')
    letterButton.append(envelope, letterLabel)
    var letterBody = node('div', 'journal-reveal')
    letterBody.id = 'journal-letter-body'
    letterBody.setAttribute('aria-hidden', 'true')
    letterBody.inert = true
    var letterInner = node('div')
    var letterText = node('div', 'journal-letter-text')
    letterText.append(node('p', '', '互联网很大，能在这里遇见，已经是一件有意思的事。'), node('p', '', '不必有什么特别的见解。一句问候，一幅涂鸦，或者只是写下今天的心情。'))
    var invitation = link('#/guestbook', '在墙上留一点痕迹 ↗', 'journal-inline-link')
    invitation.tabIndex = -1
    letterText.append(invitation, node('small', '', '目前只保存在你的浏览器里。'))
    letterInner.appendChild(letterText)
    letterBody.appendChild(letterInner)
    letterButton.addEventListener('click', function () {
      var open = letterButton.getAttribute('aria-expanded') !== 'true'
      letterButton.setAttribute('aria-expanded', String(open))
      letter.classList.toggle('is-open', open)
      letterBody.setAttribute('aria-hidden', String(!open))
      letterBody.inert = !open
      invitation.tabIndex = open ? 0 : -1
      letterLabel.textContent = open ? '读完，折好' : '给路过的人'
    })
    letter.append(letterButton, letterBody)
    main.appendChild(letter)
    photoWindow(main)

    var writing = node('section', 'journal-writing')
    writing.setAttribute('aria-labelledby', 'journal-writing-title')
    var head = node('div', 'journal-section-head')
    var heading = node('h2', '', '最近写下的')
    heading.id = 'journal-writing-title'
    head.appendChild(heading)
    var objects = node('aside', 'journal-objects')
    objects.setAttribute('aria-label', '桌上的小物件')
    if (posts.length) objects.appendChild(readingDial(posts))
    main.appendChild(objects)
    writing.appendChild(head)
    var entries = []
    var selected = -1
    function unfold(index) {
      selected = index
      entries.forEach(function (entry, i) {
        var open = index === i
        entry.root.classList.toggle('is-open', open)
        entry.button.setAttribute('aria-expanded', String(open))
        entry.preview.setAttribute('aria-hidden', String(!open))
        entry.preview.inert = !open
        entry.continueLink.tabIndex = open ? 0 : -1
      })
    }
    posts.forEach(function (post, index) {
      var title = post.querySelector('span').textContent.trim()
      var href = post.getAttribute('href')
      var article = source(href.replace(/^#/, ''))
      var firstParagraph = article.querySelector('article > p:not(.post-meta):not(.share-line)')
      var excerpt = firstParagraph ? firstParagraph.textContent.trim() : ''
      if (excerpt.length > 180) excerpt = excerpt.slice(0, 180) + '…'
      var entry = node('article', 'journal-entry')
      var row = node('div', 'journal-entry-row')
      var number = node('span', 'journal-number', String(index + 1).padStart(2, '0'))
      number.setAttribute('aria-hidden', 'true')
      var name = node('h3')
      name.appendChild(link(href, title))
      var meta = post.querySelector('.meta')
      row.append(number, name, node('span', 'journal-date', meta ? meta.textContent.trim() : ''))
      var button = node('button', 'journal-fold')
      button.type = 'button'
      button.setAttribute('aria-label', '翻看「' + title + '」的开头')
      button.setAttribute('aria-expanded', 'false')
      button.setAttribute('aria-controls', 'journal-excerpt-' + index)
      var page = node('span', 'journal-fold-paper')
      page.setAttribute('aria-hidden', 'true')
      page.appendChild(node('i'))
      button.appendChild(page)
      row.appendChild(button)
      var preview = node('div', 'journal-reveal')
      preview.id = 'journal-excerpt-' + index
      preview.setAttribute('aria-hidden', 'true')
      preview.inert = true
      var inner = node('div')
      var text = node('div', 'journal-excerpt-text')
      text.append(node('span', 'journal-excerpt-label', '从这一句开始'), node('p', '', excerpt || '这篇文章的内容，留到正文里慢慢看。'))
      var continueLink = link(href, '继续读 ↗', 'journal-inline-link')
      continueLink.tabIndex = -1
      text.appendChild(continueLink)
      inner.appendChild(text)
      preview.appendChild(inner)
      entry.append(row, preview)
      entries.push({ root: entry, button: button, preview: preview, continueLink: continueLink })
      button.addEventListener('click', function () { unfold(selected === index ? -1 : index) })
      writing.appendChild(entry)
    })
    writing.appendChild(link('#/posts', '更早的文字 ↗', 'journal-archive'))
    main.insertBefore(writing, main.querySelector('.journal-photo-window') || objects)

    if (projects.length) {
      var work = node('section', 'journal-work')
      work.append(node('h2', '', '写字之外'), node('p', '', '也做一些工具。把想法放进真实的问题里，再慢慢打磨。'))
      var list = node('ul')
      projects.forEach(function (project) {
        var item = node('li')
        var projectLink = project.cloneNode(false)
        projectLink.className = 'journal-project-link'
        projectLink.textContent = project.querySelector('.project-name').textContent
        var description = project.querySelector('.project-desc')
        item.append(projectLink, node('span', '', description ? description.textContent : ''))
        list.appendChild(item)
      })
      work.append(list, link('#/projects', '还有这些 ↗', 'journal-inline-link'))
      objects.appendChild(work)
    }
    var about = node('details', 'journal-about')
    about.append(node('summary', '', '再多认识我一点'), original)
    main.appendChild(about)
  }
  function photoWindow(main) {
    var album = source('/photos').querySelector('.photo-grid')
    var photos = album ? Array.from(album.querySelectorAll('img')).slice(0, 3) : []
    if (!photos.length) return
    var controller = new AbortController(), signal = controller.signal
    var section = node('section', 'journal-photo-window photo-desk')
    section.setAttribute('aria-label', '桌上的相片，可左右拨动')
    var stage = node('div', 'photo-desk-stage')
    var current = 0, pointer = null, held = null, startX = 0, startY = 0, dx = 0, dy = 0, moved = false, suppressClick = false
    var prints = photos.map(function (photo, index) {
      var print = node('button', 'photo-print')
      print.type = 'button'
      print.dataset.photo = String(index)
      print.setAttribute('aria-label', photo.alt + '；点击翻到下一张，也可左右拖动')
      var image = photo.cloneNode(false)
      image.loading = 'lazy'; image.draggable = false; image.alt = ''
      print.append(image, node('span', '', photo.getAttribute('data-place') || photo.alt))
      stage.appendChild(print)
      return print
    })
    var caption = node('div', 'photo-desk-caption')
    var controls = node('div', 'photo-desk-controls')
    var previous = node('button', '', '←'), next = node('button', '', '→')
    previous.type = next.type = 'button'
    previous.setAttribute('aria-label', '翻到上一张相片'); next.setAttribute('aria-label', '翻到下一张相片')
    var count = node('output')
    count.setAttribute('aria-live', 'polite')
    controls.append(previous, count, next)
    var albumLink = link('#/photos', '去相册细看 ↗', 'journal-photo-link')
    albumLink.addEventListener('click', function () { try { sessionStorage.setItem('stacktao-photo-entry', String(current)) } catch (_) {} }, { signal: signal })
    caption.append(controls, albumLink)
    var hint = node('p', 'photo-desk-hint', '左右拨一拨，看看下一张。')
    function select(index, animate) {
      var focusPrint = prints.indexOf(document.activeElement) >= 0
      var before = prints.map(function (print) { return getComputedStyle(print).transform })
      var old = current, direction = index < current ? 1 : -1
      current = (index + photos.length) % photos.length
      prints.forEach(function (print, i) {
        stopMotion(print)
        var order = (i - current + photos.length) % photos.length
        var end = order === 0 ? 'translate(0px, 0px) rotate(-3deg)' : order === 1 ? 'translate(15px, -10px) rotate(6deg)' : 'translate(-14px, -19px) rotate(-8deg)'
        var depth = photos.length - order
        print.style.zIndex = String(depth)
        print.style.transform = end
        print.classList.toggle('is-front', order === 0)
        print.inert = order !== 0; print.tabIndex = order === 0 ? 0 : -1
        print.setAttribute('aria-hidden', String(order !== 0))
        if (animate !== false) {
          if (i === old && old !== current) {
            var lifted = 'translate(' + (direction * 92) + 'px, -24px) rotate(' + (direction * 14) + 'deg) scale(1.025)'
            motion(print, [
              { transform: before[i], zIndex: photos.length + 1, offset: 0 },
              { transform: lifted, zIndex: photos.length + 1, offset: .42 },
              { transform: lifted, zIndex: depth, offset: .43 },
              { transform: end, zIndex: depth, offset: 1 }
            ], 680)
          } else motion(print, [{ transform: before[i] }, { transform: end }], 520)
        }
      })
      count.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(photos.length).padStart(2, '0')
      if (focusPrint) prints[current].focus({ preventScroll: true })
    }
    function finish(cancelled) {
      if (pointer === null) return
      var id = pointer, print = held
      pointer = null; held = null
      stage.classList.remove('is-dragging', 'is-holding')
      if (print.hasPointerCapture && print.hasPointerCapture(id)) print.releasePointerCapture(id)
      suppressClick = moved || cancelled
      select(!cancelled && Math.abs(dx) >= 48 ? current + (dx < 0 ? 1 : -1) : current)
    }
    stage.addEventListener('pointerdown', function (event) {
      var print = event.target.closest('.photo-print')
      if (print !== prints[current] || pointer !== null || !event.isPrimary || event.button !== 0) return
      pointer = event.pointerId; held = print; startX = event.clientX; startY = event.clientY; dx = dy = 0; moved = false; suppressClick = false
      var visible = getComputedStyle(print).transform
      stopMotion(print); print.style.transform = visible
      stage.classList.add('is-holding')
      print.setPointerCapture(pointer)
    }, { signal: signal })
    stage.addEventListener('pointermove', function (event) {
      if (event.pointerId !== pointer) return
      dx = event.clientX - startX; dy = event.clientY - startY
      if (!moved && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { finish(true); return }
      if (Math.abs(dx) > 5) moved = true
      if (!moved) return
      stage.classList.add('is-dragging')
      var travel = dx / (1 + Math.abs(dx) / 300)
      held.style.transform = 'translate(' + travel + 'px,' + Math.max(-24, Math.min(24, dy * .35)) + 'px) rotate(' + (-3 + travel * .08) + 'deg) scale(1.025)'
    }, { signal: signal })
    ;['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (type) {
      stage.addEventListener(type, function (event) { if (event.pointerId === pointer) finish(type !== 'pointerup') }, { signal: signal })
    })
    stage.addEventListener('click', function (event) {
      if (!event.target.closest('.photo-print')) return
      if (suppressClick && event.detail !== 0) { suppressClick = false; return }
      select(current + 1)
    }, { signal: signal })
    stage.addEventListener('dragstart', function (event) { event.preventDefault() }, { signal: signal })
    section.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { finish(true); return }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault(); finish(true); select(current + (event.key === 'ArrowLeft' ? -1 : 1))
    }, { signal: signal })
    previous.addEventListener('click', function () { finish(true); select(current - 1) }, { signal: signal })
    next.addEventListener('click', function () { finish(true); select(current + 1) }, { signal: signal })
    window.addEventListener('blur', function () { finish(true) }, { signal: signal })
    document.addEventListener('visibilitychange', function () { if (document.hidden) finish(true) }, { signal: signal })
    disposers.push(function () { finish(true); controller.abort() })
    section.append(stage, caption, hint)
    main.appendChild(section)
    select(0, false)
    prints.forEach(function (print, i) {
      motion(print, [{ opacity: .65, transform: 'translate(0px, 32px) rotate(0deg)' }, { opacity: 1, transform: print.style.transform }], 760 + i * 90)
    })
  }

  function photoLoupe(stage, image, tools) {
    var toggle = node('button', 'contact-loupe-toggle', '拿起放大镜')
    toggle.type = 'button'; toggle.setAttribute('aria-pressed', 'false')
    var lens = node('button', 'contact-loupe')
    lens.type = 'button'; lens.hidden = true
    lens.setAttribute('aria-label', '照片放大镜，拖动或用方向键移动，Escape 收起')
    var glass = node('span', 'loupe-glass'); glass.setAttribute('aria-hidden', 'true')
    lens.append(glass, node('span', 'loupe-mark', '2×'))
    stage.appendChild(lens); tools.appendChild(toggle)
    var x = .55, y = .5, initialX, initialY, width = 1, height = 1
    function paint() {
      if (lens.hidden) return
      width = stage.clientWidth; height = stage.clientHeight
      if (!width || !height) return
      var radius = lens.offsetWidth / 2, px = Math.max(radius, Math.min(width - radius, x * width)), py = Math.max(radius, Math.min(height - radius, y * height))
      x = px / width; y = py / height
      lens.style.left = px + 'px'; lens.style.top = py + 'px'
      var iw = image.naturalWidth || width, ih = image.naturalHeight || height
      var fit = image.style.objectFit === 'contain' ? Math.min(width / iw, height / ih) : Math.max(width / iw, height / ih)
      var dw = iw * fit, dh = ih * fit
      glass.style.backgroundImage = image.complete && image.naturalWidth ? 'url(' + JSON.stringify(image.src) + ')' : 'none'
      glass.style.backgroundSize = (dw * 2) + 'px ' + (dh * 2) + 'px'
      glass.style.backgroundPosition = (glass.clientWidth / 2 - (px - (width - dw) / 2) * 2) + 'px ' + (glass.clientHeight / 2 - (py - (height - dh) / 2) * 2) + 'px'
    }
    function show(open) {
      lens.hidden = !open; toggle.setAttribute('aria-pressed', String(open))
      toggle.textContent = open ? '收起放大镜' : '拿起放大镜'
      stage.classList.toggle('has-loupe', open)
      if (open) { paint(); lens.focus({ preventScroll: true }) }
    }
    toggle.addEventListener('click', function () { show(lens.hidden) })
    grab(lens, function () { initialX = x; initialY = y }, function (event, origin) {
      x = initialX + (event.clientX - origin.x) / width; y = initialY + (event.clientY - origin.y) / height; paint()
    }, function (cancelled) { if (cancelled) { x = initialX; y = initialY; paint() } })
    lens.addEventListener('keydown', function (event) {
      var distance = event.shiftKey ? 30 : 10
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation()
        x += event.key === 'ArrowLeft' ? -distance / width : event.key === 'ArrowRight' ? distance / width : 0
        y += event.key === 'ArrowUp' ? -distance / height : event.key === 'ArrowDown' ? distance / height : 0
        paint()
      }
      if (event.key === 'Escape') { show(false); toggle.focus({ preventScroll: true }) }
    })
    image.addEventListener('load', paint)
    var observer = new ResizeObserver(paint); observer.observe(stage)
    disposers.push(function () { observer.disconnect() })
    return paint
  }

  function contactSheet(main) {
    var grids = Array.from(main.querySelectorAll('.photo-grid'))
    if (!grids.length) return
    var layouts = [['gallery', '展览'], ['reader', '逐张'], ['grid', '索引'], ['masonry', '瀑布流']]
    var current = 'gallery'
    try { current = localStorage.getItem('stacktao-photo-layout-v2') || current } catch (_) {}
    if (!layouts.some(function (item) { return item[0] === current })) current = 'gallery'
    var toolbar = main.querySelector('.photo-toolbar')
    var controls = node('div', 'photo-layout-controls')
    var group = node('div', 'photo-layout-switch')
    group.setAttribute('role', 'group'); group.setAttribute('aria-label', '相册排版')
    group.appendChild(node('span', '', '观看方式'))
    var buttons = layouts.map(function (item) {
      var button = node('button', '', item[1]); button.type = 'button'; button.dataset.photoLayout = item[0]
      button.addEventListener('click', function () {
        apply(item[0])
        try { localStorage.setItem('stacktao-photo-layout-v2', item[0]) } catch (_) {}
      })
      group.appendChild(button); return button
    })
    controls.append(node('span', 'photo-total', String(main.querySelectorAll('.photo-grid img').length).padStart(2, '0') + ' 个沿途片段'), group)
    var first = main.querySelector('.photo-album') || grids[0]
    first.before(controls)
    if (toolbar) controls.appendChild(toolbar)
    var reveal = null
    try { var saved = sessionStorage.getItem('stacktao-photo-entry'); if (saved !== null) reveal = Number(saved); sessionStorage.removeItem('stacktao-photo-entry') } catch (_) {}
    if (Number.isInteger(reveal) && reveal >= 0 && reveal < grids[0].querySelectorAll('img').length) current = 'reader'
    else reveal = null
    var albums = grids.map(function (grid, index) { return contactAlbum(grid, toolbar, index === 0 ? reveal : null) }).filter(Boolean)
    function apply(layout) {
      current = layout
      buttons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.photoLayout === layout)) })
      albums.forEach(function (album) { album(layout) })
      if (toolbar) toolbar.hidden = layout !== 'reader' && layout !== 'grid'
    }
    apply(current)
  }

  function contactAlbum(grid, toolbar, reveal) {
    var active = true
    disposers.push(function () { active = false })
    var photos = Array.from(grid.querySelectorAll('img'))
    if (!photos.length) return
    grid.classList.add('contact-source')
    var room = node('section', 'contact-room')
    var roomTools = node('div', 'contact-room-tools')
    var lightSwitch = node('button', 'contact-light-switch', '熄灯看图')
    lightSwitch.type = 'button'; lightSwitch.setAttribute('aria-pressed', 'false')
    lightSwitch.addEventListener('click', function () {
      var dark = room.classList.toggle('is-darkroom')
      lightSwitch.setAttribute('aria-pressed', String(dark))
      lightSwitch.textContent = dark ? '开灯，回到纸面' : '熄灯看图'
    })
    var roomLabel = node('span', '', 'LIGHT TABLE / 手动翻片')
    roomTools.append(roomLabel, lightSwitch)
    room.appendChild(roomTools)
    room.setAttribute('aria-label', '照片阅览台')
    var stage = node('div', 'contact-stage')
    stage.tabIndex = 0
    stage.setAttribute('role', 'group')
    stage.setAttribute('aria-label', '照片阅览区，可用左右方向键切换')
    var image = node('img')
    image.draggable = false
    image.style.objectFit = 'contain'
    try { image.style.objectFit = localStorage.getItem('yunfeng-gallery-view') || 'contain' } catch (_) {}
    var loading = node('span', 'contact-loading', '正在取出照片…')
    var zoom = node('button', 'contact-zoom', '放大 ↗')
    zoom.type = 'button'
    zoom.setAttribute('aria-label', '放大当前照片')
    stage.append(image, loading, zoom)
    var paintLoupe = photoLoupe(stage, image, roomTools)
    var caption = node('div', 'contact-caption')
    var info = node('div')
    var description = node('p')
    var place = node('span')
    info.append(description, place)
    var controls = node('div', 'contact-controls')
    var previous = node('button', '', '←')
    var next = node('button', '', '→')
    previous.type = next.type = 'button'
    previous.setAttribute('aria-label', '上一张照片')
    next.setAttribute('aria-label', '下一张照片')
    var count = node('output')
    count.setAttribute('aria-live', 'polite')
    controls.append(previous, count, next)
    caption.append(info, controls)
    var strip = node('div', 'contact-strip')
    strip.setAttribute('role', 'group')
    strip.setAttribute('aria-label', '照片接触印样，选择一张查看')
    var current = 0
    var buttons = photos.map(function (photo, index) {
      var button = node('button', 'contact-frame')
      button.type = 'button'
      button.setAttribute('aria-label', '查看第' + (index + 1) + '张：' + photo.alt)
      var thumb = photo.cloneNode(false)
      thumb.alt = ''
      thumb.loading = 'lazy'
      thumb.removeAttribute('data-photo-index')
      button.append(thumb, node('span', '', String(index + 1).padStart(2, '0')))
      button.addEventListener('click', function () { select(index, true) })
      strip.appendChild(button)
      return button
    })
    function select(index, reveal) {
      current = (index + photos.length) % photos.length
      var photo = photos[current]
      stage.setAttribute('aria-busy', 'true')
      loading.hidden = false
      loading.textContent = '正在取出照片…'
      image.src = photo.src
      paintLoupe()
      image.alt = photo.alt
      description.textContent = photo.alt || '未命名照片'
      place.textContent = photo.getAttribute('data-place') || ''
      count.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(photos.length).padStart(2, '0')
      buttons.forEach(function (button, i) {
        button.setAttribute('aria-pressed', String(i === current))
        button.tabIndex = i === current ? 0 : -1
      })
      if (reveal) buttons[current].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
    }
    image.addEventListener('load', function () { if (!active) return; loading.hidden = true; stage.setAttribute('aria-busy', 'false'); motion(image, [{ opacity: .35 }, { opacity: 1 }], 240) })
    image.addEventListener('error', function () { loading.textContent = '这张照片暂时无法加载，试试下一张。'; stage.setAttribute('aria-busy', 'false') })
    previous.addEventListener('click', function () { select(current - 1, true) })
    next.addEventListener('click', function () { select(current + 1, true) })
    stage.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); select(current + (event.key === 'ArrowLeft' ? -1 : 1), true) }
    })
    strip.addEventListener('keydown', function (event) {
      var index = event.key === 'ArrowLeft' ? current - 1 : event.key === 'ArrowRight' ? current + 1 : event.key === 'Home' ? 0 : event.key === 'End' ? photos.length - 1 : null
      if (index !== null) { event.preventDefault(); select(index, true); buttons[current].focus({ preventScroll: true }) }
    })
    zoom.addEventListener('click', function () { photos[current].click() })
    var collection = node('div', 'contact-collection')
    var tiles = photos.map(function (photo, index) {
      var tile = node('button', 'contact-tile'); tile.type = 'button'
      tile.setAttribute('aria-label', '放大第' + (index + 1) + '张：' + (photo.alt || '未命名照片'))
      var thumb = photo.cloneNode(false)
      thumb.alt = ''; thumb.loading = index === 0 ? 'eager' : 'lazy'; thumb.decoding = 'async'; thumb.removeAttribute('data-photo-index')
      thumb.style.objectFit = image.style.objectFit
      var title = node('span', 'contact-tile-caption')
      var words = node('span', 'contact-tile-words')
      words.appendChild(node('span', 'contact-tile-title', photo.alt || '未命名照片'))
      var location = photo.getAttribute('data-place')
      if (location) words.appendChild(node('span', 'contact-tile-place', location))
      title.append(node('span', 'contact-tile-number', String(index + 1).padStart(2, '0')), words, node('span', 'contact-tile-open', '↗'))
      tile.append(thumb, title)
      tile.addEventListener('click', function () { select(index, false); photo.click() })
      collection.appendChild(tile)
      return thumb
    })
    room.append(stage, caption, strip, collection)
    if (toolbar) {
      toolbar.querySelectorAll('[data-gallery]').forEach(function (button) {
        button.textContent = button.dataset.gallery === 'cover' ? '铺满画框' : '完整照片'
        button.setAttribute('aria-pressed', String(button.dataset.gallery === image.style.objectFit))
        button.addEventListener('click', function () {
          image.style.objectFit = button.dataset.gallery
          toolbar.querySelectorAll('[data-gallery]').forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)) })
          tiles.forEach(function (thumb) { thumb.style.objectFit = button.dataset.gallery })
          paintLoupe()
        })
      })
    }
    if (photos.some(function (photo) { return photo.src.includes('images.unsplash.com') })) room.appendChild(node('p', 'contact-credit', '相册含 Unsplash 示例影像'))
    grid.before(room)
    select(reveal == null ? 0 : reveal, false)
    return function (layout) {
      var changed = room.dataset.layout && room.dataset.layout !== layout
      var reading = layout === 'reader', loupe = roomTools.querySelector('.contact-loupe-toggle')
      if (!reading && loupe.getAttribute('aria-pressed') === 'true') loupe.click()
      room.dataset.layout = layout
      stage.hidden = caption.hidden = strip.hidden = !reading
      collection.hidden = reading
      loupe.hidden = !reading
      if (changed) {
        stopMotion(stage); stopMotion(collection)
        motion(reading ? stage : collection, [{ opacity: .6, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], 460)
      }
      roomLabel.textContent = reading ? '一张一张，慢慢看。' : layout === 'gallery' ? '让目光在这里停一会儿。' : layout === 'grid' ? '所有片段 / 点击放大' : '沿着照片，向下走。'
    }
  }

  function pullBookmark(activate) {
    var controller = new AbortController()
    var signal = controller.signal
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    var toy = node('div', 'pull-bookmark')
    var ns = 'http://www.w3.org/2000/svg'
    var cord = document.createElementNS(ns, 'svg')
    cord.setAttribute('viewBox', '0 0 120 250')
    cord.setAttribute('aria-hidden', 'true')
    var path = document.createElementNS(ns, 'path')
    cord.appendChild(path)
    var anchor = node('span', 'pull-anchor')
    anchor.setAttribute('aria-hidden', 'true')
    var handle = node('button', 'pull-handle')
    handle.type = 'button'
    handle.setAttribute('aria-label', '抽一页：向下拖动书签后松手，也可点击或按回车')
    handle.setAttribute('aria-describedby', 'pull-instruction')
    var hole = node('span', 'pull-hole')
    hole.setAttribute('aria-hidden', 'true')
    handle.append(hole, node('span', 'pull-word', '抽一页'), node('span', 'pull-arrow', '↓'))
    var hint = node('span', 'pull-hint', '往下拉，试试看')
    hint.id = 'pull-instruction'
    toy.append(cord, anchor, handle, hint)
    var x = 0, y = 0, vx = 0, vy = 0, frame = 0, previousTime = 0
    var pointer = null, startX = 0, startY = 0, originX = 0, originY = 0
    var moved = false, suppressClick = false
    function draw() {
      handle.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) rotate(' + (x * .22).toFixed(2) + 'deg)'
      path.setAttribute('d', 'M60 8 C60 25 ' + (60 + x * .4).toFixed(2) + ' ' + (25 + y * .5).toFixed(2) + ' ' + (60 + x).toFixed(2) + ' ' + (44 + y).toFixed(2))
      toy.classList.toggle('is-ready', pointer !== null && y >= 54)
      hint.textContent = pointer !== null && y >= 54 ? '松手，翻一页' : '往下拉，试试看'
    }
    function stop() { cancelAnimationFrame(frame); frame = 0 }
    function reset() { stop(); x = y = vx = vy = 0; draw() }
    function spring(time) {
      var dt = Math.min((time - previousTime) / 1000 || 1 / 60, .032)
      previousTime = time
      vx += (-220 * x - 18 * vx) * dt
      vy += (-220 * y - 18 * vy) * dt
      x += vx * dt
      y += vy * dt
      draw()
      if (Math.abs(x) + Math.abs(y) + Math.abs(vx) + Math.abs(vy) < .12) reset()
      else frame = requestAnimationFrame(spring)
    }
    function release(cancelled) {
      if (pointer === null) return
      var id = pointer
      var shouldTurn = !cancelled && moved && y >= 54
      pointer = null
      toy.classList.remove('is-held')
      suppressClick = moved
      if (handle.hasPointerCapture && handle.hasPointerCapture(id)) handle.releasePointerCapture(id)
      if (shouldTurn) activate()
      if (reduced.matches) reset()
      else { previousTime = performance.now(); frame = requestAnimationFrame(spring) }
      draw()
    }
    handle.addEventListener('pointerdown', function (event) {
      if (pointer !== null || !event.isPrimary || event.button !== 0) return
      stop()
      pointer = event.pointerId
      startX = event.clientX; startY = event.clientY
      originX = x; originY = y
      vx = vy = 0; moved = false; suppressClick = false
      toy.classList.add('is-held')
      handle.focus({ preventScroll: true })
      handle.setPointerCapture(pointer)
    }, { signal: signal })
    handle.addEventListener('pointermove', function (event) {
      if (event.pointerId !== pointer) return
      var dx = event.clientX - startX, dy = event.clientY - startY
      moved = moved || Math.hypot(dx, dy) > 5
      x = Math.max(-30, Math.min(30, originX + dx * .35))
      var originDistance = -112 * Math.log(1 - originY / 112)
      var distance = Math.max(-18, originDistance + dy)
      y = 112 * (1 - Math.exp(-distance / 112))
      draw()
    }, { signal: signal })
    handle.addEventListener('pointerup', function (event) { if (event.pointerId === pointer) release(false) }, { signal: signal })
    handle.addEventListener('pointercancel', function (event) { if (event.pointerId === pointer) release(true) }, { signal: signal })
    handle.addEventListener('lostpointercapture', function (event) { if (event.pointerId === pointer) release(true) }, { signal: signal })
    handle.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && pointer !== null) { event.preventDefault(); release(true) }
    }, { signal: signal })
    handle.addEventListener('click', function (event) {
      if (suppressClick && event.detail !== 0) { suppressClick = false; return }
      activate()
      stop()
      if (!reduced.matches) { y = 28; vx = vy = 0; draw(); previousTime = performance.now(); frame = requestAnimationFrame(spring) }
    }, { signal: signal })
    function suspend() { release(true); reset() }
    window.addEventListener('blur', suspend, { signal: signal })
    document.addEventListener('visibilitychange', function () { if (document.hidden) suspend() }, { signal: signal })
    reduced.addEventListener('change', suspend, { signal: signal })
    disposers.push(function () { suspend(); controller.abort() })
    draw()
    return toy
  }

  function readingOpening(main) {
    var rows = Array.from(main.querySelectorAll('.post-row'))
    var readings = rows.map(function (row) {
      var href = row.getAttribute('href')
      var article = source(href.replace(/^#/, ''))
      var excerpt = article.querySelector('article blockquote p') || article.querySelector('article > p:not(.post-meta):not(.share-line)')
      return excerpt ? { href: href, title: row.querySelector('span').textContent, text: excerpt.textContent.trim() } : null
    }).filter(Boolean)
    if (!readings.length) return
    var opening = node('section', 'reading-opening')
    opening.setAttribute('aria-label', '从一句话开始阅读')
    var label = node('div', 'reading-opening-label')
    label.appendChild(node('span', '', '不妨，从这一句开始。'))
    label.appendChild(node('em', '', 'A page, by chance.'))
    var quote = node('blockquote')
    var destination = link('', '', 'reading-source')
    var page = node('span', 'reading-page')
    var current = 0
    function select(index) {
      current = index % readings.length
      var item = readings[current]
      quote.textContent = item.text.length > 140 ? item.text.slice(0, 140) + '…' : item.text
      destination.href = item.href
      destination.textContent = item.title + ' ↗'
      page.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(readings.length).padStart(2, '0')
    }
    var reveal = null
    var bookmark = pullBookmark(function () {
      if (readings.length < 2) return
      select((current + 1 + Math.floor(Math.random() * (readings.length - 1))) % readings.length)
      if (reveal) reveal.cancel()
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && quote.animate) {
        reveal = quote.animate([{ opacity: .25, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' })
      }
    })
    bookmark.querySelector('button').disabled = readings.length < 2
    disposers.push(function () { if (reveal) reveal.cancel() })
    quote.setAttribute('aria-live', 'polite')
    opening.append(label, quote, destination, page, bookmark)
    var first = main.querySelector('[data-year-group]')
    first.before(opening)
    select(0)
  }

  function projectDesk(main) {
    var grids = Array.from(main.querySelectorAll('.project-grid'))
    if (!grids.length) return
    var articles = Array.from(source('/posts').querySelectorAll('.post-row')).map(function (row) {
      var href = row.getAttribute('href'), article = source(href.replace(/^#/, '')).querySelector('article')
      var paragraph = article && (article.querySelector('blockquote') || article.querySelector(':scope > p:not(.post-meta):not(.share-line)'))
      return { href: href, title: row.querySelector('span').textContent.trim(),
        excerpt: paragraph ? paragraph.textContent.trim() : '',
        links: article ? Array.from(article.querySelectorAll('a[href]')).filter(function (a) { return !a.closest('.share-line, footer, .sponsor-box, .article-next') }).map(function (a) { return a.getAttribute('href') }) : [] }
    })
    var number = 0
    grids.forEach(function (grid, groupIndex) {
      var list = node('section', 'project-ledger')
      list.setAttribute('aria-label', groupIndex === 0 ? '项目与开发手记' : '更多项目')
      if (groupIndex === 0) list.classList.add('is-featured')
      Array.from(grid.querySelectorAll('.item')).forEach(function (project) {
        var name = project.querySelector('.project-name').textContent, href = project.getAttribute('href')
        var entry = node('article', 'project-record'), body = node('div', 'project-record-body')
        entry.appendChild(node('span', 'project-record-number', String(++number).padStart(2, '0')))
        var title = node('h2'), destination = project.cloneNode(false)
        destination.className = 'project-record-title'; destination.append(document.createTextNode(name), node('span', '', '↗'))
        title.appendChild(destination)
        var desc = project.querySelector('.project-desc')
        body.append(title, node('p', 'project-record-description', desc ? desc.textContent : ''))
        var actions = node('div', 'project-record-actions'), address = project.cloneNode(false)
        address.className = 'project-record-address'
        address.textContent = href.startsWith('#/') ? '打开这份记录 ↗' : href.replace(/^https?:\/\//, '').replace(/\/$/, '') + ' ↗'
        var copy = node('button', 'project-copy', '复制链接'); copy.type = 'button'; copy.setAttribute('aria-label', '复制 ' + name + ' 的链接')
        copy.setAttribute('aria-live', 'polite')
        var timer = 0
        copy.addEventListener('click', async function () {
          clearTimeout(timer)
          try { await navigator.clipboard.writeText(new URL(href, location.href).href); copy.textContent = '已复制 ✓' }
          catch (_) { copy.textContent = '请复制左侧链接' }
          timer = setTimeout(function () { copy.textContent = '复制链接' }, 2000)
        })
        disposers.push(function () { clearTimeout(timer) })
        actions.append(address, copy); body.appendChild(actions); entry.appendChild(body)
        var matches = articles.filter(function (article) { return article.excerpt && (article.href === href || article.links.includes(href)) }).slice(0, 2)
        if (matches.length && groupIndex === 0) {
          var notes = node('aside', 'project-record-notes')
          notes.appendChild(node('span', 'project-record-label', '背后的记录 / FIELD NOTES'))
          notes.appendChild(node('blockquote', '', matches[0].excerpt))
          matches.forEach(function (article) { notes.appendChild(link(article.href, article.title + ' ↗')) })
          entry.appendChild(notes)
        } else entry.classList.add('without-notes')
        list.appendChild(entry)
      })
      grid.replaceWith(list)
    })
    var categories = main.querySelector('.toc-nav')
    if (categories) { categories.classList.add('project-directory'); categories.setAttribute('aria-label', '项目分类') }
  }

  function articleTrail(article, route) {
    var rows = Array.from(source('/posts').querySelectorAll('.post-row'))
    var index = rows.findIndex(function (row) { return row.getAttribute('href') === '#' + route })
    if (index < 0 || rows.length < 2) return
    var next = rows[(index + 1) % rows.length]
    var aside = node('aside', 'article-next')
    aside.append(node('span', '', '读到这里，不妨再走一页。'), link(next.getAttribute('href'), next.querySelector('span').textContent + ' ↗'), link('#/guestbook', '或者，留一句你的想法', 'article-next-note'))
    article.appendChild(aside)
  }

  function podcastSleeves(main) {
    main.querySelectorAll(':scope > [data-lang]').forEach(function (episode) {
      episode.classList.add('podcast-sleeve')
      var disc = node('span', 'podcast-disc')
      disc.setAttribute('aria-hidden', 'true')
      episode.prepend(disc)
    })
  }

  function archiveIndex(main, route) {
    var rows = Array.from(main.querySelectorAll('.post-row'))
    if (!rows.length) return
    var groups = Array.from(main.querySelectorAll('[data-year-group]'))
    var bar = node('section', 'archive-tools')
    bar.setAttribute('aria-label', '筛选文字')
    var field = node('label', 'archive-field')
    var input = node('input'); input.type = 'search'; input.placeholder = '找一篇文字…'
    input.setAttribute('aria-label', '按标题筛选文字')
    field.append(node('span', '', '检索'), input)
    var year = node('select'); year.setAttribute('aria-label', '按年份筛选')
    var option = node('option', '', '所有年份'); option.value = ''; year.appendChild(option)
    groups.forEach(function (group) {
      var label = group.querySelector('.year-label')
      if (!label) return
      var option = node('option', '', label.textContent.trim()); option.value = option.textContent; year.appendChild(option)
    })
    var count = node('output', 'archive-count'); count.setAttribute('aria-live', 'polite')
    var reset = node('button', 'archive-reset', '清除筛选'); reset.type = 'button'
    var empty = node('p', 'archive-empty', '没有找到这篇文字，试试更短的关键词。'); empty.hidden = true
    var key = 'stacktao-index-' + route, state = {}
    try { state = JSON.parse(sessionStorage.getItem(key)) || {} } catch (_) {}
    input.value = typeof state.query === 'string' ? state.query : ''; year.value = state.year || ''
    if (year.selectedIndex < 0) year.value = ''
    function update() {
      var query = input.value.trim().toLowerCase(), total = 0
      rows.forEach(function (row) {
        var group = row.closest('[data-year-group]'), label = group && group.querySelector('.year-label')
        var matches = row.textContent.toLowerCase().includes(query) && (!year.value || (label && label.textContent.trim() === year.value))
        row.hidden = !matches; if (matches) total++
      })
      groups.forEach(function (group) { group.hidden = !group.querySelector('.post-row:not([hidden])') })
      count.textContent = total + ' / ' + rows.length + ' 篇'; reset.hidden = !query && !year.value; empty.hidden = total !== 0
      main.classList.toggle('is-filtering', !!query || !!year.value)
      try { sessionStorage.setItem(key, JSON.stringify({ query: input.value, year: year.value })) } catch (_) {}
    }
    input.addEventListener('input', update); year.addEventListener('change', update)
    reset.addEventListener('click', function () { input.value = ''; year.value = ''; update(); input.focus({preventScroll:true}) })
    bar.append(field, year, count, reset); groups[0].before(bar, empty); update()
  }

  function readingType(article, route) {
    var type = 'serif', size = 'normal'
    try { type = localStorage.getItem('stacktao-reading-type') || type; size = localStorage.getItem('stacktao-reading-size') || size } catch (_) {}
    var controls = node('div', 'reading-types')
    controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', '正文排字')
    controls.appendChild(node('span', '', '正文排字'))
    var buttons = ['serif', 'sans'].map(function (value) {
      var button = node('button', '', value === 'serif' ? '文楷' : '黑体')
      button.type = 'button'
      button.addEventListener('click', function () {
        type = value; sync()
        try { localStorage.setItem('stacktao-reading-type', type) } catch (_) {}
      })
      controls.appendChild(button)
      return button
    })
    var sizes = node('select', 'reading-size'); sizes.setAttribute('aria-label', '正文字号')
    ;[['small','小字'],['normal','标准'],['large','大字']].forEach(function (item) { var option = node('option', '', item[1]); option.value = item[0]; sizes.appendChild(option) })
    sizes.value = ['small','normal','large'].includes(size) ? size : 'normal'
    sizes.addEventListener('change', function () { article.dataset.readingSize = sizes.value; try { localStorage.setItem('stacktao-reading-size', sizes.value) } catch (_) {} })
    article.dataset.readingSize = sizes.value
    controls.appendChild(sizes)
    function sync() {
      article.dataset.readingType = type === 'sans' ? 'sans' : 'serif'
      buttons.forEach(function (button, index) { button.setAttribute('aria-pressed', String((index === 0 ? 'serif' : 'sans') === article.dataset.readingType)) })
    }
    sync()
    var meta = article.querySelector('.post-meta')
    if (meta) meta.after(controls)
    else article.querySelector('h1').after(controls)
    readingMark(article, route, controls)
    article.querySelectorAll('pre').forEach(function (pre) {
      var code = pre.querySelector('code') || pre
      var text = code.textContent, button = node('button', 'code-copy', '复制代码'), timer = 0
      button.type = 'button'; button.setAttribute('aria-label', '复制这段代码'); button.setAttribute('aria-live', 'polite')
      pre.classList.add('has-copy'); pre.appendChild(button)
      button.addEventListener('click', async function () {
        clearTimeout(timer)
        try { await navigator.clipboard.writeText(text); button.textContent = '已复制 ✓' }
        catch (_) { button.textContent = '请选择代码复制' }
        timer = setTimeout(function () { button.textContent = '复制代码' }, 2200)
      })
      disposers.push(function () { clearTimeout(timer) })
    })
  }

  function readingMark(article, route, controls) {
    var title = article.querySelector('h1').textContent
    var key = 'stacktao-reading-marks', marks = {}, sections = Array.from(article.querySelectorAll(':scope > p:not(.post-meta):not(.share-line), :scope > h2, :scope > h3, :scope > pre, :scope > ul, :scope > ol'))
    if (!sections.length) return
    try { marks = JSON.parse(localStorage.getItem(key)) || {} } catch (_) {}
    var mark = marks[route]
    function markedSection() {
      if (!mark) return null
      return (mark.excerpt && sections.find(function (section) { return section.textContent.trim().startsWith(mark.excerpt) })) || (Number.isInteger(mark.index) && sections[mark.index])
    }
    var valid = markedSection()
    var resume = node('button', 'reading-resume', '回到书签 ↗'); resume.type = 'button'; resume.hidden = !valid
    var save = node('button', 'reading-mark', '留个书签'); save.type = 'button'; save.setAttribute('aria-label', '记住当前阅读段落')
    var hint = node('span', 'reading-mark-hint'); hint.setAttribute('role', 'status')
    var rail = node('aside', 'reading-marker'); rail.setAttribute('aria-label', '阅读书签'); rail.append(save, hint)
    controls.appendChild(resume); article.parentNode.appendChild(rail)
    disposers.push(function () { rail.remove() })
    save.addEventListener('click', function () {
      var index = 0
      sections.forEach(function (section, i) { if (section.getBoundingClientRect().top <= innerHeight * .4) index = i })
      mark = { index: index, title: title, excerpt: sections[index].textContent.trim().slice(0, 80) }
      try {
        marks = JSON.parse(localStorage.getItem(key)) || {}; marks[route] = mark
        localStorage.setItem(key, JSON.stringify(marks)); resume.hidden = false; hint.textContent = '已记住这一段'; save.textContent = '更新书签'
      } catch (_) { hint.textContent = '当前浏览器无法保存书签' }
    })
    resume.addEventListener('click', function () {
      var target = markedSection(); if (!target) return
      target.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})
      target.tabIndex = -1; target.focus({preventScroll:true})
      motion(target, [{backgroundColor:'transparent'},{backgroundColor:'var(--surface-soft)'},{backgroundColor:'transparent'}], 900)
    })
    if (valid) { save.textContent = '更新书签'; resume.title = mark.excerpt || '回到上次标记的段落' }
  }

  function decorate(view, route) {
    var main = view.querySelector('main')
    var article = view.querySelector('article.article-prose')
    if (article) { articleTrail(article, route); readingType(article, route) }
    if (!main || route === '/' || route === '/guestbook') return
    main.classList.add('folio-page')
    main.dataset.folio = route.slice(1).split('/')[0]
    var labels = {
      '/posts': ['文字', 'Collected words', '把做过的事、没想通的问题，慢慢写下来。'],
      '/notes': ['随手记', 'In the margins', '还没成为文章的想法，也值得留下。'],
      '/projects': ['造物记', 'Work in progress', '一些工具，一些实验。一边使用，一边打磨。'],
      '/photos': ['沿途', 'Through the viewfinder', '暂时离开屏幕，看看别处。'],
      '/podcasts': ['声音来信', 'On the record', '节目展示示例，正式录音尚未接入。'],
      '/sponsors': ['同行的人', 'With gratitude', '谢谢你，让这些小事得以继续。'],
      '/bookmarks': ['常翻的书签', 'A small shelf', '收藏不在多，在于还会回来。'],
      '/use': ['工具与流程', 'How this site is made', '这个站点用到的工具，以及它们各自做的事。'],
      '/demos': ['小玩意', 'Loose experiments', '不必成为作品，也可以先做出来。'],
      '/streams': ['节目主题', 'A programme sketch', '节目单的交互示例，等待放入真实记录。'],
      '/media': ['书影音', 'On the shelf', '一组示例收藏，试着把书、影像和声音放在一起。'],
      '/feed': ['更新小报', 'The latest pages', '新写下的，一页接着一页。']
    }
    if (route === '/projects') { main.classList.add('studio-projects'); projectDesk(main) }
    if (route === '/photos') { main.classList.add('studio-photos'); contactSheet(main) }
    if (route === '/posts' || route === '/notes') { readingOpening(main); archiveIndex(main, route) }
    if (route === '/podcasts') podcastSleeves(main)
    var title = main.querySelector(':scope > h1, :scope > .prose > h1')
    if (labels[route] || title) {
      if (!title) title = node('h1')
      var heading = node('header', 'folio-heading')
      if (labels[route]) {
        title.textContent = labels[route][0]
        heading.append(node('p', 'folio-edition', labels[route][1]), title, node('p', 'folio-description', labels[route][2]))
      } else heading.append(node('p', 'folio-edition', 'From the journal'), title)
      main.prepend(heading)
      if (['/posts','/notes','/podcasts','/streams'].includes(route)) {
        var sections = node('nav', 'folio-sections')
        sections.setAttribute('aria-label', '记录分类')
        ;[['/posts','长文'],['/notes','随手记'],['/podcasts','播客'],['/streams','直播']].forEach(function (item) {
          if (!(window.PAGES || {})[item[0]]) return
          var entry = link('#' + item[0], item[1])
          if (item[0] === route) entry.setAttribute('aria-current', 'page')
          sections.appendChild(entry)
        })
        heading.after(sections)
      }
    }
  }
  var baseDecorate = decorate
  function decorateWithCabinet(view, route) { baseDecorate(view, route); if (window.Cabinet) window.Cabinet.decorate(view, route) }
  window.Studio = { home: home, decorate: decorateWithCabinet, destroy: destroy }
})()
