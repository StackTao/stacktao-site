(function(){
  var configured=window.CONTENT_CONFIG&&window.CONTENT_CONFIG.guestbook&&window.CONTENT_CONFIG.guestbook.endpoint
  var endpoint=configured||(/^(127\.0\.0\.1|localhost)$/.test(location.hostname)?location.pathname.startsWith('/site/')?location.origin+'/api/wall':'http://127.0.0.1:5174/api/wall':'/api/wall')
  if(!endpoint)return
  var pendingLoads=0,loading=0,token='',notes=[],catalog=[],presence={},section=0,version=0,listeners=[],ready=false,timer,stream,busy=false,refreshAgain=false
  var tokenKey='stacktao-wall-visitor:'+endpoint
  try{token=localStorage.getItem(tokenKey)||''}catch(_){}
  async function request(route,method,data){var r=await fetch(endpoint+route,{method:method||'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data===undefined?undefined:JSON.stringify(data),credentials:'omit'}),result=await r.json();if(!r.ok){var error=Error(result.error||'共享墙暂时无法连接');error.status=r.status;throw error;}return result}
  function accept(s){var changed=!ready||section!==s.section||JSON.stringify(notes)!==JSON.stringify(s.notes);section=s.section;notes=s.notes;catalog=s.walls;presence=s.leases;ready=true;if(changed)version++;api.seed=s.seed;api.stats=s.stats}
  async function load(wall){var ticket=++loading;pendingLoads++;try{var s=await request('?section='+wall);if(ticket===loading)accept(s);return notes}finally{pendingLoads--}}
  async function init(){if(!token){var s=await request('/session','POST',{});token=s.token;try{localStorage.setItem(tokenKey,token)}catch(_){throw Error('浏览器无法保留访客身份，请允许本地存储后重试')}}await load(section);return notes}
  var api={section:function(){return section},seed:0,stats:{},init:init,ready:function(){return ready},read:function(){return notes},version:function(){return version},walls:function(){return catalog},leases:function(){return presence},load:load,put:async function(n,lease){var result=await request('/notes','POST',{note:n,revision:n.revision,lease:lease});try{await load(n.section)}catch(_){notes=[result].concat(notes.filter(function(old){return old.id!==result.id}));version++}return result},remove:async function(n){await request('/notes/'+n.id,'DELETE',{revision:n.revision});await load(section)},restore:async function(n){await request('/notes/'+n.id+'/restore','POST',{});await load(n.section)},reserve:async function(id,wall,cells,note){var s=await request('/leases','POST',{id:id,wall:wall,cells:cells,note:note});presence=s.leases;return true},release:async function(id){await request('/leases/'+id,'DELETE',{})},newWall:async function(){var w=await request('/walls','POST',{});await load(w.id);return w.id},subscribe:function(fn){listeners.push(fn);if(!timer){timer=setInterval(refresh,2500);if(window.EventSource){stream=new EventSource(endpoint+'/events');stream.onmessage=refresh;stream.onopen=refresh}document.addEventListener('visibilitychange',visible)}return function(){listeners=listeners.filter(function(f){return f!==fn});if(!listeners.length){clearInterval(timer);timer=null;if(stream)stream.close();stream=null;document.removeEventListener('visibilitychange',visible)}}}}
  function visible(){if(!document.hidden)refresh()}
  async function refresh(){
    if(busy||pendingLoads){refreshAgain=true;return}if(document.hidden)return
    busy=true;try{var old=JSON.stringify([notes,catalog]),oldPresence=JSON.stringify(presence);await load(section);var contentChanged=old!==JSON.stringify([notes,catalog]);if(contentChanged||oldPresence!==JSON.stringify(presence))listeners.forEach(function(f){f(contentChanged)})}catch(_){/* Keep the confirmed scene and retry after reconnect. */}finally{busy=false;if(refreshAgain){refreshAgain=false;setTimeout(refresh,100)}}
  }

  window.SharedWall=api
})()
