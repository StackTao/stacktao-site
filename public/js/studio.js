(function () {
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
  function decorate(view, route) {
    var main = view.querySelector('main')
    if (!main || route === '/') return
    var labels = {
      '/posts': ['文字', 'WRITING / 想法的存档'], '/notes': ['随手记', 'NOTES / 过程也是答案'],
      '/projects': ['作品与实验', 'PROJECTS / 把想法变成现实'], '/talks': ['分享与对话', 'TALKS / 让想法相遇'],
      '/photos': ['视线之外', 'PHOTOGRAPHY / 留住一个瞬间'], '/podcasts': ['声音里的想法', 'ON AIR / 慢慢聊']
    }
    if (route === '/projects') main.classList.add('studio-projects')
    if (route === '/photos') main.classList.add('studio-photos')
    if (labels[route]) {
      var title = main.querySelector(':scope > h1')
      if (!title) { title = node('h1'); main.prepend(title) }
      title.textContent = labels[route][0]
      main.prepend(node('p', 'studio-eyebrow', labels[route][1]), title)
    }
  }
  window.Studio = { home: home, decorate: decorate }
})()
