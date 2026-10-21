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
  function sectionTitle(label, href, action) {
    var head = node('div', 'studio-section-head')
    head.append(node('h2', '', label), link(href, action + ' ↗', 'studio-text-link'))
    return head
  }
  function home(main) {
    var original = node('div', 'studio-original')
    while (main.firstChild) original.appendChild(main.firstChild)
    var oldTitle = original.querySelector('h1')
    if (oldTitle) { var aboutTitle = node('h2', '', oldTitle.textContent); oldTitle.replaceWith(aboutTitle) }
    main.className = 'page studio-home'
    var config = (window.CONTENT_CONFIG || {}).site || {}
    var name = config.name || 'StackTao'
    var posts = Array.from(source('/posts').querySelectorAll('.post-row')).slice(0, 4)
    var projects = Array.from(source('/projects').querySelectorAll('.project-grid .item')).slice(0, 3)
    var hero = node('section', 'studio-hero')
    var intro = node('div', 'studio-intro')
    intro.append(node('p', 'studio-eyebrow', name + ' / PERSONAL STUDIO'))
    var title = node('h1')
    title.append(document.createTextNode('把想法，'), node('br'), node('span', '', '做成日常。'))
    intro.append(title, node('p', 'studio-description', config.description || '关于代码、设计，以及生活里值得留下的细节。在这里，记录想法，也把它们慢慢做出来。'))
    var actions = node('div', 'studio-actions')
    actions.append(link('#/projects', '探索作品 ↗', 'studio-button'), link('#/posts', '读一篇文章', 'studio-text-link'))
    intro.append(actions)

    var desk = node('div', 'studio-desk')
    desk.setAttribute('aria-label', '探索工作室')
    var stack = node('div', 'studio-stack')
    var labels = ['做东西', '写下来', '留句话']
    var routes = ['#/projects', posts[0] ? posts[0].getAttribute('href') : '#/posts', '#/guestbook']
    var panels = []
    for (var i = 0; i < 3; i++) {
      var panel = node('section', 'studio-sheet studio-sheet-' + i)
      panel.id = 'studio-panel-' + i
      panel.setAttribute('role', 'tabpanel')
      panel.setAttribute('aria-labelledby', 'studio-tab-' + i)
      panel.append(node('div', 'studio-sheet-label', ['01 / BUILD', '02 / WRITE', '03 / CONNECT'][i]))
      if (i === 0) {
        var object = node('div', 'studio-object', '{ }')
        object.setAttribute('aria-hidden', 'true')
        panel.append(object, node('h2', '', '从一个问题开始。'), node('p', '', projects[0] ? projects[0].querySelector('.project-name').textContent : '工具、实验，以及持续的打磨。'))
      } else if (i === 1) {
        panel.append(node('div', 'studio-print-mark', 'Aa'), node('h2', '', posts[0] ? posts[0].querySelector('span').textContent : '让想法有迹可循。'), node('p', '', '一些观察，一些尚在生长的答案。'))
      } else {
        var ink = node('div', 'studio-handwriting', '你好，\n很高兴遇见你。')
        panel.append(ink, node('h2', '', '留一点你的笔迹。'), node('p', '', '一张纸笺，存下此刻。'))
      }
      panel.append(link(routes[i], ['查看作品', '打开文章', '去留言墙'][i] + ' ↗', 'studio-sheet-link'))
      stack.appendChild(panel)
      panels.push(panel)
    }
    var tabs = node('div', 'studio-switch')
    tabs.setAttribute('role', 'tablist')
    tabs.setAttribute('aria-label', '切换工作室卡片')
    var buttons = labels.map(function (label, index) {
      var button = node('button', '', label)
      button.type = 'button'
      button.id = 'studio-tab-' + index
      button.setAttribute('role', 'tab')
      button.setAttribute('aria-controls', 'studio-panel-' + index)
      tabs.appendChild(button)
      return button
    })
    function select(index, focus) {
      buttons.forEach(function (button, i) {
        button.setAttribute('aria-selected', String(i === index))
        button.tabIndex = i === index ? 0 : -1
        panels[i].classList.toggle('is-selected', i === index)
        panels[i].setAttribute('aria-hidden', String(i !== index))
        panels[i].inert = i !== index
        panels[i].style.setProperty('--sheet-order', (i - index + 3) % 3)
      })
      if (focus) buttons[index].focus()
    }
    buttons.forEach(function (button, index) {
      button.addEventListener('click', function () { select(index, false) })
      button.addEventListener('keydown', function (event) {
        var next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null
        if (next !== null) { event.preventDefault(); select(next, true) }
      })
    })
    select(0, false)
    desk.append(stack, tabs, node('p', 'studio-desk-caption', '三个入口，同一个好奇心。'))
    hero.append(intro, desk)
    main.appendChild(hero)

    if (projects.length) {
      var work = node('section', 'studio-work')
      work.appendChild(sectionTitle('正在打磨', '#/projects', '全部项目'))
      var grid = node('div', 'studio-work-grid')
      projects.forEach(function (project, index) {
        var card = project.cloneNode(true)
        card.className = 'studio-work-card'
        var art = node('div', 'studio-work-art studio-work-art-' + index)
        art.setAttribute('aria-hidden', 'true')
        var mark = node('div', 'studio-work-symbol', ['⌘', '↗', '✳'][index])
        art.append(mark, node('span', 'studio-work-number', '0' + (index + 1)))
        card.prepend(art)
        var icon = card.querySelector('.project-icon')
        if (icon) icon.remove()
        card.appendChild(node('span', 'studio-card-arrow', '↗'))
        grid.appendChild(card)
      })
      work.appendChild(grid)
      main.appendChild(work)
    }
    var journal = node('section', 'studio-journal')
    var journalIntro = node('div', 'studio-journal-intro')
    journalIntro.append(node('p', 'studio-eyebrow', 'FIELD NOTES'), node('h2', '', '边做，边想。'), node('p', '', '把过程写下来，\n让下一次走得更远。'), link('#/posts', '所有文章 ↗', 'studio-text-link'))
    var rows = node('div', 'studio-recent')
    posts.forEach(function (post) { rows.appendChild(post.cloneNode(true)) })
    journal.append(journalIntro, rows)
    main.appendChild(journal)
    var invite = link('#/guestbook', '', 'studio-invitation')
    var mini = node('span', 'studio-mini-note', '见字\n如面。')
    mini.setAttribute('aria-hidden', 'true')
    var inviteText = node('span')
    inviteText.append(node('small', '', 'A LITTLE HUMAN TOUCH'), node('strong', '', '来过，就留下一笔。'), node('span', '', '去留言墙，写一张自己的纸笺。'))
    invite.append(mini, inviteText, node('span', 'studio-invite-arrow', '↗'))
    main.appendChild(invite)
    var about = node('details', 'studio-about')
    about.append(node('summary', '', '更多关于 ' + name), original)
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
