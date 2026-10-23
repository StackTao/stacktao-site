(function () {
  var shared=window.SharedWall
  var KEY = shared?'stacktao-shared-wall-ui-v1':'stacktao-paper-wall-v1'
  var WALL_SIZE = 24
  var markWidths = { small:190, medium:260, large:320 }
  var inks = ['#343832', '#3f5870', '#a45743', '#e9edcf', '#d7f557', '#6286ee', '#f47760']
  var fonts = { wenkai:['霞鹜文楷', '"LXGW WenKai TC",serif'], mashan:['马善政毛笔', '"Ma Shan Zheng","LXGW WenKai TC",serif'], caveat:['Caveat · 英文手写', '"Caveat","LXGW WenKai TC",serif'] }
  var papers = ['ivory', 'sage', 'rose']
  var cleanup = function () {}
  var unsaved = function () { return false }
  var draft = { mode: 'draw', strokes: [], text: '', name: '', paper: 'ivory', ink: '#3f5870', width: 4.5, medium: 'ink', size:'medium', sticker:'spark', font:'wenkai', fontSize:24 }
  var sample = { id: 'sample', mode: 'text', text: '山海有归期，\n风雨有相逢。', name: '墙上的题字', paper: 'ivory', medium: 'engraving', date: '', strokes: [] }

  // Versioned vocabulary: a bijection avoids collisions; later volumes retain a unique suffix.
  var wallImages = '听雨 栖云 照晚 借月 松风 竹影 清溪 山岚 疏桐 晴岚 观澜 听泉 枕流 寻芳 望舒 归鹤 停云 远岫 拾光 照水 暮山 微雨 流萤 疏雨 清欢 迟日 南枝 见山 望川 留云 含烟 听松'.split(' ')
  var wallPlaces = '巷 坞 庭 轩 斋 舍 庐 里'.split(' ')
  var nameSeedKey = KEY + '-names-v1', nameSeed = 0
  try {
    var storedSeed = localStorage.getItem(nameSeedKey)
    if (storedSeed === null) { storedSeed = String(crypto.getRandomValues(new Uint32Array(1))[0] % 256); localStorage.setItem(nameSeedKey, storedSeed) }
    nameSeed = Number(storedSeed) % 256 || 0
  } catch (_) {}
  function wallName(id) {
    var named=shared&&shared.walls().find(function(w){return w.id===id})
    if(named&&named.name)return {title:named.name,volume:0,full:named.name}
    var index = ((id % 256) * 73 + nameSeed) % 256
    var title = wallImages[Math.floor(index / 8)] + wallPlaces[index % 8]
    var volume = Math.floor(id / 256)
    return { title:title, volume:volume, full:title + (volume ? ' · 续卷 ' + volume : '') }
  }

  window.PAGES = window.PAGES || {}
  window.PAGE_TITLES = window.PAGE_TITLES || {}
  window.PAGE_TITLES['/guestbook'] = '留言墙 · StackTao'
  window.PAGES['/guestbook'] = `<main class="page guestbook-page" data-guestbook>
    <div class="gb-wall-header"><a class="gb-exit" data-wall-protected href="#/" aria-label="返回博客">← <span>返回博客</span></a><h1 class="gb-wall-title" data-wall-protected><span data-wall-name></span><small data-wall-volume hidden></small><i aria-hidden="true"><img src="assets/materials/visitor-seal-v1.png" alt="" width="34" height="34"></i></h1><span class="gb-local-label">本机留言 · <span data-count>0</span> 处</span></div>
    <nav class="gb-wall-dock" aria-label="留言墙工具"><button class="gb-wall-book-trigger" data-gb="wall-book" aria-haspopup="dialog" aria-expanded="false" aria-controls="gb-wall-book"><span>墙册</span><small data-book-dock-count>0 / 24</small></button><button data-gb="previous-wall" aria-label="上一面墙">←</button><label class="gb-wall-picker" title="每次完成计1处，每面最多24处，可随时主动开新墙"><span data-wall-capacity>0 / 24</span><select data-wall-select aria-label="选择墙面"></select></label><button data-gb="next-wall" aria-label="下一面墙">→</button><span class="gb-dock-divider" aria-hidden="true"></span><button data-wall-tool="ink" aria-pressed="false"><span aria-hidden="true"><svg viewBox="0 0 36 36" focusable="false"><path d="m10 27 3-8L25 7l5 5-12 12Z" fill="#e3c492" stroke="#24382e"/><path d="m13 19 5 5m5-15 5 5" stroke="#385f7a" stroke-width="3"/><path d="m10 27 5-2-3-3Z" fill="#303a32"/></svg></span>涂鸦</button><button data-wall-tool="engraving" aria-pressed="false"><span aria-hidden="true"><svg viewBox="0 0 36 36" focusable="false"><path d="m8 29 4-9 7 7Z" fill="#bdc9c6" stroke="#f1f1dc"/><path d="m13 20 9-13q2-3 5 0l3 3q2 2-1 4L20 26Z" fill="#b58a5f" stroke="#24382e"/><path d="m17 18 6 5" stroke="#f0d2a3"/></svg></span>刻画</button><button data-wall-tool="paper" aria-pressed="false"><span aria-hidden="true"><svg viewBox="0 0 36 36" focusable="false"><path d="M9 7h18v23H9Z" fill="#f6f0df" stroke="#dad7bf"/><path d="M22 7v6h5" fill="#ddd5bf"/><path d="M13 18h9m-9 5h6" stroke="#858b73"/><path d="M13 5h9v5h-9Z" fill="#adb596" opacity=".8"/></svg></span>纸条</button><button data-wall-tool="sticker" aria-pressed="false"><span aria-hidden="true"><svg viewBox="0 0 36 36" focusable="false"><path d="M18 5c7-7 13 2 7 7 10-1 11 10 2 11 5 8-4 13-9 6-4 8-14 2-10-5-10 0-10-11-1-12-6-5 3-13 8-6Z" fill="#e3ad76" stroke="#f6f0df" stroke-width="2"/><circle cx="18" cy="18" r="5" fill="#e7eccf"/></svg></span>贴纸</button></nav>
    <section class="gb-wall-section" aria-label="一面可以留下痕迹的墙">
      <span class="journal-sr-only" id="gb-move-help">先选择工具，再在墙上落笔。纸条可拖动；键盘空格拿起、方向键移动、Enter放下、Escape取消；刻痕固定在墙上。</span>
      <div class="gb-wall" data-wall></div><div class="gb-live-stage" data-live-stage hidden></div><div class="gb-placement-hint" data-placement-hint hidden><span>点一处空白，开始落笔</span><button data-gb="place-here">在当前视野中央放置</button><button data-gb="cancel-place" aria-label="取消选择位置">×</button></div>
      <p class="gb-status" role="status" aria-live="polite" data-status></p>
      <button class="gb-text-button gb-undo-wall" data-gb="undo-delete" hidden>恢复刚才的痕迹</button>
    </section>
    <dialog class="gb-wall-book" id="gb-wall-book" data-wall-book aria-labelledby="gb-wall-book-title">
      <header class="gb-book-head"><div><p>路过，也留下过。</p><h2 id="gb-wall-book-title">墙册</h2></div><button data-gb="book-close" aria-label="关闭墙册">×</button></header>
      <div class="gb-book-current"><div><span>正在看的墙</span><strong data-book-title></strong></div><div class="gb-book-space"><span data-book-capacity></span><meter data-book-meter min="0" max="24" value="0" aria-label="当前墙面已用留言数"></meter></div></div>
      <p class="gb-book-explanation">先看看墙上的故事，再挑一面留下你的。余量按 24 处留言计，落笔时仍需避开已有痕迹。</p>
      <nav class="gb-book-walls" aria-label="已有痕迹的墙" data-book-walls></nav><details class="gb-book-blank-walls" data-book-blanks><summary data-book-blank-summary></summary><nav class="gb-book-walls" aria-label="空墙目录" data-book-empty-walls></nav></details>
      <section class="gb-book-notes"><div class="gb-book-section-head"><h3>本面留下的痕迹</h3><span data-book-note-count></span></div><p class="gb-book-local">点一条，回到它在墙上的位置。</p><ol data-book-notes></ol></section>
      <p class="gb-book-status" data-book-status role="status"></p>
      <footer class="gb-book-foot"><span data-book-total></span><div><button data-gb="book-new-wall" class="gb-book-new">另开新墙</button><button data-gb="book-enter">去这面墙留言 ↗</button></div></footer>
    </dialog>
    <dialog class="gb-dialog" data-composer aria-labelledby="gb-dialog-title">
      <div class="gb-dialog-head"><div><p class="gb-eyebrow" data-step>01 / 写下此刻</p><h2 id="gb-dialog-title">慢慢写，不必工整。</h2></div><button class="gb-close" data-gb="close" aria-label="关闭，保留未完成纸笺">×</button></div>
      <div data-editor>
        <div class="gb-materials" aria-label="留下痕迹的方式"><button data-medium="engraving" aria-pressed="true">刻画<small>凹槽与刮痕</small></button><button data-medium="ink" aria-pressed="false">涂鸦<small>让笔迹自由一点</small></button><button data-medium="paper" aria-pressed="false">纸条<small>一句话，一张纸</small></button><button data-medium="sticker" aria-pressed="false">贴纸<small>贴上一点自己的颜色</small></button></div>
        <div class="gb-sticker-picker" data-stickers hidden><div class="gb-sticker-tabs" data-sticker-tabs role="group" aria-label="贴纸类别"></div><div class="gb-sticker-options" data-sticker-options role="group" aria-label="选择贴纸"></div><p class="gb-sticker-current" data-sticker-current aria-live="polite"></p></div>
        <label class="gb-mark-size">占墙大小 <select data-size aria-label="占墙大小"><option value="small">小一点</option><option value="medium" selected>适中</option><option value="large">大一点</option></select><span>留下空间，也留给下一个人。</span></label>
        <div class="gb-tools"><div class="gb-segment" aria-label="书写方式"><button data-mode="draw" aria-pressed="true">手写</button><button data-mode="text" aria-pressed="false">打字</button></div><div class="gb-papers" aria-label="纸张颜色"><button data-paper="ivory" aria-label="米白纸" aria-pressed="true"></button><button data-paper="sage" aria-label="灰绿纸" aria-pressed="false"></button><button data-paper="rose" aria-label="浅粉纸" aria-pressed="false"></button></div></div>
        <div class="gb-writing-paper" data-paper-surface="ivory">
          <canvas width="1200" height="720" data-drawing aria-label="手写区域，可用鼠标、手指或触控笔书写；也可切换打字"></canvas>
          <div class="gb-canvas-hint" data-draw-hint>从这里落笔<span>鼠标 · 手指 · 触控笔</span></div>
          <textarea data-message maxlength="180" placeholder="写一句问候，或留一点此刻的想法。" aria-label="留言内容，最多180字" hidden></textarea>
        </div>
        <div class="gb-pen-row" data-pen-tools><div class="gb-inks" aria-label="墨色"><button data-ink="#343832" aria-label="石墨" aria-pressed="true"></button><button data-ink="#3f5870" aria-label="靛蓝" aria-pressed="false"></button><button data-ink="#a45743" aria-label="赭红" aria-pressed="false"></button><button data-ink="#e9edcf" aria-label="粉白" aria-pressed="false"></button><button data-ink="#d7f557" aria-label="荧光黄绿" aria-pressed="false"></button><button data-ink="#6286ee" aria-label="钴蓝" aria-pressed="false"></button><button data-ink="#f47760" aria-label="珊瑚橘" aria-pressed="false"></button></div><label class="gb-pen-size">笔触<select data-width aria-label="笔触粗细"><option value="2.4">细笔</option><option value="4.5">粗笔</option><option value="12">宽喷头</option></select></label><button class="gb-text-button" data-gb="undo">撤回一笔</button><button class="gb-text-button" data-gb="clear">清空</button></div>
        <div class="gb-type-tools" data-type-tools hidden><label>字体<select data-font aria-label="留言字体">${Object.keys(fonts).map(function(key){return '<option value="'+key+'">'+fonts[key][0]+'</option>'}).join('')}</select></label><label>字号<select data-font-size aria-label="文字大小"><option value="18">18</option><option value="24" selected>24</option><option value="32">32</option></select></label><button data-gb="preview-text" class="gb-text-button">看上墙效果</button></div><div class="gb-text-count" data-text-count hidden>0 / 180</div>
        <label class="gb-signature">落款 <input data-name maxlength="24" placeholder="留个名字，也可以匿名" autocomplete="nickname"></label>
      </div>
      <p class="gb-error" data-error role="alert"></p>
      <div class="gb-dialog-foot"><span data-foot-hint>这张纸会替你保留原本的笔迹。</span><button class="gb-text-button" data-gb="reposition">换个位置</button><button class="gb-button gb-primary" data-gb="publish" hidden>贴到墙上 ↗</button></div>
    </dialog>
    <dialog class="gb-dialog gb-detail" data-detail aria-label="纸笺详情"><button class="gb-close" data-gb="detail-close" aria-label="关闭纸笺">×</button><div data-detail-note></div><p class="gb-error" data-detail-error role="alert"></p><div class="gb-detail-foot"><button class="gb-text-button" data-arrange aria-pressed="false">移动这张纸</button><button class="gb-text-button" data-gb="edit" hidden>修改这处痕迹</button><span>本机创建的留言</span><button class="gb-text-button" data-gb="remove">擦去这处痕迹</button></div></dialog>
  </main>`

  function valid(note) {
    return note && (note.frame == null || (note.layout === 3 && note.mode === 'draw' && ['ink','engraving'].includes(note.medium) && ['x','y','width','height'].every(function(k){return Number.isFinite(note.frame[k]) && note.frame[k]>=0}) && note.frame.width>0 && note.frame.width<=1000 && note.frame.height>0 && note.frame.height<=10000 && note.frame.x+note.frame.width<=1000.01 && note.frame.y<=1200000)) && (note.section == null || (Number.isInteger(note.section) && note.section >= 0 && note.section < 1000000)) && (note.size == null || Object.prototype.hasOwnProperty.call(markWidths, note.size)) && (note.medium !== 'sticker' || Object.prototype.hasOwnProperty.call(stickerNames, note.sticker)) && (note.medium == null || ['paper','engraving','ink','sticker'].includes(note.medium)) && (note.anchor == null || (['wide','narrow'].includes(note.anchor.mode) && Number.isFinite(note.anchor.x) && note.anchor.x >= 0 && note.anchor.x <= 1 && Number.isFinite(note.anchor.y) && note.anchor.y >= 0 && note.anchor.y <= 1200000)) && typeof note.id === 'string' && ['text', 'draw'].indexOf(note.mode) >= 0 && papers.indexOf(note.paper) >= 0 && typeof note.text === 'string' && note.text.length <= 180 && typeof note.name === 'string' && note.name.length <= 24 && typeof note.date === 'string' && Array.isArray(note.strokes) && note.strokes.length <= 150 && note.strokes.reduce(function (n, s) { return n + (Array.isArray(s.points) ? s.points.length : 6001) }, 0) <= 6000 && note.strokes.every(function (s) {
      return inks.indexOf(s.ink) >= 0 && (note.frame ? Number.isFinite(s.width) && s.width>0 && s.width<=160 : [2.4, 4.5, 12].indexOf(s.width) >= 0) && Array.isArray(s.points) && s.points.length > 0 && s.points.every(function (p) { return Array.isArray(p) && p.length === 3 && p.every(function (v) { return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 }) })
    })
  }
  function load() {
    if(shared)return shared.read()
    try { var data = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(data) ? data.filter(valid) : [] } catch (_) { return [] }
  }
  function svg(strokes, frame) {
    var sw=frame ? frame.width : 600, sh=frame ? frame.height : 360
    var ns = 'http://www.w3.org/2000/svg'
    var el = document.createElementNS(ns, 'svg')
    el.setAttribute('viewBox', '0 0 '+sw+' '+sh)
    el.setAttribute('role', 'img')
    el.setAttribute('aria-label', '原笔迹手写留言')
    strokes.forEach(function (stroke) {
      var p = stroke.points
      var path = document.createElementNS(ns, 'path')
      var d = 'M' + p[0][0] * sw + ' ' + p[0][1] * sh
      if (p.length === 1) d += ' l0.01 0'
      for (var i = 1; i < p.length - 1; i++) if(frame) d += ' L'+p[i][0]*sw+' '+p[i][1]*sh; else d += ' Q' + p[i][0] * sw + ' ' + p[i][1] * sh + ' ' + (p[i][0] + p[i + 1][0]) * sw / 2 + ' ' + (p[i][1] + p[i + 1][1]) * sh / 2
      if (p.length > 1) d += ' L' + p[p.length - 1][0] * sw + ' ' + p[p.length - 1][1] * sh
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
  // Compact SVG overview uses the same saved wall coordinates, without live tools or filters.
  function wallThumbnail(items) {
    var ns='http://www.w3.org/2000/svg',art=document.createElementNS(ns,'svg'),bottom=750
    art.setAttribute('aria-hidden','true');art.setAttribute('preserveAspectRatio','xMidYMid meet')
    items.slice().reverse().forEach(function(n,index){
      var b=n.frame||n.worldBox||{x:50+index%3*300,y:70+Math.floor(index/3)*220,width:260,height:180}
      bottom=Math.max(bottom,b.y+b.height+50)
      var group=document.createElementNS(ns,'svg');group.setAttribute('x',b.x);group.setAttribute('y',b.y);group.setAttribute('width',b.width);group.setAttribute('height',b.height);group.setAttribute('viewBox','0 0 '+b.width+' '+b.height)
      if(n.medium==='sticker'){var sticker=stickerArt(n.sticker);sticker.setAttribute('width','100%');sticker.setAttribute('height','100%');group.append(sticker)}
      else {
        if(n.medium==='paper'){var paper=document.createElementNS(ns,'rect');paper.setAttribute('width','100%');paper.setAttribute('height','100%');paper.setAttribute('fill',({sage:'#e9ede4',rose:'#f2e6e1'})[n.paper]||'#faf7ef');group.append(paper)}
        if(n.mode==='draw'){
          var drawing=svg(n.strokes,n.frame);drawing.setAttribute('width','100%');drawing.setAttribute('height','100%');drawing.setAttribute('preserveAspectRatio','none');drawing.removeAttribute('role');drawing.removeAttribute('aria-label');
          if(n.medium==='engraving')drawing.querySelectorAll('path').forEach(function(p){p.setAttribute('stroke','#786046')})
          if(n.medium==='ink')drawing.setAttribute('opacity','.8')
          group.append(drawing)
        }else{
          var size=n.worldFontSize||24,lineHeight=size*1.8,padding=n.medium==='paper'?20:12,maxChars=Math.max(1,Math.floor((b.width-padding*2)/size)),lines=[]
          n.text.split('\n').forEach(function(line){var chars=Array.from(line);if(!chars.length)lines.push('');for(var i=0;i<chars.length;i+=maxChars)lines.push(chars.slice(i,i+maxChars).join(''))})
          lines.forEach(function(line,i){var text=document.createElementNS(ns,'text');text.setAttribute('x',padding);text.setAttribute('y',padding+size+i*lineHeight);text.setAttribute('font-size',size);text.setAttribute('font-family',(fonts[n.font]||fonts.wenkai)[1]);text.setAttribute('fill',n.medium==='engraving'?'#786046':n.ink||'#3f5870');text.textContent=line;group.append(text)})
        }
      }
      art.append(group)
    })
    art.setAttribute('viewBox','0 0 1000 '+bottom)
    return art
  }
  var carvingSerial = 0
  function carvedArt(note) {
    var ns = 'http://www.w3.org/2000/svg', art = note.mode === 'draw' ? svg(note.strokes,note.frame) : document.createElementNS(ns, 'svg')
    art.classList.add('gb-carved-art')
    art.setAttribute('role', 'img'); art.setAttribute('aria-label', note.mode === 'draw' ? '刻入墙面的手写笔迹' : note.text)
    var group = document.createElementNS(ns, 'g'), cutWidth = 10
    if (note.mode === 'draw') {
      while (art.firstChild) group.appendChild(art.firstChild)
      group.querySelectorAll('path').forEach(function (path) { path.setAttribute('stroke-width',String(note.frame ? Number(path.getAttribute('stroke-width')) : 4.5+Number(path.getAttribute('stroke-width'))*1.2)); path.setAttribute('stroke-linejoin',note.frame ? 'round' : 'bevel'); path.setAttribute('stroke-linecap',note.frame || path.getAttribute('d').includes('l0.01 0') ? 'round' : 'butt') })
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
    if(note.frame&&note.mode==='draw')cutWidth=Math.min.apply(null,note.strokes.map(function(stroke){return stroke.width}).concat([10]))
    var roughness=Math.min(2.3,cutWidth*.25),slope=Math.max(.35,Math.min(1.8,cutWidth*.3))
    var id = 'gb-cut-' + (++carvingSerial), seed = Array.from(note.id).reduce(function (n,c) { return (n * 31 + c.charCodeAt(0)) % 997 }, 7)
    var defs = document.createElementNS(ns, 'defs')
    // Invert the height field: the stroke is a depression, never a raised ridge.
    // Matte diffuse light only; a darker, grainy floor prevents a metallic bright core.
    defs.innerHTML = '<filter id="' + id + '" filterUnits="userSpaceOnUse" x="-10" y="-10" width="' + ((note.frame ? note.frame.width : 600)+20) + '" height="' + ((note.frame ? note.frame.height : 360)+20) + '" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency=".13 .21" numOctaves="2" seed="' + seed + '" result="grain"/>' +
      '<feDisplacementMap in="SourceAlpha" in2="grain" scale="' + roughness + '" xChannelSelector="R" yChannelSelector="G" result="cut"/>' +
      '<feGaussianBlur in="cut" stdDeviation="' + slope + '" result="slope"/>' +
      '<feComponentTransfer in="slope" result="recess"><feFuncA type="linear" slope="-1" intercept="1"/></feComponentTransfer>' +
      '<feDiffuseLighting in="recess" surfaceScale="3" diffuseConstant="1" lighting-color="#e0c29b" result="stoneLight"><feDistantLight azimuth="225" elevation="45"/></feDiffuseLighting>' +
      '<feColorMatrix in="grain" type="matrix" values="0 0 0 0 .67 0 0 0 0 .56 0 0 0 0 .43 0 0 0 .18 .82" result="sediment"/>' +
      '<feComposite in="stoneLight" in2="sediment" operator="arithmetic" k2=".4" k3=".6" result="stone"/>' +
      '<feComposite in="stone" in2="cut" operator="in" result="floor"/>' +
      '<feOffset in="cut" dx="1.1" dy="1.5" result="down"/><feComposite in="cut" in2="down" operator="out" result="innerShade"/>' +
      '<feFlood flood-color="#66513b" flood-opacity=".42"/><feComposite in2="innerShade" operator="in" result="shadow"/>' +
      '<feOffset in="cut" dx=".6" dy=".9"/><feComposite in2="cut" operator="out" result="lip"/>' +
      '<feFlood flood-color="#e1ddcb" flood-opacity=".32"/><feComposite in2="lip" operator="in" result="edge"/>' +
      '<feMerge><feMergeNode in="edge"/><feMergeNode in="floor"/><feMergeNode in="shadow"/></feMerge></filter>'
    group.setAttribute('filter', 'url(#' + id + ')'); art.append(defs, group)
    return art
  }
  function textStyle(el,note) {
    el.style.setProperty('--letter-font',(fonts[note.font]||fonts.wenkai)[1]);el.style.setProperty('--letter-size',([18,24,32].includes(note.fontSize)?note.fontSize:note.medium==='paper'?16:note.medium==='engraving'?20:25)+'px');el.style.setProperty('--letter-ink',inks.includes(note.ink)?note.ink:inks[1])
  }
  function lettering(note) {
    var box=document.createElement('div'),text=document.createElement('p');box.className='gb-lettering';box.dataset.material=note.medium;box.dataset.typeface=note.font||'kai';textStyle(box,note);text.className='gb-letter-glyph';text.textContent=note.text;box.append(text)
    if(['ink','engraving'].includes(note.medium)){
      var art=carvedArt(Object.assign({},note,{id:note.id||'preview-text',mode:'text'})),defs=art.querySelector('defs'),filter=defs.querySelector('filter'),id=filter.id
      filter.setAttribute('filterUnits','objectBoundingBox');filter.setAttribute('x','-10%');filter.setAttribute('y','-10%');filter.setAttribute('width','120%');filter.setAttribute('height','120%')
      if(note.medium==='ink')filter.innerHTML='<feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" seed="17" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale="1.1" xChannelSelector="R" yChannelSelector="G" result="paint"/><feGaussianBlur in="paint" stdDeviation=".65" result="mist"/><feColorMatrix in="grain" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .3 .65" result="pores"/><feComposite in="paint" in2="pores" operator="in" result="pigment"/><feMerge><feMergeNode in="mist"/><feMergeNode in="pigment"/></feMerge>'
      art.replaceChildren(defs);art.removeAttribute('role');art.removeAttribute('aria-label');art.setAttribute('aria-hidden','true');art.setAttribute('class','gb-material-defs');box.prepend(art);text.style.filter='url(#'+id+')'
    }
    return box
  }
  var stickerNames = { spark:'闪光', bloom:'野花', orbit:'轨道', mountain:'远山', ticket:'车票', camp:'露营', sprout:'新芽', ginkgo:'银杏', mushroom:'小蘑菇', coffee:'慢咖啡', camera:'胶片机', cassette:'旧磁带' }
  var stickerGroups = { travel:{label:'沿途',items:['mountain','ticket','camp','orbit']},plants:{label:'草木',items:['sprout','ginkgo','mushroom','bloom']},objects:{label:'小物',items:['coffee','camera','cassette','spark']} }
  function stickerGroup(kind){return Object.keys(stickerGroups).find(function(key){return stickerGroups[key].items.includes(kind)})||'objects'}
  function stickerArt(kind) {
    var ns = 'http://www.w3.org/2000/svg', art = document.createElementNS(ns, 'svg')
    art.setAttribute('viewBox', '0 0 160 160'); art.setAttribute('role', 'img'); art.setAttribute('aria-label', stickerNames[kind] + '贴纸')
    var drawings = {
      spark:'<path d="M78 8 94 53 141 31 113 77 151 99 103 105 108 151 77 117 37 147 46 102 9 83 51 66 35 20 69 47Z" fill="#dfff51" stroke="#f5f4e9" stroke-width="9" stroke-linejoin="round"/><path d="m70 73 3 9m20-11 3 9m-28 17q17 13 31-3" fill="none" stroke="#30372d" stroke-width="5" stroke-linecap="round"/>',
      bloom:'<path d="M62 54C24 12 7 65 44 79 1 94 38 138 65 108 63 154 121 142 105 107 146 137 163 82 121 76 159 46 111 15 91 53 95 8 41 14 62 54Z" fill="#fa744f" stroke="#f5f4e9" stroke-width="9" stroke-linejoin="round"/><circle cx="82" cy="81" r="24" fill="#e5ed58"/><path d="m72 75 1 6m17-6 1 6m-20 10q12 8 22-1" fill="none" stroke="#30372d" stroke-width="4" stroke-linecap="round"/>',
      orbit:'<circle cx="80" cy="80" r="49" fill="#5d78e8" stroke="#f5f4e9" stroke-width="8"/><ellipse cx="80" cy="80" rx="72" ry="23" transform="rotate(-28 80 80)" fill="none" stroke="#e7f16e" stroke-width="9"/><path d="m73 63 2 7m22-10 2 7m-26 18q15 9 26-6" fill="none" stroke="#f5f4e9" stroke-width="4" stroke-linecap="round"/>',
      mountain:'<path d="m80 10 61 27v72l-61 40-61-40V37Z" fill="#d7e0ce" stroke="#f8f3e5" stroke-width="9" stroke-linejoin="round"/><circle cx="111" cy="48" r="13" fill="#d89a60"/><path d="m22 102 39-58 29 39 17-20 32 39v6l-59 37-58-37Z" fill="#426965"/><path d="m45 68 16-24 19 26-17-7-9 11Z" fill="#f1ecd8"/><path d="m54 128 28-19-9-15 16-12" fill="none" stroke="#d8d5ae" stroke-width="5" stroke-linecap="round"/>',
      ticket:'<path d="M16 36h128v29q-17 0-17 15t17 15v29H16V95q17 0 17-15T16 65Z" fill="#b46e56" stroke="#f8f3e5" stroke-width="9" stroke-linejoin="round"/><path d="M105 42v76" stroke="#f4dec4" stroke-width="3" stroke-dasharray="4 6"/><path d="M47 62h39m-39 13h25m-25 24h38" stroke="#f4dec4" stroke-width="5" stroke-linecap="round"/><path d="m68 87 8 6-8 6" fill="none" stroke="#f4dec4" stroke-width="4"/><path d="M116 55v48m6-42v36" stroke="#453e36" stroke-width="3"/>',
      camp:'<path d="m80 18 62 104-7 21H25l-7-21Z" fill="#eadbb7" stroke="#f8f3e5" stroke-width="9" stroke-linejoin="round"/><path d="m80 27 59 99H21Z" fill="#c87950"/><path d="m80 54 31 72H49Z" fill="#344e4c"/><path d="m80 54-8 72" stroke="#f5d3a2" stroke-width="3"/><path d="M27 135h106M22 123l-8 13m124-13 8 13" stroke="#41645e" stroke-width="4" stroke-linecap="round"/><path d="m37 44 3-7 3 7 7 3-7 3-3 7-3-7-7-3Z" fill="#41645e"/>',
      sprout:'<path d="M49 100C15 77 22 39 56 48c13 3 23 13 26 22 2-34 29-49 51-37 5 29-12 57-44 60l1 12h29l-10 41H51l-11-41Z" fill="#f8f3e5" stroke="#f8f3e5" stroke-width="10" stroke-linejoin="round"/><path d="M80 94C43 92 29 73 32 53c27-1 46 13 48 41m3-9c-1-28 17-48 44-46-1 28-18 48-44 46" fill="#78916a"/><path d="M81 110V77m0 20L50 67m33 18 28-30" fill="none" stroke="#365e4d" stroke-width="4" stroke-linecap="round"/><path d="M47 105h67l-9 34H57Z" fill="#b97555"/><path d="M45 104h72v10H45Z" fill="#d49670"/>',
      ginkgo:'<path d="M79 113C42 123 12 99 15 68c1-20 23-40 47-37l18 33 15-34c28-3 51 19 50 43-1 28-27 46-59 41l7 29-13 3-8-30Z" fill="#d2b765" stroke="#f8f3e5" stroke-width="9" stroke-linejoin="round"/><path d="m80 110-1-45m1 45L39 52m41 58L22 78m58 32 39-59m-39 59 54-31m-54 31 8 30" fill="none" stroke="#9b8645" stroke-width="3" stroke-linecap="round"/><path d="m48 39 31 27 27-28" fill="none" stroke="#ead78f" stroke-width="3"/>',
      mushroom:'<path d="M16 86C15 45 47 19 80 19s65 27 64 67c-1 15-24 18-44 16l12 34q-31 16-64 0l12-34c-22 3-43-2-44-16Z" fill="#f8f3e5" stroke="#f8f3e5" stroke-width="9" stroke-linejoin="round"/><path d="M64 86h31l11 48q-26 12-52 0Z" fill="#dbccaa"/><path d="M20 83c0-38 29-60 60-60s60 23 60 60q-59 22-120 0Z" fill="#ad6253"/><ellipse cx="80" cy="87" rx="60" ry="12" fill="#ead9b9"/><path d="m34 88 27 5m19-3v7m21-4 25-5" stroke="#bba580" stroke-width="3"/><path d="M51 43q14-6 12 8t-17 8m50-10q18-6 22 10T96 69M72 31q9-4 11 4t-9 7" fill="#f0dfbc"/>',
      coffee:'<path d="M27 59h80v10h13q29 0 27 28-1 25-39 25l-9 16H36l-9-20Z" fill="#f8f3e5" stroke="#f8f3e5" stroke-width="10" stroke-linejoin="round"/><path d="M106 77h14q18 0 18 17t-30 18" fill="none" stroke="#a76651" stroke-width="12"/><path d="M31 64h76v44q0 26-37 26t-39-26Z" fill="#b9785e"/><ellipse cx="69" cy="66" rx="38" ry="10" fill="#e0b78e"/><ellipse cx="69" cy="65" rx="29" ry="6" fill="#5b493c"/><path d="M21 139h99M51 47c-16-15 13-17 0-33m26 33c-16-15 13-17 0-33" fill="none" stroke="#f8f3e5" stroke-width="8" stroke-linecap="round"/><path d="M43 81v20" stroke="#dbb794" stroke-width="5" stroke-linecap="round"/>',
      camera:'<path d="M18 48h28l9-17h49l10 17h28v87H18Z" fill="#486b72" stroke="#f8f3e5" stroke-width="9" stroke-linejoin="round"/><path d="M20 60h120v14H20Z" fill="#d5be95"/><circle cx="82" cy="94" r="31" fill="#2d4148" stroke="#ded6bc" stroke-width="7"/><circle cx="82" cy="94" r="19" fill="#668e96"/><path d="M70 88q4-10 14-8" fill="none" stroke="#c5ded5" stroke-width="5" stroke-linecap="round"/><path d="M118 84h12v11h-12Z" fill="#d9bc87"/><path d="M59 39h40v10H59Z" fill="#243f47"/>',
      cassette:'<path d="M16 31h128v99H16Z" fill="#526c74" stroke="#f8f3e5" stroke-width="9" stroke-linejoin="round"/><path d="M28 44h104v51H28Z" fill="#e2c99f"/><path d="M33 50h94v12H33Z" fill="#b87056"/><path d="M44 72h73v16H44Z" fill="#5b6663"/><circle cx="50" cy="80" r="12" fill="#efe5ce"/><circle cx="111" cy="80" r="12" fill="#efe5ce"/><circle cx="50" cy="80" r="5" fill="#4b5960"/><circle cx="111" cy="80" r="5" fill="#4b5960"/><path d="m52 107-9 20h75l-10-20Z" fill="#c6ba9e"/><path d="M59 115h42" stroke="#667577" stroke-width="3"/><circle cx="27" cy="119" r="3" fill="#d8d1ba"/><circle cx="133" cy="119" r="3" fill="#d8d1ba"/>'
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
    if(note.layout===2)el.style.setProperty('--note-angle','0deg')
    if(note.frame){el.dataset.freeform='true';el.style.setProperty('--note-angle','0deg')}
    el.dataset.paperSurface = note.paper
    el.dataset.medium = note.medium || 'paper'
    el.dataset.markSize = note.size || 'medium'
    el.style.setProperty('--mark-size', (note.medium === 'sticker' ? {small:100,medium:148,large:200}[note.size || 'medium'] : markWidths[note.size || 'medium']) + 'px')
    if (note.layout !== 2 && !note.frame && note.id !== 'sample') {
      el.style.setProperty('--mark-size', (parseFloat(el.style.getPropertyValue('--mark-size')) * [.72,.82,.9,.86,.76][markSeed%5]) + 'px')
    }
    if (!['paper','sticker'].includes(el.dataset.medium)) el.classList.add('gb-wall-mark')
    if (interactive) { el.type = 'button'; el.dataset.note = note.id; el.setAttribute('aria-label', '查看' + (note.name || '一位过客') + '留下的痕迹') }
    var content = document.createElement('div')
    content.className = 'gb-note-content'
    if (note.medium === 'sticker') content.appendChild(stickerArt(note.sticker))
    else if(note.frame && note.medium==='ink') content.appendChild(window.WallTools.paintArt(note))
    else if (note.medium === 'engraving' && note.mode === 'draw') content.appendChild(carvedArt(note))
    else if (note.mode === 'draw') content.appendChild(svg(note.strokes))
    else { content.appendChild(lettering(note)); el.dataset.typed='true' }
    el.appendChild(content)
    var foot = document.createElement('div'); foot.className = 'gb-note-foot'
    var name = document.createElement('span'); name.textContent = note.name || '一位过客'
    var date = document.createElement('span'); date.textContent = note.id === 'sample' ? '墙上题字 · 非访客留言' : note.date
    foot.append(name, date); el.appendChild(foot)
    return el
  }

  async function mount(view) {
    cleanup()
    var root = view.querySelector('[data-guestbook]')
    if (!root) return
    if(shared){
      var cancelled=false;cleanup=function(){cancelled=true};root.querySelectorAll('button,select').forEach(function(b){b.disabled=true})
      try{await shared.init();if(!shared.walls().some(function(w){return w.id===shared.section()}))await shared.load(shared.walls()[0].id);var lastWall=Number(localStorage.getItem(KEY+'-current-wall'));if(Number.isInteger(lastWall)&&lastWall!==shared.section()&&shared.walls().some(function(w){return w.id===lastWall}))await shared.load(lastWall);if(cancelled||!root.isConnected)return;nameSeed=shared.seed;root.querySelectorAll('button,select').forEach(function(b){b.disabled=false});root.querySelector('.gb-local-label').firstChild.textContent='共享留言 · '}
      catch(e){if(cancelled)return;var message=document.createElement('p');message.className='gb-status is-visible';message.textContent='共享墙连接失败：'+e.message+'。本机旧留言仍保留，未自动上传。';var retry=document.createElement('button');retry.textContent='重新连接';retry.onclick=function(){message.remove();retry.remove();mount(view)};root.append(message,retry);return}
    }
    var controller = new AbortController(), signal = controller.signal
    var $ = function (selector) { return root.querySelector(selector) }
    var textLease=shared?crypto.randomUUID():null,textLeaseTimer=0,textLeaseBeat=0
    async function reserveText(){if(!shared||!composer.open||!writeAnchor)return;var b=placementRect(),scale=wall.clientWidth/1000,cells=[];for(var x=Math.floor(b.x/scale/8);x<=Math.min(124,Math.floor((b.x+b.width)/scale/8));x++)for(var y=Math.floor(b.y/scale/8);y<=Math.floor((b.y+b.height)/scale/8);y++)cells.push(y*128+x);shared.ignoreLease=textLease;await shared.reserve(textLease,currentWall,cells,editingText&&editingText.id)}
    if(shared)textLeaseBeat=setInterval(function(){reserveText().catch(function(e){error(e.message)})},4000)
    var camera = null, freeTools = null, editingText = null, draftBaseline = null, editAnchorBaseline = null, stickerCategory=stickerGroup(draft.sticker)
    var wall = $('[data-wall]'), composer = $('[data-composer]'), detail = $('[data-detail]'), book = $('[data-wall-book]')
    var bookFocus = null, locateAfterClose = null, locatedNote = null, locatedTimer = 0
    var canvas = $('[data-drawing]'), ctx = canvas.getContext('2d'), activeStroke = null, pointer = null
    var writing = $('.gb-writing-paper'), writingHome = writing.parentElement, stage = $('[data-live-stage]'), choosing = false, closingForMove = false
    var liveCarving = document.createElement('div'); liveCarving.className = 'gb-live-carving'; writing.appendChild(liveCarving)
    var placementGhost=document.createElement('div');placementGhost.className='gb-placement-ghost';placementGhost.hidden=true;wall.after(placementGhost)
    var moveHandle=document.createElement('button');moveHandle.className='gb-stage-handle';moveHandle.type='button';moveHandle.textContent='⠿ 拖动位置';moveHandle.setAttribute('aria-label','拖动留言位置')
    var stageDrag=null,placeFrame=0
    var fontRefreshTimer=0,fontRequest=null,publishingText=false
    function refreshTypography(){
      if(signal.aborted)return
      if(drag||stageDrag||pointer!==null||(freeTools&&freeTools.busy())){fontRefreshTimer=setTimeout(refreshTypography,100);return}
      var input=$('[data-message]'),scroll=input.scrollTop
      wallLayout();input.scrollTop=scroll;liveCarving.scrollTop=scroll
    }
    function queueTypography(){if(signal.aborted)return;clearTimeout(fontRefreshTimer);fontRefreshTimer=setTimeout(refreshTypography,40)}
    function loadTypedFont(){
      if(draft.mode!=='text'||!document.fonts||!document.fonts.load)return Promise.resolve()
      var family=(fonts[draft.font]||fonts.wenkai)[1],text=draft.text||'山海 Hello',key=family+'\n'+text
      if(fontRequest&&fontRequest.key===key)return fontRequest.promise
      var request={key:key};fontRequest=request
      request.promise=document.fonts.load('400 '+(draft.fontSize||24)+'px '+family,text).then(function(){if(fontRequest===request)queueTypography();return true},function(){if(fontRequest===request)fontRequest=null;if(!signal.aborted)error('字体暂未载入，请联网后重试；草稿仍保留。');return false})
      return request.promise
    }
    if(document.fonts){
      document.fonts.ready.then(queueTypography,function(){})
      document.fonts.addEventListener('loadingdone',function(e){
        if(!e.fontfaces||e.fontfaces.some(function(face){return Object.keys(fonts).some(function(key){return fonts[key][1].includes(face.family.replace(/["']/g,''))})}))queueTypography()
      },{signal:signal})
    }
    var textRecovery=window.WallTools.draftStore(function(){return KEY+'-text-'+currentWall}),textDraftTimer=0
    var recoverText=document.createElement('button');recoverText.className='gb-draft-resume';recoverText.style.bottom='160px';recoverText.textContent='继续未完成的留言';root.append(recoverText)
    function showTextRecovery(){var saved=textRecovery.read();recoverText.hidden=composer.open||!saved||saved.section!==currentWall}
    function backupText(){clearTimeout(textDraftTimer);if(!composer.open)return;try{if(draft.text.trim()||draft.strokes.length||draft.medium==='sticker')textRecovery.write({section:currentWall,draft:draft,anchor:writeAnchor,wallWidth:wall.clientWidth,editing:editingText});else textRecovery.clear()}catch(_){error('无法备份草稿，请保持页面打开并保存。')}}
    root.addEventListener('input',function(){clearTimeout(textDraftTimer);textDraftTimer=setTimeout(backupText,300)},{signal:signal})
    root.addEventListener('change',function(){clearTimeout(textDraftTimer);textDraftTimer=setTimeout(backupText,300)},{signal:signal})
    window.addEventListener('pagehide',backupText,{signal:signal})
    recoverText.addEventListener('click',function(){var saved=textRecovery.read();if(!saved||saved.section!==currentWall)return;draft=saved.draft;editingText=saved.editing;writeAnchor=saved.anchor;if(writeAnchor)rescaleAnchor(saved.wallWidth,wall.clientWidth);openComposer(recoverText);recoverText.hidden=true},{signal:signal})
    function draftSignature(){return JSON.stringify([draft.mode,draft.medium,draft.text,draft.strokes,draft.name,draft.paper,draft.ink,draft.size,draft.sticker,draft.font,draft.fontSize])}
    unsaved=function(){
      if(freeTools&&freeTools.dirty())return true
      if(editingText&&JSON.stringify(writeAnchor)!==editAnchorBaseline)return true
      if(draftBaseline!==null)return draftSignature()!==draftBaseline
      return !!draft.text.trim() || draft.strokes.some(function(st){return st.points.length}) || (draft.medium==='sticker'&&composer.open)
    }
    window.addEventListener('beforeunload',function(e){if(unsaved()){e.preventDefault();e.returnValue=''}},{signal:signal})
    function capacityText(){var count=wallNotes().length;return '本面 '+count+' / '+WALL_SIZE+' · '+(count>=WALL_SIZE?'已满，请开新墙':'还可留 '+(WALL_SIZE-count)+' 处')}
    function roomForNote(){if(wallNotes().length<WALL_SIZE)return true;status('这面墙已满（24 / 24）。点击「开新墙」继续，现有留言会留在原墙。');return false}
    function textScale(){return draft.mode==='text'&&draft.medium!=='sticker'?wall.clientWidth/1000*(editingText?(editingText.worldFontSize||editingText.fontSize||24)/(editingText.fontSize||24):1):1}
    function draftWidth(){if(draft.mode==='text'&&draft.medium!=='sticker')return editingText&&editingText.worldBox?editingText.worldBox.width*wall.clientWidth/1000:markWidths[draft.size]*textScale();return (draft.medium==='sticker'?{small:100,medium:148,large:200}[draft.size]:markWidths[draft.size])*wall.clientWidth/1000}
    // Draft anchors use screen pixels vertically; keep their wall position on rotation.
    function rescaleAnchor(from,to){
      if(!writeAnchor||!from||from===to)return
      var clean=editingText&&JSON.stringify(writeAnchor)===editAnchorBaseline,ratio=to/from,width=draftWidth()
      writeAnchor.x=((16+writeAnchor.x*Math.max(0,from-width/ratio-32))*ratio-16)/Math.max(1,to-width-32)
      writeAnchor.y*=ratio
      if(clean)editAnchorBaseline=JSON.stringify(writeAnchor)
    }
    function viewZoom(){return camera?camera.zoom():1}
    function anchorAt(x,y){var r=wall.getBoundingClientRect(),z=viewZoom();x=(x-r.left)/z;y=(y-r.top)/z;var w=draftWidth(),h=draft.medium==='sticker'?w:w*.6;return {mode:layoutMode,x:Math.max(0,Math.min(1,(x-w/2-16)/Math.max(1,wall.clientWidth-w-32))),y:Math.max(16,y-h/2)}}
    function choosePlace(medium) {
      var recoverable=textRecovery.read();if(recoverable&&!composer.open&&!draft.text.trim()&&!draft.strokes.length){recoverText.click();return}
      if(!editingText&&!roomForNote())return
      if (composer.open) { closingForMove = true; composer.close() }
      draft.medium = medium; choosing = true; root.classList.add('is-choosing'); $('[data-placement-hint]').hidden = false
      root.querySelectorAll('[data-wall-tool]').forEach(function (b) { b.setAttribute('aria-pressed',String(b.dataset.wallTool === medium)) })
      $('[data-placement-hint] > span').textContent = {ink:'喷漆文字',engraving:'刻字',paper:'纸条',sticker:'贴纸'}[medium]+' · 点哪里，就放在哪里'
    }
    function cancelPlace() { choosing = false;placementGhost.hidden=true;root.classList.remove('is-choosing');$('[data-placement-hint]').hidden=true;root.querySelectorAll('[data-wall-tool]').forEach(function(b){b.setAttribute('aria-pressed','false')}) }
    function abandonPlacement(){cancelPlace();editingText=null;wall.querySelectorAll('.gb-editing-original').forEach(function(el){el.classList.remove('gb-editing-original')})}
    function positionStage() {
      clearTimeout(textDraftTimer);if(composer.open)textDraftTimer=setTimeout(backupText,300)
      if(shared){clearTimeout(textLeaseTimer);textLeaseTimer=setTimeout(function(){reserveText().catch(function(e){error(e.message)})},250)}
      var width=draftWidth();writing.style.width='';writing.style.transform='';stage.style.height='';stage.style.width=width+'px';stage.style.left=(wall.offsetLeft+16+(writeAnchor?writeAnchor.x:.5)*Math.max(0,wall.clientWidth-width-32))+'px';stage.style.top=(wall.offsetTop+(writeAnchor?writeAnchor.y:32))+'px'
      if(draft.medium==='sticker')stage.replaceChildren(card({id:'draft-sticker',medium:'sticker',sticker:draft.sticker,size:draft.size,paper:draft.paper,name:'',date:'',text:'',strokes:[]},false),moveHandle)
      else if(writing.parentElement!==stage)stage.replaceChildren(writing,moveHandle)
      stage.dataset.medium=draft.medium
      if(draft.mode==='text'&&draft.medium!=='sticker'){var ts=textScale(),authoredWidth=width/ts;writing.style.width=authoredWidth+'px';writing.style.transformOrigin='0 0';writing.style.transform='scale('+ts+')';textStyle(writing,draft);var input=$('[data-message]');input.style.height='0px';var h=Math.max(authoredWidth*.6,input.scrollHeight);input.style.height=h+'px';writing.style.height=h+'px';stage.style.height=h*ts+'px'}else {writing.style.height='';$('[data-message]').style.height=''}
      if(composer.open){validatePlacement();var b=stage.getBoundingClientRect();composer.style.left=innerWidth>900&&b.right>innerWidth-330?'24px':'';composer.style.right=composer.style.left?'auto':''}
    }
    function placementRect(){var width=draftWidth(),h=draft.medium==='sticker'?width:draft.mode==='draw'?width*.6:Math.max(writing.offsetHeight*textScale(),width*.6);if(draft.medium==='paper')h+=36*(draft.mode==='text'?textScale():wall.clientWidth/1000);return {x:16+writeAnchor.x*Math.max(0,wall.clientWidth-width-32),y:writeAnchor.y,width:width,height:h}}
    function validatePlacement(){if(!writeAnchor||!composer.open)return true;var b=placementRect(),ok=freeTools.canPlace(b,editingText&&editingText.id);stage.classList.toggle('is-conflicting',!ok);$('[data-gb="publish"]').disabled=!ok||publishingText;error(ok?'':'这里会覆盖已有痕迹。拖动上方把手，或点「换个位置」。');return ok}
    wall.addEventListener('pointermove',function(e){if(!choosing)return;var a=anchorAt(e.clientX,e.clientY),w=draftWidth();placementGhost.hidden=false;Object.assign(placementGhost.style,{left:wall.offsetLeft+16+a.x*Math.max(0,wall.clientWidth-w-32)+'px',top:wall.offsetTop+a.y+'px',width:w+'px',height:(draft.medium==='sticker'?w:w*.6)+'px'});placementGhost.textContent={ink:'喷漆文字',engraving:'刻字',paper:'纸条',sticker:'贴纸'}[draft.medium]},{signal:signal})
    moveHandle.addEventListener('pointerdown',function(e){if(e.button!==0||!e.isPrimary||stageDrag)return;e.preventDefault();moveHandle.setPointerCapture(e.pointerId);stageDrag={id:e.pointerId,x:e.clientX,y:e.clientY,anchor:Object.assign({},writeAnchor)}},{signal:signal})
    moveHandle.addEventListener('pointermove',function(e){if(!stageDrag||stageDrag.id!==e.pointerId)return;writeAnchor={mode:layoutMode,x:Math.max(0,Math.min(1,stageDrag.anchor.x+(e.clientX-stageDrag.x)/viewZoom()/Math.max(1,wall.clientWidth-draftWidth()-32))),y:Math.max(16,stageDrag.anchor.y+(e.clientY-stageDrag.y)/viewZoom())};stage.style.left=wall.offsetLeft+16+writeAnchor.x*Math.max(0,wall.clientWidth-draftWidth()-32)+'px';stage.style.top=wall.offsetTop+writeAnchor.y+'px';if(!placeFrame)placeFrame=requestAnimationFrame(function(){placeFrame=0;validatePlacement()})},{signal:signal})
    ;['pointerup','pointercancel','lostpointercapture'].forEach(function(type){moveHandle.addEventListener(type,function(e){if(!stageDrag||stageDrag.id!==e.pointerId)return;stageDrag=null;positionStage()},{signal:signal})})
    moveHandle.addEventListener('keydown',function(e){var d={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(!d)return;e.preventDefault();writeAnchor.x=Math.max(0,Math.min(1,writeAnchor.x+d[0]/Math.max(1,wall.clientWidth-draftWidth()-32)));writeAnchor.y=Math.max(16,writeAnchor.y+d[1]);positionStage()},{signal:signal})
    function readNotes(){var items=load();items.slice().reverse().forEach(function(n,i){if(n.section==null)n.section=Math.floor(i/WALL_SIZE)});return items}
    var notes = readNotes(), previewNote = null, selected = null, removed = null, restoreFocus = null, writeAnchor = null, statusTimer = 0
    // Stable wall membership: newer messages never push older ones to another wall.
    notes.slice().reverse().forEach(function (note, index) { if (note.section == null) note.section = Math.floor(index / WALL_SIZE) })
    var currentWall = Math.max.apply(null, notes.map(function (note) { return note.section }).concat([0]))
    var wallPreference = KEY + '-current-wall'
    try { var remembered = Number(localStorage.getItem(wallPreference)); if (localStorage.getItem(wallPreference) !== null && notes.some(function (note) { return note.section === remembered })) currentWall = remembered } catch (_) {}
    var wallCatalog=[];try{wallCatalog=JSON.parse(localStorage.getItem(KEY+'-walls')||'[]').filter(function(n){return Number.isInteger(n)&&n>=0&&n<1000000})}catch(_){}
    if(wallCatalog.includes(Number(localStorage.getItem(wallPreference))))currentWall=Number(localStorage.getItem(wallPreference))
    if(shared)currentWall=shared.read().length?shared.read()[0].section:shared.section()
    function wallIds(){if(shared)return shared.walls().map(function(w){return w.id});return Array.from(new Set(notes.map(function(n){return n.section}).concat(wallCatalog,[currentWall]))).sort(function(a,b){return a-b})}
    function wallNotes() { return notes.filter(function (note) { return note.section === currentWall }) }
    function canNavigateWall() {
      if (drag && drag.active) { status('先把手里的纸条放好，再翻墙册。'); return false }
      if (composer.open || choosing || (freeTools && freeTools.active())) { status('先完成当前创作，或收起工具，再翻墙册。你的草稿还在原处。'); return false }
      return true
    }
    var wallChange=0
    function changeWall(section) {
      if (!canNavigateWall()) return false
      if(shared){var ticket=++wallChange;shared.load(section).then(function(){if(signal.aborted||ticket!==wallChange)return;notes=readNotes();currentWall=section;if(camera)camera.reset();try{localStorage.setItem(wallPreference,String(section))}catch(_){}renderWall();if(book.open){renderBook();var chosen=$('[data-book-wall="'+section+'"]');if(chosen)chosen.focus({preventScroll:true})}}).catch(function(e){if(signal.aborted||ticket!==wallChange)return;status(e.message);if(book.open){$('[data-book-status]').textContent=e.message;$('[data-gb="book-enter"]').disabled=false}});return true}
      abandonPlacement();currentWall = section;if(camera)camera.reset(); writeAnchor = null; renderWall()
      try { localStorage.setItem(wallPreference, String(currentWall)) } catch (_) {}
      window.scrollTo({top:0,behavior:'auto'})
      status('第 ' + String(currentWall + 1).padStart(2,'0') + ' 面墙 · ' + wallNotes().length + ' 处痕迹')
      return true
    }
    function newWall() {
      if (!canNavigateWall()) return false
      if(shared){var ticket=++wallChange;shared.newWall().then(function(id){if(signal.aborted||ticket!==wallChange)return;notes=readNotes();currentWall=id;if(camera)camera.reset();renderWall();status('已打开共享墙「'+wallName(id).full+'」')}).catch(function(e){status(e.message)});return true}
      var next = Math.max.apply(null,wallIds()) + 1
      try { localStorage.setItem(KEY+'-walls',JSON.stringify(wallCatalog.concat([next]))) }
      catch (_) { var message='新墙暂时无法保存，请释放浏览器空间后重试。现有留言没有改变。';status(message);$('[data-book-status]').textContent=message;return false }
      wallCatalog.push(next);changeWall(next)
      status('已打开新墙「'+wallName(next).full+'」，0 / 24。旧留言仍在原墙。')
      return true
    }
    function noteLabel(note) {
      if (note.medium === 'sticker') return (stickerNames[note.sticker] || '一枚') + '贴纸'
      if (note.mode === 'text') return note.text.replace(/\s+/g,' ').trim() || '未题名的留言'
      return {ink:'手绘涂鸦',engraving:'手刻笔迹',paper:'手写纸条'}[note.medium || 'paper'] + ' · ' + note.strokes.length + ' 笔'
    }
    var bookPreviews=new Map(),previewObserver=window.IntersectionObserver?new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){previewObserver.unobserve(entry.target);loadBookPreview(entry.target)}})},{root:book,rootMargin:'100px'}):null
    function loadBookPreview(box){
      var id=Number(box.dataset.previewWall),key=box.dataset.previewKey,items=notes.filter(function(n){return n.section===id})
      if(!shared||id===currentWall){box.replaceChildren(wallThumbnail(items));return}
      if(!shared.preview)return
      var pending=bookPreviews.get(key)
      if(!pending){pending=shared.preview(id);bookPreviews.set(key,pending)}
      pending.then(function(items){if(!signal.aborted&&box.isConnected&&box.dataset.previewKey===key)box.replaceChildren(wallThumbnail(items))}).catch(function(){bookPreviews.delete(key);if(box.isConnected)box.textContent='预览暂未加载，点选后重试'})
    }
    function renderBook() {
      $('[data-book-status]').textContent='';$('[data-gb="book-enter"]').disabled=false
      var ids = wallIds(), items = wallNotes(), counts = {}
      notes.forEach(function (note) { counts[note.section] = (counts[note.section] || 0) + 1 })
      if(shared)shared.walls().forEach(function(w){counts[w.id]=w.count})
      $('[data-book-title]').textContent = wallName(currentWall).full
      $('[data-book-capacity]').textContent = items.length + ' / '+WALL_SIZE+' · '+(items.length >= WALL_SIZE ? '本面已满' : '余 '+(WALL_SIZE-items.length)+' 处')
      $('[data-book-meter]').value = items.length
      $('[data-book-note-count]').textContent = items.length + ' 处'
      $('[data-book-total]').textContent = ids.length + ' 面墙 · '+(shared?shared.stats.total:notes.length)+(shared?' 处共享痕迹':' 处本机痕迹')
      var walls=$('[data-book-walls]'),emptyWalls=$('[data-book-empty-walls]'),blankGroup=$('[data-book-blanks]'),emptyIds=ids.filter(function(id){return !counts[id]})
      walls.replaceChildren();emptyWalls.replaceChildren();if(previewObserver)previewObserver.disconnect()
      blankGroup.hidden=!emptyIds.length
      $('[data-book-blank-summary]').textContent=emptyIds.length+' 面空墙 · 每面可留 24 处'
      if(!counts[currentWall]&&!book.open)blankGroup.open=true
      $('[data-gb="book-enter"]').textContent=items.length>=WALL_SIZE?'去看看这面墙 ↗':'去这面墙留言 ↗'
      ids.forEach(function (id) {
        var count=counts[id]||0,button=document.createElement('button'),picture=document.createElement('span'),name=document.createElement('strong'),capacity=document.createElement('small'),bar=document.createElement('span'),meta=document.createElement('span')
        button.type='button';button.dataset.bookWall=String(id);button.setAttribute('aria-current',String(id===currentWall));button.setAttribute('aria-label',wallName(id).full+'，'+(count>=WALL_SIZE?'已满，可浏览':'还可留 '+(WALL_SIZE-count)+' 处')+(id===currentWall?'，当前墙面':''))
        picture.className='gb-book-preview';picture.setAttribute('aria-hidden','true')
        if(!count){picture.classList.add('is-blank');picture.textContent='等你留下第一笔'}
        else {picture.textContent='正在看这面墙…';picture.dataset.previewWall=String(id);var info=shared&&shared.walls().find(function(w){return w.id===id});picture.dataset.previewKey=id+':'+(info?info.revision:'local')}
        name.textContent=wallName(id).full;meta.className='gb-book-card-meta';capacity.textContent=count>=WALL_SIZE?'已满 · 24 / 24':'还可留 '+(WALL_SIZE-count)+' 处';bar.className='gb-book-fill';bar.style.setProperty('--used',Math.min(100,count/WALL_SIZE*100)+'%');meta.append(name,capacity);button.append(picture,meta,bar);(count?walls:emptyWalls).append(button)
        if(count){if(previewObserver)previewObserver.observe(picture);else loadBookPreview(picture)}
      })
      walls.hidden=!ids.some(function(id){return counts[id]>0})
      var list=$('[data-book-notes]');list.replaceChildren()
      if (!items.length) { var empty=document.createElement('li');empty.className='gb-book-empty';empty.textContent='这里还没有留言。合上墙册，留下一笔吧。';list.append(empty) }
      items.forEach(function (note) {
        var li=document.createElement('li'), button=document.createElement('button'), kind=document.createElement('span'), content=document.createElement('span'), title=document.createElement('strong'), meta=document.createElement('small'), arrow=document.createElement('span')
        button.type='button';button.dataset.bookNote=note.id;button.setAttribute('aria-label','定位：'+noteLabel(note))
        kind.className='gb-book-kind';kind.dataset.kind=note.medium || 'paper';kind.textContent={ink:'涂',engraving:'刻',paper:'笺',sticker:'贴'}[note.medium || 'paper']
        content.className='gb-book-note-text';title.textContent=noteLabel(note);meta.textContent=(note.name ? '落款：'+note.name+' · ' : '')+note.date
        arrow.className='gb-book-locate';arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';content.append(title,meta);button.append(kind,content,arrow);li.append(button);list.append(li)
      })
    }
    function locateNote(id) {
      var note=notes.find(function(n){return n.id===id});if(!note)return
      if(note.section!==currentWall&&!changeWall(note.section))return
      var el=Array.from(wall.querySelectorAll('[data-note]')).find(function(n){return n.dataset.note===id});if(!el)return
      clearTimeout(locatedTimer);if(locatedNote)locatedNote.classList.remove('is-located')
      locatedNote=el;el.classList.remove('is-distant');el.classList.add('is-located');el.focus({preventScroll:true})
      if(camera)camera.focus(el);else el.scrollIntoView({block:'center',inline:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})
      status('已找到「'+noteLabel(note).slice(0,24)+'」。点击痕迹可查看或管理。')
      locatedTimer=setTimeout(function(){el.classList.remove('is-located');locatedNote=null},4500)
    }
    book.addEventListener('close',function(){
      $('[data-gb="wall-book"]').setAttribute('aria-expanded','false');document.body.classList.remove('gb-dialog-open')
      if(locateAfterClose){var id=locateAfterClose;locateAfterClose=null;locateNote(id)}
      else if(bookFocus&&bookFocus.isConnected)bookFocus.focus({preventScroll:true})
      bookFocus=null
    },{signal:signal})
    book.addEventListener('click',function(e){if(e.target===book){var r=book.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)book.close()}},{signal:signal})
    $('[data-wall-select]').addEventListener('change',function (e) { if(!changeWall(Number(e.target.value)))e.target.value=String(currentWall) },{signal:signal})
    function status(message) { clearTimeout(statusTimer); $('[data-status]').textContent = message; $('[data-status]').classList.add('is-visible'); statusTimer = setTimeout(function () { $('[data-status]').classList.remove('is-visible') }, 4500) }
    function error(message) { $('[data-error]').textContent = message; $('[data-detail-error]').textContent = message }
    async function persist(next) {
      if(shared){try{
        var deleted=notes.filter(function(n){return !next.some(function(x){return x.id===n.id})}),changed=next.filter(function(n){return !notes.some(function(x){return x.id===n.id&&JSON.stringify(x)===JSON.stringify(n)})})
        for(var n of deleted)await shared.remove(n)
        for(var n of changed){if(removed&&removed.id===n.id){await shared.restore(n);continue}if(!n.frame){var box=placementRect(),scale=wall.clientWidth/1000;n.worldBox={x:box.x/scale,y:box.y/scale,width:box.width/scale,height:box.height/scale};n.worldFontSize=(draft.fontSize||24)*(draft.mode==='text'&&draft.medium!=='sticker'?textScale()/scale:1)}await reserveText();await shared.put(n,textLease)}
        notes=readNotes();return true
      }catch(e){error(e.message+'；草稿仍保留。');status(e.message);return false}}

      var previous=notes.map(function(n){return n.id}), retained=next.map(function(n){return n.id})
      function write(){
        var fresh=readNotes();if(editingText&&JSON.stringify(fresh.find(function(n){return n.id===editingText.id}))!==JSON.stringify(editingText))throw Error('原作已在另一窗口修改，请重新打开后再编辑。');var changed=next.filter(function(n){var old=notes.find(function(item){return item.id===n.id});return !old||JSON.stringify(old)!==JSON.stringify(n)})
        var live=Object.values(JSON.parse(localStorage.getItem(KEY+'-live-leases')||'{}')).filter(function(p){return p.expires>Date.now()})
        if(live.some(function(p){return p.note&&previous.includes(p.note)&&!retained.includes(p.note)}))throw Error('这面墙还有窗口正在创作，请待对方完成后再保存，草稿仍在。')
        changed.forEach(function(n){var old=notes.find(function(item){return item.id===n.id});if(old&&JSON.stringify(fresh.find(function(item){return item.id===n.id}))!==JSON.stringify(old))throw Error('原作已在另一窗口修改，请重新打开后再编辑。')})
        var merged=changed.filter(function(n){return !previous.includes(n.id)}).concat(fresh.filter(function(n){return !previous.includes(n.id)||retained.includes(n.id)}).map(function(n){return changed.find(function(item){return item.id===n.id})||n}))
        if(changed.some(function(n){return !previous.includes(n.id)&&merged.filter(function(item){return item.section===n.section}).length>WALL_SIZE}))throw Error('这面墙已满，无法再放入新的痕迹。请先开新墙。')
        if(previewNote&&changed.length){if(!freeTools.canPlace(placementRect(),editingText&&editingText.id))throw Error('这里已有新的痕迹，请移动草稿后再保存。')}
        localStorage.setItem(KEY,JSON.stringify(merged));notes=merged;return true
      }
      try { return navigator.locks ? await navigator.locks.request(KEY+'-mutation',write) : write() }
      catch (err) { error((/正在创作|另一窗口|这面墙已满|新的痕迹/.test(err.message)) ? err.message : '浏览器空间不足或无法保存。草稿仍在，请不要关闭页面；原有留言没有改变。'); status(/正在创作|另一窗口|这面墙已满|新的痕迹/.test(err.message)?err.message:'保存未完成，草稿和原有留言都还在。'); return false }
    }
    var layoutWidth=wall.clientWidth
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
    window.addEventListener('storage',function(e){if(e.key===layoutKey && e.newValue){try{var next=JSON.parse(e.newValue);if(next.wide&&next.narrow){layouts=next;wallLayout()}}catch(_){}}},{signal:signal})
    function positionOf(el) {
      if(shared){var n=notes.find(function(n){return n.id===el.dataset.note});if(n&&n.worldBox){var f=n.worldBox,s=wall.clientWidth/1000;return {x:(f.x*s-16)/Math.max(1,wall.clientWidth-f.width*s-32),y:f.y*s,z:notes.indexOf(n)+1}}}

      var freeNote=notes.find(function(n){return n.id===el.dataset.note && n.frame});if(freeNote){var f=freeNote.frame,scale=wall.clientWidth/1000;return {x:Math.max(0,(f.x*scale-16)/Math.max(1,wall.clientWidth-f.width*scale-32)),y:f.y*scale,z:notes.indexOf(freeNote)+1}}
      if (Object.prototype.hasOwnProperty.call(layouts[layoutMode], el.dataset.note)) return layouts[layoutMode][el.dataset.note]
      var note = notes.find(function (n) { return n.id === el.dataset.note })
      return note && note.layout === 2 && note.anchor && note.anchor.mode === layoutMode ? { x:note.anchor.x, y:note.anchor.y, z:notes.length + 1 } : null
    }
    function paintPaper(el, x, y) { el.style.left = x + 'px'; el.style.top = y + 'px' }
    function wallControls(){var r=wall.getBoundingClientRect(),z=viewZoom();return Array.from(root.querySelectorAll('[data-wall-protected]')).map(function(el){var b=el.getBoundingClientRect();return {x:(b.left-r.left)/z-8,y:(b.top-r.top)/z-8,width:b.width/z+16,height:b.height/z+16,medium:'control'}})}
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
      if(recoverText)showTextRecovery()
      finishPaper(true)
      var width = wall.clientWidth, paperWidth = Math.min(280, Math.max(180, width - 32))
      if(width!==layoutWidth){rescaleAnchor(layoutWidth,width);layoutWidth=width;stop();stageDrag=null}
      layoutMode = width < 600 ? 'narrow' : 'wide'
      wall.style.setProperty('--wall-paper-width', paperWidth + 'px')
      var cards = Array.from(wall.querySelectorAll('[data-note]')), bottom = 0
      cards.forEach(function (el) { var n=notes.find(function(n){return n.id===el.dataset.note});el.style.width = (n && (n.frame||n.worldBox) ? (n.frame||n.worldBox).width*width/1000 : Math.min(parseFloat(el.style.getPropertyValue('--mark-size')), Math.max(160, width - 32))) + 'px';el.style.setProperty('--letter-min-height',parseFloat(el.style.width)*.6+'px');if(n&&(n.frame||n.worldBox)){el.style.height=(n.frame||n.worldBox).height*width/1000+'px';if(n.worldBox){
          el.dataset.worldSized='true';el.style.overflow='hidden'
          var fontSize=n.fontSize||24,scale=(n.worldFontSize||24)*width/1000/fontSize
          el.style.setProperty('--note-scale',scale)
          var lettering=el.querySelector('.gb-lettering');if(lettering){lettering.style.width=(n.worldBox.width*width/1000/scale)+'px';lettering.style.transformOrigin='0 0';lettering.style.transform='scale('+scale+')';lettering.style.setProperty('--letter-size',fontSize+'px');lettering.style.setProperty('--note-scale',1)}
        }} })
      var reserved=wallControls();var occupied = reserved.concat(cards.map(function (el) { var p = positionOf(el); return p ? { x:16 + p.x * Math.max(0,width - parseFloat(el.style.width) - 32), y:p.y, width:parseFloat(el.style.width), height:el.offsetHeight || 240, medium:el.dataset.medium } : null }).filter(Boolean))
      cards.forEach(function (el,index) {
        var p = positionOf(el), height = el.offsetHeight || 240, ownWidth = parseFloat(el.style.width), maxX = Math.max(0, width - ownWidth - 32)
        if(!shared && p && !el.dataset.freeform && !spotAvailable(16+p.x*maxX,p.y,ownWidth,height,el.dataset.medium,reserved))p=null
        if (!p) {
          var spot = findWallSpot(ownWidth,height,el.dataset.medium,traceSeed({id:el.dataset.note}),occupied)
          p = { x:spot.x, y:el.dataset.note === 'sample' ? 180 : spot.y, z:index + 1 }
          occupied.push({x:16 + p.x * maxX,y:p.y,width:ownWidth,height:height,medium:el.dataset.medium})
        }
        Object.defineProperty(layouts[layoutMode], el.dataset.note, { value:p, writable:true, enumerable:true, configurable:true })
        var freeNote=notes.find(function(n){return n.id===el.dataset.note && (n.frame||n.worldBox)})
        paintPaper(el, freeNote ? (freeNote.frame||freeNote.worldBox).x*width/1000 : 16 + p.x * maxX, p.y); el.style.zIndex = String(p.z)
        bottom = Math.max(bottom, p.y + height)
      })
      wall.style.height = Math.max((window.innerHeight || 720) - 100, bottom + 160, freeTools?freeTools.extent():0, composer.open&&writeAnchor?writeAnchor.y+stage.offsetHeight+100:0) + 'px'
      try {var value=JSON.stringify(layouts);if(localStorage.getItem(layoutKey)!==value)localStorage.setItem(layoutKey,value)} catch (_) {}
      if (composer.open) positionStage()
      if(freeTools)freeTools.resize()
      if(camera)camera.refresh()
    }
    function startPaper(el, pointerId, x, y) {
      if(shared&&!notes.some(function(n){return n.id===el.dataset.note&&n.owned})){status('只能移动自己留下的纸条或贴纸。');return}
      if (drag) return
      try {if(Object.values(JSON.parse(localStorage.getItem(KEY+'-live-leases')||'{}')).some(function(p){return p.wall===currentWall&&p.expires>Date.now()})){status('另一窗口正在这面墙上创作，完成后再移动纸条。');return}}catch(_){}
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
    async function finishPaper(cancelled) {
      if (!drag) return
      var held = drag; drag = null; suppressNoteClick = held.active
      var el = held.el, p = positionOf(el)
      if (held.active && !cancelled) {
        var next = { wide:{}, narrow:{} }, ids = notes.map(function (n) { return n.id }).concat(['sample'], removed ? [removed.id] : [])
        ;['wide', 'narrow'].forEach(function (mode) { ids.forEach(function (id) { if (Object.prototype.hasOwnProperty.call(layouts[mode], id)) Object.defineProperty(next[mode], id, { value:layouts[mode][id], writable:true, enumerable:true, configurable:true }) }) })
        var maxX = Math.max(0, wall.clientWidth - el.offsetWidth - 32)
        var top = Math.max.apply(null, Object.values(next[layoutMode]).map(function (p) { return p.z }).concat([0]))
        var placed = { x:maxX ? (held.x - 16) / maxX : .5, y:held.y, z:top + 1 }
        Object.defineProperty(next[layoutMode], el.dataset.note, { value:placed, writable:true, enumerable:true, configurable:true })
        try {
          function commitMove(){
            if(!freeTools.canPlace({x:held.x,y:held.y,width:el.offsetWidth,height:el.offsetHeight},el.dataset.note))throw Error('occupied')
            var fresh=JSON.parse(localStorage.getItem(layoutKey)||'{}');fresh.wide=fresh.wide||{};fresh.narrow=fresh.narrow||{};fresh[layoutMode][el.dataset.note]=placed
            localStorage.setItem(layoutKey,JSON.stringify(fresh));layouts=fresh;p=placed
          }
          if(shared){var original=notes.find(function(n){return n.id===el.dataset.note}),scale=wall.clientWidth/1000;await shared.put(Object.assign({},original,{worldBox:Object.assign({},original.worldBox,{x:held.x/scale,y:held.y/scale})}));notes=readNotes();layouts[layoutMode][el.dataset.note]=placed;p=placed}else if(navigator.locks)await navigator.locks.request(KEY+'-mutation',commitMove);else commitMove()
          status(shared?'位置已保存到共享墙。':'贴好了，位置已保存在这个浏览器。')
        }
        catch (err) { cancelled = true; status(err.message==='occupied'?'这里会覆盖已有痕迹，已放回原处。请换一个空白位置。':'位置保存失败，已放回原处；原有留言没有改变。') }
      }
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
      var x = (e.clientX - drag.startX)/viewZoom(), y = (e.clientY - drag.startY)/viewZoom()
      if (!drag.active && Math.hypot(x, y)*viewZoom() < 6) return
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
      ids.forEach(function (id) { var option = document.createElement('option'); option.value = String(id); option.textContent = String(id + 1).padStart(2,'0') + ' · ' + wallName(id).full; picker.appendChild(option) })
      picker.value = String(currentWall)
      var title=wallName(currentWall);$('[data-wall-name]').textContent=title.title;$('[data-wall-volume]').hidden=!title.volume;$('[data-wall-volume]').textContent='续卷 '+title.volume
      $('.gb-wall-title').setAttribute('aria-label',title.full+'，第'+(currentWall+1)+'面留言墙')
      $('[data-gb="previous-wall"]').disabled = ids.indexOf(currentWall) === 0
      var nextWall=$('[data-gb="next-wall"]'),atEnd=ids.indexOf(currentWall)===ids.length-1;nextWall.disabled=false;nextWall.textContent=atEnd?'开新墙':'→';nextWall.setAttribute('aria-label',atEnd?'开新墙':'下一面墙');$('[data-wall-capacity]').textContent='本面 '+wallNotes().length+' / '+WALL_SIZE;$('[data-wall-capacity]').title=capacityText()
      $('[data-count]').textContent = notes.length.toLocaleString('zh-CN')
      $('[data-book-dock-count]').textContent = wallNotes().length + ' / ' + WALL_SIZE
      if(book.open)renderBook()
      wall.setAttribute('aria-label','第 ' + (currentWall + 1) + ' 面墙，' + wallNotes().length + ' 处留言')
      if (!wallNotes().length) {
        var invitation = document.createElement('div'); invitation.className = 'gb-wall-invitation'
        invitation.innerHTML = '<span>一面墙，等一个路过的人。</span><small>写一句话，画一个念头。这里不必工整。</small>'
        wall.appendChild(invitation)
      }
      ;(notes.length ? wallNotes().sort(function (a,b) { var physical = function (n) { return !n.medium || ['paper','sticker'].includes(n.medium) }; return Number(physical(b))-Number(physical(a)) || traceSeed(a)-traceSeed(b) }) : []).forEach(function (note) {
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
    }
    // Reflow before the camera clamps its new viewport, including height-only rotation.
    window.addEventListener('resize', wallLayout, {signal:signal})
    wall.addEventListener('click', function (e) {
      if ((!choosing&&e.target!==wall) || suppressNoteClick || composer.open || (freeTools&&freeTools.active())) return
      if(!choosing){status('先选择工具，再在墙上落笔。');return}
      writeAnchor=anchorAt(e.clientX,e.clientY)
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
      liveCarving.replaceChildren(); liveCarving.hidden = draft.mode==='text' ? draft.medium==='sticker' : draft.medium!=='engraving'
      canvas.style.opacity = draft.medium === 'engraving' ? '0' : '1'
      if (draft.medium === 'engraving' && draft.mode === 'draw' && draft.strokes.length) liveCarving.appendChild(carvedArt({id:'live-carving',mode:draft.mode,strokes:draft.strokes,text:draft.text}))
      writing.classList.toggle('is-material-text',draft.mode==='text');if(draft.mode==='text')liveCarving.appendChild(lettering(Object.assign({id:'live-text'},draft)))
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
      syncStickers()
      $('.gb-writing-paper').dataset.paperSurface = draft.paper
      $('.gb-writing-paper').dataset.medium = draft.medium || 'paper'
      root.querySelectorAll('.gb-materials [data-medium]').forEach(function (b) { if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', b.dataset.medium === draft.medium) })
      $('.gb-papers').hidden = draft.medium !== 'paper'
      $('[data-pen-tools]').classList.toggle('is-engraving', draft.medium === 'engraving')
      canvas.hidden = draft.mode !== 'draw'; $('[data-message]').hidden = draft.mode !== 'text'
      $('[data-pen-tools]').hidden = isSticker||(draft.mode==='text'&&draft.medium==='engraving');$('.gb-pen-size').hidden=draft.mode!=='draw';$('[data-gb="undo"]').hidden=draft.mode!=='draw';$('[data-gb="clear"]').hidden=draft.mode!=='draw';$('[data-type-tools]').hidden=isSticker||draft.mode!=='text';$('[data-font]').value=fonts[draft.font]?draft.font:'wenkai';$('[data-font-size]').value=String(draft.fontSize||24); $('[data-text-count]').hidden = isSticker || draft.mode !== 'text'
      $('[data-message]').value = draft.text; $('[data-name]').value = draft.name; $('[data-width]').value = String(draft.width)
      $('[data-text-count]').textContent = draft.text.length + ' / 180'
      redraw(); if (composer.open) positionStage();loadTypedFont()
    }
    function showEditor() {
      $('[data-gb="publish"]').hidden = false
      $('[data-step]').textContent = '直接留在墙上'; $('#gb-dialog-title').textContent = {ink:'拿起笔，随意画。',engraving:'一笔一划，刻下来。',paper:'写好，就贴在这里。',sticker:'挑一枚，贴在这里。'}[draft.medium]
      $('[data-gb="publish"]').textContent = ['paper','sticker'].includes(draft.medium) ? '贴在这里' : '留下这一笔'
      $('[data-foot-hint]').textContent = capacityText()+' · 写满后手动开新墙'; error(''); syncEditor()
    }
    function openComposer(trigger) {
      recoverText.hidden=true;
      cancelPlace(); restoreFocus = trigger; previewNote = null
      if(draft.medium==='sticker')stickerCategory=stickerGroup(draft.sticker)
      if(!writeAnchor)writeAnchor=anchorAt(innerWidth*.45,innerHeight*.4)
      showEditor();composer.show();root.classList.add('is-writing');stage.hidden=false;positionStage()
      wall.style.height=Math.max(parseFloat(wall.style.height)||0,writeAnchor.y+stage.offsetHeight+100)+'px'
      ;(draft.mode === 'text' ? $('[data-message]') : $('[data-mode="draw"]')).focus({preventScroll:true})
    }
    function makeNote() {
      return { id: crypto.randomUUID(), layout:2, medium:draft.medium || 'paper', font:fonts[draft.font]?draft.font:'wenkai',fontSize:draft.fontSize||24,ink:draft.ink,size:draft.size || 'medium', sticker:draft.sticker || 'spark', anchor:shared?null:writeAnchor, mode: draft.medium === 'sticker' ? 'text' : draft.mode, strokes: draft.medium !== 'sticker' && draft.mode === 'draw' ? JSON.parse(JSON.stringify(draft.strokes)) : [], text: draft.medium !== 'sticker' && draft.mode === 'text' ? draft.text.trim() : '', name: draft.name.trim(), paper: draft.paper, date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) }
    }
    function point(e) { var r = canvas.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)), e.pressure || 0.5].map(function (n) { return Math.round(n * 10000) / 10000 }) }
    function stop() { var hadStroke=pointer!==null;activeStroke = null; pointer = null;if(hadStroke)backupText() }
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
    canvas.addEventListener('pointerup',function(e){
      if(pointer!==e.pointerId||!activeStroke)return
      var p=point(e),last=activeStroke.points[activeStroke.points.length-1]
      if((p[0]!==last[0]||p[1]!==last[1])&&draft.strokes.reduce(function(n,s){return n+s.points.length},0)<6000){activeStroke.points.push(p);redraw()}
      stop()
    },{signal:signal})
    ;['pointercancel','lostpointercapture'].forEach(function (event) {canvas.addEventListener(event,function(e){if(pointer===e.pointerId)stop()},{signal:signal})})
    $('[data-message]').addEventListener('input',function(e){draft.text=e.target.value; $('[data-text-count]').textContent=draft.text.length+' / 180';redraw();positionStage();loadTypedFont()},{signal:signal})
    $('[data-font]').addEventListener('change',function(e){draft.font=e.target.value;syncEditor()},{signal:signal})
    $('[data-font-size]').addEventListener('change',function(e){draft.fontSize=Number(e.target.value);syncEditor()},{signal:signal})
    $('[data-message]').addEventListener('blur',function(){writing.classList.remove('is-typing')},{signal:signal})
    $('[data-message]').addEventListener('focus',function(){writing.classList.add('is-typing')},{signal:signal})
    $('[data-message]').addEventListener('scroll',function(e){liveCarving.scrollTop=e.target.scrollTop},{signal:signal})
    $('[data-name]').addEventListener('input',function(e){draft.name=e.target.value},{signal:signal})
    function syncStickers(){
      root.querySelectorAll('[data-sticker-group]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.stickerGroup===stickerCategory))})
      root.querySelectorAll('[data-sticker]').forEach(function(b){b.hidden=!stickerGroups[stickerCategory].items.includes(b.dataset.sticker);b.setAttribute('aria-pressed',String(b.dataset.sticker===draft.sticker))})
      $('[data-sticker-current]').textContent='当前：'+stickerNames[draft.sticker]+' · 选好后贴在墙上'
    }
    Object.keys(stickerGroups).forEach(function(key){
      var button=document.createElement('button');button.type='button';button.dataset.stickerGroup=key;button.textContent=stickerGroups[key].label;$('[data-sticker-tabs]').appendChild(button)
      stickerGroups[key].items.forEach(function(kind){
        var button=document.createElement('button'),label=document.createElement('span');button.type='button';button.dataset.sticker=kind;button.setAttribute('aria-label',stickerNames[kind]+'贴纸');label.textContent=stickerNames[kind];button.append(stickerArt(kind),label);$('[data-sticker-options]').appendChild(button)
      })
    })
    $('[data-size]').addEventListener('change',function(e){draft.size=e.target.value;positionStage()},{signal:signal})
    $('[data-width]').addEventListener('change',function(e){draft.width=Number(e.target.value)},{signal:signal})
    root.addEventListener('click', async function (e) {
      var button=e.target.closest('button');if(!button)return
      if (button.dataset.bookWall !== undefined) { var targetWall=Number(button.dataset.bookWall);if(shared){$('[data-book-status]').textContent='正在打开这面墙…';$('[data-gb="book-enter"]').disabled=true;}if(changeWall(targetWall))$('[data-book-wall="'+targetWall+'"]').focus({preventScroll:true});return }
      if (button.dataset.bookNote) { locateAfterClose=button.dataset.bookNote;book.close();return }
      if (button.dataset.wallTool) { if(choosing&&editingText)abandonPlacement(); if(['ink','engraving'].includes(button.dataset.wallTool)){if(composer.open)composer.close();cancelPlace();if(!roomForNote())return;draft.medium=button.dataset.wallTool;freeTools.start(button.dataset.wallTool)}else choosePlace(button.dataset.wallTool); return }
      if (button.closest('.gb-materials') && button.dataset.medium) { draft.medium=button.dataset.medium;syncEditor();return }
      if (button.dataset.stickerGroup) {stickerCategory=button.dataset.stickerGroup;syncStickers();return}
      if (button.dataset.sticker) {draft.sticker=button.dataset.sticker;syncEditor();return}
      if (button.dataset.mode) {if(button.dataset.mode==='draw'&&['ink','engraving'].includes(draft.medium)){if(draft.text.trim()){error('文字草稿还在，请先保存或关闭编辑，再切换手写。');return}composer.close();freeTools.start(draft.medium);return}draft.mode=button.dataset.mode;syncEditor();return}
      if (button.dataset.paper) {draft.paper=button.dataset.paper;syncEditor();return}
      if (button.dataset.ink) {draft.ink=button.dataset.ink;syncEditor();return}
      if (button.dataset.note) {
        if (choosing || composer.open || (freeTools&&freeTools.active())) return
        selected=button.dataset.note==='sample'?sample:notes.find(function(n){return n.id===button.dataset.note});if(!selected)return
        restoreFocus=button;arrange.hidden=!['paper','sticker'].includes(selected.medium || 'paper');arrange.textContent=selected.medium==='sticker'?'移动这枚贴纸':'移动这张纸';error('');$('[data-detail-note]').replaceChildren(card(selected,false));$('[data-gb="remove"]').hidden=selected.id==='sample';$('[data-gb="edit"]').hidden=selected.id==='sample'||(!['ink','engraving'].includes(selected.medium)&&!(selected.mode==='text'&&(selected.medium||'paper')==='paper'));if(shared){arrange.hidden=arrange.hidden||!selected.owned;$('[data-gb="remove"]').hidden=!selected.owned;$('[data-gb="edit"]').hidden=$('[data-gb="edit"]').hidden||!selected.owned;$('.gb-detail-foot span').textContent=selected.owned?'你留下的痕迹':'访客留下的痕迹'}detail.showModal();document.body.classList.add('gb-dialog-open');return
      }
      switch(button.dataset.gb) {
        case 'wall-book':
          if(!canNavigateWall())break
          bookFocus=button;renderBook();book.showModal();book.scrollTop=0;button.setAttribute('aria-expanded','true');document.body.classList.add('gb-dialog-open');break
        case 'book-close':book.close();break
        case 'book-enter':book.close();status(wallNotes().length>=WALL_SIZE?'这面墙已满，可以欣赏已有的留言。':'选好这面墙了，拿起下方的工具，留下一笔吧。');break
        case 'book-new-wall':if(newWall())book.close();break
        case 'previous-wall': case 'next-wall':
          var ids = wallIds(), index = ids.indexOf(currentWall) + (button.dataset.gb === 'previous-wall' ? -1 : 1)
          if(ids[index]!==undefined)changeWall(ids[index]);else if(button.dataset.gb==='next-wall')newWall()
          break
        case 'write': choosePlace(draft.medium);break
        case 'preview-text':$('[data-message]').blur();writing.classList.remove('is-typing');break
        case 'place-here': writeAnchor=anchorAt(innerWidth*.45,innerHeight*.4);openComposer($('[data-wall-tool="'+draft.medium+'"]'));break
        case 'cancel-place': abandonPlacement();break
        case 'reposition': choosePlace(draft.medium);break
        case 'close': composer.close();break
        case 'detail-close':detail.close();break
        case 'edit':
          if(!selected||selected.id==='sample')return
          restoreFocus=null;detail.close()
          if(selected.mode==='draw'){freeTools.start(selected.medium,selected);break}
          editingText=JSON.parse(JSON.stringify(selected));draft=Object.assign({ink:inks[1],width:4.5,size:'medium',sticker:'spark',font:'kai',fontSize:24},JSON.parse(JSON.stringify(selected)))
          var original=Array.from(wall.querySelectorAll('[data-note]')).find(function(el){return el.dataset.note===selected.id})
          original.classList.add('gb-editing-original');var oldPosition=positionOf(original);writeAnchor={mode:layoutMode,x:oldPosition.x,y:oldPosition.y};draftBaseline=draftSignature();editAnchorBaseline=JSON.stringify(writeAnchor)
          openComposer(original);$('[data-gb="publish"]').textContent='保存修改';break
        case 'undo':draft.strokes.pop();redraw();error('');break
        case 'clear':draft.strokes=[];redraw();error('');break
        case 'publish':
          if(publishingText)return
          if(draft.medium!=='sticker' && (draft.mode==='draw'?!draft.strokes.length:!draft.text.trim())) { error('先在墙面选中的位置留下一笔。'); return }
          if(draft.mode==='text'&&draft.medium!=='sticker'){
            var beforeFontLoad=draftSignature();publishingText=true;button.disabled=true
            var fontReady=await loadTypedFont();publishingText=false
            if(signal.aborted||!composer.open)break
            if(fontReady===false){button.disabled=false;error('字体暂未载入，请重试；草稿仍保留。');break}
            positionStage()
            if(draftSignature()!==beforeFontLoad){error('文字或字体已更改，请确认后再次保存。');break}
          }
          previewNote=makeNote();if(editingText){previewNote.id=editingText.id;previewNote.date=editingText.date;previewNote.revision=editingText.revision}
          if(!editingText&&!roomForNote()){error('本面已满。先保留草稿并关闭编辑，再点击「开新墙」。');return}
          if(!validatePlacement())return
          previewNote.section=currentWall
          publishingText=true;button.disabled=true
          var stored=await persist(editingText?notes.map(function(n){return n.id===editingText.id?previewNote:n}):[previewNote].concat(notes));publishingText=false;button.disabled=false;if(!stored)return
          try{localStorage.setItem(wallPreference,String(currentWall))}catch(_){}
          textRecovery.clear();clearTimeout(textDraftTimer);var newId=previewNote.id;draftBaseline=null;if(editingText&&writeAnchor)layouts[layoutMode][newId]={x:writeAnchor.x,y:writeAnchor.y,z:notes.length+1};previewNote=null;draft={mode:'draw',strokes:[],text:'',name:draft.name,paper:draft.paper,ink:draft.ink,width:draft.width,medium:draft.medium,size:draft.size,sticker:draft.sticker,font:draft.font,fontSize:draft.fontSize};writeAnchor=null;restoreFocus=null;composer.close();renderWall(newId);status('已留在你选的位置。'+capacityText()+(wallNotes().length>=WALL_SIZE?' · 点击「开新墙」继续。':''))
          var pinned=Array.from(wall.querySelectorAll('[data-note]')).find(function(el){return el.dataset.note===newId});if(pinned){pinned.focus({preventScroll:true});}break
        case 'remove':
          if(!selected || selected.id==='sample')return
          var next=notes.filter(function(n){return n.id!==selected.id});if(!await persist(next))return;removed=selected;restoreFocus=null;detail.close();renderWall();status('已擦去这处痕迹。');$('[data-gb="undo-delete"]').hidden=false;$('[data-gb="undo-delete"]').focus();break
        case 'undo-delete':
          if(removed && await persist([removed].concat(notes))){currentWall=removed.section;renderWall(removed.id);removed=null;button.hidden=true;status('痕迹已恢复。');$('[data-wall-tool="ink"]').focus()}break
      }
    }, {signal:signal})
    ;[composer,detail].forEach(function(dialog){dialog.addEventListener('close',function(){stop();document.body.classList.remove('gb-dialog-open');if(dialog===detail&&restoreFocus&&restoreFocus.isConnected)restoreFocus.focus()},{signal:signal})})
    composer.addEventListener('close',function () {
      if(draft.text.trim()||draft.strokes.length||(draft.medium==='sticker'&&writeAnchor)){try{textRecovery.write({section:currentWall,draft:draft,anchor:writeAnchor,wallWidth:wall.clientWidth,editing:editingText})}catch(_){}}showTextRecovery()
      if(shared){clearTimeout(textLeaseTimer);shared.ignoreLease=null;shared.release(textLease).catch(function(){})}
      if(editingText&&!closingForMove){editingText=null;wall.querySelectorAll('.gb-editing-original').forEach(function(el){el.classList.remove('gb-editing-original')})}
      stage.hidden=true; root.classList.remove('is-writing'); writingHome.insertBefore(writing,$('[data-pen-tools]')); stage.replaceChildren(); wallLayout()
      if (!closingForMove) { cancelPlace(); if (restoreFocus && restoreFocus.isConnected) { restoreFocus.focus({preventScroll:true}) } }
      closingForMove = false
    },{signal:signal})
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ if(composer.open) composer.close(); else if(choosing) abandonPlacement() } },{signal:signal})
    root.querySelectorAll('[data-wall-tool="ink"],[data-wall-tool="engraving"]').forEach(function(b){b.querySelector('span').innerHTML=window.WallTools.toolArt(b.dataset.wallTool)})
    function cancelCameraGesture(){
      if(freeTools)freeTools.cancelGesture()
      if(activeStroke){draft.strokes=draft.strokes.filter(function(s){return s!==activeStroke});stop();redraw()}
      if(stageDrag){writeAnchor=stageDrag.anchor;stageDrag=null;positionStage()}
      finishPaper(true)
    }
    if(window.WallCamera)camera=window.WallCamera.mount({root:root,wall:wall,stage:stage,ghost:placementGhost,cancel:cancelCameraGesture,editing:function(){return choosing||composer.open||touchArrange||!!(freeTools&&freeTools.active())},changed:function(){if(freeTools)freeTools.viewportChanged();if(composer.open)validatePlacement()}})
    freeTools=window.WallTools.mount({root:root,wall:wall,zoom:viewZoom,key:KEY,section:function(){return currentWall},read:readNotes,carve:carvedArt,notice:status,changed:wallLayout,capacity:capacityText,type:function(medium){draft.medium=medium;draft.mode='text';writeAnchor=null;choosePlace(medium)},sync:function(){notes=readNotes();renderWall()},saved:function(n){notes=readNotes();renderWall(n.id);status('痕迹已保存。'+capacityText()+(wallNotes().length>=WALL_SIZE?' · 点击「开新墙」继续。':''))}})
    renderWall()
    var liveRefreshTimer=0
    function refreshShared(){if(signal.aborted)return;if(!shared.walls().some(function(w){return w.id===currentWall})){if(composer.open||choosing||(freeTools&&freeTools.active())){status('这面墙已由管理员移除，草稿仍保留。恢复墙面后可继续提交。');return}changeWall(shared.walls()[0].id);status('原墙已移入删除档案，已为你打开另一面墙。');return}if((drag&&drag.active)||(freeTools&&freeTools.busy())||stageDrag){clearTimeout(liveRefreshTimer);liveRefreshTimer=setTimeout(refreshShared,80);return}notes=readNotes();renderWall();if(editingText){var original=Array.from(wall.querySelectorAll('[data-note]')).find(function(el){return el.dataset.note===editingText.id});if(original)original.classList.add('gb-editing-original')}if(book.open)renderBook()}
    var unsubscribe=shared?shared.subscribe(function(contentChanged){if(contentChanged===false){if(freeTools)freeTools.presence();return}refreshShared()}):function(){}
    showTextRecovery();
    cleanup=function(){if(previewObserver)previewObserver.disconnect();bookPreviews.clear();clearTimeout(liveRefreshTimer);backupText();clearTimeout(textDraftTimer);unsubscribe();clearTimeout(textLeaseTimer);clearInterval(textLeaseBeat);if(shared){shared.ignoreLease=null;shared.release(textLease).catch(function(){})}unsaved=function(){return false};cancelAnimationFrame(placeFrame);clearTimeout(fontRefreshTimer);clearTimeout(locatedTimer);if(book.open)book.close();if(freeTools)freeTools.destroy();if(camera)camera.destroy();clearTimeout(statusTimer);finishPaper(true);if(wallObserver)wallObserver.disconnect();if(visibilityObserver)visibilityObserver.disconnect();controller.abort();if(composer.open)composer.close();if(detail.open)detail.close();document.body.classList.remove('gb-dialog-open')}
  }
  window.Guestbook={mount:mount,hasUnsavedChanges:function(){return unsaved()},confirmLeave:function(){return !unsaved() || window.confirm('墙上还有尚未保存的内容。已备份的草稿可在原窗口恢复；未完成的提交不会发布。确定离开吗？')},destroy:function(){cleanup();cleanup=function(){}}}
})()
