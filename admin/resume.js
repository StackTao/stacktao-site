const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const field = (label, name, value = '') => `<label>${label}<input name="${name}" value="${escape(value)}"></label>`

export async function resumeEditor({ api, main, run, toast, changed, busy }) {
  const result = await api('/settings'), config = result.data
  const data = structuredClone(config.resume || { draft: true, name: '', role: '', contacts: [], sections: [] })
  data.contacts ||= []; data.sections ||= []
  main.innerHTML = `<header class="page-head"><div><span class="eyebrow">RÉSUMÉ / 简历</span><h1>一份内容，两种呈现。</h1><p>保存后同步更新网页和 PDF。经历要写清你的职责、行动与结果。</p></div><div class="actions"><a href="/site/#/resume" target="_blank" rel="noopener">查看简历 ↗</a><button id="save-resume" class="primary">保存并构建 ↗</button></div></header>
    <section class="section-card"><h2>个人资料</h2><div class="form-grid" data-resume-basics>${field('姓名 / 称呼','name',data.name)}${field('目标岗位','role',data.role)}${field('字母印记','monogram',data.monogram)}${field('更新日期','updated',data.updated)}<label class="full">个人简介<textarea name="summary" rows="3">${escape(data.summary)}</textarea></label>${field('页脚短句','footer',data.footer)}</div><label>内容状态<select id="resume-draft"><option value="true" ${data.draft !== false ? 'selected' : ''}>示例模式：保留虚构内容提示</option><option value="false" ${data.draft === false ? 'selected' : ''}>正式简历：已替换为真实资料</option></select></label><p class="hint">保存的内容会出现在公开简历中。示例模式会在页面和 PDF 上保留标记。</p></section>
    <section class="section-card"><h2>联系与链接</h2><div id="resume-contacts"></div><button id="resume-add-contact">＋ 添加联系方式</button></section>
    <div id="resume-sections"></div><button id="resume-add-section">＋ 添加栏目</button>`
  const q = selector => main.querySelector(selector)
  function sync() {
    q('[data-resume-basics]').querySelectorAll('[name]').forEach(el => data[el.name] = el.value)
    data.draft = q('#resume-draft').value === 'true'
    q('#resume-contacts').querySelectorAll('[data-contact]').forEach((row,i) => {
      data.contacts[i] = { label: row.querySelector('[name=label]').value, url: row.querySelector('[name=url]').value }
    })
    q('#resume-sections').querySelectorAll('[data-section]').forEach((row,i) => {
      const section = data.sections[i]
      section.title = row.querySelector('[name=section-title]').value
      section.caption = row.querySelector('[name=caption]').value
      row.querySelectorAll('[data-entry]').forEach((entry,j) => {
        for (const name of ['title','subtitle','period','url']) section.items[j][name] = entry.querySelector(`[name=${name}]`).value
        section.items[j].points = entry.querySelector('[name=points]').value.split('\n').map(s => s.trim()).filter(Boolean)
      })
    })
  }
  function render() {
    q('#resume-contacts').innerHTML = data.contacts.map((item,i) => `<div class="form-row" data-contact>${field('显示文字','label',item.label)}${field('链接（可留空）','url',item.url)}<button data-remove-contact="${i}" aria-label="移除联系方式 ${i+1}">×</button></div>`).join('')
    q('#resume-sections').innerHTML = data.sections.map((section,i) => `<section class="section-card" data-section><div class="form-grid">${field('栏目名称','section-title',section.title)}${field('英文小标题','caption',section.caption)}</div>${(section.items || []).map((entry,j) => `<div class="section-card" data-entry><div class="form-grid">${field('标题 / 公司 / 项目','title',entry.title)}${field('时间','period',entry.period)}${field('职位 / 技术 / 补充说明','subtitle',entry.subtitle)}${field('作品链接（可留空）','url',entry.url)}<label class="full">经历与成果（每行一条）<textarea name="points" rows="4">${escape((entry.points || []).join('\n'))}</textarea></label></div><button class="quiet" data-remove-entry="${i}:${j}">移除这条经历</button></div>`).join('')}<div class="actions"><button data-add-entry="${i}">＋ 添加经历</button><button class="quiet" data-remove-section="${i}">移除栏目</button></div></section>`).join('')
    const bind = (attribute, action) => main.querySelectorAll(`[${attribute}]`).forEach(button => button.onclick = () => { sync(); action(button.getAttribute(attribute)); changed(true); render() })
    bind('data-remove-contact', i => data.contacts.splice(+i,1))
    bind('data-remove-section', i => data.sections.splice(+i,1))
    bind('data-add-entry', i => { data.sections[i].items ||= []; data.sections[i].items.push({points:[]}) })
    bind('data-remove-entry', value => { const [i,j] = value.split(':').map(Number); data.sections[i].items.splice(j,1) })
  }
  render()
  q('#resume-add-contact').onclick = () => { sync(); data.contacts.push({label:'',url:''}); changed(true); render() }
  q('#resume-add-section').onclick = () => { sync(); data.sections.push({title:'新栏目',caption:'',items:[{points:[]}]}); changed(true); render() }
  main.oninput = () => changed(true)
  q('#save-resume').onclick = run(async () => {
    sync()
    if (!data.name.trim()) throw new Error('请填写姓名或称呼')
    for (const item of [...data.contacts,...data.sections.flatMap(section => section.items || [])]) {
      if (item.url && !/^(https?:\/\/|mailto:)/i.test(item.url.trim())) throw new Error('链接请使用完整的 https:// 地址，邮箱链接使用 mailto:')
    }
    const button = q('#save-resume'); busy(true); button.disabled = true
    try {
      const saved = await api('/settings', { method:'PUT', headers:{'If-Match':result.revision}, body:{...config,resume:data} })
      result.revision = saved.revision
      changed(false); toast('简历已保存，网页与 PDF 内容已同步')
    } finally { busy(false); button.disabled = false }
  })
}
