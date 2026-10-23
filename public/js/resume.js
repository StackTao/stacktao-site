(function () {
  var dispose = function () {}
  window.Resume = {
    destroy: function () { dispose(); dispose = function () {} },
    mount: function (view) {
      window.Resume.destroy()
      var page = view.querySelector('.resume-page')
      var button = view.querySelector('[data-resume-print]')
      if (!page || !button) return
      var controller = new AbortController(), signal = controller.signal, observer = null, savedScroll = 0
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)')
      page.querySelectorAll('.resume-case-tabs').forEach(function (tablist) {
        var tabs = Array.from(tablist.querySelectorAll('[data-case-tab]'))
        function activate(tab) {
          tabs.forEach(function (item) {
            var active = item === tab
            item.setAttribute('aria-selected', String(active))
            item.tabIndex = active ? 0 : -1
            var panel = document.getElementById(item.getAttribute('aria-controls'))
            panel.hidden = !active
            if (active && panel.animate && !(reduced && reduced.matches)) panel.animate([{ opacity: .3, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' })
          })
        }
        tabs.forEach(function (tab, i) {
          tab.addEventListener('click', function () { activate(tab) }, { signal: signal })
          tab.addEventListener('keydown', function (event) {
            var next = event.key === 'ArrowRight' ? (i + 1) % tabs.length : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
            if (next < 0) return
            event.preventDefault(); activate(tabs[next]); tabs[next].focus()
          }, { signal: signal })
        })
      })
      var toggle = page.querySelector('[data-resume-view]')
      toggle.addEventListener('click', function () {
        var paper = !page.classList.contains('is-paper-preview')
        if (paper) savedScroll = window.scrollY
        page.classList.toggle('is-paper-preview', paper)
        toggle.setAttribute('aria-pressed', String(paper))
        toggle.textContent = paper ? '返回网页版' : '纸面预览'
        window.scrollTo({ top: paper ? page.offsetTop - 16 : savedScroll, behavior: 'instant' })
      }, { signal: signal })
      function locate(element) {
        if (!element) return
        element.scrollIntoView({ behavior: reduced && reduced.matches ? 'instant' : 'smooth', block: 'start' })
        var title = element.querySelector('h2,h3')
        if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }) }
        if (element.animate && !(reduced && reduced.matches)) element.animate([{ backgroundColor: 'rgba(180,100,65,.14)' }, { backgroundColor: 'transparent' }], { duration: 1100 })
      }
      var jumps = Array.from(page.querySelectorAll('[data-resume-jump]'))
      jumps.forEach(function (jump) { jump.addEventListener('click', function () { locate(page.querySelector('[data-resume-section="' + jump.dataset.resumeJump + '"]')) }, { signal: signal }) })
      page.querySelectorAll('[data-resume-entry-target]').forEach(function (jump) {
        jump.addEventListener('click', function () { locate(page.querySelector('[data-resume-entry="' + jump.dataset.resumeEntryTarget + '"]')) }, { signal: signal })
      })
      if (window.IntersectionObserver) {
        observer = new IntersectionObserver(function (entries) {
          var visible = entries.filter(function (entry) { return entry.isIntersecting })[0]
          if (!visible) return
          jumps.forEach(function (jump) {
            if (jump.dataset.resumeJump === visible.target.dataset.resumeSection) jump.setAttribute('aria-current', 'location')
            else jump.removeAttribute('aria-current')
          })
        }, { rootMargin: '-15% 0px -55% 0px' })
        page.querySelectorAll('[data-resume-section]').forEach(function (section) { observer.observe(section) })
      }
      var copy = page.querySelector('[data-resume-copy]')
      if (copy) copy.addEventListener('click', async function () {
        var status = page.querySelector('[data-resume-copy-status]')
        try { await navigator.clipboard.writeText(copy.dataset.resumeCopy); if (copy.isConnected) status.textContent = '邮箱已复制，期待联系。' }
        catch (error) { if (copy.isConnected) status.textContent = '复制未完成，可以直接选中上方邮箱复制。' }
      }, { signal: signal })
      button.onclick = async function () {
        var status = view.querySelector('[data-resume-status]')
        button.disabled = true
        status.textContent = '正在准备字体…'
        try {
          if (document.fonts) await document.fonts.ready
          if (!button.isConnected) return
          status.textContent = '在打印窗口选择「另存为 PDF」，使用 A4、100% 缩放，并关闭页眉和页脚。'
          window.print()
        } catch (error) { status.textContent = '未能打开打印窗口，请使用浏览器菜单中的「打印」。' }
        finally { button.disabled = false }
      }
      dispose = function () { controller.abort(); if (observer) observer.disconnect(); button.onclick = null }
    }
  }
})()
