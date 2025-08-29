import { registerSW } from 'virtual:pwa-register'

function showBanner({ message, actionText, onAction, hideAfter = 8000 }) {
  const id = 'pf-update-banner'
  if (document.getElementById(id)) return
  const wrap = document.createElement('div')
  wrap.id = id
  wrap.style.cssText = [
    'position:fixed','left:16px','bottom:16px','z-index:10000','max-width:92%','box-shadow:0 4px 12px rgba(0,0,0,0.1)',
    'background:#111827','color:#fff','border-radius:10px','padding:10px 12px','display:flex','align-items:center','gap:8px'
  ].join(';')
  const text = document.createElement('span')
  text.textContent = message
  text.style.cssText = 'font-size:12px;opacity:.95'
  const btn = document.createElement('button')
  btn.textContent = actionText
  btn.style.cssText = 'background:#22c55e;color:#0b2312;border:none;padding:6px 10px;border-radius:8px;font-size:12px;cursor:pointer'
  btn.onclick = () => { try { onAction?.() } finally { document.body.removeChild(wrap) } }
  const close = document.createElement('button')
  close.textContent = 'Dismiss'
  close.style.cssText = 'background:transparent;color:#c7cad1;border:1px solid #374151;padding:6px 10px;border-radius:8px;font-size:12px;cursor:pointer'
  close.onclick = () => document.body.removeChild(wrap)
  wrap.append(text, btn, close)
  document.body.appendChild(wrap)
  if (hideAfter) setTimeout(() => { if (wrap.parentNode) document.body.removeChild(wrap) }, hideAfter)
}

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    showBanner({
      message: 'A new version is available.',
      actionText: 'Refresh',
      onAction: () => updateSW(true)
    })
  },
  onOfflineReady() {
    showBanner({ message: 'Offline ready. You can use the app without internet.', actionText: 'OK', onAction: () => {} })
  }
})

