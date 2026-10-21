(function () {
  var disposers = [], motions = new Set(), motionByElement = new WeakMap()
  function motion(el, frames, duration) {
    var previous = motionByElement.get(el)
    if (previous) { previous.cancel(); motions.delete(previous) }
    if (!el.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    var animation = el.animate(frames, { duration: duration, easing: 'cubic-bezier(.2,.75,.25,1)' })
    motionByElement.set(el, animation); motions.add(animation)
    animation.onfinish = function () { motions.delete(animation) }
    return animation
  }
  function destroy() { motions.forEach(function (animation) { animation.cancel() }); motions.clear(); disposers.forEach(function (dispose) { dispose() }); disposers = [] }
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
    intro.append(node('p', 'journal-overline', 'PERSONAL JOURNAL'))
    var title = node('h1', '', '你好，我是 ')
    title.appendChild(node('span', 'journal-name', name + '。'))
    intro.append(title, node('p', 'journal-bio', config.description || '写代码，也写一些关于工具、设计和日常的观察。这个博客用来存放做过的东西，以及还在慢慢想的问题。'))
    var wandering = node('p', 'journal-wandering')
    wandering.append(document.createTextNode('大多时候在'), link('#/posts', '写字'), document.createTextNode('，偶尔'), link('#/photos', '看看别处'), document.createTextNode('。你可以随意逛逛。'))
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
    var invitation = link('#/guestbook', '留一张你的手写纸笺 ↗', 'journal-inline-link')
    invitation.tabIndex = -1
    letterText.append(invitation, node('small', '', '纸笺目前只保存在你的浏览器里。'))
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
    var shuffle = node('button', 'journal-shuffle', '随手翻翻 ')
    shuffle.type = 'button'
    var shuffleMark = node('span', '', '↝')
    shuffleMark.setAttribute('aria-hidden', 'true')
    shuffle.appendChild(shuffleMark)
    head.append(heading, shuffle)
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
    var status = node('span', 'journal-sr-only')
    status.setAttribute('role', 'status')
    shuffle.disabled = !entries.length
    shuffle.addEventListener('click', function () {
      var choices = entries.map(function (_, index) { return index }).filter(function (index) { return index !== selected })
      if (!choices.length) return
      var index = choices[Math.floor(Math.random() * choices.length)]
      unfold(index)
      entries[index].button.focus({ preventScroll: true })
      entries[index].root.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      status.textContent = '翻到了：' + posts[index].querySelector('span').textContent.trim()
    })
    writing.append(status, link('#/posts', '更早的文字 ↗', 'journal-archive'))
    main.appendChild(writing)

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
      main.appendChild(work)
    }
    var about = node('details', 'journal-about')
    about.append(node('summary', '', '再多认识我一点'), original)
    main.appendChild(about)
  }
  function photoWindow(main) {
    var photos = Array.from(source('/photos').querySelectorAll('.photo-grid img')).slice(0, 3)
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
    caption.append(controls, link('#/photos', '去相册细看 ↗', 'journal-photo-link'))
    var hint = node('p', 'photo-desk-hint', '左右拨一拨，看看下一张。')
    function select(index) {
      var focusPrint = prints.indexOf(document.activeElement) >= 0
      current = (index + photos.length) % photos.length
      prints.forEach(function (print, i) {
        var order = (i - current + photos.length) % photos.length
        print.style.zIndex = String(photos.length - order)
        print.style.transform = order === 0 ? 'translate(0px, 0px) rotate(-3deg)' : order === 1 ? 'translate(15px, -10px) rotate(6deg)' : 'translate(-14px, -19px) rotate(-8deg)'
        print.classList.toggle('is-front', order === 0)
        print.inert = order !== 0; print.tabIndex = order === 0 ? 0 : -1
        print.setAttribute('aria-hidden', String(order !== 0))
      })
      count.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(photos.length).padStart(2, '0')
      if (focusPrint) prints[current].focus({ preventScroll: true })
    }
    function finish(cancelled) {
      if (pointer === null) return
      var id = pointer, print = held
      pointer = null; held = null
      stage.classList.remove('is-dragging')
      if (print.hasPointerCapture && print.hasPointerCapture(id)) print.releasePointerCapture(id)
      suppressClick = moved || cancelled
      select(!cancelled && Math.abs(dx) >= 48 ? current + (dx < 0 ? 1 : -1) : current)
    }
    stage.addEventListener('pointerdown', function (event) {
      var print = event.target.closest('.photo-print')
      if (print !== prints[current] || pointer !== null || !event.isPrimary || event.button !== 0) return
      pointer = event.pointerId; held = print; startX = event.clientX; startY = event.clientY; dx = dy = 0; moved = false; suppressClick = false
      print.setPointerCapture(pointer)
    }, { signal: signal })
    stage.addEventListener('pointermove', function (event) {
      if (event.pointerId !== pointer) return
      dx = event.clientX - startX; dy = event.clientY - startY
      if (!moved && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { finish(true); return }
      if (Math.abs(dx) > 5) moved = true
      if (!moved) return
      stage.classList.add('is-dragging')
      var travel = Math.max(-95, Math.min(95, dx * .75))
      held.style.transform = 'translate(' + travel + 'px,' + Math.max(-12, Math.min(12, dy * .2)) + 'px) rotate(' + (-3 + travel * .09) + 'deg)'
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
    select(0)
  }

  function contactSheet(main) {
    var grid = main.querySelector('.photo-grid')
    if (!grid) return
    var active = true
    disposers.push(function () { active = false })
    var photos = Array.from(grid.querySelectorAll('img'))
    if (!photos.length) return
    grid.classList.add('contact-source')
    var toolbar = main.querySelector('.photo-toolbar')
    var room = node('section', 'contact-room')
    room.setAttribute('aria-label', '照片阅览台')
    var stage = node('div', 'contact-stage')
    stage.tabIndex = 0
    stage.setAttribute('role', 'group')
    stage.setAttribute('aria-label', '照片阅览区，可用左右方向键切换')
    var image = node('img')
    image.draggable = false
    image.style.objectFit = localStorage.getItem('yunfeng-gallery-view') || 'cover'
    var loading = node('span', 'contact-loading', '正在取出照片…')
    var zoom = node('button', 'contact-zoom', '放大 ↗')
    zoom.type = 'button'
    zoom.setAttribute('aria-label', '放大当前照片')
    stage.append(image, loading, zoom)
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
    image.addEventListener('load', function () { if (!active) return; loading.hidden = true; stage.setAttribute('aria-busy', 'false'); motion(image, [{ opacity: .2, clipPath: 'inset(0 0 8% 0)', transform: 'scale(1.025)' }, { opacity: 1, clipPath: 'inset(0)', transform: 'scale(1)' }], 520) })
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
    room.append(stage, caption, strip)
    if (toolbar) {
      toolbar.querySelectorAll('[data-gallery]').forEach(function (button) {
        button.textContent = button.dataset.gallery === 'cover' ? '铺满画框' : '完整照片'
        button.addEventListener('click', function () { image.style.objectFit = button.dataset.gallery })
      })
      room.appendChild(toolbar)
    }
    if (photos.some(function (photo) { return photo.src.includes('images.unsplash.com') })) room.appendChild(node('p', 'contact-credit', '相册含 Unsplash 示例影像'))
    grid.before(room)
    select(0, false)
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
    var grid = main.querySelector('.project-grid')
    if (!grid) return
    var projects = Array.from(grid.querySelectorAll('.item'))
    if (!projects.length) return
    var desk = node('section', 'project-desk')
    desk.setAttribute('aria-label', '项目工作笔记')
    var list = node('div', 'project-register')
    list.setAttribute('role', 'group')
    list.setAttribute('aria-label', '选择一个项目')
    var page = node('div', 'project-notebook'), selectedProject = -1
    var count = node('span', 'project-page-number')
    var title = node('h2')
    var description = node('p', 'project-note-description')
    var destination = link('', '打开项目 ↗', 'journal-inline-link')
    var related = node('div', 'project-related')
    page.append(count, title, description, destination, related)
    var articles = Array.from(source('/posts').querySelectorAll('.post-row'))
    var buttons = projects.map(function (project, index) {
      var button = node('button')
      button.type = 'button'
      button.append(node('span', 'project-register-number', String(index + 1).padStart(2, '0')), node('span', '', project.querySelector('.project-name').textContent), node('span', 'project-register-arrow', '↗'))
      button.addEventListener('click', function () { select(index) })
      list.appendChild(button)
      return button
    })
    function select(index) {
      if (index === selectedProject) return
      var direction = index > selectedProject ? 1 : -1
      if (selectedProject >= 0) motion(page, [{ opacity: .35, transform: 'perspective(900px) rotateY(' + (direction * 9) + 'deg) translateX(' + (direction * 10) + 'px)' }, { opacity: 1, transform: 'perspective(900px) rotateY(0deg) translateX(0)' }], 460)
      selectedProject = index
      var project = projects[index]
      var name = project.querySelector('.project-name').textContent
      title.textContent = name
      count.textContent = 'PROJECT NOTES / ' + String(index + 1).padStart(2, '0')
      var desc = project.querySelector('.project-desc')
      description.textContent = desc ? desc.textContent : ''
      destination.href = project.getAttribute('href')
      destination.target = project.getAttribute('target') || ''
      destination.rel = project.getAttribute('rel') || ''
      related.replaceChildren()
      var words = name.toLowerCase().split(/\s+/).filter(function (word) { return word.length >= 4 })
      var matches = articles.filter(function (article) { return words.some(function (word) { return article.querySelector('span').textContent.toLowerCase().includes(word) }) }).slice(0, 2)
      if (matches.length) {
        related.appendChild(node('h3', '', '关于它，写过这些'))
        matches.forEach(function (article) { related.appendChild(link(article.getAttribute('href'), article.querySelector('span').textContent + ' ↗')) })
      }
      buttons.forEach(function (button, i) { button.setAttribute('aria-pressed', String(i === index)) })
    }
    desk.append(list, page)
    grid.replaceWith(desk)
    select(0)
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

  function talkIndex(main) {
    var controller = new AbortController()
    disposers.push(function () { controller.abort() })
    main.querySelectorAll('.talk-block').forEach(function (block, index) {
      var sessions = Array.from(block.querySelectorAll('.talk-pres, .pres-links'))
      if (!sessions.length) return
      var details = node('details', 'talk-recordings'), body = node('div', 'talk-recordings-body'), transition = null, expanded = index === 0
      details.open = expanded
      var summary = node('summary', '', (expanded ? '收起' : '展开') + '分享记录 · ' + block.querySelectorAll('.talk-pres').length)
      var count = block.querySelectorAll('.talk-pres').length
      details.append(summary, body)
      sessions.forEach(function (session) { body.appendChild(session) })
      summary.addEventListener('click', function (event) {
        event.preventDefault()
        var start = details.getBoundingClientRect().height
        if (transition) { transition.onfinish = null; transition.cancel() }
        expanded = !expanded
        details.open = true
        summary.textContent = (expanded ? '收起' : '展开') + '分享记录 · ' + count
        var end = expanded ? summary.offsetHeight + body.offsetHeight : summary.offsetHeight
        transition = motion(details, [{ height: start + 'px' }, { height: end + 'px' }], 340)
        if (transition) transition.onfinish = function () { details.open = expanded; motions.delete(transition); transition = null }
        else details.open = expanded
      }, {signal:controller.signal})
      block.appendChild(details)
      block.prepend(node('span', 'talk-index-number', String(index + 1).padStart(2, '0')))
    })
  }

  function podcastSleeves(main) {
    main.querySelectorAll(':scope > [data-lang]').forEach(function (episode) {
      episode.classList.add('podcast-sleeve')
      var disc = node('span', 'podcast-disc')
      disc.setAttribute('aria-hidden', 'true')
      episode.prepend(disc)
    })
  }

  function decorate(view, route) {
    var main = view.querySelector('main')
    var article = view.querySelector('article.article-prose')
    if (article) articleTrail(article, route)
    if (!main || route === '/') return
    var labels = {
      '/posts': ['文字', 'WRITING / 想法的存档'], '/notes': ['随手记', 'NOTES / 过程也是答案'],
      '/projects': ['作品与实验', 'PROJECTS / 把想法变成现实'], '/talks': ['分享与对话', 'TALKS / 让想法相遇'],
      '/photos': ['视线之外', 'PHOTOGRAPHY / 留住一个瞬间'], '/podcasts': ['声音里的想法', 'ON AIR / 慢慢聊']
    }
    if (route === '/projects') { main.classList.add('studio-projects'); projectDesk(main) }
    if (route === '/photos') { main.classList.add('studio-photos'); contactSheet(main) }
    if (route === '/posts' || route === '/notes') readingOpening(main)
    if (route === '/talks') talkIndex(main)
    if (route === '/podcasts') podcastSleeves(main)
    if (labels[route]) {
      var title = main.querySelector(':scope > h1')
      if (!title) { title = node('h1'); main.prepend(title) }
      title.textContent = labels[route][0]
      main.prepend(node('p', 'studio-eyebrow', labels[route][1]), title)
    }
  }
  window.Studio = { home: home, decorate: decorate, destroy: destroy }
})()
