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
  const email = list(resume.contacts).find(item => item && /^mailto:/i.test(text(item.url)))
  return `<main class="resume-page" aria-label="个人简历">
    <div class="resume-tools"><a href="#/" class="resume-back">← 返回博客</a><span class="resume-format">PERSONAL INDEX / 01</span><button type="button" class="resume-view-toggle" data-resume-view aria-pressed="false">纸面预览</button><button type="button" data-resume-print><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5"/></svg>导出 PDF</button></div>
    <div class="resume-status" role="status" data-resume-status>${resume.draft !== false ? '版式预览 · 以下经历、项目与数据均为虚构示例，请替换后使用。' : '网页与 PDF 使用同一份内容。导出时选择「另存为 PDF」。'}</div>
    <article class="resume-paper" aria-label="${escape(resume.name)}的简历">
      <div class="resume-opening"><header class="resume-heading"><div class="resume-eyebrow"><span>CURRICULUM VITAE</span><span>${resume.draft !== false ? '示例 / DRAFT' : escape(resume.updated || '')}</span></div>
        <p class="resume-greeting resume-web-only">你好，我是</p><div class="resume-name-row"><h1>${escape(resume.name)}</h1><span class="resume-monogram" aria-hidden="true">${escape(resume.monogram || 'SU')}<i>✳</i></span></div>
        <p class="resume-role">${escape(resume.role)}</p>
        <div class="resume-contacts">${contacts}${email ? `<button type="button" class="resume-copy resume-web-only" data-resume-copy="${escape(text(email.url).slice(7).split('?')[0])}">复制邮箱</button>` : ''}</div><span class="resume-copy-status resume-web-only" data-resume-copy-status role="status"></span>
      </header>
      <aside class="resume-craft resume-web-only" aria-label="可交互的界面设计小样">
        <div class="resume-craft-label"><span>一点手艺 / INTERFACE STUDY</span><span aria-hidden="true">↙</span></div>
        <div class="resume-craft-stage" data-craft-stage style="--craft:1;--craft-percent:100%">
          <span class="resume-craft-cross cross-one" aria-hidden="true">+</span><span class="resume-craft-cross cross-two" aria-hidden="true">+</span>
          <div class="resume-craft-window" aria-hidden="true"><div class="craft-window-bar"><i></i><i></i><i></i><span>hello.interface</span></div><div class="craft-window-content"><span class="craft-small">A SMALL IDEA, MADE REAL.</span><strong>Hello,<br><em>world.</em></strong><div class="craft-window-line"></div><div class="craft-window-line short"></div><span class="craft-window-cta">让想法发生 <b>↗</b></span></div><svg class="craft-pointer" viewBox="0 0 24 30"><path d="M2 2 21 17l-9 1-4 9Z"/></svg></div>
          <span class="resume-craft-coordinate" aria-hidden="true">FIG. 01 — FROM IDEA TO INTERFACE</span>
        </div>
        <div class="resume-craft-control"><label for="resume-craft-range">从想法到成品</label><output for="resume-craft-range" data-craft-output>04 / 成品</output><input id="resume-craft-range" type="range" min="0" max="100" value="100" aria-label="界面完成度" aria-valuetext="成品" /><div class="resume-craft-scale"><span>线框</span><span>结构</span><span>细节</span><span>成品</span></div></div>
        <div class="resume-craft-caption"><span>拖一拖，看看一个界面如何长成。</span><button type="button" data-craft-replay>再做一遍 ↺</button></div>
      </aside></div>
      ${text(resume.summary) ? `<p class="resume-summary">${escape(resume.summary)}</p>` : ''}
      <nav class="resume-index resume-web-only" aria-label="简历章节">${sections.map((section, i) => `<button type="button" data-resume-jump="${i}"><span>${String(i + 1).padStart(2, '0')}</span>${escape(section.title)}<b aria-hidden="true">↗</b></button>`).join('')}</nav>
      ${sections.map((section, i) => `<section class="resume-section" data-resume-section="${i}" aria-labelledby="resume-section-${i}"><div class="resume-section-label"><span aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h2 id="resume-section-${i}">${escape(section.title)}</h2><small>${escape(section.caption)}</small><div class="resume-time-index resume-web-only">${list(section.items).filter(Boolean).map((item, j) => text(item.period) ? `<button type="button" data-resume-entry-target="${i}-${j}">${escape(item.period)}<span aria-hidden="true">→</span></button>` : '').join('')}</div></div><div class="resume-entries">${list(section.items).filter(Boolean).map((item, j) => `<div class="resume-entry" data-resume-entry="${i}-${j}"><div class="resume-entry-heading"><h3>${href(item.url) ? `<a href="${href(item.url)}" target="_blank" rel="noreferrer">${escape(item.title)} <span aria-hidden="true">↗</span></a>` : escape(item.title)}</h3>${text(item.period) ? `<span class="resume-period">${escape(item.period)}</span>` : ''}</div>${text(item.subtitle) ? `<p class="resume-subtitle">${escape(item.subtitle)}</p>` : ''}${list(item.points).length ? `<ul>${item.points.map(point => `<li>${escape(point)}</li>`).join('')}</ul>` : ''}</div>`).join('')}</div></section>`).join('')}
      <footer class="resume-paper-footer"><span>${escape(resume.footer || '保持好奇，把事情做好。')}</span><span>${escape(resume.name)} · ${resume.draft !== false ? '示例简历' : 'RÉSUMÉ'}</span></footer>
    </article>
    <p class="resume-print-note">导出建议：A4 纸张、缩放 100%、关闭页眉和页脚。文字与链接会保留。</p>
  </main>`
}
