/* Optional first-party aggregate analytics. No content or search text is collected. */
(function () {
  var endpoint = window.CONTENT_CONFIG && window.CONTENT_CONFIG.analytics && window.CONTENT_CONFIG.analytics.endpoint
  if (!endpoint || navigator.doNotTrack === '1' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.pathname.indexOf('/site/') === 0) return
  try { if (new URL(endpoint).protocol !== 'https:') return } catch (_) { return }
  var session
  try { session = sessionStorage.getItem('stacktao-analytics-session'); if (!session) { session = crypto.randomUUID(); sessionStorage.setItem('stacktao-analytics-session', session) } } catch (_) { return }
  var route = '', started = 0, complete = false, timer
  function send(event) {
    if (document.visibilityState !== 'visible') return
    var referrer = ''
    try { var ref = new URL(document.referrer); if (ref.origin !== location.origin) referrer = ref.origin } catch (_) {}
    fetch(endpoint, { method: 'POST', credentials: 'omit', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ event: event, path: route, session: session, referrer: referrer, device: innerWidth < 768 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop' }) }).catch(function () {})
  }
  function read() {
    if (complete || !/^\/posts\/[^/]+$/.test(route) || Date.now() - started < 10000 || document.visibilityState !== 'visible') return
    var article = document.querySelector('article.prose')
    if (!article) return
    var box = article.getBoundingClientRect()
    if (innerHeight >= box.top + box.height * .9) { complete = true; send('read_complete') }
  }
  function page() {
    var next = (location.hash.slice(1) || '/').split('?')[0]
    if (!/^\/[a-zA-Z0-9/_-]{0,160}$/.test(next) || route === next) return
    route = next; started = Date.now(); complete = false; clearTimeout(timer); send('pageview'); timer = setTimeout(read, 11000)
  }
  addEventListener('hashchange', page)
  addEventListener('scroll', read, { passive: true })
  document.addEventListener('click', function (e) { var a = e.target.closest('a[href]'); if (a) { try { var url = new URL(a.href); if (/^https?:$/.test(url.protocol) && url.origin !== location.origin) send('outbound') } catch (_) {} } })
  var light = document.querySelector('.lightbox'), opened = false
  if (light) new MutationObserver(function () { var now = light.classList.contains('is-open'); if (now && !opened) send('photo_open'); opened = now }).observe(light, { attributes: true, attributeFilter: ['class'] })
  page()
})()
