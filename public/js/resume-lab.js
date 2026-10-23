(function () {
  window.ResumeLab = {
    mount: function (root, signal) {
      var lab = root.querySelector('.resume-lab')
      if (!lab) return
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)')
      var cancelStroke = function () {}
      var tabs = Array.from(lab.querySelectorAll('[data-lab-tab]'))
      function select(tab) {
        cancelStroke()
        tabs.forEach(function (item) {
          var selected = item === tab, panel = root.querySelector('#' + item.getAttribute('aria-controls'))
          item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1; panel.hidden = !selected
          if (selected && panel.animate && !(reduced && reduced.matches)) panel.animate([{opacity:.4},{opacity:1}],{duration:150})
        })
      }
      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { select(tab) }, {signal:signal})
        tab.addEventListener('keydown', function (event) {
          var next = event.key === 'ArrowRight' ? (i+1)%tabs.length : event.key === 'ArrowLeft' ? (i+tabs.length-1)%tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : -1
          if (next < 0) return
          event.preventDefault(); select(tabs[next]); tabs[next].focus()
        }, {signal:signal})
      })
      var json = lab.querySelector('#resume-json'), jsonStatus = lab.querySelector('[data-json-status]')
      if (json) {
        json.addEventListener('input', function () { json.removeAttribute('aria-invalid'); jsonStatus.textContent = '内容已修改，点击格式化或压缩检查。' }, {signal:signal})
        lab.querySelectorAll('[data-json-action]').forEach(function (button) {
          button.addEventListener('click', async function () {
            if (json.value.length > 6000) { jsonStatus.textContent = '体验区最多处理 6000 个字符。'; return }
            var parsed
            try { parsed = JSON.parse(json.value); json.removeAttribute('aria-invalid') }
            catch (error) { json.setAttribute('aria-invalid','true'); jsonStatus.textContent = 'JSON 格式有误，请检查引号、逗号与括号；原内容已保留。'; return }
            var pending = [[parsed, 0]], tooDeep = false
            while (pending.length) {
              var pair = pending.pop()
              if (pair[1] > 32) { tooDeep = true; break }
              if (pair[0] && typeof pair[0] === 'object') Object.values(pair[0]).forEach(function(value){pending.push([value,pair[1]+1])})
            }
            if (tooDeep) { jsonStatus.textContent = '体验区最多处理 32 层嵌套，原内容已保留。'; return }
            if (button.dataset.jsonAction === 'copy') {
              try { await navigator.clipboard.writeText(json.value); if (!signal.aborted) jsonStatus.textContent = '已复制，可以粘贴到你的请求工作台。' }
              catch (error) { if (!signal.aborted) jsonStatus.textContent = '复制未完成，可以选中文本手动复制。' }
            } else {
              var formatted = JSON.stringify(parsed, null, button.dataset.jsonAction === 'format' ? 2 : 0)
              if (formatted.length > 6000) { jsonStatus.textContent = '整理后超过 6000 字符，原内容已保留。'; return }
              json.value = formatted
              jsonStatus.textContent = button.dataset.jsonAction === 'format' ? '校验通过，已按两空格缩进。' : '校验通过，已移除多余空白。'
            }
          }, {signal:signal})
        })
      }
      var search = lab.querySelector('#resume-guide-search')
      if (search) {
        var entries = Array.from(lab.querySelectorAll('[data-guide-entry]')), searchStatus = lab.querySelector('[data-guide-status]')
        function filter() {
          var terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean), count = 0
          entries.forEach(function (entry, i) {
            var match = terms.length ? terms.every(function (term) { return entry.dataset.guideKeywords.includes(term) }) : i < 3
            entry.hidden = !match; if (match) count++
          })
          searchStatus.textContent = terms.length ? count ? '找到 ' + count + ' 篇相关章节' : '这 8 篇中没有匹配项，试试 MCP、Hooks 或代码审查。' : '先看看这 3 篇，也可以搜索全部 8 篇。'
        }
        search.addEventListener('input', filter, {signal:signal})
        lab.querySelectorAll('[data-guide-query]').forEach(function (button) { button.addEventListener('click', function () { search.value = button.dataset.guideQuery; filter(); search.focus() }, {signal:signal}) })
        filter()
      }
      var canvas = lab.querySelector('.rl-canvas')
      if (!canvas) return
      var ctx = canvas.getContext('2d'), status = lab.querySelector('[data-wall-status]'), ink = '#3f5870'
      var strokes = [], active = null, pointer = null, rect = null, points = 0
      var undo = lab.querySelector('[data-lab-wall="undo"]'), clear = lab.querySelector('[data-lab-wall="clear"]')
      if (!ctx || !window.WallTools?.paintStroke) { status.textContent = '当前浏览器无法打开试写画布，可以进入完整留言墙。'; lab.querySelectorAll('[data-lab-wall]').forEach(function(b){b.disabled=true}); return }
      ctx.scale(2,2)
      function paint(stroke) { window.WallTools.paintStroke(ctx, stroke, 400, 220) }
      function update() { undo.disabled = clear.disabled = strokes.length === 0; status.textContent = strokes.length ? '已画 ' + strokes.length + ' 笔 · 仅在这里试写，不会发布。' : '试写区 · 不会发布到公共留言墙。' }
      function redraw() { ctx.clearRect(0,0,400,220); strokes.forEach(paint); update() }
      function release() { var id = pointer; pointer = null; active = null; if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id) }
      cancelStroke = function () { if (!active) return; points -= active.points.length; strokes.pop(); release(); redraw() }
      function point(event) { return [Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)), Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))] }
      function append(event) {
        if (!active || points >= 1800) return
        var p = point(event), last = active.points[active.points.length-1]
        if (Math.hypot((p[0]-last[0])*400,(p[1]-last[1])*220) < .7) return
        active.points.push(p); points++; paint({ink:active.ink,width:active.width,points:[last,p]})
      }
      canvas.addEventListener('pointerdown', function (event) {
        if (pointer !== null || event.button !== 0 || event.isPrimary === false) return
        if (strokes.length >= 30 || points >= 1800) { status.textContent = '试写区已满，撤回或清空后可以继续。'; return }
        event.preventDefault(); rect = canvas.getBoundingClientRect(); pointer = event.pointerId
        active = {ink:ink,width:6,points:[point(event)]}; strokes.push(active); points++; paint(active); canvas.setPointerCapture(pointer)
      }, {signal:signal})
      canvas.addEventListener('pointermove', function (event) { if (event.pointerId !== pointer) return; var batch = event.getCoalescedEvents ? event.getCoalescedEvents() : []; (batch.length ? batch : [event]).forEach(append) }, {signal:signal})
      canvas.addEventListener('pointerup', function (event) { if (event.pointerId !== pointer) return; append(event); release(); update() }, {signal:signal})
      canvas.addEventListener('pointercancel', function(event){if(event.pointerId===pointer)cancelStroke()}, {signal:signal})
      canvas.addEventListener('lostpointercapture', function(event){if(event.pointerId===pointer)cancelStroke()}, {signal:signal})
      lab.querySelectorAll('[data-lab-ink]').forEach(function (button) { button.addEventListener('click', function () { ink = button.dataset.labInk; lab.querySelectorAll('[data-lab-ink]').forEach(function(b){b.setAttribute('aria-pressed',String(b===button))}) }, {signal:signal}) })
      lab.querySelectorAll('[data-lab-wall]').forEach(function (button) { button.addEventListener('click', function () {
        cancelStroke()
        if (button.dataset.labWall === 'clear') { strokes = []; points = 0 }
        else if (button.dataset.labWall === 'undo') { var removed = strokes.pop(); if (removed) points -= removed.points.length }
        else {
          if (strokes.length >= 30 || points + 11 > 1800) { status.textContent = '试写区已满，撤回或清空后可以继续。'; return }
          var star=[];for(var i=0;i<=10;i++){var angle=-Math.PI/2+i*Math.PI/5,r=i%2?26:62;star.push([.5+Math.cos(angle)*r/400,.5+Math.sin(angle)*r/220])}
          strokes.push({ink:ink,width:6,points:star}); points+=star.length
        }
        redraw()
      }, {signal:signal}) })
      root.querySelector('[data-resume-view]').addEventListener('click',cancelStroke,{signal:signal})
      window.addEventListener('resize',cancelStroke,{signal:signal})
      document.addEventListener('visibilitychange',function(){if(document.hidden)cancelStroke()},{signal:signal})
      signal.addEventListener('abort',cancelStroke,{once:true})
    }
  }
})()
