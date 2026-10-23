(function () {
  // The camera transforms CSS pixels only. Authored geometry stays in wall units.
  function mount(o) {
    var root=o.root,wall=o.wall,viewport=wall.parentElement,controller=new AbortController(),signal=controller.signal
    var scene=document.createElement('div');scene.className='gb-wall-scene'
    viewport.classList.add('has-wall-camera');viewport.prepend(scene)
    ;[wall,o.stage,o.ghost].forEach(function(el){scene.append(el)})
    var titleHost=document.createElement('div');titleHost.className='gb-wall-header';titleHost.append(root.querySelector('.gb-wall-title'));scene.append(titleHost)
    var controls=document.createElement('nav');controls.className='gb-camera-controls';controls.setAttribute('aria-label','墙面视野')
    controls.innerHTML='<div><button data-camera="out" aria-label="缩小墙面">−</button><button data-camera="reset" aria-label="还原墙面视野" title="还原视野">100%</button><button data-camera="in" aria-label="放大墙面">＋</button><button data-camera="hand" aria-label="拖动墙面" aria-pressed="false">✥</button></div><small>双指缩放、平移 · 单指落笔</small>'
    root.append(controls)
    var zoom=1,x=0,y=0,hand=false,points=new Map(),gesture=null,blocked=false,suppressClick=false,lastView={width:viewport.clientWidth,height:viewport.clientHeight,wall:wall.clientWidth,left:wall.offsetLeft,top:wall.offsetTop}
    var clamp=function(value,low,high){return Math.max(low,Math.min(high,value))}
    function apply(){
      x=clamp(x,Math.min(0,viewport.clientWidth-scene.clientWidth*zoom),0)
      y=clamp(y,Math.min(0,viewport.clientHeight-scene.scrollHeight*zoom),0)
      scene.style.setProperty('--wall-view-zoom',zoom)
      scene.style.transform='translate('+x+'px,'+y+'px) scale('+zoom+')'
      controls.querySelector('[data-camera="reset"]').textContent=Math.round(zoom*100)+'%'
      controls.querySelector('[data-camera="out"]').disabled=zoom<=1
      controls.querySelector('[data-camera="in"]').disabled=zoom>=4
      scene.classList.toggle('is-panning',!!gesture||hand)
    }
    function changed(){if(o.changed)o.changed()}
    function screenPoint(e){var r=viewport.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
    function pair(){var p=Array.from(points.values()).slice(0,2);return {x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.max(1,Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y))}}
    function beginPinch(){
      o.cancel();blocked=true;suppressClick=true
      var p=pair();gesture={type:'pinch',x:p.x,y:p.y,d:p.d,zoom:zoom,worldX:(p.x-x)/zoom,worldY:(p.y-y)/zoom}
      apply()
    }
    function stopEvent(e){e.preventDefault();e.stopImmediatePropagation()}
    viewport.addEventListener('pointerdown',function(e){
      if(e.button!==0)return
      suppressClick=false
      var p=screenPoint(e);p.startX=p.x;p.startY=p.y
      p.pan=hand||(e.pointerType==='touch'&&!o.editing())||(!o.editing()&&!e.target.closest('[data-note],button,input,textarea'))
      points.set(e.pointerId,p)
      if(points.size>=2){beginPinch();stopEvent(e)}
      else if(hand){o.cancel();blocked=true;suppressClick=true;gesture={type:'pan',pointer:e.pointerId,startX:p.x,startY:p.y,x:x,y:y};viewport.setPointerCapture(e.pointerId);stopEvent(e)}
    },{capture:true,signal:signal})
    window.addEventListener('pointermove',function(e){
      var p=points.get(e.pointerId);if(!p)return
      var next=screenPoint(e);p.x=next.x;p.y=next.y
      if(gesture&&gesture.type==='pinch'){
        var center=pair();zoom=clamp(gesture.zoom*center.d/gesture.d,1,4)
        x=center.x-gesture.worldX*zoom;y=center.y-gesture.worldY*zoom;apply();stopEvent(e)
      }else if(points.size===1&&!gesture&&!blocked&&p.pan&&Math.hypot(p.x-p.startX,p.y-p.startY)>6){
        o.cancel();blocked=true;suppressClick=true;gesture={type:'pan',pointer:e.pointerId,startX:p.startX,startY:p.startY,x:x,y:y}
        viewport.setPointerCapture(e.pointerId)
      }
      if(gesture&&gesture.type==='pan'){
        x=gesture.x+p.x-gesture.startX;y=gesture.y+p.y-gesture.startY;apply();stopEvent(e)
      }else if(blocked)stopEvent(e)
    },{capture:true,signal:signal})
    function release(e){
      if(!points.has(e.pointerId))return
      points.delete(e.pointerId)
      if(blocked)stopEvent(e)
      // Keep the remaining finger inert until it lifts; never resume an old stroke.
      if(points.size>=2)beginPinch()
      else if(gesture){gesture=null;apply();changed()}
      if(!points.size)blocked=false
    }
    window.addEventListener('pointerup',release,{capture:true,signal:signal})
    window.addEventListener('pointercancel',release,{capture:true,signal:signal})
    viewport.addEventListener('click',function(e){if(suppressClick){stopEvent(e);suppressClick=false}},{capture:true,signal:signal})
    function zoomAt(value,p){o.cancel();var next=clamp(value,1,4);x=p.x-(p.x-x)*next/zoom;y=p.y-(p.y-y)*next/zoom;zoom=next;apply();changed()}
    controls.addEventListener('click',function(e){
      var b=e.target.closest('button');if(!b)return
      if(b.dataset.camera==='hand'){o.cancel();hand=!hand;b.setAttribute('aria-pressed',String(hand));apply();return}
      if(b.dataset.camera==='reset'){o.cancel();zoom=1;x=y=0;apply();changed();return}
      zoomAt(zoom*(b.dataset.camera==='in'?1.5:1/1.5),{x:viewport.clientWidth/2,y:viewport.clientHeight*.4})
    },{signal:signal})
    controls.addEventListener('keydown',function(e){var d={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]}[e.key];if(!hand||!d)return;e.preventDefault();o.cancel();x+=d[0];y+=d[1];apply();changed()},{signal:signal})
    viewport.addEventListener('wheel',function(e){
      if(e.target.closest('textarea,input,select'))return
      e.preventDefault()
      if(e.ctrlKey||e.metaKey)zoomAt(zoom*Math.exp(-e.deltaY*.008),screenPoint(e))
      else {o.cancel();var unit=e.deltaMode===1?16:e.deltaMode===2?viewport.clientHeight:1;x-=e.deltaX*unit;y-=e.deltaY*unit;apply();changed()}
    },{passive:false,signal:signal})
    function refresh(){
      var next={width:viewport.clientWidth,height:viewport.clientHeight,wall:wall.clientWidth,left:wall.offsetLeft,top:wall.offsetTop}
      if(lastView.wall&&(next.width!==lastView.width||next.height!==lastView.height)){
        var cx=(lastView.width/2-x-lastView.left*zoom)/(lastView.wall*zoom),cy=(lastView.height*.4-y-lastView.top*zoom)/(lastView.wall*zoom)
        x=next.width/2-(next.left+cx*next.wall)*zoom;y=next.height*.4-(next.top+cy*next.wall)*zoom
      }
      lastView=next;apply();changed()
    }
    window.addEventListener('resize',function(){points.clear();gesture=null;blocked=false;o.cancel();refresh();changed()},{signal:signal})
    window.addEventListener('blur',function(){points.clear();gesture=null;blocked=false;apply()},{signal:signal})
    apply()
    return {
      zoom:function(){return zoom},refresh:refresh,
      reset:function(){zoom=1;x=y=0;apply();changed()},
      focus:function(el){var r=el.getBoundingClientRect(),v=viewport.getBoundingClientRect();x+=v.left+v.width/2-(r.left+r.width/2);y+=v.top+v.height*.4-(r.top+r.height/2);apply();changed()},
      destroy:function(){controller.abort();controls.remove();root.querySelector(':scope > .gb-wall-header').append(titleHost.firstChild);titleHost.remove();while(scene.firstChild)viewport.insertBefore(scene.firstChild,scene);scene.remove();viewport.classList.remove('has-wall-camera')}
    }
  }
  window.WallCamera={mount:mount}
})()
