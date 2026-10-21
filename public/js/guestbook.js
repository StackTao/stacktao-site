(function () {
  var KEY = 'stacktao-paper-wall-v1'
  var inks = ['#343832', '#3f5870', '#a45743']
  var papers = ['ivory', 'sage', 'rose']
  var cleanup = function () {}
  var draft = { mode: 'draw', strokes: [], text: '', name: '', paper: 'ivory', ink: inks[0], width: 2.4 }
  var sample = { id: 'sample', mode: 'text', text: '见字如面。\n\n愿你一直有好奇心，\n也有慢下来的自由。', name: '纸笺示例', paper: 'ivory', date: '', strokes: [] }

  window.PAGES = window.PAGES || {}
  window.PAGE_TITLES = window.PAGE_TITLES || {}
  window.PAGE_TITLES['/guestbook'] = '留言墙 · StackTao'
  window.PAGES['/guestbook'] = `<main class="page guestbook-page" data-guestbook>
    <header class="gb-heading">
      <p class="gb-eyebrow">GUESTBOOK <span>／</span> 来过，留下片刻</p>
      <div class="gb-title-row"><h1>见字<span>如面。</span></h1><p>一张纸，一点墨，几句想说的话。<br>把此刻留在这里。</p></div>
      <div class="gb-heading-bottom"><button class="gb-button gb-primary" data-gb="write"><span aria-hidden="true">＋</span> 留一张纸笺</button><span class="gb-local">本机预览 · 留言仅保存在当前浏览器</span></div>
    </header>
    <section class="gb-wall-section" aria-label="留言墙">
      <div class="gb-wall-label"><span>纸笺墙 <span data-count>00</span></span><span>每一张，都值得停留。</span></div>
      <div class="gb-wall" data-wall></div>
      <p class="gb-status" role="status" aria-live="polite" data-status></p>
      <button class="gb-text-button" data-gb="undo-delete" hidden>恢复刚才的纸笺</button>
    </section>
    <dialog class="gb-dialog" data-composer aria-labelledby="gb-dialog-title">
      <div class="gb-dialog-head"><div><p class="gb-eyebrow" data-step>01 / 写下此刻</p><h2 id="gb-dialog-title">慢慢写，不必工整。</h2></div><button class="gb-close" data-gb="close" aria-label="关闭，保留未完成纸笺">×</button></div>
      <div data-editor>
        <div class="gb-tools"><div class="gb-segment" aria-label="书写方式"><button data-mode="draw" aria-pressed="true">手写</button><button data-mode="text" aria-pressed="false">打字</button></div><div class="gb-papers" aria-label="纸张颜色"><button data-paper="ivory" aria-label="米白纸" aria-pressed="true"></button><button data-paper="sage" aria-label="灰绿纸" aria-pressed="false"></button><button data-paper="rose" aria-label="浅粉纸" aria-pressed="false"></button></div></div>
        <div class="gb-writing-paper" data-paper-surface="ivory">
          <canvas width="1200" height="720" data-drawing aria-label="手写区域，可用鼠标、手指或触控笔书写；也可切换打字"></canvas>
          <div class="gb-canvas-hint" data-draw-hint>从这里落笔<span>鼠标 · 手指 · 触控笔</span></div>
          <textarea data-message maxlength="180" placeholder="写一句问候，或留一点此刻的想法。" aria-label="留言内容，最多180字" hidden></textarea>
        </div>
        <div class="gb-pen-row" data-pen-tools><div class="gb-inks" aria-label="墨色"><button data-ink="#343832" aria-label="石墨" aria-pressed="true"></button><button data-ink="#3f5870" aria-label="靛蓝" aria-pressed="false"></button><button data-ink="#a45743" aria-label="赭红" aria-pressed="false"></button></div><label class="gb-pen-size">笔触<select data-width aria-label="笔触粗细"><option value="2.4">细笔</option><option value="4.5">粗笔</option></select></label><button class="gb-text-button" data-gb="undo">撤回一笔</button><button class="gb-text-button" data-gb="clear">清空</button></div>
        <div class="gb-text-count" data-text-count hidden>0 / 180</div>
        <label class="gb-signature">落款 <input data-name maxlength="24" placeholder="留个名字，也可以匿名" autocomplete="nickname"></label>
      </div>
      <div class="gb-preview" data-preview hidden></div>
      <p class="gb-error" data-error role="alert"></p>
      <div class="gb-dialog-foot"><span data-foot-hint>这张纸会替你保留原本的笔迹。</span><button class="gb-text-button" data-gb="back" hidden>继续修改</button><button class="gb-button gb-primary" data-gb="preview">写好了，看看</button><button class="gb-button gb-primary" data-gb="publish" hidden>贴到墙上 ↗</button></div>
    </dialog>
    <dialog class="gb-dialog gb-detail" data-detail aria-label="纸笺详情"><button class="gb-close" data-gb="detail-close" aria-label="关闭纸笺">×</button><div data-detail-note></div><p class="gb-error" data-detail-error role="alert"></p><div class="gb-detail-foot"><span>把这一刻，留在纸上。</span><button class="gb-text-button" data-gb="remove">收回这张纸笺</button></div></dialog>
  </main>`

  function valid(note) {
    return note && typeof note.id === 'string' && ['text', 'draw'].indexOf(note.mode) >= 0 && papers.indexOf(note.paper) >= 0 && typeof note.text === 'string' && note.text.length <= 180 && typeof note.name === 'string' && note.name.length <= 24 && typeof note.date === 'string' && Array.isArray(note.strokes) && note.strokes.length <= 150 && note.strokes.reduce(function (n, s) { return n + (Array.isArray(s.points) ? s.points.length : 6001) }, 0) <= 6000 && note.strokes.every(function (s) {
      return inks.indexOf(s.ink) >= 0 && [2.4, 4.5].indexOf(s.width) >= 0 && Array.isArray(s.points) && s.points.length > 0 && s.points.every(function (p) { return Array.isArray(p) && p.length === 3 && p.every(function (v) { return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 }) })
    })
  }
  function load() {
    try { var data = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(data) ? data.filter(valid).slice(0, 30) : [] } catch (_) { return [] }
  }
  function svg(strokes) {
    var ns = 'http://www.w3.org/2000/svg'
    var el = document.createElementNS(ns, 'svg')
    el.setAttribute('viewBox', '0 0 600 360')
    el.setAttribute('role', 'img')
    el.setAttribute('aria-label', '原笔迹手写留言')
    strokes.forEach(function (stroke) {
      var p = stroke.points
      var path = document.createElementNS(ns, 'path')
      var d = 'M' + p[0][0] * 600 + ' ' + p[0][1] * 360
      if (p.length === 1) d += ' l0.01 0'
      for (var i = 1; i < p.length - 1; i++) d += ' Q' + p[i][0] * 600 + ' ' + p[i][1] * 360 + ' ' + (p[i][0] + p[i + 1][0]) * 300 + ' ' + (p[i][1] + p[i + 1][1]) * 180
      if (p.length > 1) d += ' L' + p[p.length - 1][0] * 600 + ' ' + p[p.length - 1][1] * 360
      path.setAttribute('d', d)
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', stroke.ink)
      path.setAttribute('stroke-width', stroke.width)
      path.setAttribute('stroke-linecap', 'round')
      path.setAttribute('stroke-linejoin', 'round')
      el.appendChild(path)
    })
    return el
  }
  function card(note, interactive) {
    var el = document.createElement(interactive ? 'button' : 'div')
    el.className = 'gb-note'
    el.dataset.paperSurface = note.paper
    if (interactive) { el.type = 'button'; el.dataset.note = note.id; el.setAttribute('aria-label', '查看' + (note.name || '一位过客') + '的纸笺') }
    var content = document.createElement('div')
    content.className = 'gb-note-content'
    if (note.mode === 'draw') content.appendChild(svg(note.strokes))
    else { var paragraph = document.createElement('p'); paragraph.textContent = note.text; content.appendChild(paragraph) }
    el.appendChild(content)
    var foot = document.createElement('div'); foot.className = 'gb-note-foot'
    var name = document.createElement('span'); name.textContent = note.name || '一位过客'
    var date = document.createElement('span'); date.textContent = note.id === 'sample' ? '示例 · 非访客留言' : note.date
    foot.append(name, date); el.appendChild(foot)
    return el
  }

  function mount(view) {
    cleanup()
    var root = view.querySelector('[data-guestbook]')
    if (!root) return
    var controller = new AbortController(), signal = controller.signal
    var $ = function (selector) { return root.querySelector(selector) }
    var wall = $('[data-wall]'), composer = $('[data-composer]'), detail = $('[data-detail]')
    var canvas = $('[data-drawing]'), ctx = canvas.getContext('2d'), activeStroke = null, pointer = null
    var notes = load(), previewNote = null, selected = null, removed = null, restoreFocus = null
    function status(message) { $('[data-status]').textContent = message }
    function error(message) { $('[data-error]').textContent = message; $('[data-detail-error]').textContent = message }
    function persist(next) {
      try { localStorage.setItem(KEY, JSON.stringify(next)); notes = next; return true }
      catch (_) { error('浏览器未能保存，请保留这张纸后重试，或收回一些旧纸笺腾出空间。'); status('保存未完成，原有纸笺没有改变。'); return false }
    }
    function renderWall(newId) {
      wall.replaceChildren()
      $('[data-count]').textContent = String(notes.length).padStart(2, '0')
      notes.forEach(function (note, index) {
        var el = card(note, true)
        el.style.setProperty('--note-angle', [-1.6, 1.1, -0.6, 1.8][index % 4] + 'deg')
        if (note.id === newId) el.classList.add('gb-just-pinned')
        wall.appendChild(el)
      })
      if (!notes.length) { var example = card(sample, true); example.classList.add('gb-example'); wall.appendChild(example) }
      var add = document.createElement('button'); add.className = 'gb-add-paper'; add.dataset.gb = 'write'
      add.innerHTML = '<span class="gb-add-mark" aria-hidden="true">＋</span><span>这里，留给你。</span><small>拿一张纸，写点什么</small>'
      wall.appendChild(add)
    }
    function redraw() {
      ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, 600, 360)
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      draft.strokes.forEach(function (s) {
        var points = s.points; ctx.strokeStyle = s.ink; ctx.lineWidth = s.width; ctx.beginPath();ctx.moveTo(points[0][0] * 600, points[0][1] * 360)
        if (points.length === 1) ctx.lineTo(points[0][0] * 600 + 0.01, points[0][1] * 360)
        for (var i = 1; i < points.length - 1; i++) ctx.quadraticCurveTo(points[i][0] * 600, points[i][1] * 360, (points[i][0] + points[i + 1][0]) * 300, (points[i][1] + points[i + 1][1]) * 180)
        if (points.length > 1) ctx.lineTo(points[points.length - 1][0] * 600, points[points.length - 1][1] * 360)
        ctx.stroke()
      })
      $('[data-draw-hint]').hidden = draft.mode !== 'draw' || draft.strokes.length > 0
      $('[data-gb="undo"]').disabled = !draft.strokes.length
      $('[data-gb="clear"]').disabled = !draft.strokes.length
    }
    function syncEditor() {
      root.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === draft.mode) })
      root.querySelectorAll('[data-paper]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.paper === draft.paper) })
      root.querySelectorAll('[data-ink]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.ink === draft.ink) })
      $('.gb-writing-paper').dataset.paperSurface = draft.paper
      canvas.hidden = draft.mode !== 'draw'; $('[data-message]').hidden = draft.mode !== 'text'
      $('[data-pen-tools]').hidden = draft.mode !== 'draw'; $('[data-text-count]').hidden = draft.mode !== 'text'
      $('[data-message]').value = draft.text; $('[data-name]').value = draft.name; $('[data-width]').value = String(draft.width)
      $('[data-text-count]').textContent = draft.text.length + ' / 180'
      redraw()
    }
    function showEditor() {
      $('[data-editor]').hidden = false; $('[data-preview]').hidden = true
      $('[data-gb="preview"]').hidden = false; $('[data-gb="publish"]').hidden = true; $('[data-gb="back"]').hidden = true
      $('[data-step]').textContent = '01 / 写下此刻'; $('#gb-dialog-title').textContent = '慢慢写，不必工整。'
      $('[data-foot-hint]').textContent = '这张纸会替你保留原本的笔迹。'; error(''); syncEditor()
    }
    function openComposer(trigger) {
      if (notes.length >= 30) { status('这面墙已保存 30 张纸笺，收回一张后再来写吧。'); return }
      restoreFocus = trigger; showEditor(); composer.showModal(); document.body.classList.add('gb-dialog-open')
      ;(draft.mode === 'text' ? $('[data-message]') : $('[data-mode="draw"]')).focus()
    }
    function makeNote() {
      return { id: crypto.randomUUID(), mode: draft.mode, strokes: draft.mode === 'draw' ? JSON.parse(JSON.stringify(draft.strokes)) : [], text: draft.mode === 'text' ? draft.text.trim() : '', name: draft.name.trim(), paper: draft.paper, date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) }
    }
    function point(e) { var r = canvas.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)), e.pressure || 0.5].map(function (n) { return Math.round(n * 10000) / 10000 }) }
    function stop() { activeStroke = null; pointer = null }
    canvas.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary || e.button !== 0 || draft.mode !== 'draw' || pointer !== null) return
      if (draft.strokes.length >= 150 || draft.strokes.reduce(function (n,s) { return n+s.points.length },0) >= 6000) { error('纸上笔迹已经很多了，撤回一些笔画，或先把这张贴上墙。'); return }
      e.preventDefault();error('');pointer=e.pointerId;canvas.setPointerCapture(pointer)
      activeStroke={ ink:draft.ink, width:draft.width, points:[point(e)] };draft.strokes.push(activeStroke);redraw()
    }, {signal:signal})
    canvas.addEventListener('pointermove', function (e) {
      if (pointer !== e.pointerId || !activeStroke) return
      var p=point(e),last=activeStroke.points[activeStroke.points.length-1]
      if (Math.hypot((p[0]-last[0])*600,(p[1]-last[1])*360)<1.4) return
      if (draft.strokes.reduce(function(n,s){return n+s.points.length},0)>=6000) {stop();error('已达到这张纸的笔迹上限，可以预览后贴到墙上。');return}
      activeStroke.points.push(p);redraw()
    }, {signal:signal})
    ;['pointerup','pointercancel','lostpointercapture'].forEach(function (event) {canvas.addEventListener(event,stop,{signal:signal})})
    $('[data-message]').addEventListener('input',function(e){draft.text=e.target.value; $('[data-text-count]').textContent=draft.text.length+' / 180';error('')},{signal:signal})
    $('[data-name]').addEventListener('input',function(e){draft.name=e.target.value},{signal:signal})
    $('[data-width]').addEventListener('change',function(e){draft.width=Number(e.target.value)},{signal:signal})
    root.addEventListener('click', function (e) {
      var button=e.target.closest('button');if(!button)return
      if (button.dataset.mode) {draft.mode=button.dataset.mode;syncEditor();return}
      if (button.dataset.paper) {draft.paper=button.dataset.paper;syncEditor();return}
      if (button.dataset.ink) {draft.ink=button.dataset.ink;syncEditor();return}
      if (button.dataset.note) {
        selected=button.dataset.note==='sample'?sample:notes.find(function(n){return n.id===button.dataset.note});if(!selected)return
        restoreFocus=button;error('');$('[data-detail-note]').replaceChildren(card(selected,false));$('[data-gb="remove"]').hidden=selected.id==='sample';detail.showModal();document.body.classList.add('gb-dialog-open');return
      }
      switch(button.dataset.gb) {
        case 'write': openComposer(button);break
        case 'close': composer.close();break
        case 'detail-close':detail.close();break
        case 'undo':draft.strokes.pop();redraw();error('');break
        case 'clear':draft.strokes=[];redraw();error('');break
        case 'back':showEditor();$('[data-mode="'+draft.mode+'"]').focus();break
        case 'preview':
          if(draft.mode==='draw'?!draft.strokes.length:!draft.text.trim()){error('先在纸上留下一点内容。');return}
          previewNote=makeNote();$('[data-preview]').replaceChildren(card(previewNote,false));$('[data-preview]').hidden=false;$('[data-editor]').hidden=true
          $('[data-gb="preview"]').hidden=true;$('[data-gb="publish"]').hidden=false;$('[data-gb="back"]').hidden=false
          $('[data-step]').textContent='02 / 贴之前，看一眼';$('#gb-dialog-title').textContent='这一刻，准备留下了。';$('[data-foot-hint]').textContent='会保存在当前浏览器，其他访客暂不可见。';error('');$('[data-gb="publish"]').focus();break
        case 'publish':
          if(!previewNote || !persist([previewNote].concat(notes)))return
          var newId=previewNote.id;previewNote=null;draft={mode:'draw',strokes:[],text:'',name:draft.name,paper:draft.paper,ink:draft.ink,width:draft.width};restoreFocus=null;composer.close();renderWall(newId);status('已贴到墙上。刷新页面，这张纸也会在。')
          var pinned=wall.querySelector('[data-note]');if(pinned){pinned.focus({preventScroll:true});pinned.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}break
        case 'remove':
          if(!selected || selected.id==='sample')return
          var next=notes.filter(function(n){return n.id!==selected.id});if(!persist(next))return;removed=selected;restoreFocus=null;detail.close();renderWall();status('纸笺已收回。');$('[data-gb="undo-delete"]').hidden=false;$('[data-gb="undo-delete"]').focus();break
        case 'undo-delete':
          if(removed && notes.length<30 && persist([removed].concat(notes))){renderWall(removed.id);removed=null;button.hidden=true;status('纸笺已恢复。');$('[data-gb="write"]').focus()}break
      }
    }, {signal:signal})
    ;[composer,detail].forEach(function(dialog){dialog.addEventListener('close',function(){stop();document.body.classList.remove('gb-dialog-open');if(restoreFocus&&restoreFocus.isConnected)restoreFocus.focus()},{signal:signal})})
    renderWall()
    cleanup=function(){controller.abort();if(composer.open)composer.close();if(detail.open)detail.close();document.body.classList.remove('gb-dialog-open')}
  }
  window.Guestbook={mount:mount,destroy:function(){cleanup();cleanup=function(){}}}
})()
