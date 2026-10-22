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
    var root=o.root,wall=o.wall,key=o.key,leaseKey=key+'-live-leases',controller=new AbortController(),signal=controller.signal
    var owner='',active=false,medium='ink',color=inks[1],width=14,strokes=[],bounds=null,held=null,editing=null,editingSource='',erasing=false,history=[]
    var pending=[],inflight=null,frameRequest=0,settleTimer=0,heartbeat=0,ending=false,generation=0,lastPoint=null,leased=null,blockedBoxes=[],pointCount=0
    var layer=document.createElement('div');layer.className='gb-free-layer';layer.hidden=true
    var canvas=document.createElement('canvas');canvas.setAttribute('aria-label','整面墙自由创作区，按住喷绘或刻画');canvas.tabIndex=0
    var carving=document.createElement('div');carving.className='gb-free-carving';layer.append(canvas,carving);wall.after(layer)
    var presence=document.createElement('div');presence.className='gb-wall-presence';wall.after(presence)
    var cursor=document.createElement('div');cursor.className='gb-real-tool';cursor.hidden=true;root.append(cursor)
    var warning=document.createElement('div');warning.className='gb-paint-warning';warning.hidden=true;warning.setAttribute('role','status');root.append(warning)
    var panel=document.createElement('div');panel.className='gb-free-panel';panel.hidden=true
    panel.innerHTML='<div class="gb-free-instrument" aria-hidden="true"></div><div class="gb-free-controls"><div class="gb-free-heading"><strong data-title></strong><span data-instruction></span></div><div class="gb-free-colors" aria-label="喷漆颜色">'+inks.map(function(ink,i){return '<button data-color="'+ink+'" style="--swatch:'+ink+'" aria-label="'+['石墨','靛蓝','赭红','粉白','黄绿','钴蓝','珊瑚橘'][i]+'喷漆"></button>'}).join('')+'</div><div class="gb-free-actions"><label>笔触 <select aria-label="喷幅或刻刀宽度" data-brush><option value="7">细</option><option value="14" selected>中</option><option value="26">宽</option></select></label><button data-action="undo">撤回</button><button data-action="erase" aria-pressed="false">擦除笔画</button><button data-action="text">打字</button><button data-action="sound" aria-pressed="false">声音关</button><button data-action="cancel">放回工具</button><button data-action="finish" class="gb-free-finish">完成 · 留在墙上</button></div><p data-feedback role="status">本机预览 · 同一浏览器窗口之间同步占位</p></div>'
    root.append(panel)
    var sound=false,audio=null,hiss=null,warningTimer=0
    function audioStop(){if(hiss){hiss.stop();hiss=null}}
    function audioStart(){if(!sound||erasing)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume();var b=audio.createBuffer(1,audio.sampleRate,audio.sampleRate),data=b.getChannelData(0);for(var i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.12;hiss=audio.createBufferSource();hiss.buffer=b;hiss.loop=true;var f=audio.createBiquadFilter();f.type=medium==='ink'?'highpass':'bandpass';f.frequency.value=medium==='ink'?1400:2300;hiss.connect(f);f.connect(audio.destination);hiss.start()}catch(_){}}
    function feedback(text){var el=panel.querySelector('[data-feedback]');if(el.textContent!==text)el.textContent=text}
    function warn(p){var r=wall.getBoundingClientRect(),s=scale();warning.textContent='这里已有题字或留言，请绕开';warning.hidden=false;warning.style.left=Math.max(8,Math.min(innerWidth-190,r.left+p[0]*s+18))+'px';warning.style.top=Math.max(8,r.top+p[1]*s-34)+'px';clearTimeout(warningTimer);warningTimer=setTimeout(function(){warning.hidden=true},1300);cursor.classList.add('is-blocked');feedback('已保护原有痕迹，冲突位置不会落墨。');audioStop()}
    function scale(){return wall.clientWidth/WORLD}
    function rectAt(e){var r=wall.getBoundingClientRect(),s=scale();return [(e.clientX-r.left)/s,(e.clientY-r.top)/s,Math.max(0,Math.min(1,e.pressure||.5))]}
    function leases(){try{return JSON.parse(localStorage.getItem(leaseKey)||'{}')}catch(_){return {}}}
    function transact(fn){if(!navigator.locks)return Promise.reject(Error('当前浏览器不支持安全占位，请使用新版浏览器。'));return navigator.locks.request(key+'-mutation',fn)}
    function isOwn(el){return editing && el.dataset.note===editing.id}
    function hideOriginal(){wall.querySelectorAll('[data-note]').forEach(function(el){el.classList.toggle('gb-editing-original',!!isOwn(el))})}
    function refreshBoxes(){var r=wall.getBoundingClientRect(),s=scale();blockedBoxes=Array.from(wall.querySelectorAll('[data-note]:not([data-note="sample"])')).filter(function(el){return !isOwn(el)}).map(function(el){var b=el.getBoundingClientRect();return {x:(b.left-r.left)/s,y:(b.top-r.top)/s,width:b.width/s,height:b.height/s}}).concat(Array.from(root.querySelectorAll('[data-wall-protected]')).map(function(el){var b=el.getBoundingClientRect();return {x:(b.left-r.left)/s,y:(b.top-r.top)/s,width:b.width/s,height:b.height/s}}));hideOriginal()}
    function conflicts(box,gap){
      if(blockedBoxes.some(function(b){return overlaps(box,b,gap)}))return true
      var layout=JSON.parse(localStorage.getItem(key+'-positions-organic-v1')||'{}'),mode=wall.clientWidth<600?'narrow':'wide',s=scale()
      if(Array.from(wall.querySelectorAll('[data-note]')).some(function(el){var p=(layout[mode]||{})[el.dataset.note];if(!p||el.dataset.freeform||isOwn(el))return false;return overlaps(box,{x:(16+p.x*Math.max(0,wall.clientWidth-el.offsetWidth-32))/s,y:p.y/s,width:el.offsetWidth/s,height:el.offsetHeight/s},gap)}))return true
      var visible=new Set(Array.from(wall.querySelectorAll('[data-note]')).map(function(el){return el.dataset.note}))
      return o.read().some(function(n){return (!editing||n.id!==editing.id)&&n.section===o.section()&&(n.frame?overlaps(box,n.frame,gap):!visible.has(n.id))})
    }
    function union(a,b){if(!a)return Object.assign({},b);var x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);return {x:x,y:y,width:Math.max(a.x+a.width,b.x+b.width)-x,height:Math.max(a.y+a.height,b.y+b.height)-y}}
    function pointBox(p,s){var r=medium==='ink'?s.width*1.35+4:s.width+5;return {x:Math.max(0,p[0]-r),y:Math.max(0,p[1]-r),width:Math.min(WORLD,p[0]+r)-Math.max(0,p[0]-r),height:p[1]+r-Math.max(0,p[1]-r)}}
    function contains(a,b){return a&&a.x<=b.x&&a.y<=b.y&&a.x+a.width>=b.x+b.width&&a.y+a.height>=b.y+b.height}
    async function claim(next,exact){var id=owner;return transact(function(){var all=leases(),now=Date.now();Object.keys(all).forEach(function(k){if(all[k].expires<now)delete all[k]});function unavailable(box){return conflicts(box,8)||Object.entries(all).some(function(pair){return pair[0]!==id&&pair[1].wall===o.section()&&overlaps(box,pair[1].box,8)})}
      if(unavailable(next))return false
      var pad=exact?0:32,safe={x:Math.max(0,next.x-pad),y:Math.max(0,next.y-pad),width:Math.min(WORLD,next.x+next.width+pad)-Math.max(0,next.x-pad),height:next.height+pad+Math.min(pad,next.y)}
      if(unavailable(safe))safe=next
      all[id]={wall:o.section(),box:safe,expires:now+TTL,note:editing?editing.id:null};localStorage.setItem(leaseKey,JSON.stringify(all));if(owner===id)leased=all[id];return true})}
    function release(){var id=owner;leased=null;return transact(function(){var all=leases();delete all[id];localStorage.setItem(leaseKey,JSON.stringify(all))}).catch(function(){})}
    function showPresence(){var s=scale(),all=leases();presence.replaceChildren();presence.style.left=wall.offsetLeft+'px';presence.style.top=wall.offsetTop+'px';Object.entries(all).forEach(function(pair){var p=pair[1];if(pair[0]===owner||p.wall!==o.section()||p.expires<Date.now())return;var box=document.createElement('div');box.className='gb-other-painter';box.textContent='另一窗口正在创作';Object.assign(box.style,{left:p.box.x*s+'px',top:p.box.y*s+'px',width:p.box.width*s+'px',height:p.box.height*s+'px'});presence.append(box)})}
    function fit(){var s=scale(),height=Math.max(wall.clientHeight,window.innerHeight*1.7);if(active)wall.style.height=height+'px';Object.assign(layer.style,{left:wall.offsetLeft+'px',top:wall.offsetTop+'px',width:wall.clientWidth+'px',height:height+'px'});canvas.width=WORLD;canvas.height=Math.ceil(height/s);refreshBoxes();showPresence();redraw();if(!held)finishTexture()}
    function note(){var b=bounds;return Object.assign({},editing||{id:owner,paper:'ivory',size:'medium',text:'',name:'',date:new Date().toLocaleDateString('zh-CN'),section:o.section()},{layout:3,medium:medium,mode:'draw',anchor:null,frame:Object.assign({},b),strokes:strokes.filter(function(s){return s.points.length}).map(function(s){return {ink:s.ink,width:s.width,points:s.points.map(function(p){return [(p[0]-b.x)/b.width,(p[1]-b.y)/b.height,p[2]]})}})})}
    function paintSegment(ctx,s,previous,p,index){
      if(medium==='ink'){var dx=p[0]-previous[0],dy=p[1]-previous[1],n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(2,s.width*.3)));for(var k=1;k<=n;k++)sprayPoint(ctx,p[0]-dx+dx*k/n,p[1]-dy+dy*k/n,s.width,s.ink,index*977+k*31)}
      else {ctx.lineCap='butt';ctx.lineJoin='round';ctx.lineWidth=s.width;ctx.strokeStyle='#a58b69';ctx.beginPath();ctx.moveTo(previous[0],previous[1]);ctx.lineTo(p[0]+.01,p[1]);ctx.stroke();ctx.lineWidth=Math.max(.6,s.width*.16);ctx.strokeStyle='#70583d90';ctx.beginPath();ctx.moveTo(previous[0]-.5,previous[1]-s.width*.3);ctx.lineTo(p[0]-.5,p[1]-s.width*.3);ctx.stroke()}
    }
    function redraw(){var ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);canvas.style.opacity='1';carving.replaceChildren();strokes.forEach(function(s){s.points.forEach(function(p,i){paintSegment(ctx,s,s.points[Math.max(0,i-1)],p,i)})})}
    function finishTexture(){clearTimeout(settleTimer);settleTimer=setTimeout(function(){if(!active||held||pending.length||inflight||!bounds||medium!=='engraving')return;var s=scale();Object.assign(carving.style,{left:bounds.x*s+'px',top:bounds.y*s+'px',width:bounds.width*s+'px',height:bounds.height*s+'px'});carving.replaceChildren(o.carve(note()));canvas.style.opacity='0'},80)}
    function remember(){history.push(JSON.stringify(strokes));if(history.length>20)history.shift()}
    function remeasure(){bounds=null;pointCount=0;strokes.forEach(function(s){s.points.forEach(function(p){bounds=union(bounds,pointBox(p,s));pointCount++})})}
    function distance(p,a,b){var dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
    function eraseAt(p){var before=strokes.length;strokes=strokes.filter(function(s){return !s.points.some(function(q,i){return distance(p,s.points[Math.max(0,i-1)],q)<12/scale()+s.width})});if(before!==strokes.length){remeasure();return true}return false}
    async function flush(){
      if(inflight){await inflight;if(pending.length)return flush();return}
      if(!pending.length)return
      var batch=pending.splice(0),token=generation
      inflight=(async function(){if(!active)return;var accepted=[],next=bounds,erased=false
        batch.forEach(function(item){if(item.erase){erased=eraseAt(item.p)||erased;return}if(pointCount+accepted.length>=2500)return;var box=pointBox(item.p,item.stroke);if(item.p[0]<0||item.p[0]>WORLD||item.p[1]<0)return;var proposed=union(next,box);if(blockedBoxes.some(function(b){return overlaps(proposed,b,8)})){warn(item.p);return}next=proposed;accepted.push(item)})
        if(erased){redraw();feedback('已擦除整笔；可点「撤回」恢复。')}
        if(!accepted.length)return
        try{if(!(leased&&leased.expires>Date.now()&&contains(leased.box,next))&&!await claim(next)){warn(accepted[accepted.length-1].p);return}if(!active||token!==generation)return;var ctx=canvas.getContext('2d');canvas.style.opacity='1';carving.replaceChildren();bounds=next
          accepted.forEach(function(item){var s=item.stroke,prev=s.points[s.points.length-1]||item.p;paintSegment(ctx,s,prev,item.p,s.points.length);s.points.push(item.p);pointCount++});cursor.classList.remove('is-blocked');feedback('松开可以继续下一笔；完成后按实际笔迹收拢范围。')
        }catch(e){feedback(e.message||'占位失败，笔迹未保存。');audioStop()}
      })();await inflight;inflight=null;if(pending.length)schedule();else if(!held)finishTexture()
    }
    function schedule(){if(!frameRequest)frameRequest=requestAnimationFrame(function(){frameRequest=0;flush()})}
    function enqueue(p,stroke,erase){pending.push({p:p,stroke:stroke,erase:erase});schedule()}
    async function drain(){cancelAnimationFrame(frameRequest);frameRequest=0;await flush();while(pending.length||inflight)await flush()}
    function toolMove(e){lastPoint=rectAt(e);if(!active||e.pointerType==='touch'){cursor.hidden=true;return}cursor.hidden=false;cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px'}
    function penUp(){held=null;cursor.classList.remove('is-working');audioStop();finishTexture()}
    canvas.addEventListener('pointerdown',function(e){if(!active||ending||held||e.button!==0||!e.isPrimary)return;if(!erasing&&strokes.length>=150){feedback('这一处已有很多笔，请先完成。');return}e.preventDefault();canvas.setPointerCapture(e.pointerId);remember();var s={ink:color,width:Math.min(160,(medium==='ink'?width:width*.28)/scale()),points:[]};if(!erasing)strokes.push(s);held={pointer:e.pointerId,stroke:s};toolMove(e);cursor.classList.add('is-working');enqueue(lastPoint,s,erasing);audioStart()},{signal:signal})
    canvas.addEventListener('pointermove',function(e){toolMove(e);if(!held||held.pointer!==e.pointerId)return;e.preventDefault();var events=e.getCoalescedEvents?e.getCoalescedEvents():[e];if(!events.length)events=[e];events.forEach(function(sample){var p=rectAt(sample),prev=pending.length?pending[pending.length-1].p:held.stroke.points[held.stroke.points.length-1];if(!prev||Math.hypot(p[0]-prev[0],p[1]-prev[1])>1.2/scale())enqueue(p,held.stroke,erasing)})},{signal:signal})
    ;['pointerup','pointercancel','lostpointercapture'].forEach(function(type){canvas.addEventListener(type,penUp,{signal:signal})});canvas.addEventListener('pointerleave',function(){cursor.hidden=true},{signal:signal})
    var sprayTimer=setInterval(function(){if(active&&held&&!erasing&&medium==='ink'&&lastPoint)enqueue(lastPoint,held.stroke,false)},100)
    function end(){active=false;generation++;pending=[];cancelAnimationFrame(frameRequest);frameRequest=0;penUp();clearInterval(heartbeat);clearTimeout(settleTimer);cursor.hidden=true;warning.hidden=true;panel.hidden=true;layer.hidden=true;root.classList.remove('is-free-painting','is-free-review');release();editing=null;hideOriginal();o.changed()}
    function useEraser(value){erasing=value;cursor.dataset.tool=value?'eraser':medium;cursor.innerHTML=value?'<svg viewBox="0 0 80 120" aria-hidden="true"><path d="m12 24 34-14 23 64-34 14Z" fill="#d3a79a" stroke="#9c7869"/><path d="m20 45 34-14 15 43-34 14Z" fill="#e9dcca"/><path d="m35 88 34-14-7 9-23 11Z" fill="#a88a77"/></svg>':toolArt(medium);panel.querySelector('[data-action="erase"]').setAttribute('aria-pressed',String(value));panel.querySelector('[data-instruction]').textContent=value?'碰到哪一笔，就擦除那一笔':medium==='ink'?'按住喷涂 · 停留会加深':'按住刻画 · 松开收刀'}
    async function start(kind,existing){
      if(active)return;owner=crypto.randomUUID();medium=kind;active=true;ending=false;strokes=[];bounds=null;leased=null;history=[];pointCount=0;editing=existing||null;editingSource=existing?JSON.stringify(existing):'';generation++;panel.hidden=false;layer.hidden=false;root.classList.add('is-free-painting');panel.dataset.tool=medium;useEraser(false);panel.querySelector('.gb-free-instrument').innerHTML=toolArt(kind);root.style.setProperty('--paint',color)
      panel.querySelector('[data-title]').textContent=existing?'修改自己的痕迹':kind==='ink'?'拿起喷瓶':'拿起刻刀';panel.querySelector('[data-action="finish"]').textContent=existing?'保存修改':'完成 · 留在墙上';panel.querySelector('[data-action="cancel"]').textContent=existing?'取消修改':'放回工具';panel.querySelector('[data-action="text"]').hidden=!!existing;panel.querySelector('.gb-free-colors').hidden=kind!=='ink';panel.querySelectorAll('[data-color]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.color===color))})
      if(existing){var el=Array.from(wall.querySelectorAll('[data-note]')).find(function(el){return el.dataset.note===existing.id}),r=wall.getBoundingClientRect(),s=scale(),svg=el&&el.querySelector('.gb-note-content svg'),matrix=svg&&svg.getScreenCTM()
        if(!existing.frame&&!matrix){end();o.notice('暂时无法读取这处笔迹，请刷新后重试。');return}
        strokes=existing.strokes.map(function(st){var width=st.width;if(!existing.frame&&matrix)width=(kind==='engraving'?4.5+st.width*1.2:st.width)*Math.hypot(matrix.a,matrix.b)/s;return {ink:st.ink,width:Math.min(160,width),points:st.points.map(function(p){if(existing.frame)return [existing.frame.x+p[0]*existing.frame.width,existing.frame.y+p[1]*existing.frame.height,p[2]];return [Math.max(0,Math.min(WORLD,(matrix.a*p[0]*600+matrix.c*p[1]*360+matrix.e-r.left)/s)),Math.max(0,(matrix.b*p[0]*600+matrix.d*p[1]*360+matrix.f-r.top)/s),p[2]]})}});remeasure()
      }
      fit();feedback(existing?'可以补画或擦除笔画；取消修改会恢复原作。':'整面墙自由落笔，完成后收拢范围 · 本机多窗口占位');canvas.focus({preventScroll:true})
      if(existing&&bounds){try{if(!await claim(bounds,true))throw Error('这处痕迹正在被另一窗口编辑，请稍后再试。')}catch(err){end();o.notice(err.message);return}}
      heartbeat=setInterval(function(){showPresence();if(active&&bounds)claim(bounds).then(function(ok){if(!ok){leased=null;penUp();feedback('占位已变化，请撤回冲突笔画后再保存。')}}).catch(function(){leased=null;penUp();feedback('占位续期失败，当前笔迹仍保留。')})},4000)
    }
    panel.addEventListener('click',async function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.color){color=b.dataset.color;root.style.setProperty('--paint',color);panel.querySelectorAll('[data-color]').forEach(function(btn){btn.setAttribute('aria-pressed',String(btn===b))});return}switch(b.dataset.action){
      case 'sound':sound=!sound;b.textContent=sound?'声音开':'声音关';b.setAttribute('aria-pressed',String(sound));if(!sound)audioStop();break
      case 'cancel':end();break
      case 'text':if(strokes.some(function(s){return s.points.length})){feedback('先完成或撤回当前笔迹，再切换打字。');return}end();o.type(medium);break
      case 'erase':penUp();await drain();useEraser(!erasing);break
      case 'undo':penUp();await drain();if(!history.length){feedback('没有可撤回的操作。');break}strokes=JSON.parse(history.pop());remeasure();redraw();finishTexture();feedback('已撤回上一步。');break
      case 'finish':
        if(ending)return;ending=true;penUp();b.disabled=true;await drain()
        try{if(!bounds||!strokes.some(function(s){return s.points.length})){feedback(editing?'已擦空，可以撤回恢复；整条删除请取消后选择「擦去这处痕迹」。':'先在墙面留下一笔。');return}
          if(!await claim(bounds,true))throw Error('这块位置已有留言，请撤回冲突笔画。')
          var saved=await transact(function(){var all=leases(),own=all[owner];if(!own||own.expires<Date.now())throw Error('占位已失效，请再落一笔重新确认位置。');var fresh=o.read();if(editing&&JSON.stringify(fresh.find(function(n){return n.id===editing.id}))!==editingSource)throw Error('原作已被另一窗口修改或删除。草稿仍在，请取消后重新打开原作。');if(!editing&&fresh.filter(function(n){return n.section===o.section()}).length>=24)throw Error('这面墙已满，请放回工具后切换下一面。');if(conflicts(bounds,6))throw Error('这块位置出现了新留言，请撤回冲突笔画。');var n=note();localStorage.setItem(key,JSON.stringify(editing?fresh.map(function(old){return old.id===n.id?n:old}):[n].concat(fresh)));delete all[owner];localStorage.setItem(leaseKey,JSON.stringify(all));return n})
          end();o.saved(saved);root.classList.add('is-free-review');setTimeout(function(){root.classList.remove('is-free-review')},1800)
        }catch(err){feedback(err.message||'保存失败，笔迹仍在，请不要关闭。')}finally{ending=false;b.disabled=false}break
    }},{signal:signal})
    panel.querySelector('[data-brush]').addEventListener('change',function(e){width=Number(e.target.value)},{signal:signal})
    window.addEventListener('storage',function(e){if(e.key===leaseKey){leased=null;showPresence()}if(e.key===key){o.sync();refreshBoxes();showPresence()}},{signal:signal})
    window.addEventListener('resize',function(){penUp();if(active)fit();else {refreshBoxes();showPresence()}},{signal:signal})
    window.addEventListener('scroll',function(){if(active)refreshBoxes()},{passive:true,signal:signal})
    window.addEventListener('blur',penUp,{signal:signal});document.addEventListener('visibilitychange',function(){if(document.hidden)penUp()},{signal:signal})
    document.addEventListener('keydown',function(e){if(active&&e.key==='Escape'){if(held)penUp();else end()}},{signal:signal})
    window.addEventListener('pagehide',release,{signal:signal});showPresence()
    return {start:start,active:function(){return active},resize:function(){if(active)fit();else {refreshBoxes();showPresence()}},destroy:function(){end();clearInterval(sprayTimer);clearTimeout(warningTimer);if(audio)audio.close();controller.abort();layer.remove();presence.remove();panel.remove();cursor.remove();warning.remove()}}
  }
  window.WallTools={mount:mount,paintArt:paintArt,toolArt:toolArt}
})()
