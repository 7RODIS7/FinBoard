(function(){
  const $ = (sel,root=document)=>root.querySelector(sel)

  const LS_KEY = 'salary_timer_state'

  function parseLocaleNumber(str){
    if(typeof str !== 'string') return NaN
    const cleaned = str.replace(/[^0-9,\.\-\s]/g,'').replace(/\s+/g,'').replace(',', '.')
    const n = parseFloat(cleaned)
    return Number.isFinite(n) ? n : NaN
  }

  function readRates(){
    // From KPI labels: "work / calendar"
    const netHourText = ($('#kNetHour')?.textContent||'').trim()
    const grossHourText = ($('#kGrossHour')?.textContent||'').trim()
    const cur = (function(){ try{ return document.getElementById('selCurrency').value }catch(_){ return 'BGN' } })()

    function splitPair(txt){
      // e.g. "12,34 / 10,12 EUR"
      // Remove currency suffix if present
      const noCur = txt.replace(/\s+(BGN|EUR|USD)\s*$/,'')
      const parts = noCur.split('/').map(s=>s.trim())
      if(parts.length<2) return [NaN, NaN]
      return [ parseLocaleNumber(parts[0]), parseLocaleNumber(parts[1]) ]
    }

    const [netHourWork, netHourCal] = splitPair(netHourText)
    const [grossHourWork, grossHourCal] = splitPair(grossHourText)

    return {
      currency: cur,
      // per second in current currency
      net: {
        workPerSec: Number.isFinite(netHourWork) ? netHourWork/3600 : NaN,
        calPerSec:  Number.isFinite(netHourCal)  ? netHourCal/3600  : NaN
      },
      gross: {
        workPerSec: Number.isFinite(grossHourWork) ? grossHourWork/3600 : NaN,
        calPerSec:  Number.isFinite(grossHourCal)  ? grossHourCal/3600  : NaN
      }
    }
  }

  function fmtMoney(n, cur){
    try{
      // Show more precision to see the "drip"
      return new Intl.NumberFormat('ru-RU',{ minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(n||0) + ' ' + (cur||'BGN')
    }catch(_){ return (n||0).toFixed(4) + ' ' + (cur||'BGN') }
  }

  function fmtTime(msTotal){
    msTotal = Math.max(0, Math.floor(msTotal))
    const totalSec = Math.floor(msTotal/1000)
    const ms = msTotal % 1000
    const days = Math.floor(totalSec / 86400)
    const hh = Math.floor((totalSec % 86400) / 3600)
    const mm = Math.floor((totalSec % 3600) / 60)
    const ss = totalSec % 60
    const pad = (n)=> String(n).padStart(2,'0')
    const mspad = String(ms).padStart(3,'0')
    return (days>0? (days + ' дн · '):'') + `${pad(hh)}:${pad(mm)}:${pad(ss)}.${mspad}`
  }

  function loadState(){
    try{ const raw=localStorage.getItem(LS_KEY); if(raw){ const s=JSON.parse(raw); if(s && typeof s==='object') return s } }catch(_){ }
    return { startedAt: 0, elapsedMs: 0, running: false, type: 'net', period: 'cal' }
  }
  function saveState(st){ try{ localStorage.setItem(LS_KEY, JSON.stringify(st)) }catch(_){ }
  }

  function openModal(){
    const overlay = document.getElementById('dashOverlay')
    const modal = document.getElementById('dashModal')
    const title = document.getElementById('dashModalTitle')
    const content = document.getElementById('dashModalContent')
    if(!overlay || !modal || !title || !content) return

    title.textContent = 'Зарплатный секундомер'
    content.innerHTML = `
      <div class="controls">
        <label class="pill">Тип
          <select id="stType">
            <option value="net">Net</option>
            <option value="gross">Gross</option>
          </select>
        </label>
        <label class="pill">Период
          <select id="stPeriod">
            <option value="cal">Календарный</option>
            <option value="work">Рабочий</option>
          </select>
        </label>
        <span class="right"></span>
        <button id="stToggle" class="btn primary" aria-pressed="false">▶ Старт</button>
        <button id="stReset" class="btn">Сброс</button>
      </div>
      <div class="card" style="margin-top:12px">
        <div class="st-layout" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:stretch">
          <div class="st-side" style="display:flex;flex-direction:column;gap:10px;height:100%">
            <div class="st-sidebox" style="display:flex;flex-direction:column;gap:8px;padding:12px;border:1px dashed var(--grid);border-radius:12px;background:var(--chip)">
              <div id="stInfoRate" style="font-weight:600;color:var(--text)"></div>
              <div class="muted" style="font-size:12px">Пробел — старт/стоп</div>
              <div class="muted" style="font-size:12px">Значения зависят от текущих параметров калькулятора и валюты.</div>
            </div>
          </div>
          <div class="st-main" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;border:1px dashed var(--grid);border-radius:12px;background:var(--chip);height:100%">
            <div id="stTime" style="font-size:32px;font-weight:800;letter-spacing:0.5px">00:00:00.000</div>
            <div id="stEarn" style="font-size:24px;font-weight:800;margin-top:8px;color:var(--ok)">0.00</div>
          </div>
        </div>
      </div>
    `

    overlay.style.display = 'block'
    modal.style.display = 'block'

    const btnClose = document.getElementById('btnCloseDashModal')
    if(btnClose){ btnClose.onclick = closeModal }
    overlay.onclick = closeModal

    setupTimerUI()
  }

  function closeModal(){
    const overlay = document.getElementById('dashOverlay')
    const modal = document.getElementById('dashModal')
    if(overlay) overlay.style.display = 'none'
    if(modal) modal.style.display = 'none'
  }

  let rafId = 0
  let keydownHandler = null
  function setupTimerUI(){
    const st = loadState()
    const selType = document.getElementById('stType')
    const selPeriod = document.getElementById('stPeriod')
    const btnToggle = document.getElementById('stToggle')
    const btnReset = document.getElementById('stReset')

    if(selType) selType.value = st.type||'net'
    if(selPeriod) selPeriod.value = st.period||'cal'

    function currentRate(){
      const rates = readRates()
      const usingNet = (document.getElementById('stType')?.value||'net') === 'net'
      const usingWork = (document.getElementById('stPeriod')?.value||'cal') === 'work'
      const perSec = usingNet
        ? (usingWork ? rates.net.workPerSec : rates.net.calPerSec)
        : (usingWork ? rates.gross.workPerSec : rates.gross.calPerSec)
      return { perSec: perSec||0, currency: rates.currency, usingNet, usingWork, rates }
    }

    function updateRateInfo(){
      const el = document.getElementById('stInfoRate')
      if(!el) return
      const rates = readRates()
      const cur = rates.currency
      const usingNet = (document.getElementById('stType')?.value||'net') === 'net'
      const usingWork = (document.getElementById('stPeriod')?.value||'cal') === 'work'
      const perHour = usingNet
        ? (usingWork ? rates.net.workPerSec*3600 : rates.net.calPerSec*3600)
        : (usingWork ? rates.gross.workPerSec*3600 : rates.gross.calPerSec*3600)
      const val = (function(v){ try{ return new Intl.NumberFormat('ru-RU',{ minimumFractionDigits:2, maximumFractionDigits:2 }).format(v||0) }catch(_){ return (v||0).toFixed(2) } })(perHour)
      const typeLabel = usingNet ? 'Net' : 'Gross'
      const perLabel = usingWork ? 'раб. час' : 'календ. час'
      el.textContent = `${typeLabel} · ${perLabel}: ${val} ${cur}`
    }

    function setHeaderActive(active){
      const btn = document.getElementById('btnSalaryTimer')
      if(btn){ btn.classList.toggle('active', !!active) }
    }

    function updateToggleButton(){
      const state = loadState()
      if(!btnToggle) return
      if(state.running){
        btnToggle.textContent = '⏸ Стоп'
        btnToggle.setAttribute('aria-pressed','true')
        btnToggle.classList.add('primary')
      }else{
        btnToggle.textContent = '▶ Старт'
        btnToggle.setAttribute('aria-pressed','false')
        btnToggle.classList.add('primary')
      }
    }

    function tick(){
      const state = loadState()
      const now = Date.now()
      const elapsed = (state.running ? (now - (state.startedAt||now)) : 0) + (state.elapsedMs||0)
      const tEl = document.getElementById('stTime')
      const eEl = document.getElementById('stEarn')
      const rate = currentRate()
      const perMs = rate.perSec / 1000
      if(tEl) tEl.textContent = fmtTime(elapsed)
      if(eEl) eEl.textContent = fmtMoney(perMs * elapsed, rate.currency)
      setHeaderActive(state.running)
      rafId = requestAnimationFrame(tick)
    }

    function start(){
      const state = loadState()
      if(!state.running){ state.running = true; state.startedAt = Date.now(); saveState(state) }
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(tick)
      updateToggleButton()
    }
    function stop(){
      const state = loadState()
      if(state.running){
        const now = Date.now()
        state.elapsedMs = (state.elapsedMs||0) + (now - (state.startedAt||now))
        state.running = false
        saveState(state)
      }
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(tick)
      updateToggleButton()
    }
    function toggle(){ const s=loadState(); if(s.running) stop(); else start() }
    function reset(){
      const wasRunning = loadState().running
      const state = { startedAt: wasRunning? Date.now():0, elapsedMs: 0, running: wasRunning, type: selType?.value||'net', period: selPeriod?.value||'cal' }
      saveState(state)
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(tick)
      updateToggleButton()
    }

    if(btnToggle) btnToggle.onclick = toggle
    if(btnReset) btnReset.onclick = reset
    if(selType) selType.onchange = ()=>{ const s=loadState(); s.type = selType.value; saveState(s); updateRateInfo() }
    if(selPeriod) selPeriod.onchange = ()=>{ const s=loadState(); s.period = selPeriod.value; saveState(s); updateRateInfo() }

    // Spacebar toggle when modal is open
    keydownHandler = (e)=>{
      const modal = document.getElementById('dashModal')
      const visible = modal && modal.style.display==='block'
      if(!visible) return
      if(e.code==='Space'){
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', keydownHandler)
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(tick)
    updateToggleButton()
    // keep rate line in sync with KPIs/currency
    try{
      const observeTargets = ['kNetHour','kGrossHour'].map(id=>document.getElementById(id)).filter(Boolean)
      observeTargets.forEach(el=>{
        const mo = new MutationObserver(()=>updateRateInfo())
        mo.observe(el, { childList:true, characterData:true, subtree:true })
      })
      const sc = document.getElementById('selCurrency')
      if(sc){ sc.addEventListener('change', updateRateInfo) }
    }catch(_){ }
    updateRateInfo()
  }

  function ensureHeaderButton(){
    const hdr = document.querySelector('header')
    if(!hdr) return
    if(document.getElementById('btnSalaryTimer')) return
    const btn = document.createElement('button')
    btn.id = 'btnSalaryTimer'
    btn.className = 'icon-btn'
    btn.title = 'Зарплатный секундомер'
    btn.innerHTML = '💸'
    btn.onclick = openModal
    // Place between currency and theme: insert before theme toggle if present
    const theme = document.getElementById('themeToggle')
    if(theme && theme.parentElement===hdr){ hdr.insertBefore(btn, theme) }
    else {
      // Fallback: before settings, else append
      const settings = document.getElementById('settingsToggle')
      if(settings && settings.parentElement===hdr){ hdr.insertBefore(btn, settings) }
      else { hdr.appendChild(btn) }
    }
  }

  function init(){
    ensureHeaderButton()
    // If state exists, keep header indicator in sync even without modal open
    try{
      const state = loadState()
      const btn = document.getElementById('btnSalaryTimer')
      if(btn) btn.classList.toggle('active', !!state.running)
    }catch(_){ }
  }

  // Observe modal display to clean key handler when it closes
  const modalObs = new MutationObserver(()=>{
    const modal = document.getElementById('dashModal')
    if(!modal) return
    const isOpen = modal.style.display==='block'
    if(!isOpen && keydownHandler){ document.removeEventListener('keydown', keydownHandler); keydownHandler=null }
  })
  try{ const modal = document.getElementById('dashModal'); if(modal){ modalObs.observe(modal, { attributes:true, attributeFilter:['style'] }) } }catch(_){ }

  try{ init() }catch(_){ document.addEventListener('DOMContentLoaded', init) }
})()


