(function () {
  var dispose = function () {}
  window.Resume = {
    destroy: function () { dispose(); dispose = function () {} },
    mount: function (view) {
      window.Resume.destroy()
      var page = view.querySelector('.resume-page')
      var button = view.querySelector('[data-resume-print]')
      if (!page || !button) return
      var controller = new AbortController(), signal = controller.signal, frame = 0, observer = null, savedScroll = 0
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)')
      var stage = page.querySelector('[data-craft-stage]'), range = page.querySelector('#resume-craft-range'), output = page.querySelector('[data-craft-output]')
      function stop() { if (frame) cancelAnimationFrame(frame); frame = 0 }
      function paint(value) {
        value = Math.max(0, Math.min(100, Number(value)))
        var index = Math.min(3, Math.floor(value / 26)), labels = ['线框', '结构', '细节', '成品']
        range.value = value
        stage.style.setProperty('--craft', value / 100)
        stage.style.setProperty('--craft-percent', value + '%')
        range.style.setProperty('--range-progress', value + '%')
        range.setAttribute('aria-valuetext', labels[index])
        output.textContent = '0' + (index + 1) + ' / ' + labels[index]
      }
      if (range) {
        paint(range.value)
        range.addEventListener('input', function () { stop(); paint(range.value) }, { signal: signal })
        ;['pointerdown', 'keydown'].forEach(function (event) { range.addEventListener(event, stop, { signal: signal }) })
        page.querySelector('[data-craft-replay]').addEventListener('click', function () {
          stop()
          if (reduced && reduced.matches) { paint(100); return }
          paint(0)
          var started = performance.now()
          function tick(time) {
            var progress = Math.min(1, (time - started) / 1600)
            paint(Math.round((1 - Math.pow(1 - progress, 3)) * 100))
            frame = progress < 1 ? requestAnimationFrame(tick) : 0
          }
          frame = requestAnimationFrame(tick)
        }, { signal: signal })
        document.addEventListener('visibilitychange', function () { if (document.hidden) stop() }, { signal: signal })
        if (reduced && reduced.addEventListener) reduced.addEventListener('change', function () { if (reduced.matches) stop() }, { signal: signal })
      }
      var toggle = page.querySelector('[data-resume-view]')
      toggle.addEventListener('click', function () {
        var paper = !page.classList.contains('is-paper-preview')
        if (paper) savedScroll = window.scrollY
        stop()
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
        stop()
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
      dispose = function () { stop(); controller.abort(); if (observer) observer.disconnect(); button.onclick = null }
    }
  }
})()
