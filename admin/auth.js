const $=s=>document.querySelector(s)
const input=(label,name,type='text',autocomplete='',extra='')=>`<label>${label}<input name="${name}" type="${type}" autocomplete="${autocomplete}" ${extra} required></label>`
const password=(label,name='password')=>input(label,name,'password','new-password','minlength="12" maxlength="128"')
export function authentication({api,toast,boot,run}){
 let resetToken=''
 function captureReset(){if(!location.hash.startsWith('#reset='))return false;resetToken=location.hash.slice(7);history.replaceState(null,'',location.pathname);return true}
 captureReset()
 async function show(mode){
  const config=await api('/auth/config')
  mode=mode||(resetToken?'reset':config.configured?'login':'setup')
  $('#workspace').hidden=true;$('#login').hidden=false
  const panel=$('#auth-panel')
  const descriptions={login:'欢迎回来，继续整理你的想法。',setup:'首次使用：创建专属于你的管理员账号。',forgot:'重置链接会发送到初始化时填写的管理员邮箱。',reset:'设置新密码后，所有设备都需要重新登录。'}
  const labels={login:'登录工作台 ↗',setup:'创建管理员账号',forgot:'发送重置链接',reset:'保存新密码'}
  panel.innerHTML=`<p>${descriptions[mode]}</p><form id="auth-form">${mode==='setup'?input('初始化凭据','token','password','off')+input('账号','username','text','username','pattern="[a-zA-Z0-9_.-]{3,64}"')+input('找回邮箱','email','email','email')+password('密码')+password('再次输入密码','confirm'):mode==='login'?input('账号','username','text','username')+input('密码','password','password','current-password'):mode==='forgot'?input('管理员邮箱','email','email','email'):password('新密码')+password('再次输入新密码','confirm')}<button class="primary" ${mode==='forgot'&&!config.emailRecovery?'disabled':''}>${labels[mode]}</button></form><p class="hint">${mode==='setup'?'初始化凭据在服务器的 state/owner-token 文件中，只用于这一次。密码至少 12 个字符；找回邮箱请仔细核对。':mode==='forgot'?(config.emailRecovery?'链接 15 分钟有效，仅能使用一次。':'邮件服务尚未配置，请通过服务器恢复访问。'):mode==='reset'?'重置后，现有 API 令牌也会撤销，请为 AI 工具重新授权。':'密码不会保存在浏览器本地存储。'}</p><div class="actions">${mode==='login'?'<button id="forgot-password" class="quiet">忘记密码？</button>':mode!=='setup'?'<button id="back-login" class="quiet">返回登录</button>':''}</div>`
  $('#forgot-password')?.addEventListener('click',run(()=>show('forgot')))
  $('#back-login')?.addEventListener('click',run(()=>{resetToken='';return show('login')}))
  $('#auth-form').onsubmit=run(async e=>{
   e.preventDefault();const data=Object.fromEntries(new FormData(e.target)),button=e.target.querySelector('button')
   if(data.confirm!==undefined&&data.confirm!==data.password)throw new Error('两次输入的密码不一致')
   button.disabled=true
   try{
    if(mode==='login'){await api('/session',{method:'POST',body:data});e.target.reset();await boot()}
    if(mode==='setup'){await api('/auth/setup',{method:'POST',body:data});toast('管理员账号已创建，请使用账号密码登录');await show('login')}
    if(mode==='forgot'){const result=await api('/auth/forgot',{method:'POST',body:data});toast(result.message)}
    if(mode==='reset'){await api('/auth/reset',{method:'POST',body:{password:data.password,token:resetToken}});resetToken='';toast('密码已重置，请重新登录');await show('login')}
   }finally{button.disabled=false}
  })
 }
 async function account(){
  const data=await api('/account'),a=data.account
  $('#main').innerHTML=`<header class="page-head"><div><span class="eyebrow">SECURITY / 安全</span><h1>账号与安全</h1><p>修改密码会退出所有设备。AI 令牌可在「AI 与 API」中单独撤销。</p></div></header><section class="section-card"><h2>管理员账号</h2><dl class="account-details"><dt>账号</dt><dd id="account-name"></dd><dt>找回邮箱</dt><dd id="account-email"></dd></dl><p class="hint">${data.emailRecovery?'邮件重置服务已配置。':'邮件服务尚未配置；请在部署环境配置发件服务后使用邮件找回。'}</p></section><section class="section-card"><h2>修改密码</h2><form id="change-password">${input('当前密码','currentPassword','password','current-password')}${password('新密码')}${password('再次输入新密码','confirm')}<p class="hint">12–128 个字符，建议使用密码管理器生成的独特长密码。</p><button class="primary">更新密码并退出登录</button></form></section><section class="section-card"><h2>第三方登录</h2><p class="hint">Google 登录尚未启用。后续将通过已登录的管理员账号绑定，不开放公开注册。</p></section>`
  $('#account-name').textContent=a?.username||'尚未初始化';$('#account-email').textContent=a?.email||'尚未设置'
  $('#change-password').onsubmit=run(async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));if(data.password!==data.confirm)throw new Error('两次输入的密码不一致');const b=e.target.querySelector('button');b.disabled=true;try{await api('/account/password',{method:'POST',body:data});toast('密码已更新，请重新登录');await show('login')}finally{b.disabled=false}})
 }
 return {show,account,captureReset,hasReset:()=>!!resetToken}
}
