import { renderResumeLab } from './resume-lab.mjs'
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const list = value => Array.isArray(value) ? value : []
const text = value => typeof value === 'string' ? value : ''
const href = value => /^(https?:\/\/|mailto:)/i.test(text(value).trim()) ? escape(value.trim()) : ''

export function renderResume(resume, projects) {
  if (!resume || !text(resume.name).trim()) return ''
  const lab = renderResumeLab(projects)
  const sections = list(resume.sections).filter(section => section && text(section.title))
  const contacts = list(resume.contacts).filter(item => item && text(item.label)).map(item => {
    const url = href(item.url)
    return url ? `<a href="${url}" target="_blank" rel="noreferrer">${escape(item.label)} <span aria-hidden="true">↗</span></a>` : `<span>${escape(item.label)}</span>`
  }).join('')
  const email = list(resume.contacts).find(item => item && /^mailto:/i.test(text(item.url)))
  const cases = sections.flatMap((section, i) => list(section.items).filter(Boolean).map((item, j) => ({ item, target: `${i}-${j}` }))).filter(({item}) => item.caseStudy && ['problem','decision','result'].some(key => text(item.caseStudy[key]).trim()))
  const notes = cases.length ? `<aside class="resume-project-notes resume-web-only" aria-label="项目旁注"><div class="resume-notes-heading"><span>写在项目旁边 / FIELD NOTES</span><span aria-hidden="true">↙</span></div>${cases.map(({item, target}, i) => {
    const parts = [['problem','问题'],['decision','取舍'],['result','验证']].filter(([key]) => text(item.caseStudy[key]).trim())
    return `<section class="resume-case" aria-label="${escape(item.title)}的项目旁注"><div class="resume-case-meta"><span>PROJECT ${String(i+1).padStart(2,'0')}</span><span>${escape(item.period)}</span></div><h2>${escape(item.title)}</h2><div class="resume-case-tabs" role="tablist" aria-label="${escape(item.title)}的设计过程">${parts.map(([key,label], n) => `<button type="button" role="tab" id="case-tab-${target}-${key}" aria-controls="case-panel-${target}-${key}" aria-selected="${n===0}" tabindex="${n===0?0:-1}" data-case-tab>${label}<span aria-hidden="true">${String(n+1).padStart(2,'0')}</span></button>`).join('')}</div>${parts.map(([key,label], n) => `<div class="resume-case-panel" role="tabpanel" id="case-panel-${target}-${key}" aria-labelledby="case-tab-${target}-${key}" tabindex="0" ${n ? 'hidden' : ''}><span class="resume-case-marker" aria-hidden="true">${String(n+1).padStart(2,'0')} / ${label}</span><p>${escape(item.caseStudy[key])}</p></div>`).join('')}<div class="resume-case-links"><button type="button" data-resume-entry-target="${target}">读这段经历 <span aria-hidden="true">↓</span></button>${href(item.caseStudy.url) ? `<a href="${href(item.caseStudy.url)}" target="_blank" rel="noopener noreferrer">打开作品 ↗</a>` : ''}</div></section>`
  }).join('')}<p class="resume-notes-foot">作品背后的问题、判断与验证。</p></aside>` : ''

  return `<main class="resume-page" aria-label="个人简历">
    <div class="resume-tools"><a href="#/" class="resume-back">← 返回博客</a><span class="resume-format">PERSONAL INDEX / 01</span><button type="button" class="resume-view-toggle" data-resume-view aria-pressed="false">纸面预览</button><button type="button" data-resume-print><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5"/></svg>导出 PDF</button></div>
    <div class="resume-status" role="status" data-resume-status>${resume.draft !== false ? '版式预览 · 个人资料与经历含示例内容，请核实并替换后使用。' : '网页与 PDF 使用同一份内容。导出时选择「另存为 PDF」。'}</div>
    <article class="resume-paper" aria-label="${escape(resume.name)}的简历">
      <div class="resume-opening"><header class="resume-heading"><div class="resume-eyebrow"><span>CURRICULUM VITAE</span><span>${resume.draft !== false ? '示例 / DRAFT' : escape(resume.updated || '')}</span></div>
        <p class="resume-greeting resume-web-only">你好，我是</p><div class="resume-name-row"><h1>${escape(resume.name)}</h1><span class="resume-monogram" aria-hidden="true">${escape(resume.monogram || 'SU')}<i>✳</i></span></div>
        <p class="resume-role">${escape(resume.role)}</p>
        <div class="resume-contacts">${contacts}${email ? `<button type="button" class="resume-copy resume-web-only" data-resume-copy="${escape(text(email.url).slice(7).split('?')[0])}">复制邮箱</button>` : ''}</div><span class="resume-copy-status resume-web-only" data-resume-copy-status role="status"></span>
      </header>
      ${lab || notes}</div>
      ${text(resume.summary) ? `<p class="resume-summary">${escape(resume.summary)}</p>` : ''}
      <nav class="resume-index resume-web-only" aria-label="简历章节">${sections.map((section, i) => `<button type="button" data-resume-jump="${i}"><span>${String(i + 1).padStart(2, '0')}</span>${escape(section.title)}<b aria-hidden="true">↗</b></button>`).join('')}</nav>
      ${sections.map((section, i) => `<section class="resume-section" data-resume-section="${i}" aria-labelledby="resume-section-${i}"><div class="resume-section-label"><span aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h2 id="resume-section-${i}">${escape(section.title)}</h2><small>${escape(section.caption)}</small><div class="resume-time-index resume-web-only">${list(section.items).filter(Boolean).map((item, j) => text(item.period) ? `<button type="button" data-resume-entry-target="${i}-${j}">${escape(item.period)}<span aria-hidden="true">→</span></button>` : '').join('')}</div></div><div class="resume-entries">${list(section.items).filter(Boolean).map((item, j) => `<div class="resume-entry" data-resume-entry="${i}-${j}"><div class="resume-entry-heading"><h3>${href(item.url) ? `<a href="${href(item.url)}" target="_blank" rel="noreferrer">${escape(item.title)} <span aria-hidden="true">↗</span></a>` : escape(item.title)}</h3>${text(item.period) ? `<span class="resume-period">${escape(item.period)}</span>` : ''}</div>${text(item.subtitle) ? `<p class="resume-subtitle">${escape(item.subtitle)}</p>` : ''}${list(item.points).length ? `<ul>${item.points.map(point => `<li>${escape(point)}</li>`).join('')}</ul>` : ''}${lab && item.caseStudy && ['problem','decision','result'].some(key => text(item.caseStudy[key]).trim()) ? `<details class="resume-inline-notes resume-web-only"><summary>这个项目背后的取舍</summary>${[['problem','遇到的问题'],['decision','做过的取舍'],['result','结果与验证']].filter(([key]) => text(item.caseStudy[key]).trim()).map(([key,label])=>`<h4>${label}</h4><p>${escape(item.caseStudy[key])}</p>`).join('')}</details>` : ''}</div>`).join('')}</div></section>`).join('')}
      <footer class="resume-paper-footer"><span>${escape(resume.footer || '保持好奇，把事情做好。')}</span><span>${escape(resume.name)} · ${resume.draft !== false ? '示例简历' : 'RÉSUMÉ'}</span></footer>
    </article>
    <p class="resume-print-note">导出建议：A4 纸张、缩放 100%、关闭页眉和页脚。文字与链接会保留。</p>
  </main>`
}
