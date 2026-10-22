(function () {
  var KEY = 'stacktao-paper-wall-v1'
  var WALL_SIZE = 24
  var markWidths = { small:190, medium:260, large:320 }
  var inks = ['#343832', '#3f5870', '#a45743', '#e9edcf', '#d7f557', '#6286ee', '#f47760']
  var papers = ['ivory', 'sage', 'rose']
  var cleanup = function () {}
  var draft = { mode: 'draw', strokes: [], text: '', name: '', paper: 'ivory', ink: '#3f5870', width: 4.5, medium: 'ink', size:'medium', sticker:'spark' }
  var sample = { id: 'sample', mode: 'text', text: '山海有归期，\n风雨有相逢。', name: '墙上的题字', paper: 'ivory', medium: 'engraving', date: '', strokes: [] }

  window.PAGES = window.PAGES || {}
  window.PAGE_TITLES = window.PAGE_TITLES || {}
  window.PAGE_TITLES['/guestbook'] = '留言墙 · StackTao'
  window.PAGES['/guestbook'] = `<main class="page guestbook-page" data-guestbook>
    <div class="gb-wall-header"><a class="gb-exit" href="#/" aria-label="返回博客">← <span>返回博客</span></a><h1>过客<span>THE VISITOR WALL</span></h1><span class="gb-local-label">本机留言 · <span data-count>0</span> 处</span></div>
    <nav class="gb-wall-dock" aria-label="留言墙工具"><button data-gb="previous-wall" aria-label="上一面墙">←</button><label class="gb-wall-picker" title="每面容纳24处留言，写满自动延伸到下一面"><span>墙面</span><select data-wall-select aria-label="选择墙面"></select></label><button data-gb="next-wall" aria-label="下一面墙">→</button><span class="gb-dock-divider" aria-hidden="true"></span><button data-wall-tool="ink" aria-pressed="false"><span aria-hidden="true"><svg viewBox="0 0 36 36" focusable="false"><path d="m10 27 3-8L25 7l5 5-12 12Z" fill="#e3c492" stroke="#24382e"/><path d="m13 19 5 5m5-15 5 5" stroke="#385f7a" stroke-width="3"/><path d="m10 27 5-2-3-3Z" fill="#303a32"/></svg></span>涂鸦</button><button data-wall-tool="engraving" aria-pressed="false"><span aria-hidden="true"><svg viewBox="0 0 36 36" focusable="false"><path d="m8 29 4-9 7 7Z" fill="#bdc9c6" stroke="#f1f1dc"/><path d="m13 20 9-13q2-3 5 0l3 3q2 2-1 4L20 26Z" fill="#b58a5f" stroke="#24382e"/><path d="m17 18 6 5" stroke="#f0d2a3"/></svg></span>刻画</button><button data-wall-tool="paper" aria-pressed="false"><span aria-hidden="true"><svg viewBox="0 0 36 36" focusable="false"><path d="M9 7h18v23H9Z" fill="#f6f0df" stroke="#dad7bf"/><path d="M22 7v6h5" fill="#ddd5bf"/><path d="M13 18h9m-9 5h6" stroke="#858b73"/><path d="M13 5h9v5h-9Z" fill="#adb596" opacity=".8"/></svg></span>纸条</button><button data-wall-tool="sticker" aria-pressed="false"><span aria-hidden="true"><svg viewBox="0 0 36 36" focusable="false"><path d="M18 5c7-7 13 2 7 7 10-1 11 10 2 11 5 8-4 13-9 6-4 8-14 2-10-5-10 0-10-11-1-12-6-5 3-13 8-6Z" fill="#e3ad76" stroke="#f6f0df" stroke-width="2"/><circle cx="18" cy="18" r="5" fill="#e7eccf"/></svg></span>贴纸</button></nav>
    <section class="gb-wall-section" aria-label="一面可以留下痕迹的墙">
      <span class="journal-sr-only" id="gb-move-help">点空白墙面写留言。纸条可拖动；键盘空格拿起、方向键移动、Enter放下、Escape取消；刻痕固定在墙上。</span>
      <div class="gb-wall" data-wall></div><div class="gb-live-stage" data-live-stage hidden></div><div class="gb-placement-hint" data-placement-hint hidden><span>点一处空白，开始落笔</span><button data-gb="place-here">就在可用空白处写</button><button data-gb="cancel-place" aria-label="取消选择位置">×</button></div>
      <p class="gb-status" role="status" aria-live="polite" data-status></p>
      <button class="gb-text-button gb-undo-wall" data-gb="undo-delete" hidden>恢复刚才的痕迹</button>
    </section>
    <dialog class="gb-dialog" data-composer aria-labelledby="gb-dialog-title">
      <div class="gb-dialog-head"><div><p class="gb-eyebrow" data-step>01 / 写下此刻</p><h2 id="gb-dialog-title">慢慢写，不必工整。</h2></div><button class="gb-close" data-gb="close" aria-label="关闭，保留未完成纸笺">×</button></div>
      <div data-editor>
        <div class="gb-materials" aria-label="留下痕迹的方式"><button data-medium="engraving" aria-pressed="true">刻画<small>凹槽与刮痕</small></button><button data-medium="ink" aria-pressed="false">涂鸦<small>让笔迹自由一点</small></button><button data-medium="paper" aria-pressed="false">纸条<small>一句话，一张纸</small></button><button data-medium="sticker" aria-pressed="false">贴纸<small>贴上一点自己的颜色</small></button></div>
        <div class="gb-sticker-picker" data-stickers hidden aria-label="选择贴纸"></div>
        <label class="gb-mark-size">占墙大小 <select data-size aria-label="占墙大小"><option value="small">小一点</option><option value="medium" selected>适中</option><option value="large">大一点</option></select><span>留下空间，也留给下一个人。</span></label>
        <div class="gb-tools"><div class="gb-segment" aria-label="书写方式"><button data-mode="draw" aria-pressed="true">手写</button><button data-mode="text" aria-pressed="false">打字</button></div><div class="gb-papers" aria-label="纸张颜色"><button data-paper="ivory" aria-label="米白纸" aria-pressed="true"></button><button data-paper="sage" aria-label="灰绿纸" aria-pressed="false"></button><button data-paper="rose" aria-label="浅粉纸" aria-pressed="false"></button></div></div>
        <div class="gb-writing-paper" data-paper-surface="ivory">
          <canvas width="1200" height="720" data-drawing aria-label="手写区域，可用鼠标、手指或触控笔书写；也可切换打字"></canvas>
          <div class="gb-canvas-hint" data-draw-hint>从这里落笔<span>鼠标 · 手指 · 触控笔</span></div>
          <textarea data-message maxlength="180" placeholder="写一句问候，或留一点此刻的想法。" aria-label="留言内容，最多180字" hidden></textarea>
        </div>
        <div class="gb-pen-row" data-pen-tools><div class="gb-inks" aria-label="墨色"><button data-ink="#343832" aria-label="石墨" aria-pressed="true"></button><button data-ink="#3f5870" aria-label="靛蓝" aria-pressed="false"></button><button data-ink="#a45743" aria-label="赭红" aria-pressed="false"></button><button data-ink="#e9edcf" aria-label="粉白" aria-pressed="false"></button><button data-ink="#d7f557" aria-label="荧光黄绿" aria-pressed="false"></button><button data-ink="#6286ee" aria-label="钴蓝" aria-pressed="false"></button><button data-ink="#f47760" aria-label="珊瑚橘" aria-pressed="false"></button></div><label class="gb-pen-size">笔触<select data-width aria-label="笔触粗细"><option value="2.4">细笔</option><option value="4.5">粗笔</option><option value="12">宽喷头</option></select></label><button class="gb-text-button" data-gb="undo">撤回一笔</button><button class="gb-text-button" data-gb="clear">清空</button></div>
        <div class="gb-text-count" data-text-count hidden>0 / 180</div>
        <label class="gb-signature">落款 <input data-name maxlength="24" placeholder="留个名字，也可以匿名" autocomplete="nickname"></label>
      </div>
      <p class="gb-error" data-error role="alert"></p>
      <div class="gb-dialog-foot"><span data-foot-hint>这张纸会替你保留原本的笔迹。</span><button class="gb-text-button" data-gb="reposition">换个位置</button><button class="gb-button gb-primary" data-gb="publish" hidden>贴到墙上 ↗</button></div>
    </dialog>
    <dialog class="gb-dialog gb-detail" data-detail aria-label="纸笺详情"><button class="gb-close" data-gb="detail-close" aria-label="关闭纸笺">×</button><div data-detail-note></div><p class="gb-error" data-detail-error role="alert"></p><div class="gb-detail-foot"><button class="gb-text-button" data-arrange aria-pressed="false">移动这张纸</button><span>痕迹只保存在本机。</span><button class="gb-text-button" data-gb="remove">擦去这处痕迹</button></div></dialog>
  </main>`

  function valid(note) {
    return note && (note.section == null || (Number.isInteger(note.section) && note.section >= 0 && note.section < 1000000)) && (note.size == null || Object.prototype.hasOwnProperty.call(markWidths, note.size)) && (note.medium !== 'sticker' || Object.prototype.hasOwnProperty.call(stickerNames, note.sticker)) && (note.medium == null || ['paper','engraving','ink','sticker'].includes(note.medium)) && (note.anchor == null || (['wide','narrow'].includes(note.anchor.mode) && Number.isFinite(note.anchor.x) && note.anchor.x >= 0 && note.anchor.x <= 1 && Number.isFinite(note.anchor.y) && note.anchor.y >= 0 && note.anchor.y <= 1200000)) && typeof note.id === 'string' && ['text', 'draw'].indexOf(note.mode) >= 0 && papers.indexOf(note.paper) >= 0 && typeof note.text === 'string' && note.text.length <= 180 && typeof note.name === 'string' && note.name.length <= 24 && typeof note.date === 'string' && Array.isArray(note.strokes) && note.strokes.length <= 150 && note.strokes.reduce(function (n, s) { return n + (Array.isArray(s.points) ? s.points.length : 6001) }, 0) <= 6000 && note.strokes.every(function (s) {
      return inks.indexOf(s.ink) >= 0 && [2.4, 4.5, 12].indexOf(s.width) >= 0 && Array.isArray(s.points) && s.points.length > 0 && s.points.every(function (p) { return Array.isArray(p) && p.length === 3 && p.every(function (v) { return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 }) })
    })
  }
  function load() {
    try { var data = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(data) ? data.filter(valid) : [] } catch (_) { return [] }
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
  var carvingSerial = 0
  function carvedArt(note) {
    var ns = 'http://www.w3.org/2000/svg', art = note.mode === 'draw' ? svg(note.strokes) : document.createElementNS(ns, 'svg')
    art.classList.add('gb-carved-art')
    art.setAttribute('role', 'img'); art.setAttribute('aria-label', note.mode === 'draw' ? '刻入墙面的手写笔迹' : note.text)
    var group = document.createElementNS(ns, 'g')
    if (note.mode === 'draw') {
      while (art.firstChild) group.appendChild(art.firstChild)
      group.querySelectorAll('path').forEach(function (path) { path.setAttribute('stroke-width',String(Math.max(8,Number(path.getAttribute('stroke-width'))))); path.setAttribute('stroke-linejoin','bevel') })
    }
    else {
      var lines = [], line = '', units = 0
      Array.from(note.text).forEach(function (char) {
        var size = char.charCodeAt(0) > 255 ? 1 : .56
        if (char === '\n' || units + size > 11) { lines.push(line); line = ''; units = 0 }
        if (char !== '\n') { line += char; units += size }
      })
      if (line || !lines.length) lines.push(line)
      var longest = Math.max.apply(null,lines.map(function (line) { return Array.from(line).reduce(function (n,char) { return n + (char.charCodeAt(0)>255 ? 1 : .56) },0) }).concat([1]))
      var fontSize = Math.min(62, 532 / longest, 300 / (lines.length * 1.35)), lineHeight = fontSize * 1.35
      art.setAttribute('viewBox', '0 0 600 360')
      lines.forEach(function (value, index) {
        var text = document.createElementNS(ns, 'text')
        text.setAttribute('x', '28'); text.setAttribute('y', String(30 + fontSize + index * lineHeight))
        text.setAttribute('font-size', String(fontSize)); text.setAttribute('fill', '#8b887f'); text.setAttribute('class', 'gb-carved-glyph')
        text.textContent = value; group.appendChild(text)
      })
    }
    var id = 'gb-cut-' + (++carvingSerial), seed = Array.from(note.id).reduce(function (n,c) { return (n * 31 + c.charCodeAt(0)) % 997 }, 7)
    var defs = document.createElementNS(ns, 'defs')
    // All relief is clipped inside the cut: shadow on the upper lip, muted light below.
    defs.innerHTML = '<filter id="' + id + '" filterUnits="userSpaceOnUse" x="-10" y="-10" width="620" height="380" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency=".12 .19" numOctaves="2" seed="' + seed + '" result="grain"/>' +
      '<feDisplacementMap in="SourceAlpha" in2="grain" scale="1.15" xChannelSelector="R" yChannelSelector="G" result="cut"/>' +
      '<feOffset in="cut" dx="1.5" dy="2.1" result="down"/><feComposite in="cut" in2="down" operator="out" result="innerShade"/>' +
      '<feGaussianBlur in="innerShade" stdDeviation=".65"/><feComposite in2="cut" operator="in" result="softShade"/>' +
      '<feOffset in="cut" dx="-.6" dy="-.9" result="up"/><feComposite in="cut" in2="up" operator="out" result="innerLight"/>' +
      '<feFlood flood-color="#999583"/><feComposite in2="cut" operator="in" result="floor"/>' +
      '<feFlood flood-color="#37392e" flood-opacity=".88"/><feComposite in2="innerShade" operator="in" result="lip"/>' +
      '<feFlood flood-color="#444638" flood-opacity=".65"/><feComposite in2="softShade" operator="in" result="shade"/>' +
      '<feFlood flood-color="#ddd8c4" flood-opacity=".45"/><feComposite in2="innerLight" operator="in" result="light"/>' +
      '<feMerge><feMergeNode in="floor"/><feMergeNode in="shade"/><feMergeNode in="lip"/><feMergeNode in="light"/></feMerge></filter>'
    group.setAttribute('filter', 'url(#' + id + ')'); art.append(defs, group)
    return art
  }
  var stickerNames = { spark:'闪光', bloom:'野花', orbit:'轨道' }
  function stickerArt(kind) {
    var ns = 'http://www.w3.org/2000/svg', art = document.createElementNS(ns, 'svg')
    art.setAttribute('viewBox', '0 0 160 160'); art.setAttribute('role', 'img'); art.setAttribute('aria-label', stickerNames[kind] + '贴纸')
    var drawings = {
      spark:'<path d="M78 8 94 53 141 31 113 77 151 99 103 105 108 151 77 117 37 147 46 102 9 83 51 66 35 20 69 47Z" fill="#dfff51" stroke="#f5f4e9" stroke-width="9" stroke-linejoin="round"/><path d="m70 73 3 9m20-11 3 9m-28 17q17 13 31-3" fill="none" stroke="#30372d" stroke-width="5" stroke-linecap="round"/>',
      bloom:'<path d="M62 54C24 12 7 65 44 79 1 94 38 138 65 108 63 154 121 142 105 107 146 137 163 82 121 76 159 46 111 15 91 53 95 8 41 14 62 54Z" fill="#fa744f" stroke="#f5f4e9" stroke-width="9" stroke-linejoin="round"/><circle cx="82" cy="81" r="24" fill="#e5ed58"/><path d="m72 75 1 6m17-6 1 6m-20 10q12 8 22-1" fill="none" stroke="#30372d" stroke-width="4" stroke-linecap="round"/>',
      orbit:'<circle cx="80" cy="80" r="49" fill="#5d78e8" stroke="#f5f4e9" stroke-width="8"/><ellipse cx="80" cy="80" rx="72" ry="23" transform="rotate(-28 80 80)" fill="none" stroke="#e7f16e" stroke-width="9"/><path d="m73 63 2 7m22-10 2 7m-26 18q15 9 26-6" fill="none" stroke="#f5f4e9" stroke-width="4" stroke-linecap="round"/>'
    }
    art.innerHTML = drawings[kind] || drawings.spark
    return art
  }
  function traceSeed(note) { return Array.from(note.id).reduce(function (n,c) { return (n*31+c.charCodeAt(0))%997 },7) }
  function card(note, interactive) {
    var el = document.createElement(interactive ? 'button' : 'div')
    el.className = 'gb-note'
    var markSeed = traceSeed(note)
    el.dataset.fastener = markSeed%3 === 0 ? 'pin' : 'tape'
    el.style.setProperty('--note-angle',((markSeed%101)/100 * (note.medium === 'paper' ? 12 : 8) - (note.medium === 'paper' ? 6 : 4)).toFixed(2)+'deg')
    el.dataset.paperSurface = note.paper
    el.dataset.medium = note.medium || 'paper'
    el.dataset.markSize = note.size || 'medium'
    el.style.setProperty('--mark-size', (note.medium === 'sticker' ? {small:100,medium:148,large:200}[note.size || 'medium'] : markWidths[note.size || 'medium']) + 'px')
    if (note.layout !== 2 && note.id !== 'sample') {
      el.style.setProperty('--mark-size', (parseFloat(el.style.getPropertyValue('--mark-size')) * [.72,.82,.9,.86,.76][markSeed%5]) + 'px')
    }
    if (!['paper','sticker'].includes(el.dataset.medium)) el.classList.add('gb-wall-mark')
    if (interactive) { el.type = 'button'; el.dataset.note = note.id; el.setAttribute('aria-label', '查看' + (note.name || '一位过客') + '留下的痕迹') }
    var content = document.createElement('div')
    content.className = 'gb-note-content'
    if (note.medium === 'sticker') content.appendChild(stickerArt(note.sticker))
    else if (note.medium === 'engraving') content.appendChild(carvedArt(note))
    else if (note.mode === 'draw') content.appendChild(svg(note.strokes))
    else { var paragraph = document.createElement('p'); paragraph.textContent = note.text; content.appendChild(paragraph) }
    el.appendChild(content)
    var foot = document.createElement('div'); foot.className = 'gb-note-foot'
    var name = document.createElement('span'); name.textContent = note.name || '一位过客'
    var date = document.createElement('span'); date.textContent = note.id === 'sample' ? '墙上题字 · 非访客留言' : note.date
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
    var writing = $('.gb-writing-paper'), writingHome = writing.parentElement, stage = $('[data-live-stage]'), choosing = false, closingForMove = false, browseScroll = 0
    var liveCarving = document.createElement('div'); liveCarving.className = 'gb-live-carving'; writing.appendChild(liveCarving)
    function choosePlace(medium) {
      if (!composer.open && !choosing) browseScroll = window.scrollY
      if (composer.open) { closingForMove = true; composer.close() }
      draft.medium = medium; choosing = true; root.classList.add('is-choosing'); $('[data-placement-hint]').hidden = false
      root.querySelectorAll('[data-wall-tool]').forEach(function (b) { b.setAttribute('aria-pressed',String(b.dataset.wallTool === medium)) })
      $('[data-placement-hint] > span').textContent = medium === 'sticker' ? '点一处空白，把贴纸放在这里' : '点一处空白，' + (medium === 'engraving' ? '刻下这一刻' : '开始落笔')
      $('[data-gb="place-here"]').focus({preventScroll:true})
    }
    function cancelPlace() { choosing = false; root.classList.remove('is-choosing'); $('[data-placement-hint]').hidden = true; root.querySelectorAll('[data-wall-tool]').forEach(function (b) { b.setAttribute('aria-pressed','false') }) }
    function positionStage() {
      var width = Math.min(draft.medium === 'sticker' ? {small:100,medium:148,large:200}[draft.size] : markWidths[draft.size], Math.max(160,wall.clientWidth-32))
      stage.style.width = width + 'px'; stage.style.left = (wall.offsetLeft + 16 + (writeAnchor ? writeAnchor.x : .5) * Math.max(0,wall.clientWidth-width-32)) + 'px'; stage.style.top = (wall.offsetTop + (writeAnchor ? writeAnchor.y : 32)) + 'px'
      if (draft.medium === 'sticker') { stage.replaceChildren(card({id:'draft-sticker',medium:'sticker',sticker:draft.sticker,size:draft.size,paper:draft.paper,name:'',date:'',text:'',strokes:[]},false)) }
      else if (writing.parentElement !== stage) stage.replaceChildren(writing)
      stage.dataset.medium = draft.medium
    }
    var notes = load(), previewNote = null, selected = null, removed = null, restoreFocus = null, writeAnchor = null, statusTimer = 0
    // Stable wall membership: newer messages never push older ones to another wall.
    notes.slice().reverse().forEach(function (note, index) { if (note.section == null) note.section = Math.floor(index / WALL_SIZE) })
    var currentWall = Math.max.apply(null, notes.map(function (note) { return note.section }).concat([0]))
    var wallPreference = KEY + '-current-wall'
    try { var remembered = Number(localStorage.getItem(wallPreference)); if (localStorage.getItem(wallPreference) !== null && notes.some(function (note) { return note.section === remembered })) currentWall = remembered } catch (_) {}
    function wallIds() { return Array.from(new Set(notes.map(function (note) { return note.section }).concat([currentWall]))).sort(function (a,b) { return a-b }) }
    function wallNotes() { return notes.filter(function (note) { return note.section === currentWall }) }
    function changeWall(section) {
      currentWall = section; writeAnchor = null; renderWall()
      try { localStorage.setItem(wallPreference, String(currentWall)) } catch (_) {}
      window.scrollTo({top:0,behavior:'auto'})
      status('第 ' + String(currentWall + 1).padStart(2,'0') + ' 面墙 · ' + wallNotes().length + ' 处痕迹')
    }
    $('[data-wall-select]').addEventListener('change',function (e) { changeWall(Number(e.target.value)) },{signal:signal})
    function status(message) { clearTimeout(statusTimer); $('[data-status]').textContent = message; $('[data-status]').classList.add('is-visible'); statusTimer = setTimeout(function () { $('[data-status]').classList.remove('is-visible') }, 4500) }
    function error(message) { $('[data-error]').textContent = message; $('[data-detail-error]').textContent = message }
    function persist(next) {
      try { localStorage.setItem(KEY, JSON.stringify(next)); notes = next; return true }
      catch (_) { error('浏览器空间不足或无法保存。草稿仍在，请不要关闭页面；原有留言没有改变。'); status('保存未完成，草稿和原有留言都还在。'); return false }
    }
    var layoutKey = KEY + '-positions-organic-v1', layouts = { wide: {}, narrow: {} }, layoutMode = '', drag = null, suppressNoteClick = false
    var arrange = $('[data-arrange]'), touchArrange = false, wallObserver = null, visibilityObserver = null
    try {
      var saved = JSON.parse(localStorage.getItem(layoutKey) || '{}')
      ;['wide', 'narrow'].forEach(function (mode) {
        Object.entries(saved[mode] || {}).forEach(function (entry) {
          var p = entry[1]
          if (p && Number.isFinite(p.x) && p.x >= 0 && p.x <= 1 && Number.isFinite(p.y) && p.y >= 0 && p.y <= 1200000 && Number.isFinite(p.z) && p.z >= 0 && p.z < 1e9) Object.defineProperty(layouts[mode], entry[0], { value:p, writable:true, enumerable:true, configurable:true })
        })
      })
    } catch (_) {}
    function positionOf(el) {
      if (Object.prototype.hasOwnProperty.call(layouts[layoutMode], el.dataset.note)) return layouts[layoutMode][el.dataset.note]
      var note = notes.find(function (n) { return n.id === el.dataset.note })
      return note && note.layout === 2 && note.anchor && note.anchor.mode === layoutMode ? { x:note.anchor.x, y:note.anchor.y, z:notes.length + 1 } : null
    }
    function paintPaper(el, x, y) { el.style.left = x + 'px'; el.style.top = y + 'px' }
    function spotAvailable(x,y,width,height,medium,occupied) {
      return occupied.every(function (other) {
        var ox = Math.min(x+width,other.x+other.width)-Math.max(x,other.x)
        var oy = Math.min(y+height,other.y+other.height)-Math.max(y,other.y)
        if (ox < -8 || oy < -8) return true
        var physical = ['paper','sticker'].includes(medium) && ['paper','sticker'].includes(other.medium)
        return physical && ox > 0 && oy > 0 && ((ox <= 12 && oy <= 60) || (oy <= 12 && ox <= 60))
      })
    }
    // Sample the wall continuously, never snap to rows or columns. Only blank paper edges may overlap.
    function findWallSpot(ownWidth, height, medium, seed, occupied) {
      var span = Math.max(0, wall.clientWidth-ownWidth-32), state = seed+1
      function random() { state = (state*1664525+1013904223) >>> 0; return state/4294967296 }
      function available(x,y) { return spotAvailable(x,y,ownWidth,height,medium,occupied) }
      var bottom = Math.max.apply(null,occupied.map(function (o) { return o.y+o.height }).concat([24]))
      var best = { x:16+random()*span, y:bottom+24+random()*28 }, score = best.y+40
      for (var i=0; i<240; i++) {
        var x = 16+random()*span, y = 24+seed%59+random()*(bottom+height*.4)
        var rank = y+random()*42
        if (rank < score && available(x,y)) { best={x:x,y:y}; score=rank }
      }
      // A few physical notes meet at their corners; their written area stays clear.
      if (span > 100 && ['paper','sticker'].includes(medium)) {
        occupied.forEach(function (other) {
          if (!['paper','sticker'].includes(other.medium)) return
          var x = seed%2 ? other.x+other.width-38 : other.x-ownWidth+38, y = other.y+other.height-10
          if (x >= 16 && x <= 16+span && y <= best.y+72 && available(x,y)) best={x:x,y:y}
        })
      }
      return { x:span ? (best.x-16)/span : .5, y:best.y }
    }
    function wallLayout() {
      finishPaper(true)
      var width = wall.clientWidth, paperWidth = Math.min(280, Math.max(180, width - 32))
      layoutMode = width < 600 ? 'narrow' : 'wide'
      wall.style.setProperty('--wall-paper-width', paperWidth + 'px')
      var cards = Array.from(wall.querySelectorAll('[data-note]')), bottom = 0
      cards.forEach(function (el) { el.style.width = Math.min(parseFloat(el.style.getPropertyValue('--mark-size')), Math.max(160, width - 32)) + 'px' })
      var occupied = cards.map(function (el) { var p = positionOf(el); return p ? { x:16 + p.x * Math.max(0,width - parseFloat(el.style.width) - 32), y:p.y, width:parseFloat(el.style.width), height:el.offsetHeight || 240, medium:el.dataset.medium } : null }).filter(Boolean)
      cards.forEach(function (el,index) {
        var p = positionOf(el), height = el.offsetHeight || 240, ownWidth = parseFloat(el.style.width), maxX = Math.max(0, width - ownWidth - 32)
        if (!p) {
          var spot = findWallSpot(ownWidth,height,el.dataset.medium,traceSeed({id:el.dataset.note}),occupied)
          p = { x:spot.x, y:el.dataset.note === 'sample' ? 180 : spot.y, z:index + 1 }
          occupied.push({x:16 + p.x * maxX,y:p.y,width:ownWidth,height:height,medium:el.dataset.medium})
        }
        Object.defineProperty(layouts[layoutMode], el.dataset.note, { value:p, writable:true, enumerable:true, configurable:true })
        paintPaper(el, 16 + p.x * maxX, p.y); el.style.zIndex = String(p.z)
        bottom = Math.max(bottom, p.y + height)
      })
      wall.style.height = Math.max((window.innerHeight || 720) - 100, bottom + 160) + 'px'
      try { localStorage.setItem(layoutKey,JSON.stringify(layouts)) } catch (_) {}
      if (composer.open) positionStage()
    }
    function startPaper(el, pointerId, x, y) {
      if (drag) return
      var p = positionOf(el)
      drag = { el:el, pointer:pointerId, startX:x, startY:y, x:parseFloat(el.style.left), y:p.y, originX:parseFloat(el.style.left), originY:p.y, active:pointerId === null }
      if (drag.active) liftPaper()
    }
    function liftPaper() {
      drag.active = true
      drag.el.classList.add('is-lifted'); drag.el.classList.remove('gb-just-pinned')
      drag.el.style.zIndex = '1000000000'; drag.el.setAttribute('aria-pressed', 'true')
    }
    function movePaper(x, y) {
      var maxX = Math.max(16, wall.clientWidth - drag.el.offsetWidth - 16), maxY = Math.max(16, wall.clientHeight - drag.el.offsetHeight - 24)
      drag.x = Math.max(16, Math.min(maxX, x)); drag.y = Math.max(16, Math.min(maxY, y))
      paintPaper(drag.el, drag.x, drag.y)
      drag.el.style.setProperty('--carry-angle', Math.max(-3, Math.min(3, (drag.x - drag.originX) * .025)) + 'deg')
    }
    function finishPaper(cancelled) {
      if (!drag) return
      var held = drag; drag = null
      var el = held.el, p = positionOf(el)
      if (held.active && !cancelled) {
        var next = { wide:{}, narrow:{} }, ids = notes.map(function (n) { return n.id }).concat(['sample'], removed ? [removed.id] : [])
        ;['wide', 'narrow'].forEach(function (mode) { ids.forEach(function (id) { if (Object.prototype.hasOwnProperty.call(layouts[mode], id)) Object.defineProperty(next[mode], id, { value:layouts[mode][id], writable:true, enumerable:true, configurable:true }) }) })
        var maxX = Math.max(0, wall.clientWidth - el.offsetWidth - 32)
        var top = Math.max.apply(null, Object.values(next[layoutMode]).map(function (p) { return p.z }).concat([0]))
        var placed = { x:maxX ? (held.x - 16) / maxX : .5, y:held.y, z:top + 1 }
        Object.defineProperty(next[layoutMode], el.dataset.note, { value:placed, writable:true, enumerable:true, configurable:true })
        try { localStorage.setItem(layoutKey, JSON.stringify(next)); layouts = next; p = placed; status('贴好了，位置已保存在这个浏览器。') }
        catch (_) { cancelled = true; status('位置未能保存，纸笺已放回原处。留言内容没有改变。') }
      }
      suppressNoteClick = held.active
      el.classList.remove('is-lifted'); el.style.removeProperty('--carry-angle'); el.setAttribute('aria-pressed', 'false'); el.style.zIndex = String(p.z)
      if (cancelled) paintPaper(el, held.originX, held.originY)
      if (held.pointer !== null && el.hasPointerCapture(held.pointer)) el.releasePointerCapture(held.pointer)
      if (held.active && touchArrange) { touchArrange = false; wall.classList.remove('is-arranging'); arrange.setAttribute('aria-pressed', 'false') }
    }
    wall.addEventListener('pointerdown', function (e) {
      var el = e.target.closest('[data-note]')
      if (!drag && e.isPrimary) suppressNoteClick = false
      if (choosing || composer.open || !el || !['paper','sticker'].includes(el.dataset.medium) || drag || !e.isPrimary || e.button !== 0 || (e.pointerType === 'touch' && !touchArrange)) return
      startPaper(el, e.pointerId, e.clientX, e.clientY)
      el.setPointerCapture(e.pointerId)
    }, {signal:signal})
    wall.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.pointer) return
      var x = e.clientX - drag.startX, y = e.clientY - drag.startY
      if (!drag.active && Math.hypot(x, y) < 6) return
      if (!drag.active) liftPaper()
      movePaper(drag.originX + x, drag.originY + y)
    }, {signal:signal})
    ;['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (type) {
      wall.addEventListener(type, function (e) { if (drag && e.pointerId === drag.pointer) finishPaper(type !== 'pointerup') }, {signal:signal})
    })
    wall.addEventListener('click', function (e) {
      if (suppressNoteClick && e.detail !== 0) { e.stopImmediatePropagation(); e.preventDefault(); suppressNoteClick = false }
    }, {signal:signal})
    wall.addEventListener('dragstart', function (e) { e.preventDefault() }, {signal:signal})
    wall.addEventListener('keydown', function (e) {
      var el = e.target.closest('[data-note]'); if (!el || !['paper','sticker'].includes(el.dataset.medium)) return
      if (e.key === 'Escape') { finishPaper(true); return }
      if (e.key === ' ' || (e.key === 'Enter' && drag)) {
        e.preventDefault()
        if (drag) finishPaper(false); else startPaper(el, null, 0, 0)
        return
      }
      if (!drag || drag.el !== el || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return
      e.preventDefault(); var step = e.shiftKey ? 30 : 10
      movePaper(drag.x + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0), drag.y + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0))
    }, {signal:signal})
    wall.addEventListener('keyup', function (e) { if (e.key === ' ' && e.target.closest('[data-note]')) e.preventDefault() }, {signal:signal})
    wall.addEventListener('focusout', function (e) { if (drag && drag.el === e.target) finishPaper(true) }, {signal:signal})
    arrange.addEventListener('click', function () {
      finishPaper(true); touchArrange = !touchArrange
      wall.classList.toggle('is-arranging', touchArrange); arrange.setAttribute('aria-pressed', String(touchArrange))
      if (detail.open) detail.close()
      if (touchArrange) status('拖动纸条，放在你喜欢的位置。')
    }, {signal:signal})
    window.addEventListener('blur', function () { finishPaper(true) }, {signal:signal})
    document.addEventListener('visibilitychange', function () { if (document.hidden) finishPaper(true) }, {signal:signal})
    function renderWall(newId) {
      finishPaper(true); suppressNoteClick = false; wall.replaceChildren()
      var ids = wallIds(), picker = $('[data-wall-select]'); picker.replaceChildren()
      ids.forEach(function (id) { var option = document.createElement('option'); option.value = String(id); option.textContent = String(id + 1).padStart(2,'0') + ' / ' + String(ids[ids.length-1] + 1).padStart(2,'0'); picker.appendChild(option) })
      picker.value = String(currentWall)
      $('[data-gb="previous-wall"]').disabled = ids.indexOf(currentWall) === 0
      $('[data-gb="next-wall"]').disabled = ids.indexOf(currentWall) === ids.length - 1
      $('[data-count]').textContent = notes.length.toLocaleString('zh-CN')
      wall.setAttribute('aria-label','第 ' + (currentWall + 1) + ' 面墙，' + wallNotes().length + ' 处留言')
      if (!notes.length) {
        var invitation = document.createElement('div'); invitation.className = 'gb-wall-invitation'
        invitation.innerHTML = '<span>一面墙，等一个路过的人。</span><small>写一句话，画一个念头。这里不必工整。</small>'
        wall.appendChild(invitation)
      }
      ;(notes.length ? wallNotes().sort(function (a,b) { var physical = function (n) { return !n.medium || ['paper','sticker'].includes(n.medium) }; return Number(physical(b))-Number(physical(a)) || traceSeed(a)-traceSeed(b) }) : [sample]).forEach(function (note) {
        var el = card(note, true)
        el.setAttribute('aria-describedby', 'gb-move-help'); if (el.dataset.medium === 'paper') el.setAttribute('aria-pressed', 'false')
        if (note.id === newId) el.classList.add('gb-just-pinned')
        wall.appendChild(el)
      })
      wallLayout()
      if (visibilityObserver) { visibilityObserver.disconnect(); wall.querySelectorAll('[data-note]').forEach(function (el) { visibilityObserver.observe(el) }) }
    }
    if (window.IntersectionObserver) visibilityObserver = new IntersectionObserver(function (entries) { entries.forEach(function (entry) { entry.target.classList.toggle('is-distant', !entry.isIntersecting) }) }, {rootMargin:'800px'})
    if (window.ResizeObserver) {
      var lastWidth = 0
      wallObserver = new ResizeObserver(function () { if (wall.clientWidth !== lastWidth) { lastWidth = wall.clientWidth; wallLayout() } })
      wallObserver.observe(wall)
    } else window.addEventListener('resize', wallLayout, {signal:signal})
    wall.addEventListener('click', function (e) {
      if (e.target !== wall || suppressNoteClick || composer.open) return
      if (!choosing) choosePlace(draft.medium)
      var rect = wall.getBoundingClientRect(), width = Math.min(markWidths[draft.size], Math.max(160, wall.clientWidth - 32)), span = Math.max(0, wall.clientWidth - width - 32)
      writeAnchor = { mode:layoutMode, x:span ? Math.max(0, Math.min(1, (e.clientX - rect.left - width / 2 - 16) / span)) : .5, y:Math.max(16, Math.min(1200000, e.clientY - rect.top - 80)) }
      openComposer($('[data-wall-tool="'+draft.medium+'"]'))
    }, {signal:signal})
    function redraw() {
      ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, 600, 360)
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      draft.strokes.forEach(function (s) {
        var points = s.points; ctx.strokeStyle = draft.medium === 'engraving' ? '#817969' : s.ink; ctx.lineWidth = s.width; ctx.beginPath();ctx.moveTo(points[0][0] * 600, points[0][1] * 360)
        if (points.length === 1) ctx.lineTo(points[0][0] * 600 + 0.01, points[0][1] * 360)
        for (var i = 1; i < points.length - 1; i++) ctx.quadraticCurveTo(points[i][0] * 600, points[i][1] * 360, (points[i][0] + points[i + 1][0]) * 300, (points[i][1] + points[i + 1][1]) * 180)
        if (points.length > 1) ctx.lineTo(points[points.length - 1][0] * 600, points[points.length - 1][1] * 360)
        ctx.stroke()
      })
      liveCarving.replaceChildren(); liveCarving.hidden = draft.medium !== 'engraving'
      canvas.style.opacity = draft.medium === 'engraving' ? '0' : '1'
      if (draft.medium === 'engraving' && (draft.mode === 'draw' ? draft.strokes.length : draft.text.trim())) liveCarving.appendChild(carvedArt({id:'live-carving',mode:draft.mode,strokes:draft.strokes,text:draft.text}))
      writing.classList.toggle('is-carving-text',draft.medium === 'engraving' && draft.mode === 'text' && !!draft.text.trim())
      $('[data-draw-hint]').hidden = draft.mode !== 'draw' || draft.strokes.length > 0
      $('[data-gb="undo"]').disabled = !draft.strokes.length
      $('[data-gb="clear"]').disabled = !draft.strokes.length
    }
    function syncEditor() {
      root.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === draft.mode) })
      root.querySelectorAll('[data-paper]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.paper === draft.paper) })
      root.querySelectorAll('[data-ink]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.ink === draft.ink) })
      var isSticker = draft.medium === 'sticker'
      $('.gb-tools').hidden = isSticker; $('.gb-writing-paper').hidden = isSticker; $('[data-stickers]').hidden = !isSticker
      $('[data-size]').value = draft.size || 'medium'
      root.querySelectorAll('[data-sticker]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.sticker === draft.sticker)) })
      $('.gb-writing-paper').dataset.paperSurface = draft.paper
      $('.gb-writing-paper').dataset.medium = draft.medium || 'paper'
      root.querySelectorAll('.gb-materials [data-medium]').forEach(function (b) { if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', b.dataset.medium === draft.medium) })
      $('.gb-papers').hidden = draft.medium !== 'paper'
      $('[data-pen-tools]').classList.toggle('is-engraving', draft.medium === 'engraving')
      canvas.hidden = draft.mode !== 'draw'; $('[data-message]').hidden = draft.mode !== 'text'
      $('[data-pen-tools]').hidden = isSticker || draft.mode !== 'draw'; $('[data-text-count]').hidden = isSticker || draft.mode !== 'text'
      $('[data-message]').value = draft.text; $('[data-name]').value = draft.name; $('[data-width]').value = String(draft.width)
      $('[data-text-count]').textContent = draft.text.length + ' / 180'
      redraw(); if (composer.open) positionStage()
    }
    function showEditor() {
      $('[data-gb="publish"]').hidden = false
      $('[data-step]').textContent = '直接留在墙上'; $('#gb-dialog-title').textContent = {ink:'拿起笔，随意画。',engraving:'一笔一划，刻下来。',paper:'写好，就贴在这里。',sticker:'挑一枚，贴在这里。'}[draft.medium]
      $('[data-gb="publish"]').textContent = ['paper','sticker'].includes(draft.medium) ? '贴在这里' : '留下这一笔'
      $('[data-foot-hint]').textContent = '本机保存 · 每面24处，写满自动延伸。'; error(''); syncEditor()
    }
    function openComposer(trigger) {
      cancelPlace(); restoreFocus = trigger; previewNote = null
      var probe = makeNote(), relocated = reserveLocalSpot(probe); writeAnchor = probe.anchor
      if (relocated) status('这里放不下完整笔迹，已选好附近的空白处。')
      showEditor(); composer.show(); root.classList.add('is-writing'); stage.hidden = false; positionStage()
      wall.style.height = Math.max(parseFloat(wall.style.height),writeAnchor.y+stage.offsetHeight+window.innerHeight*.65)+'px'
      var bounds = stage.getBoundingClientRect()
      composer.style.left = window.innerWidth>900 && bounds.left>window.innerWidth/2 ? '24px' : ''
      composer.style.right = composer.style.left ? 'auto' : ''
      window.scrollTo({top:Math.max(0,window.scrollY+bounds.top-Math.min(180,window.innerHeight*.2)),behavior:'auto'})
      ;(draft.mode === 'text' ? $('[data-message]') : $('[data-mode="draw"]')).focus({preventScroll:true})
    }
    function makeNote() {
      return { id: crypto.randomUUID(), layout:2, medium:draft.medium || 'paper', size:draft.size || 'medium', sticker:draft.sticker || 'spark', anchor:writeAnchor, mode: draft.medium === 'sticker' ? 'text' : draft.mode, strokes: draft.medium !== 'sticker' && draft.mode === 'draw' ? JSON.parse(JSON.stringify(draft.strokes)) : [], text: draft.medium !== 'sticker' && draft.mode === 'text' ? draft.text.trim() : '', name: draft.name.trim(), paper: draft.paper, date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) }
    }
    function reserveLocalSpot(note) {
      var width = Math.min(note.medium === 'sticker' ? {small:100,medium:148,large:200}[note.size || 'medium'] : markWidths[note.size || 'medium'], Math.max(160,wall.clientWidth - 32))
      var probe = card(note,false); probe.style.width = width + 'px'; probe.style.visibility = 'hidden'; wall.appendChild(probe)
      var height = probe.offsetHeight || width * .6 + 64; probe.remove()
      var span = Math.max(0,wall.clientWidth - width - 32), occupied = Array.from(wall.querySelectorAll('[data-note]')).map(function (el) { return {x:parseFloat(el.style.left),y:parseFloat(el.style.top),width:el.offsetWidth || parseFloat(el.style.width),height:el.offsetHeight || 240,medium:el.dataset.medium} })
      if (note.anchor && spotAvailable(16+note.anchor.x*span,note.anchor.y,width,height,note.medium,occupied)) return false
      var relocated = !!note.anchor, spot = findWallSpot(width,height,note.medium,traceSeed(note),occupied)
      note.anchor={mode:layoutMode,x:spot.x,y:spot.y}
      return relocated
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
    $('[data-message]').addEventListener('input',function(e){draft.text=e.target.value; $('[data-text-count]').textContent=draft.text.length+' / 180';redraw();error('')},{signal:signal})
    $('[data-name]').addEventListener('input',function(e){draft.name=e.target.value},{signal:signal})
    Object.keys(stickerNames).forEach(function (kind) {
      var button = document.createElement('button'); button.type = 'button'; button.dataset.sticker = kind; button.setAttribute('aria-label', stickerNames[kind] + '贴纸'); button.appendChild(stickerArt(kind)); $('[data-stickers]').appendChild(button)
    })
    $('[data-size]').addEventListener('change',function(e){draft.size=e.target.value;positionStage()},{signal:signal})
    $('[data-width]').addEventListener('change',function(e){draft.width=Number(e.target.value)},{signal:signal})
    root.addEventListener('click', function (e) {
      var button=e.target.closest('button');if(!button)return
      if (button.dataset.wallTool) { choosePlace(button.dataset.wallTool); return }
      if (button.closest('.gb-materials') && button.dataset.medium) { draft.medium=button.dataset.medium;syncEditor();return }
      if (button.dataset.sticker) {draft.sticker=button.dataset.sticker;syncEditor();return}
      if (button.dataset.mode) {draft.mode=button.dataset.mode;syncEditor();return}
      if (button.dataset.paper) {draft.paper=button.dataset.paper;syncEditor();return}
      if (button.dataset.ink) {draft.ink=button.dataset.ink;syncEditor();return}
      if (button.dataset.note) {
        if (choosing || composer.open) return
        selected=button.dataset.note==='sample'?sample:notes.find(function(n){return n.id===button.dataset.note});if(!selected)return
        restoreFocus=button;arrange.hidden=!['paper','sticker'].includes(selected.medium || 'paper');arrange.textContent=selected.medium==='sticker'?'移动这枚贴纸':'移动这张纸';error('');$('[data-detail-note]').replaceChildren(card(selected,false));$('[data-gb="remove"]').hidden=selected.id==='sample';detail.showModal();document.body.classList.add('gb-dialog-open');return
      }
      switch(button.dataset.gb) {
        case 'previous-wall': case 'next-wall':
          var ids = wallIds(), index = ids.indexOf(currentWall) + (button.dataset.gb === 'previous-wall' ? -1 : 1)
          if (ids[index] !== undefined) changeWall(ids[index])
          break
        case 'write': choosePlace(draft.medium);break
        case 'place-here': writeAnchor=null;openComposer($('[data-wall-tool="'+draft.medium+'"]'));break
        case 'cancel-place': cancelPlace();break
        case 'reposition': choosePlace(draft.medium);break
        case 'close': composer.close();break
        case 'detail-close':detail.close();break
        case 'undo':draft.strokes.pop();redraw();error('');break
        case 'clear':draft.strokes=[];redraw();error('');break
        case 'publish':
          if(draft.medium!=='sticker' && (draft.mode==='draw'?!draft.strokes.length:!draft.text.trim())) { error('先在墙面选中的位置留下一笔。'); return }
          previewNote=makeNote()
          var destination = currentWall
          if (wallNotes().length + (removed && removed.section === currentWall ? 1 : 0) >= WALL_SIZE) {
            var last = Math.max.apply(null, notes.map(function (note) { return note.section }).concat([0]))
            destination = notes.filter(function (note) { return note.section === last }).length + (removed && removed.section === last ? 1 : 0) < WALL_SIZE ? last : last + 1
          }
          var previousWall = currentWall, extended = destination !== currentWall
          previewNote.section = destination
          if (extended) { previewNote.anchor = null; currentWall = destination; renderWall() }
          var relocated = reserveLocalSpot(previewNote)
          if(!persist([previewNote].concat(notes))) { if (extended) { currentWall = previousWall; renderWall() } return }
          currentWall = destination
          try { localStorage.setItem(wallPreference, String(currentWall)) } catch (_) {}
          var newId=previewNote.id;previewNote=null;draft={mode:'draw',strokes:[],text:'',name:draft.name,paper:draft.paper,ink:draft.ink,width:draft.width,medium:draft.medium,size:draft.size,sticker:draft.sticker};writeAnchor=null;restoreFocus=null;composer.close();renderWall(newId);status(extended?'这面墙写满了，已为你延伸到第 '+(currentWall+1)+' 面。':relocated?'原位置较满，已留在附近空白处。':'痕迹留下了，刷新后也在。')
          var pinned=Array.from(wall.querySelectorAll('[data-note]')).find(function(el){return el.dataset.note===newId});if(pinned){pinned.focus({preventScroll:true});pinned.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}break
        case 'remove':
          if(!selected || selected.id==='sample')return
          var next=notes.filter(function(n){return n.id!==selected.id});if(!persist(next))return;removed=selected;restoreFocus=null;detail.close();renderWall();status('已擦去这处痕迹。');$('[data-gb="undo-delete"]').hidden=false;$('[data-gb="undo-delete"]').focus();break
        case 'undo-delete':
          if(removed && persist([removed].concat(notes))){currentWall=removed.section;renderWall(removed.id);removed=null;button.hidden=true;status('痕迹已恢复。');$('[data-wall-tool="ink"]').focus()}break
      }
    }, {signal:signal})
    ;[composer,detail].forEach(function(dialog){dialog.addEventListener('close',function(){stop();document.body.classList.remove('gb-dialog-open');if(dialog===detail&&restoreFocus&&restoreFocus.isConnected)restoreFocus.focus()},{signal:signal})})
    composer.addEventListener('close',function () {
      stage.hidden=true; root.classList.remove('is-writing'); writingHome.insertBefore(writing,$('[data-pen-tools]')); stage.replaceChildren(); wallLayout()
      if (!closingForMove) { cancelPlace(); if (restoreFocus && restoreFocus.isConnected) { window.scrollTo({top:browseScroll,behavior:'auto'}); restoreFocus.focus({preventScroll:true}) } }
      closingForMove = false
    },{signal:signal})
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ if(composer.open) composer.close(); else if(choosing) cancelPlace() } },{signal:signal})
    renderWall()
    cleanup=function(){clearTimeout(statusTimer);finishPaper(true);if(wallObserver)wallObserver.disconnect();if(visibilityObserver)visibilityObserver.disconnect();controller.abort();if(composer.open)composer.close();if(detail.open)detail.close();document.body.classList.remove('gb-dialog-open')}
  }
  window.Guestbook={mount:mount,destroy:function(){cleanup();cleanup=function(){}}}
})()
