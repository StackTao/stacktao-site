(function () {
  var WORLD = 1000, TTL = 15000
  var inks = ['#343832','#3f5870','#a45743','#e9edcf','#d7f557','#6286ee','#f47760']
  function toolArt(kind) {
    return kind === 'ink' ? '<svg viewBox="0 0 80 120" aria-hidden="true"><defs><linearGradient id="can-metal"><stop stop-color="#526169"/><stop offset=".3" stop-color="#d2d9d5"/><stop offset=".65" stop-color="#8c9999"/><stop offset="1" stop-color="#35494e"/></linearGradient></defs><path d="M27 29q0-9 7-11h16q7 2 7 11" fill="#b3bdb8"/><path d="M34 18V9h16v9" fill="#272d2a"/><path d="M34 10h6v5h-6" fill="#e9eee7"/><rect x="24" y="29" width="36" height="78" rx="7" fill="url(#can-metal)" stroke="#36433e"/><path d="M25 49h34v42H25Z" fill="var(--paint,#3f5870)"/><path d="m33 62 16-5-12 18 14-4" fill="none" stroke="#f7efdc" stroke-width="3"/><path d="M29 101h26" stroke="#e0e3d6"/><path class="nozzle-mist" d="M34 12 2 2v25Z" fill="var(--paint)" opacity=".18"/></svg>' : '<svg viewBox="0 0 80 120" aria-hidden="true"><defs><linearGradient id="knife-steel"><stop stop-color="#f4eee0"/><stop offset=".45" stop-color="#b5b9ad"/><stop offset="1" stop-color="#5d6862"/></linearGradient></defs><path d="m12 10 27 16 9 24-15 8Z" fill="url(#knife-steel)" stroke="#5a625b"/><path d="m12 10 21 48 4-23Z" fill="#e9e8d6"/><path d="m34 49 14-7 26 52q3 11-9 16-10 4-15-5Z" fill="#99724d" stroke="#513e2c"/><path d="m41 56 20 45m-14-49 21 45" stroke="#c5a677" opacity=".6"/><path d="m31 49 18-9 5 9-18 10Z" fill="#555d51"/></svg>'
  }
  function sprayPoint(ctx,x,y,r,ink,seed) {
    var state = seed + 1
    function random() { state=(state*1664525+1013904223)>>>0; return state/4294967296 }
    var g=ctx.createRadialGradient(x,y,0,x,y,r)
    g.addColorStop(0,ink+'96');g.addColorStop(.5,ink+'65');g.addColorStop(1,ink+'00')
    ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.fillStyle=ink+'85'
    for(var j=0;j<9;j++){var a=random()*Math.PI*2,d=Math.sqrt(random())*r*1.15;ctx.beginPath();ctx.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,.35+random()*.65,0,Math.PI*2);ctx.fill()}
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
  function overlaps(a,b,gap) {gap=gap||0;return a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y}
  function mount(o) {
    var root=o.root,wall=o.wall,key=o.key,leaseKey=key+'-live-leases',owner=crypto.randomUUID(),controller=new AbortController(),signal=controller.signal
    var active=false,medium='ink',color=inks[1],width=14,strokes=[],bounds=null,held=null,chain=Promise.resolve(),ending=false,generation=0,lastPoint=null,heartbeat=0,hover=null,frameRequest=0
    var layer=document.createElement('div');layer.className='gb-free-layer';layer.hidden=true
    var canvas=document.createElement('canvas');canvas.setAttribute('aria-label','整面墙自由创作区，按住喷绘或刻画');canvas.tabIndex=0
    var carving=document.createElement('div');carving.className='gb-free-carving';layer.append(canvas,carving);wall.after(layer)
    var presence=document.createElement('div');presence.className='gb-wall-presence';wall.after(presence)
    var cursor=document.createElement('div');cursor.className='gb-real-tool';cursor.hidden=true;root.append(cursor)
    var panel=document.createElement('div');panel.className='gb-free-panel';panel.hidden=true
    panel.innerHTML='<div class="gb-free-instrument" aria-hidden="true"></div><div class="gb-free-controls"><div class="gb-free-heading"><strong data-title></strong><span data-instruction></span></div><div class="gb-free-colors" aria-label="喷漆颜色">'+inks.map(function(ink,i){return '<button data-color="'+ink+'" style="--swatch:'+ink+'" aria-label="'+['石墨','靛蓝','赭红','粉白','黄绿','钴蓝','珊瑚橘'][i]+'喷漆"></button>'}).join('')+'</div><div class="gb-free-actions"><label>笔触 <select aria-label="喷幅或刻刀宽度" data-brush><option value="7">细</option><option value="14" selected>中</option><option value="26">宽</option></select></label><button data-action="undo">撤回一笔</button><button data-action="text">打字</button><button data-action="sound" aria-pressed="false">声音关</button><button data-action="cancel">放回工具</button><button data-action="finish" class="gb-free-finish">完成 · 留在墙上</button></div><p data-feedback role="status">本机预览 · 同一浏览器窗口之间同步占位</p></div>'
    root.append(panel)
    var sound=false,audio=null,hiss=null
    function audioStop(){if(hiss){hiss.stop();hiss=null}}
    function audioStart(){if(!sound)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume();var b=audio.createBuffer(1,audio.sampleRate,audio.sampleRate),data=b.getChannelData(0);for(var i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.12;hiss=audio.createBufferSource();hiss.buffer=b;hiss.loop=true;var f=audio.createBiquadFilter();f.type=medium==='ink'?'highpass':'bandpass';f.frequency.value=medium==='ink'?1400:2300;hiss.connect(f);f.connect(audio.destination);hiss.start()}catch(_){}}
    function feedback(text){panel.querySelector('[data-feedback]').textContent=text}
    function scale(){return wall.clientWidth/WORLD}
    function rectAt(e){var r=wall.getBoundingClientRect(),s=scale();return [(e.clientX-r.left)/s,(e.clientY-r.top)/s,e.pressure||.5]}
    function leases(){try{return JSON.parse(localStorage.getItem(leaseKey)||'{}')}catch(_){return {}}}
    function transact(fn){if(!navigator.locks)return Promise.reject(Error('当前浏览器不支持安全占位，请使用新版浏览器。'));return navigator.locks.request(key+'-mutation',fn)}
    function occupied(){var r=wall.getBoundingClientRect(),s=scale();return Array.from(wall.querySelectorAll('[data-note]:not([data-note="sample"])')).map(function(el){var b=el.getBoundingClientRect();return {x:(b.left-r.left)/s,y:(b.top-r.top)/s,width:b.width/s,height:b.height/s}})}
    function conflicts(box,gap){
      if(occupied().some(function(b){return overlaps(box,b,gap)}))return true
      var layout=JSON.parse(localStorage.getItem(key+'-positions-organic-v1')||'{}'),mode=wall.clientWidth<600?'narrow':'wide',s=scale()
      if(Array.from(wall.querySelectorAll('[data-note]')).some(function(el){var p=(layout[mode]||{})[el.dataset.note];if(!p||el.dataset.freeform)return false;return overlaps(box,{x:(16+p.x*Math.max(0,wall.clientWidth-el.offsetWidth-32))/s,y:p.y/s,width:el.offsetWidth/s,height:el.offsetHeight/s},gap)}))return true
      var visible=new Set(Array.from(wall.querySelectorAll('[data-note]')).map(function(el){return el.dataset.note}))
      return o.read().some(function(n){return n.section===o.section() && (n.frame ? overlaps(box,n.frame,gap) : !visible.has(n.id))})
    }
    async function claim(next){return transact(function(){var all=leases(),now=Date.now();Object.keys(all).forEach(function(id){if(all[id].expires<now)delete all[id]});if(conflicts(next,8))return false
      if(Object.entries(all).some(function(pair){return pair[0]!==owner&&pair[1].wall===o.section()&&overlaps(next,pair[1].box,8)}))return false
      all[owner]={wall:o.section(),box:next,expires:now+TTL};localStorage.setItem(leaseKey,JSON.stringify(all));return true})}
    function release(){var releasedOwner=owner;return transact(function(){var all=leases();delete all[releasedOwner];localStorage.setItem(leaseKey,JSON.stringify(all))}).catch(function(){})}
    function showPresence(){var s=scale(),all=leases();presence.replaceChildren();presence.style.left=wall.offsetLeft+'px';presence.style.top=wall.offsetTop+'px';Object.entries(all).forEach(function(pair){var p=pair[1];if(pair[0]===owner||p.wall!==o.section()||p.expires<Date.now())return;var box=document.createElement('div');box.className='gb-other-painter';box.textContent='另一窗口正在创作';Object.assign(box.style,{left:p.box.x*s+'px',top:p.box.y*s+'px',width:p.box.width*s+'px',height:p.box.height*s+'px'});presence.append(box)})}
    function fit(){var s=scale(),height=Math.max(wall.clientHeight,window.innerHeight*1.7);if(active)wall.style.height=height+'px';Object.assign(layer.style,{left:wall.offsetLeft+'px',top:wall.offsetTop+'px',width:wall.clientWidth+'px',height:height+'px'});canvas.width=WORLD;canvas.height=Math.ceil(height/s);showPresence();redraw()}
    function note(){var b=bounds;return {id:owner,layout:3,medium:medium,mode:'draw',paper:'ivory',size:'medium',text:'',name:'',date:new Date().toLocaleDateString('zh-CN'),section:o.section(),frame:{x:b.x,y:b.y,width:b.width,height:b.height},strokes:strokes.filter(function(s){return s.points.length}).map(function(s){return {ink:s.ink,width:s.width,points:s.points.map(function(p){return [(p[0]-b.x)/b.width,(p[1]-b.y)/b.height,p[2]]})}})}}
    function redraw(){cancelAnimationFrame(frameRequest);frameRequest=requestAnimationFrame(function(){var ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);carving.replaceChildren();if(!bounds)return;var n=note(),s=scale();if(medium==='ink'){ctx.save();ctx.translate(bounds.x,bounds.y);n.strokes.forEach(function(st){paintStroke(ctx,st,bounds.width,bounds.height)});ctx.restore()}else{Object.assign(carving.style,{left:bounds.x*s+'px',top:bounds.y*s+'px',width:bounds.width*s+'px',height:bounds.height*s+'px'});carving.appendChild(o.carve(n))}})}
    function proposed(p,r){var left=Math.max(0,p[0]-r),top=Math.max(0,p[1]-r),right=Math.min(WORLD,p[0]+r),bottom=p[1]+r;if(bounds){left=Math.min(left,bounds.x);top=Math.min(top,bounds.y);right=Math.max(right,bounds.x+bounds.width);bottom=Math.max(bottom,bounds.y+bounds.height)}return {x:left,y:top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)}}
    function enqueue(p,stroke,token){chain=chain.then(async function(){if(!active||token!==generation)return;var r=medium==='ink'?stroke.width*1.35+4:stroke.width+5,next=proposed(p,r);if(p[0]<r||p[0]>WORLD-r||p[1]<r)return;if(strokes.reduce(function(n,s){return n+s.points.length},0)>=2500){feedback('这一处笔迹已经很多，先完成，再继续下一处。');return}
      try{if(!await claim(next)){cursor.classList.add('is-blocked');feedback('这边已有留言或正在创作的占位，换个方向继续。');audioStop();return}if(!active||token!==generation){await release();return}bounds=next;stroke.points.push(p);cursor.classList.remove('is-blocked');feedback('松开可以继续下一笔；完成后按实际笔迹收拢范围。');redraw()}catch(e){feedback(e.message||'占位失败，笔迹未保存，请稍后重试。');audioStop()}})}
    function toolMove(e){if(!active||e.pointerType==='touch'){cursor.hidden=true;return}cursor.hidden=false;cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';hover=e;lastPoint=rectAt(e)}
    function penUp(){held=null;cursor.classList.remove('is-working');audioStop()}
    canvas.addEventListener('pointerdown',function(e){if(!active||ending||held||e.button!==0||!e.isPrimary)return;if(strokes.length>=150){feedback('这一处已有很多笔，请先完成。');return}e.preventDefault();canvas.setPointerCapture(e.pointerId);var st={ink:color,width:Math.min(160,(medium==='ink'?width:width*.28)/scale()),points:[]};strokes.push(st);held={pointer:e.pointerId,stroke:st};toolMove(e);cursor.classList.add('is-working');lastPoint=rectAt(e);enqueue(lastPoint,st,generation);audioStart()},{signal:signal})
    canvas.addEventListener('pointermove',function(e){toolMove(e);if(!held||held.pointer!==e.pointerId)return;e.preventDefault();var p=rectAt(e),prev=held.stroke.points[held.stroke.points.length-1];if(!prev||Math.hypot(p[0]-prev[0],p[1]-prev[1])>2/scale())enqueue(p,held.stroke,generation)},{signal:signal})
    ;['pointerup','pointercancel','lostpointercapture'].forEach(function(type){canvas.addEventListener(type,penUp,{signal:signal})});canvas.addEventListener('pointerleave',function(){cursor.hidden=true},{signal:signal})
    var sprayTimer=setInterval(function(){if(active&&held&&medium==='ink'&&lastPoint)enqueue(lastPoint,held.stroke,generation)},80)
    function end(){active=false;generation++;penUp();clearInterval(heartbeat);cursor.hidden=true;panel.hidden=true;layer.hidden=true;root.classList.remove('is-free-painting','is-free-review');release();o.changed()}
    function start(kind){if(active)return;owner=crypto.randomUUID();medium=kind;active=true;ending=false;strokes=[];bounds=null;generation++;panel.hidden=false;layer.hidden=false;root.classList.add('is-free-painting');panel.dataset.tool=medium;cursor.dataset.tool=medium;cursor.innerHTML=toolArt(kind);panel.querySelector('.gb-free-instrument').innerHTML=toolArt(kind);root.style.setProperty('--paint',color);panel.querySelector('[data-title]').textContent=kind==='ink'?'拿起喷瓶':'拿起刻刀';panel.querySelector('[data-instruction]').textContent=kind==='ink'?'按住喷涂 · 停留会加深':'按住刻画 · 松开收刀';panel.querySelector('.gb-free-colors').hidden=kind!=='ink';panel.querySelectorAll('[data-color]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.color===color))});feedback('整面墙自由落笔，完成后收拢范围 · 本机多窗口占位');fit();canvas.focus({preventScroll:true});heartbeat=setInterval(function(){showPresence();if(active&&bounds)claim(bounds).then(function(ok){if(!ok){penUp();feedback('占位已变化，请撤回冲突笔画后再保存。')}}).catch(function(){penUp();feedback('占位续期失败，当前笔迹仍保留。')})},4000)}
    panel.addEventListener('click',async function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.color){color=b.dataset.color;root.style.setProperty('--paint',color);panel.querySelectorAll('[data-color]').forEach(function(btn){btn.setAttribute('aria-pressed',String(btn===b))});return}switch(b.dataset.action){case 'sound':sound=!sound;b.textContent=sound?'声音开':'声音关';b.setAttribute('aria-pressed',String(sound));if(!sound)audioStop();break;case 'cancel':end();break;case 'text':if(strokes.some(function(s){return s.points.length})){feedback('先完成或撤回当前笔迹，再切换打字。');return}end();o.type(medium);break;case 'undo':penUp();await chain;strokes.pop();bounds=null;strokes.forEach(function(s){s.points.forEach(function(p){bounds=proposed(p,medium==='ink'?s.width*1.35+4:s.width+5)})});if(bounds)await claim(bounds);else await release();redraw();feedback('已撤回上一笔。');break;case 'finish':
      if(ending)return;ending=true;penUp();b.disabled=true;await chain
      try{if(!bounds||!strokes.some(function(s){return s.points.length})){feedback('先在墙面留下一笔。');return}var saved=await transact(function(){var all=leases(),own=all[owner];if(!own||own.expires<Date.now()||Object.entries(all).some(function(pair){return pair[0]!==owner&&pair[1].expires>Date.now()&&pair[1].wall===o.section()&&overlaps(bounds,pair[1].box,8)}))throw Error('占位已失效，请再落一笔重新确认位置。');var fresh=o.read();if(fresh.filter(function(n){return (n.section||0)===o.section()}).length>=24)throw Error('这面墙已满，请保留当前草稿，或放回工具后切换下一面。');if(conflicts(bounds,6))throw Error('这块位置出现了新留言，请撤回冲突笔画。');var n=note();localStorage.setItem(key,JSON.stringify([n].concat(fresh)));delete all[owner];localStorage.setItem(leaseKey,JSON.stringify(all));return n})
        end();o.saved(saved);root.classList.add('is-free-review');setTimeout(function(){root.classList.remove('is-free-review')},1800)
      }catch(err){feedback(err.message||'保存失败，笔迹仍在，请不要关闭。')}finally{ending=false;b.disabled=false}break}
    },{signal:signal})
    panel.querySelector('[data-brush]').addEventListener('change',function(e){width=Number(e.target.value)},{signal:signal})
    window.addEventListener('storage',function(e){if(e.key===leaseKey)showPresence();if(e.key===key){o.sync();showPresence()}},{signal:signal})
    window.addEventListener('resize',function(){penUp();if(active)fit();else showPresence()},{signal:signal})
    window.addEventListener('blur',penUp,{signal:signal});document.addEventListener('visibilitychange',function(){if(document.hidden)penUp()},{signal:signal})
    document.addEventListener('keydown',function(e){if(active&&e.key==='Escape'){if(held)penUp();else end()}},{signal:signal})
    window.addEventListener('pagehide',release,{signal:signal});showPresence()
    return {start:start,active:function(){return active},resize:function(){if(active)fit();else showPresence()},destroy:function(){active=false;generation++;clearInterval(sprayTimer);clearInterval(heartbeat);cancelAnimationFrame(frameRequest);penUp();release();if(audio)audio.close();controller.abort();layer.remove();presence.remove();panel.remove();cursor.remove();root.classList.remove('is-free-painting')}}
  }
  window.WallTools={mount:mount,paintArt:paintArt,toolArt:toolArt}
})()
