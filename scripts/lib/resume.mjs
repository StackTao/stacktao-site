const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const list = value => Array.isArray(value) ? value : []
const text = value => typeof value === 'string' ? value : ''
const href = value => /^(https?:\/\/|mailto:)/i.test(text(value).trim()) ? escape(value.trim()) : ''

export function renderResume(resume) {
  if (!resume || !text(resume.name).trim()) return ''
  const sections = list(resume.sections).filter(section => section && text(section.title))
  const contacts = list(resume.contacts).filter(item => item && text(item.label)).map(item => {
    const url = href(item.url)
    return url ? `<a href="${url}" target="_blank" rel="noreferrer">${escape(item.label)} <span aria-hidden="true">↗</span></a>` : `<span>${escape(item.label)}</span>`
  }).join('')
  return `<main class="resume-page" aria-label="个人简历">
    <div class="resume-tools"><a href="#/" class="resume-back">← 返回博客</a><span class="resume-format">A4 / RÉSUMÉ</span><button type="button" data-resume-print><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5"/></svg>导出 PDF</button></div>
    <div class="resume-status" role="status" data-resume-status>${resume.draft !== false ? '版式预览 · 以下经历、项目与数据均为虚构示例，请替换后使用。' : '网页与 PDF 使用同一份内容。导出时选择「另存为 PDF」。'}</div>
    <article class="resume-paper" aria-label="${escape(resume.name)}的简历">
      <header class="resume-heading"><div class="resume-eyebrow"><span>CURRICULUM VITAE</span><span>${resume.draft !== false ? '示例 / DRAFT' : escape(resume.updated || '')}</span></div>
        <div class="resume-name-row"><h1>${escape(resume.name)}</h1><span class="resume-monogram" aria-hidden="true">${escape(resume.monogram || 'SU')}<i>✳</i></span></div>
        <p class="resume-role">${escape(resume.role)}</p>
        <div class="resume-contacts">${contacts}</div>
      </header>
      ${text(resume.summary) ? `<p class="resume-summary">${escape(resume.summary)}</p>` : ''}
      ${sections.map((section, i) => `<section class="resume-section" aria-labelledby="resume-section-${i}"><div class="resume-section-label"><span aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h2 id="resume-section-${i}">${escape(section.title)}</h2><small>${escape(section.caption)}</small></div><div class="resume-entries">${list(section.items).filter(Boolean).map(item => `<div class="resume-entry"><div class="resume-entry-heading"><h3>${href(item.url) ? `<a href="${href(item.url)}" target="_blank" rel="noreferrer">${escape(item.title)} <span aria-hidden="true">↗</span></a>` : escape(item.title)}</h3>${text(item.period) ? `<span class="resume-period">${escape(item.period)}</span>` : ''}</div>${text(item.subtitle) ? `<p class="resume-subtitle">${escape(item.subtitle)}</p>` : ''}${list(item.points).length ? `<ul>${item.points.map(point => `<li>${escape(point)}</li>`).join('')}</ul>` : ''}</div>`).join('')}</div></section>`).join('')}
      <footer class="resume-paper-footer"><span>${escape(resume.footer || '保持好奇，把事情做好。')}</span><span>${escape(resume.name)} · ${resume.draft !== false ? '示例简历' : 'RÉSUMÉ'}</span></footer>
    </article>
    <p class="resume-print-note">导出建议：A4 纸张、缩放 100%、关闭页眉和页脚。文字与链接会保留。</p>
  </main>`
}
