(function () {
  var WORLD = 1000, TTL = 15000
  var inks = ['#343832','#3f5870','#a45743','#e9edcf','#d7f557','#6286ee','#f47760']
  function toolArt(kind) {
    return kind === 'ink' ? '<svg viewBox="0 0 80 120" aria-hidden="true"><defs><linearGradient id="can-metal"><stop stop-color="#526169"/><stop offset=".3" stop-color="#d2d9d5"/><stop offset=".65" stop-color="#8c9999"/><stop offset="1" stop-color="#35494e"/></linearGradient></defs><path d="M27 29q0-9 7-11h16q7 2 7 11" fill="#b3bdb8"/><path d="M34 18V9h16v9" fill="#272d2a"/><path d="M34 10h6v5h-6" fill="#e9eee7"/><rect x="24" y="29" width="36" height="78" rx="7" fill="url(#can-metal)" stroke="#36433e"/><path d="M25 49h34v42H25Z" fill="var(--paint,#3f5870)"/><path d="m33 62 16-5-12 18 14-4" fill="none" stroke="#f7efdc" stroke-width="3"/><path d="M29 101h26" stroke="#e0e3d6"/><path class="nozzle-mist" d="M34 12 2 2v25Z" fill="var(--paint)" opacity=".18"/></svg>' : '<svg viewBox="0 0 80 120" aria-hidden="true"><defs><linearGradient id="knife-steel"><stop stop-color="#f4eee0"/><stop offset=".45" stop-color="#b5b9ad"/><stop offset="1" stop-color="#5d6862"/></linearGradient></defs><path d="m12 10 27 16 9 24-15 8Z" fill="url(#knife-steel)" stroke="#5a625b"/><path d="m12 10 21 48 4-23Z" fill="#e9e8d6"/><path d="m34 49 14-7 26 52q3 11-9 16-10 4-15-5Z" fill="#99724d" stroke="#513e2c"/><path d="m41 56 20 45m-14-49 21 45" stroke="#c5a677" opacity=".6"/><path d="m31 49 18-9 5 9-18 10Z" fill="#555d51"/></svg>'
  }
  // Reuse small, deterministic pigment stamps. A moving nozzle should not build
  // a gradient and dozens of paths for every interpolated point.
  var sprayStamps = new Map()
  function sprayStamp(ink,variant) {
    var key=ink+':'+variant
    if(sprayStamps.has(key))return sprayStamps.get(key)
    var c=document.createElement('canvas');c.width=c.height=80
    var ctx=c.getContext('2d'),state=variant*977+17,r=32
    function random(){state=(state*1664525+1013904223)>>>0;return state/4294967296}
    var g=ctx.createRadialGradient(40,40,0,40,40,r)
    g.addColorStop(0,ink+'42');g.addColorStop(.52,ink+'28');g.addColorStop(.82,ink+'10');g.addColorStop(1,ink+'00')
    ctx.fillStyle=g;ctx.fillRect(0,0,80,80)
    for(var j=0;j<150;j++){var a=random()*Math.PI*2,d=Math.sqrt(random())*r*1.12,falloff=Math.max(.08,1-d/(r*1.15));ctx.globalAlpha=falloff*(.28+random()*.45);ctx.fillStyle=ink;ctx.beginPath();ctx.arc(40+Math.cos(a)*d,40+Math.sin(a)*d,.35+random()*.75,0,Math.PI*2);ctx.fill()}
    if(sprayStamps.size>=32)sprayStamps.delete(sprayStamps.keys().next().value)
    sprayStamps.set(key,c);return c
  }
  function sprayPoint(ctx,x,y,r,ink,seed) {
    var stamp=sprayStamp(ink,Math.abs(seed)%8),extent=r*1.25
    ctx.drawImage(stamp,x-extent,y-extent,extent*2,extent*2)
  }
  function paintStroke(ctx,s,width,height) {
    s.points.forEach(function(p,i){var x=p[0]*width,y=p[1]*height,prev=s.points[Math.max(0,i-1)],dx=x-prev[0]*width,dy=y-prev[1]*height,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(2,s.width*.3)))
      for(var k=1;k<=n;k++)sprayPoint(ctx,x-dx+dx*k/n,y-dy+dy*k/n,s.width,s.ink,i*977+k*31)
    })
  }
  function paintArt(note) {
    var c=document.createElement('canvas'),f=note.frame;c.width=Math.ceil(f.width*1.5);c.height=Math.ceil(f.height*1.5)
    c.setAttribute('role','img');c.setAttribute('aria-label','喷漆留下的涂鸦');var ctx=c.getContext('2d');ctx.scale(1.5,1.5)
    note.strokes.forEach(function(s){paintStroke(ctx,s,f.width,f.height)});return c
  }
  // Capsules follow the visible brush width; broad-phase buckets are only an index.
  function pointDistance(p,a,b){var x=b[0]-a[0],y=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/(x*x+y*y||1)));return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y)}
  function segmentDistance(a,b,c,d){
    var ux=b[0]-a[0],uy=b[1]-a[1],vx=d[0]-c[0],vy=d[1]-c[1],den=ux*vy-uy*vx
    if(Math.abs(den)>1e-10){var x=c[0]-a[0],y=c[1]-a[1],t=(x*vy-y*vx)/den,u=(x*uy-y*ux)/den;if(t>=0&&t<=1&&u>=0&&u<=1)return 0}
    return Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b))
  }
  function capsuleBox(s){return {x:Math.min(s.a[0],s.b[0])-s.r,y:Math.min(s.a[1],s.b[1])-s.r,width:Math.abs(s.a[0]-s.b[0])+s.r*2,height:Math.abs(s.a[1]-s.b[1])+s.r*2}}
  function capsuleHitsRect(s,b){
    function inside(p){return p[0]>=b.x&&p[0]<=b.x+b.width&&p[1]>=b.y&&p[1]<=b.y+b.height}
    if(inside(s.a)||inside(s.b))return true
    var p=[[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height]]
    return p.some(function(a,i){return segmentDistance(s.a,s.b,a,p[(i+1)%4])<=s.r})
  }
  function cellRange(b,size,visit){for(var y=Math.floor(b.y/size);y<=Math.floor((b.y+b.height)/size);y++)for(var x=Math.floor(b.x/size);x<=Math.floor((b.x+b.width)/size);x++)visit(x,y)}
  function collisionIndex(){var buckets=new Map();return {
    add:function(shape){cellRange(shape.a?capsuleBox(shape):shape,32,function(x,y){var key=x+','+y;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(shape)})},
    rectHits:function(rect){var found=false,seen=new Set();cellRange(rect,32,function(x,y){if(found)return;(buckets.get(x+','+y)||[]).some(function(b){if(seen.has(b))return false;seen.add(b);found=b.a?capsuleHitsRect(b,rect):rect.x<b.x+b.width&&rect.x+rect.width>b.x&&rect.y<b.y+b.height&&rect.y+rect.height>b.y;return found})});return found},
    hits:function(s){var found=false,seen=new Set();cellRange(capsuleBox(s),32,function(x,y){if(found)return;(buckets.get(x+','+y)||[]).some(function(b){if(seen.has(b))return false;seen.add(b);found=b.a?segmentDistance(s.a,s.b,b.a,b.b)<=s.r+b.r:capsuleHitsRect(s,b);return found})});return found}
  }}
  function leaseCells(segment){
    var cells=[],b=capsuleBox(segment),dx=segment.b[0]-segment.a[0],dy=segment.b[1]-segment.a[1],r=segment.r
    // Limit each row to the swept capsule, rather than scanning a diagonal's
    // entire bounding rectangle. The final exact intersection stays unchanged.
    for(var y=Math.max(0,Math.floor(b.y/8));y<=Math.floor((b.y+b.height)/8);y++){
      var low=0,high=1
      if(Math.abs(dy)>1e-10){var t1=(y*8-r-segment.a[1])/dy,t2=((y+1)*8+r-segment.a[1])/dy;low=Math.max(0,Math.min(t1,t2));high=Math.min(1,Math.max(t1,t2));if(low>high)continue}
      var a=segment.a[0]+dx*low,z=segment.a[0]+dx*high
      for(var x=Math.max(0,Math.floor((Math.min(a,z)-r)/8));x<=Math.min(124,Math.floor((Math.max(a,z)+r)/8));x++)if(capsuleHitsRect(segment,{x:x*8,y:y*8,width:8,height:8}))cells.push(y*128+x)
    }
    return cells
  }
  // Each tab keeps its own recovery slot; two visitors never overwrite a draft.
  function draftStore(key) {
    var tab;try{tab=sessionStorage.getItem('wall-draft-tab');if(!tab){tab=crypto.randomUUID();sessionStorage.setItem('wall-draft-tab',tab)}}catch(_){tab='recovery'}
    function slot(){return (typeof key==='function'?key():key)+'-draft-'+tab}
    return {read:function(){try{return JSON.parse(localStorage.getItem(slot())||'null')}catch(_){return null}},write:function(value){localStorage.setItem(slot(),JSON.stringify(value))},clear:function(){localStorage.removeItem(slot())}}
  }
  function mount(o) {
    var shared=window.SharedWall,remoteTimer=0
    var root=o.root,wall=o.wall,key=o.key,leaseKey=key+'-live-leases',controller=new AbortController(),signal=controller.signal
    var owner='',active=false,medium='ink',color=inks[1],width=14,strokes=[],bounds=null,held=null,editing=null,editingSource='',initialStrokes='[]',erasing=false,history=[]
    var pending=[],inflight=null,frameRequest=0,settleTimer=0,heartbeat=0,ending=false,generation=0,lastPoint=null,protectedInk=collisionIndex(),protectedIgnore=null,sceneStamp='',sceneDirty=true,pointCount=0,wallScale=0,pixelScale=1,presenceTimer=0
    var layer=document.createElement('div');layer.className='gb-free-layer';layer.hidden=true
    var canvas=document.createElement('canvas');canvas.setAttribute('aria-label','整面墙自由创作区，按住喷绘或刻画');canvas.tabIndex=0
    var carving=document.createElement('div');carving.className='gb-free-carving';layer.append(canvas,carving);wall.after(layer)
    var presence=document.createElement('div');presence.className='gb-wall-presence';wall.after(presence)
    var cursor=document.createElement('div');cursor.className='gb-real-tool';cursor.hidden=true;cursor.style.left='0';cursor.style.top='0';root.append(cursor)
    var warning=document.createElement('div');warning.className='gb-paint-warning';warning.hidden=true;warning.setAttribute('role','status');root.append(warning)
    var panel=document.createElement('div');panel.className='gb-free-panel';panel.hidden=true
    panel.innerHTML='<div class="gb-free-instrument" aria-hidden="true"></div><div class="gb-free-controls"><div class="gb-free-heading"><strong data-title></strong><small data-capacity></small><span data-instruction></span></div><div class="gb-free-colors" aria-label="喷漆颜色">'+inks.map(function(ink,i){return '<button data-color="'+ink+'" style="--swatch:'+ink+'" aria-label="'+['石墨','靛蓝','赭红','粉白','黄绿','钴蓝','珊瑚橘'][i]+'喷漆"></button>'}).join('')+'</div><div class="gb-free-actions"><label>笔触 <select aria-label="喷幅或刻刀宽度" data-brush><option value="7">细</option><option value="14" selected>中</option><option value="26">宽</option></select></label><button data-action="move" aria-pressed="false">整幅挪位置</button><button data-action="undo">撤回</button><button data-action="erase" aria-pressed="false">擦除笔画</button><button data-action="text">打字</button><button data-action="sound" aria-pressed="false">声音关</button><button data-action="cancel">放回工具</button><button data-action="finish" class="gb-free-finish">完成 · 留在墙上</button></div><p data-feedback role="status">创作占位自动续期，完成后确认保存</p></div>'
    root.append(panel)
    var sound=false,audio=null,hiss=null,warningTimer=0,moving=false,moveDrag=null,draftTimer=0
    var recovery=draftStore(function(){return key+'-free-'+o.section()}),resume=document.createElement('button'),discard=document.createElement('button'),selection=document.createElement('div')
    resume.className='gb-draft-resume';resume.textContent='继续未完成的笔迹';root.append(resume);discard.className='gb-draft-resume';discard.style.left='220px';discard.textContent='放弃笔迹草稿';root.append(discard);discard.addEventListener('click',function(){if(window.confirm('放弃这份未完成的笔迹？已保存到墙上的作品不会改变。')){recovery.clear();showRecovery()}},{signal:signal})
    selection.className='gb-free-selection';selection.hidden=true;layer.append(selection)
    function showRecovery(){var saved=recovery.read();resume.hidden=active||!saved||saved.section!==o.section();discard.hidden=resume.hidden}
    function saveDraft(){clearTimeout(draftTimer);if(!active)return;try{if(dirty()&&strokes.some(function(st){return st.points.length}))recovery.write({section:o.section(),owner:owner,medium:medium,color:color,width:width,strokes:JSON.parse(strokeSnapshot()),editing:editing,initial:initialStrokes});else recovery.clear()}catch(_){feedback('浏览器无法备份草稿，请保持此页打开并完成保存。')}}
    function queueDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(saveDraft,250)}
    function moveOutline(){selection.hidden=!moving||!bounds;if(!selection.hidden){var s=scale();Object.assign(selection.style,{left:bounds.x*s+'px',top:bounds.y*s+'px',width:bounds.width*s+'px',height:bounds.height*s+'px'})}}
    function setMoving(value){moving=value;moveDrag=null;layer.classList.toggle('is-moving',value);panel.querySelector('[data-action="move"]').setAttribute('aria-pressed',String(value));moveOutline();if(value){cursor.hidden=true;feedback('拖动框内笔迹，把整幅作品挪到空处；再点完成保存。')}}
    resume.addEventListener('click',async function(){var saved=recovery.read();if(!saved||saved.section!==o.section())return;await start(saved.medium,null,true);owner=saved.owner;medium=saved.medium;color=saved.color;width=saved.width;panel.querySelector('[data-brush]').value=String(width);root.style.setProperty('--paint',color);panel.querySelectorAll('[data-color]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.color===color))});strokes=saved.strokes;editing=saved.editing;editingSource=editing?JSON.stringify(editing):'';initialStrokes=saved.initial;remeasure();hideOriginal();redraw();finishTexture();setMoving(true);resume.hidden=true;feedback('已恢复草稿，可继续画，也可整幅挪位置。');claim().catch(function(e){feedback(e.message+'；草稿已恢复，请整幅挪到空处。')})},{signal:signal})
    showRecovery()
    function audioStop(){if(hiss){hiss.stop();hiss=null}}
    function audioStart(){if(!sound||erasing)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume();var b=audio.createBuffer(1,audio.sampleRate,audio.sampleRate),data=b.getChannelData(0);for(var i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.12;hiss=audio.createBufferSource();hiss.buffer=b;hiss.loop=true;var f=audio.createBiquadFilter();f.type=medium==='ink'?'highpass':'bandpass';f.frequency.value=medium==='ink'?1400:2300;hiss.connect(f);f.connect(audio.destination);hiss.start()}catch(_){}}
    function feedback(text){var el=panel.querySelector('[data-feedback]');if(el.textContent!==text)el.textContent=text}
    function warn(p){var r=wall.getBoundingClientRect(),s=viewScale();warning.textContent='这里已有题字或留言，请绕开';warning.hidden=false;warning.style.left=Math.max(8,Math.min(innerWidth-190,r.left+p[0]*s+18))+'px';warning.style.top=Math.max(8,r.top+p[1]*s-34)+'px';clearTimeout(warningTimer);warningTimer=setTimeout(function(){warning.hidden=true},1300);cursor.classList.add('is-blocked');feedback('已保护原有痕迹，冲突位置不会落墨。');audioStop()}
    function scale(){return wallScale||(wall.clientWidth/WORLD)}
    function viewScale(){return scale()*(o.zoom?o.zoom():1)}
    function rectAt(e,r){r=r||wall.getBoundingClientRect();var s=viewScale();return [(e.clientX-r.left)/s,(e.clientY-r.top)/s,Math.max(0,Math.min(1,e.pressure||.5))]}
    function leases(){if(shared)return shared.leases();try{var all=JSON.parse(localStorage.getItem(leaseKey)||'{}');Object.keys(all).forEach(function(id){if(all[id].expires<Date.now())delete all[id]});return all}catch(_){return {}}}
    function transact(fn){if(shared)return Promise.resolve().then(fn);if(!navigator.locks)return Promise.reject(Error('当前浏览器不支持安全占位，请使用新版浏览器。'));return navigator.locks.request(key+'-mutation',fn)}
    function isOwn(el){return editing && el.dataset.note===editing.id}
    function hideOriginal(){wall.querySelectorAll('[data-note]').forEach(function(el){el.classList.toggle('gb-editing-original',!!isOwn(el))})}
    function brushRadius(kind,width){return kind==='ink'?width*1.15+1:width*.5+1.5}
    function sweep(a,b,stroke,kind){return {a:a,b:b,r:brushRadius(kind||medium,stroke.width)+2/scale()}}
    function sceneVersion(){if(shared)return String(shared.version());return (localStorage.getItem(key)||'')+'|'+(localStorage.getItem(key+'-positions-organic-v1')||'')}
    function refreshBoxes(ignoreId){
      protectedIgnore=ignoreId||null;wallScale=wall.clientWidth/WORLD
      var r=wall.getBoundingClientRect(),s=viewScale(),items=o.read();protectedInk=collisionIndex()
      function rect(el){var b=el.getBoundingClientRect();protectedInk.add({x:(b.left-r.left)/s,y:(b.top-r.top)/s,width:b.width/s,height:b.height/s})}
      items.filter(function(n){return n.section===o.section()&&n.id!==ignoreId&&(!editing||n.id!==editing.id)}).forEach(function(n){
        var el=Array.from(wall.querySelectorAll('[data-note]')).find(function(el){return el.dataset.note===n.id})
        if(n.frame){n.strokes.forEach(function(st){var points=st.points.map(function(p){return [n.frame.x+p[0]*n.frame.width,n.frame.y+p[1]*n.frame.height]});points.forEach(function(p,i){protectedInk.add({a:points[Math.max(0,i-1)],b:p,r:brushRadius(n.medium,st.width)})})});return}
        if(!el)return
        if(n.mode==='draw'&&['ink','engraving'].includes(n.medium)){
          var paths=Array.from(el.querySelectorAll('.gb-note-content svg path'))
          if(paths.length&&paths.every(function(path){return typeof path.getTotalLength==='function'})){paths.forEach(function(path){var m=path.getScreenCTM(),length=path.getTotalLength();if(!m)return;var factor=Math.hypot(m.a,m.b)/s,steps=Math.max(1,Math.ceil(length*factor/3)),radius=Number(path.getAttribute('stroke-width'))*factor*.5+1.5,previous
            for(var i=0;i<=steps;i++){var p=path.getPointAtLength(length*i/steps),q=[(m.a*p.x+m.c*p.y+m.e-r.left)/s,(m.b*p.x+m.d*p.y+m.f-r.top)/s];protectedInk.add({a:previous||q,b:q,r:radius});previous=q}
          });return}
        }
        rect(el)
      })
      root.querySelectorAll('[data-wall-protected]').forEach(rect);sceneStamp=sceneVersion();sceneDirty=false;hideOriginal()
    }
    function currentScene(force){if(!force&&!sceneDirty)return;sceneDirty=false;var next=sceneVersion();if(sceneStamp!==next){sceneStamp=next;o.sync();refreshBoxes()}}
    function canPlace(box,ignoreId){currentScene(true);if(protectedIgnore!==(ignoreId||null))refreshBoxes(ignoreId);var s=scale(),b={x:box.x/s,y:box.y/s,width:box.width/s,height:box.height/s},other=peers(leases()),hit=protectedInk.rectHits(b);if(!hit)cellRange(b,8,function(x,y){if(other.cells.has(y*128+x))hit=true});return !hit&&!other.old.some(function(r){return b.x<r.x+r.width&&b.x+b.width>r.x&&b.y<r.y+r.height&&b.y+b.height>r.y})}
    function draftSegments(){var all=[];strokes.forEach(function(st){st.points.forEach(function(p,i){all.push(sweep(st.points[Math.max(0,i-1)],p,st))})});return all}
    function draftConflicts(){return draftSegments().some(function(segment){return protectedInk.hits(segment)})}
    function peers(all){var cells=new Set(),old=[];Object.entries(all).forEach(function(pair){var p=pair[1];if(pair[0]===owner||(shared&&pair[0]===shared.ignoreLease)||p.wall!==o.section()||p.expires<Date.now())return;if(Array.isArray(p.cells))p.cells.forEach(function(c){cells.add(c)});else old.push(p.box)});return {cells:cells,old:old}}
    function peerHits(segment,cells,other){return cells.some(function(c){return other.cells.has(c)})||other.old.some(function(b){return capsuleHitsRect(segment,b)})}
    function writeLease(all,cells){if(shared){if(!remoteTimer)remoteTimer=setTimeout(function(){remoteTimer=0;if(active&&bounds)claim().catch(function(e){feedback(e.message+'；当前草稿尚未提交。')})},250);return}var entry={wall:o.section(),box:bounds,cells:Array.from(cells),expires:Date.now()+TTL,note:editing?editing.id:null};all[owner]=entry;localStorage.setItem(leaseKey,JSON.stringify(all))}
    function union(a,b){if(!a)return Object.assign({},b);var x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);return {x:x,y:y,width:Math.max(a.x+a.width,b.x+b.width)-x,height:Math.max(a.y+a.height,b.y+b.height)-y}}
    function pointBox(p,s){var r=medium==='ink'?s.width*1.35+4:s.width+5;return {x:Math.max(0,p[0]-r),y:Math.max(0,p[1]-r),width:Math.min(WORLD,p[0]+r)-Math.max(0,p[0]-r),height:p[1]+r-Math.max(0,p[1]-r)}}
    async function claim(){if(shared){var cells=new Set();draftSegments().forEach(function(seg){leaseCells(seg).forEach(function(c){cells.add(c)})});await shared.reserve(owner,o.section(),Array.from(cells),editing&&editing.id);return true}return transact(function(){currentScene(true);var all=leases(),other=peers(all),cells=new Set(),segments=draftSegments();if(segments.some(function(segment){var covered=leaseCells(segment);covered.forEach(function(c){cells.add(c)});return protectedInk.hits(segment)||peerHits(segment,covered,other)}))return false;writeLease(all,cells);return true})}
    function release(){var id=owner;if(shared){clearTimeout(remoteTimer);remoteTimer=0;return shared.release(id).catch(function(){})}return transact(function(){var all=leases();delete all[id];localStorage.setItem(leaseKey,JSON.stringify(all))}).catch(function(){})}
    function showPresence(){var s=scale(),all=leases();presence.replaceChildren();presence.style.left=wall.offsetLeft+'px';presence.style.top=wall.offsetTop+'px';Object.entries(all).forEach(function(pair){var p=pair[1];if(pair[0]===owner||(shared&&pair[0]===shared.ignoreLease)||p.wall!==o.section()||p.expires<Date.now())return
      if(Array.isArray(p.cells)){var art=document.createElementNS('http://www.w3.org/2000/svg','svg');art.setAttribute('class','gb-peer-trace');art.setAttribute('aria-label','另一窗口正在创作的笔迹');art.style.width=wall.clientWidth+'px';art.style.height=wall.clientHeight+'px';var path=document.createElementNS(art.namespaceURI,'path');path.setAttribute('d',p.cells.map(function(c){var x=c%128*8*s,y=Math.floor(c/128)*8*s,k=8*s;return 'M'+x+' '+y+'h'+k+'v'+k+'h-'+k+'Z'}).join(''));art.append(path);presence.append(art)}
      else if(p.box){var box=document.createElement('div');box.className='gb-other-painter';box.textContent='另一窗口正在创作';Object.assign(box.style,{left:p.box.x*s+'px',top:p.box.y*s+'px',width:p.box.width*s+'px',height:p.box.height*s+'px'});presence.append(box)}
    })}
    function fit(){wallScale=wall.clientWidth/WORLD;var s=scale(),height=Math.max(wall.clientHeight,window.innerHeight*1.7,bounds?(bounds.y+bounds.height+120)*s:0);if(active)wall.style.height=height+'px';Object.assign(layer.style,{left:wall.offsetLeft+'px',top:wall.offsetTop+'px',width:wall.clientWidth+'px',height:height+'px'});pixelScale=Math.max(1,s*Math.min(window.devicePixelRatio||1,2));canvas.width=Math.ceil(WORLD*pixelScale);canvas.height=Math.ceil(height/s*pixelScale);canvas.getContext('2d').setTransform(pixelScale,0,0,pixelScale,0,0);refreshBoxes();showPresence();redraw();if(!held)finishTexture()}
    function note(){var b=bounds;return Object.assign({},editing||{id:owner,paper:'ivory',size:'medium',text:'',name:'',date:new Date().toLocaleDateString('zh-CN'),section:o.section()},{layout:3,medium:medium,mode:'draw',anchor:null,frame:Object.assign({},b),strokes:strokes.filter(function(s){return s.points.length}).map(function(s){return {ink:s.ink,width:s.width,points:s.points.map(function(p){return [(p[0]-b.x)/b.width,(p[1]-b.y)/b.height,p[2]]})}})})}
    function paintSegment(ctx,s,previous,p,index){
      if(medium==='ink'){var dx=p[0]-previous[0],dy=p[1]-previous[1],n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(2,s.width*.3)));for(var k=1;k<=n;k++)sprayPoint(ctx,p[0]-dx+dx*k/n,p[1]-dy+dy*k/n,s.width,s.ink,index*977+k*31)}
      else {
        // Light comes from above-left: the inner upper-left wall is dark, while
        // the lower-right floor catches light. No bright outside bevel or shadow.
        ctx.lineCap='round';ctx.lineJoin='round'
        ;[[s.width,0,0,'#816447'],[s.width*.66,.28,.38,'#ad906a'],[Math.max(.4,s.width*.2),s.width*.2,s.width*.24,'#c0a47c']].forEach(function(layer){ctx.lineWidth=layer[0];ctx.strokeStyle=layer[3];ctx.beginPath();ctx.moveTo(previous[0]+layer[1],previous[1]+layer[2]);ctx.lineTo(p[0]+layer[1]+.01,p[1]+layer[2]);ctx.stroke()})
      }
    }
    function redraw(){var ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);canvas.style.opacity='1';carving.replaceChildren();strokes.forEach(function(s){s.points.forEach(function(p,i){paintSegment(ctx,s,s.points[Math.max(0,i-1)],p,i)})})}
    function finishTexture(){clearTimeout(settleTimer);settleTimer=setTimeout(function(){if(!active||held||pending.length||inflight||!bounds||medium!=='engraving')return;var s=scale();Object.assign(carving.style,{left:bounds.x*s+'px',top:bounds.y*s+'px',width:bounds.width*s+'px',height:bounds.height*s+'px'});carving.replaceChildren(o.carve(note()));canvas.style.opacity='0'},80)}
    function strokeSnapshot(){return JSON.stringify(strokes.filter(function(st){return st.points.length}).map(function(st){return {ink:st.ink,width:st.width,points:st.points}}))}
    function dirty(){return active && (!!pending.length || !!inflight || strokeSnapshot()!==initialStrokes)}
    function remember(){history.push(JSON.stringify(strokes.map(function(st){return {ink:st.ink,width:st.width,points:st.points}})));if(history.length>20)history.shift()}
    function remeasure(){bounds=null;pointCount=0;strokes.forEach(function(s){s.points.forEach(function(p){bounds=union(bounds,pointBox(p,s));pointCount++})})}
    function distance(p,a,b){var dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
    function eraseAt(p){var before=strokes.length;strokes=strokes.filter(function(s){return !s.points.some(function(q,i){return distance(p,s.points[Math.max(0,i-1)],q)<12/viewScale()+s.width})});if(before!==strokes.length){remeasure();return true}return false}
    async function flush(){
      if(inflight){await inflight;if(pending.length)return flush();return}
      if(!pending.length)return
      var batch=pending.splice(0),token=generation
      inflight=(async function(){if(!active)return
        try{await transact(function(){if(!active||token!==generation)return;currentScene();var all=leases(),other=peers(all),existing=all[owner],cells=new Set(existing&&existing.expires>Date.now()?existing.cells||[]:[]),changed=false,erased=false,accepted=false,blocked=false,limited=false,ctx=canvas.getContext('2d')
          batch.forEach(function(item){
            if(item.erase){erased=eraseAt(item.p)||erased;return}if(pointCount>=6000){limited=true;return}
            var source=item.stroke,st=source.fragment||source,prev=source.cut?item.p:st.points[st.points.length-1]||item.p
            if(item.p[0]<0||item.p[0]>WORLD||item.p[1]<0){source.cut=true;return}
            var segment=sweep(prev,item.p,st),covered=leaseCells(segment)
            if(protectedInk.hits(segment)||peerHits(segment,covered,other)){source.cut=true;blocked=true;warn(item.p);return}
            if(source.cut&&st.points.length){if(strokes.length>=150)return;st={ink:source.ink,width:source.width,points:[]};source.fragment=st;strokes.push(st)}source.cut=false
            covered.forEach(function(c){if(!cells.has(c)){cells.add(c);changed=true}})
            paintSegment(ctx,st,prev,item.p,st.points.length);st.points.push(item.p);bounds=union(bounds,pointBox(item.p,st));pointCount++;accepted=true
          })
          if(erased){redraw();feedback('已擦除整笔；可点「撤回」恢复。');cells=new Set();draftSegments().forEach(function(seg){leaseCells(seg).forEach(function(c){cells.add(c)})});changed=true}
          if(accepted){canvas.style.opacity='1';carving.replaceChildren();if(!blocked){cursor.classList.remove('is-blocked');warning.hidden=true;feedback('松开可以继续下一笔；完成后按实际笔迹收拢范围。')}}
          if(limited)feedback('这处笔迹已到保存上限，请先完成，再接着画。');
          if((changed||!existing||existing.expires<Date.now())&&bounds)writeLease(all,cells);else if(erased&&!bounds){delete all[owner];localStorage.setItem(leaseKey,JSON.stringify(all))}
        })}catch(e){feedback(e.message||'占位失败，笔迹未保存。');audioStop()}
      })();await inflight;inflight=null;queueDraft();if(pending.length)schedule();else if(!held)finishTexture()
    }
    function schedule(){if(!frameRequest)frameRequest=requestAnimationFrame(function(){frameRequest=0;flush()})}
    function enqueue(p,stroke,erase){pending.push({p:p,stroke:stroke,erase:erase});schedule()}
    async function drain(){cancelAnimationFrame(frameRequest);frameRequest=0;await flush();while(pending.length||inflight)await flush()}
    function toolMove(e,r){lastPoint=rectAt(e,r);if(!active||e.pointerType==='touch'){cursor.hidden=true;return}cursor.hidden=false;cursor.style.translate=e.clientX+'px '+e.clientY+'px'}
    function cancelGesture(){
      if(!held&&!moveDrag)return
      generation++;pending=[];cancelAnimationFrame(frameRequest);frameRequest=0;penUp();moveDrag=null
      if(history.length)strokes=JSON.parse(history.pop())
      remeasure();redraw();finishTexture();moveOutline();saveDraft()
      if(bounds)claim().catch(function(e){feedback(e.message)});else release()
    }
    function penUp(){held=null;cursor.classList.remove('is-working');audioStop();finishTexture()}
    canvas.addEventListener('pointerdown',function(e){if(!active||ending||held||moveDrag||e.button!==0||!e.isPrimary)return;if(!moving&&!erasing&&strokes.length>=150){feedback('这一处已有很多笔，请先完成。');return}e.preventDefault();canvas.setPointerCapture(e.pointerId);if(moving){var p=rectAt(e);if(!bounds||p[0]<bounds.x||p[0]>bounds.x+bounds.width||p[1]<bounds.y||p[1]>bounds.y+bounds.height)return;remember();moveDrag={pointer:e.pointerId,start:p,strokes:JSON.parse(strokeSnapshot()),box:Object.assign({},bounds)};release();return}remember();var s={ink:color,width:Math.min(160,(medium==='ink'?width:width*.28)),points:[]};if(!erasing)strokes.push(s);held={pointer:e.pointerId,stroke:s};toolMove(e);cursor.classList.add('is-working');enqueue(lastPoint,s,erasing);audioStart()},{signal:signal})
    canvas.addEventListener('pointermove',function(e){if((held&&held.pointer!==e.pointerId)||(moveDrag&&moveDrag.pointer!==e.pointerId))return;var rect=wall.getBoundingClientRect();toolMove(e,rect);if(moving){cursor.hidden=true;if(moveDrag&&moveDrag.pointer===e.pointerId){e.preventDefault();var p=rectAt(e,rect),b=moveDrag.box,dx=Math.max(-b.x,Math.min(WORLD-b.x-b.width,p[0]-moveDrag.start[0])),dy=Math.max(-b.y,Math.min(10000-b.y-b.height,p[1]-moveDrag.start[1]));strokes=moveDrag.strokes.map(function(st){return {ink:st.ink,width:st.width,points:st.points.map(function(q){return [q[0]+dx,q[1]+dy,q[2]]})}});remeasure();redraw();finishTexture();moveOutline();queueDraft()}return}if(!held||held.pointer!==e.pointerId)return;e.preventDefault();var events=e.getCoalescedEvents?e.getCoalescedEvents():[e];if(!events.length)events=[e];events.forEach(function(sample){var p=rectAt(sample,rect),prev=held.last||lastQueued(held.stroke);if(!prev||p[0]!==prev[0]||p[1]!==prev[1]){enqueue(p,held.stroke,erasing);held.last=p}})},{signal:signal})
    function lastQueued(stroke){return pending.length?pending[pending.length-1].p:(stroke.fragment||stroke).points[(stroke.fragment||stroke).points.length-1]}
    canvas.addEventListener('pointerup',function(e){if(moveDrag&&moveDrag.pointer===e.pointerId){moveDrag=null;saveDraft();claim().then(function(){feedback('位置已调整，可以保存。')}).catch(function(err){feedback(err.message+'；请继续挪动，草稿不会清除。')});return}if(!held||held.pointer!==e.pointerId)return;var p=rectAt(e),prev=held.last||lastQueued(held.stroke);if(!prev||p[0]!==prev[0]||p[1]!==prev[1])enqueue(p,held.stroke,erasing);penUp()},{signal:signal})
    ;['pointercancel','lostpointercapture'].forEach(function(type){canvas.addEventListener(type,function(e){if(moveDrag&&moveDrag.pointer===e.pointerId){moveDrag=null;saveDraft()}if(held&&held.pointer===e.pointerId)penUp()},{signal:signal})});canvas.addEventListener('pointerleave',function(){cursor.hidden=true},{signal:signal})
    var sprayTimer=setInterval(function(){if(active&&held&&!erasing&&medium==='ink'&&lastPoint)enqueue(lastPoint,held.stroke,false)},100)
    function end(saved){if(!saved)saveDraft();else{clearTimeout(draftTimer);recovery.clear()}setMoving(false);active=false;generation++;pending=[];cancelAnimationFrame(frameRequest);frameRequest=0;penUp();clearInterval(heartbeat);clearTimeout(settleTimer);cursor.hidden=true;warning.hidden=true;panel.hidden=true;layer.hidden=true;root.classList.remove('is-free-painting','is-free-review');release();editing=null;hideOriginal();o.changed();showRecovery()}
    function useEraser(value){erasing=value;cursor.dataset.tool=value?'eraser':medium;cursor.innerHTML=value?'<svg viewBox="0 0 80 120" aria-hidden="true"><path d="m12 24 34-14 23 64-34 14Z" fill="#d3a79a" stroke="#9c7869"/><path d="m20 45 34-14 15 43-34 14Z" fill="#e9dcca"/><path d="m35 88 34-14-7 9-23 11Z" fill="#a88a77"/></svg>':toolArt(medium);panel.querySelector('[data-action="erase"]').setAttribute('aria-pressed',String(value));panel.querySelector('[data-instruction]').textContent=value?'碰到哪一笔，就擦除那一笔':medium==='ink'?'按住喷涂 · 停留会加深':'按住刻画 · 松开收刀'}
    async function start(kind,existing,restoring){
      if(active)return;if(recovery.read()&&!restoring){showRecovery();o.notice('先继续未完成的笔迹，或放弃草稿后重新创作。');return}resume.hidden=true;discard.hidden=true;owner=crypto.randomUUID();medium=kind;active=true;ending=false;strokes=[];bounds=null;history=[];pointCount=0;editing=existing||null;editingSource=existing?JSON.stringify(existing):'';generation++;panel.hidden=false;layer.hidden=false;root.classList.add('is-free-painting');panel.dataset.tool=medium;useEraser(false);panel.querySelector('.gb-free-instrument').innerHTML=toolArt(kind);root.style.setProperty('--paint',color)
      panel.querySelector('[data-title]').textContent=existing?'修改自己的痕迹':kind==='ink'?'拿起喷瓶':'拿起刻刀';panel.querySelector('[data-action="finish"]').textContent=existing?'保存修改':'完成 · 留在墙上';panel.querySelector('[data-action="cancel"]').textContent=existing?'取消修改':'放回工具';panel.querySelector('[data-action="text"]').hidden=!!existing;panel.querySelector('.gb-free-colors').hidden=kind!=='ink';panel.querySelectorAll('[data-color]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.color===color))})
      if(existing){var el=Array.from(wall.querySelectorAll('[data-note]')).find(function(el){return el.dataset.note===existing.id}),r=wall.getBoundingClientRect(),s=viewScale(),svg=el&&el.querySelector('.gb-note-content svg'),matrix=svg&&svg.getScreenCTM()
        if(!existing.frame&&!matrix){end();o.notice('暂时无法读取这处笔迹，请刷新后重试。');return}
        strokes=existing.strokes.map(function(st){var width=st.width;if(!existing.frame&&matrix)width=(kind==='engraving'?4.5+st.width*1.2:st.width)*Math.hypot(matrix.a,matrix.b)/s;return {ink:st.ink,width:Math.min(160,width),points:st.points.map(function(p){if(existing.frame)return [existing.frame.x+p[0]*existing.frame.width,existing.frame.y+p[1]*existing.frame.height,p[2]];return [Math.max(0,Math.min(WORLD,(matrix.a*p[0]*600+matrix.c*p[1]*360+matrix.e-r.left)/s)),Math.max(0,(matrix.b*p[0]*600+matrix.d*p[1]*360+matrix.f-r.top)/s),p[2]]})}});remeasure()
      }
      initialStrokes=strokeSnapshot();fit();panel.querySelector('[data-capacity]').textContent=o.capacity?o.capacity():'';feedback(existing?'可以补画或擦除笔画；取消修改会恢复原作。':'整面墙自由落笔，完成后收拢范围');canvas.focus({preventScroll:true})
      if(existing&&bounds){try{if(!await claim())throw Error('这处痕迹正在被另一窗口编辑，请稍后再试。')}catch(err){end();o.notice(err.message);return}}
      heartbeat=setInterval(function(){showPresence();if(active&&bounds)claim().then(function(ok){if(!ok){penUp();feedback('占位已变化，请撤回冲突笔画后再保存。')}}).catch(function(){penUp();feedback('占位续期失败，当前笔迹仍保留。')})},4000)
    }
    panel.addEventListener('click',async function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.color){color=b.dataset.color;root.style.setProperty('--paint',color);panel.querySelectorAll('[data-color]').forEach(function(btn){btn.setAttribute('aria-pressed',String(btn===b))});return}switch(b.dataset.action){
      case 'move':penUp();await drain();if(!bounds){feedback('先留下一笔，再整幅移动。');break}setMoving(!moving);break
      case 'sound':sound=!sound;b.textContent=sound?'声音开':'声音关';b.setAttribute('aria-pressed',String(sound));if(!sound)audioStop();break
      case 'cancel':end();break
      case 'text':if(strokes.some(function(s){return s.points.length})){feedback('先完成或撤回当前笔迹，再切换打字。');return}end();o.type(medium);break
      case 'erase':setMoving(false);penUp();await drain();useEraser(!erasing);break
      case 'undo':penUp();await drain();if(!history.length){feedback('没有可撤回的操作。');break}strokes=JSON.parse(history.pop());remeasure();redraw();finishTexture();if(!bounds)await release();if(bounds&&!await claim())feedback('恢复的笔迹与新留言冲突，请重新调整。');else feedback('已撤回上一步。');break
      case 'finish':
        if(ending)return;ending=true;penUp();b.disabled=true;await drain()
        try{if(!bounds||!strokes.some(function(s){return s.points.length})){feedback(editing?'已擦空，可以撤回恢复；整条删除请取消后选择「擦去这处痕迹」。':'先在墙面留下一笔。');return}
          if(!await claim())throw Error('这块位置已有留言，请撤回冲突笔画。')
          var saved=shared?await shared.put(note(),owner):await transact(function(){var all=leases(),own=all[owner];if(!own||own.expires<Date.now())throw Error('占位已失效，请再落一笔重新确认位置。');var other=peers(all);if(draftSegments().some(function(seg){return peerHits(seg,leaseCells(seg),other)}))throw Error('这处笔迹正在被另一窗口使用，请稍后再试。');var fresh=o.read();if(editing&&JSON.stringify(fresh.find(function(n){return n.id===editing.id}))!==editingSource)throw Error('原作已被另一窗口修改或删除。草稿仍在，请取消后重新打开原作。');if(!editing&&fresh.filter(function(n){return n.section===o.section()}).length>=24)throw Error('这面墙已满，请放回工具后切换下一面。');currentScene();if(draftConflicts())throw Error('这块位置出现了新留言，请撤回冲突笔画。');var n=note();localStorage.setItem(key,JSON.stringify(editing?fresh.map(function(old){return old.id===n.id?n:old}):[n].concat(fresh)));delete all[owner];localStorage.setItem(leaseKey,JSON.stringify(all));return n})
          end(true);o.saved(saved);root.classList.add('is-free-review');setTimeout(function(){root.classList.remove('is-free-review')},1800)
        }catch(err){saveDraft();setMoving(true);feedback((err.message||'保存失败')+'；草稿已保留，可整幅挪位置再保存。')}finally{ending=false;b.disabled=false}break
    }},{signal:signal})
    panel.querySelector('[data-brush]').addEventListener('change',function(e){width=Number(e.target.value)},{signal:signal})
    window.addEventListener('storage',function(e){if(e.key===key||e.key===key+'-positions-organic-v1'){sceneDirty=true;if(!held){currentScene();showPresence()}}if(e.key===leaseKey&&!presenceTimer)presenceTimer=setTimeout(function(){presenceTimer=0;showPresence()},100)},{signal:signal})
    window.addEventListener('resize',function(){penUp();if(active)fit();else {refreshBoxes();showPresence()}},{signal:signal})
    window.addEventListener('scroll',function(){refreshBoxes(protectedIgnore)},{passive:true,signal:signal})
    window.addEventListener('blur',penUp,{signal:signal});document.addEventListener('visibilitychange',function(){if(document.hidden)penUp()},{signal:signal})
    document.addEventListener('keydown',function(e){if(active&&e.key==='Escape'){if(held)penUp();else end()}},{signal:signal})
    window.addEventListener('pagehide',function(){saveDraft();release()},{signal:signal});showPresence()
    return {cancelGesture:cancelGesture,viewportChanged:function(){refreshBoxes(protectedIgnore);cursor.hidden=true;warning.hidden=true},extent:function(){return active&&bounds?(bounds.y+bounds.height+120)*scale():0},start:start,canPlace:canPlace,dirty:dirty,active:function(){return active},busy:function(){return !!held||!!moveDrag||!!pending.length||!!inflight},presence:showPresence,resize:function(){panel.querySelector('[data-capacity]').textContent=o.capacity?o.capacity():'';if(active){fit();hideOriginal();moveOutline()}else {refreshBoxes();showPresence();showRecovery()}},destroy:function(){end();clearInterval(sprayTimer);clearTimeout(warningTimer);clearTimeout(presenceTimer);if(audio)audio.close();controller.abort();layer.remove();presence.remove();panel.remove();cursor.remove();warning.remove();resume.remove();discard.remove();clearTimeout(draftTimer)}}
  }
  window.WallTools={draftStore:draftStore,mount:mount,paintArt:paintArt,paintStroke:paintStroke,toolArt:toolArt}
})()
