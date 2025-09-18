// Preferences module for FinBoard (theme, currency, FX rates)
(function(){
  const PREFS_KEY = 'ofb_prefs'
  const DEFAULT_PREFS = {
    theme: 'dark',
    preferredCurrency: 'BGN',
    fx: { BGN_EUR: 1.95583, BGN_USD: 1.65230 }
  }
  const LEGACY_DEFAULT_FX = { BGN_EUR: 1.949, BGN_USD: 1.773 }
  function sanitizeFxRates(obj){
    const d = DEFAULT_PREFS.fx
    const eur = +((obj&&obj.BGN_EUR)!=null ? obj.BGN_EUR : d.BGN_EUR)
    const usd = +((obj&&obj.BGN_USD)!=null ? obj.BGN_USD : d.BGN_USD)
    return {
      BGN_EUR: (Number.isFinite(eur) && eur>0.1 && eur<10) ? eur : d.BGN_EUR,
      BGN_USD: (Number.isFinite(usd) && usd>0.1 && usd<10) ? usd : d.BGN_USD
    }
  }

  function mergePrefs(a,b){
    const out = Object.assign({}, a||{})
    for(const k in b){
      if(b[k] && typeof b[k]==='object' && !Array.isArray(b[k])){
        out[k] = mergePrefs(out[k]||{}, b[k])
      }else{
        out[k] = b[k]
      }
    }
    return out
  }

  function loadPrefs(){
    try{
      const raw = localStorage.getItem(PREFS_KEY)
      const parsed = raw ? JSON.parse(raw) : {}
      return mergePrefs(DEFAULT_PREFS, parsed)
    }catch(_){ return DEFAULT_PREFS }
  }
  function savePrefs(p){ try{ localStorage.setItem(PREFS_KEY, JSON.stringify(p)) }catch(_){ } }

  let CACHE = null
  function get(){ if(!CACHE) CACHE = loadPrefs(); return CACHE }
  function set(update){
    const next = mergePrefs(get(), update||{})
    CACHE = next
    savePrefs(next)
    return next
  }

  function initThemeFromPrefs(){
    const theme = (get().theme||'dark')
    document.documentElement.setAttribute('data-theme', theme)
    // keep compatibility with old storage
    try{ localStorage.setItem('finboard_theme', theme) }catch(_){ }
  }
  function toggleThemeByPrefs(){
    const cur = get().theme || 'dark'
    const next = cur==='dark' ? 'light' : 'dark'
    set({ theme: next })
    initThemeFromPrefs()
    try{ if(window.toast) toast(`Переключено на ${next==='dark'?'темную':'светлую'} тему`) }catch(_){ }
  }

  function getFx(){ return sanitizeFxRates((get().fx)||{}) }

  function getFxDefaults(){ return { ...DEFAULT_PREFS.fx } }

  // One-time migration: if stored FX equals legacy defaults, update to new defaults
  try{
    const cur = get()
    const fx = cur && cur.fx || {}
    const looksLegacy = (+fx.BGN_EUR === LEGACY_DEFAULT_FX.BGN_EUR) && (+fx.BGN_USD === LEGACY_DEFAULT_FX.BGN_USD)
    if(looksLegacy){ set({ fx: { ...DEFAULT_PREFS.fx } }) }
  }catch(_){ }

  function openModal(){
    const prefs = get()
    const o=document.querySelector('#dashOverlay'), m=document.querySelector('#dashModal'), t=document.querySelector('#dashModalTitle'), c=document.querySelector('#dashModalContent')
    if(!o||!m||!t||!c) return
    const wrap = c
    o.style.display='block'; m.style.display='block'
    t.textContent = 'Настройки'
    const rs=t.parentElement && t.parentElement.querySelector('.right'); if(rs) rs.innerHTML=''
    c.innerHTML = `
      <div class="grid-sm">
        <div>
          <label>Тема</label>
          <select id="prefTheme" class="filter-select">
            <option value="dark" ${prefs.theme==='dark'?'selected':''}>Тёмная</option>
            <option value="light" ${prefs.theme==='light'?'selected':''}>Светлая</option>
          </select>
        </div>
        <div>
          <label>Предпочитаемая валюта</label>
          <select id="prefCurrency" class="filter-select">
            ${['BGN','EUR','USD'].map(c=>`<option value="${c}" ${prefs.preferredCurrency===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Курс BGN→EUR</label>
          <input id="prefBGN_EUR" type="number" step="0.00001" min="0" value="${(prefs.fx?.BGN_EUR ?? DEFAULT_PREFS.fx.BGN_EUR)}"/>
        </div>
        <div>
          <label>Курс BGN→USD</label>
          <input id="prefBGN_USD" type="number" step="0.00001" min="0" value="${(prefs.fx?.BGN_USD ?? DEFAULT_PREFS.fx.BGN_USD)}"/>
        </div>
      </div>
      <div class="hr"></div>
      <div class="inline">
        <button id="btnPrefsExport" class="btn">Экспорт</button>
        <button id="btnPrefsImport" class="btn">Импорт</button>
        <input id="inpPrefsImport" type="file" accept="application/json,.json" class="hidden" />
        <span class="right"></span>
        <button id="btnPrefsReset" class="warn">Сброс</button>
        <button id="btnPrefsSave" class="primary">Сохранить</button>
      </div>`
    const closeBtn=document.querySelector('#btnCloseDashModal'); if(closeBtn){ closeBtn.onclick=()=>{ try{ o.style.display='none'; m.style.display='none'; }catch(_){} } }
    const $ = (sel,root=document)=>root.querySelector(sel)

    async function saveJsonFile(name, content){
      // Try modern Save File Picker
      if(window.showSaveFilePicker){
        try{
          const handle = await showSaveFilePicker({
            suggestedName: name,
            types: [{ description:'JSON', accept:{'application/json':['.json']} }]
          })
          const writable = await handle.createWritable()
          await writable.write(new Blob([content],{type:'application/json'}))
          await writable.close()
          try{ if(window.toast) toast('Файл сохранён') }catch(_){ }
          return true
        }catch(_){ /* user may cancel */ }
      }
      // Fallback — regular download
      try{
        const a=document.createElement('a')
        a.href=URL.createObjectURL(new Blob([content],{type:'application/json'}))
        a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),800)
        try{ if(window.toast) toast('Файл скачан') }catch(_){ }
        return true
      }catch(_){ }
      return false
    }

    $('#btnPrefsExport',wrap).onclick=async()=>{
      const payload = get()
      const name = `ofb-prefs-${new Date().toISOString().slice(0,10)}.json`
      await saveJsonFile(name, JSON.stringify(payload,null,2))
    }
    const inp = $('#inpPrefsImport',wrap)
    $('#btnPrefsImport',wrap).onclick=()=> inp && inp.click()
    if(inp){ inp.onchange = async (e)=>{
      const f=e.target.files && e.target.files[0]; if(!f) return
      try{
        const t = await f.text()
        const obj = JSON.parse(t)
        if(!obj || typeof obj!=='object') throw new Error('bad json')
        // Merge and save
        const next = set(obj)
        initThemeFromPrefs()
        try{ if(window.toast) toast('Настройки импортированы') }catch(_){ }
        // Update fields to reflect applied values
        try{
          $('#prefTheme',wrap).value = next.theme
          $('#prefCurrency',wrap).value = next.preferredCurrency
          const sfx = sanitizeFxRates(next.fx||{})
          $('#prefBGN_EUR',wrap).value = String(sfx.BGN_EUR)
          $('#prefBGN_USD',wrap).value = String(sfx.BGN_USD)
        }catch(_){ }
        // Notify listeners
        try{ window.dispatchEvent(new CustomEvent('prefsChanged',{detail: next})) }catch(_){ }
      }catch(_){ try{ if(window.toast) toast('Некорректный JSON настроек','warn') }catch(__){} }
      e.target.value=''
    } }

    $('#btnPrefsReset',wrap).onclick=()=>{
      const next = set(DEFAULT_PREFS)
      initThemeFromPrefs()
      try{ if(window.toast) toast('Настройки сброшены') }catch(_){ }
      try{
        $('#prefTheme',wrap).value = next.theme
        $('#prefCurrency',wrap).value = next.preferredCurrency
        const sfx = sanitizeFxRates(next.fx||{})
        $('#prefBGN_EUR',wrap).value = String(sfx.BGN_EUR)
        $('#prefBGN_USD',wrap).value = String(sfx.BGN_USD)
      }catch(_){ }
      try{ window.dispatchEvent(new CustomEvent('prefsChanged',{detail: next})) }catch(_){ }
    }

    $('#btnPrefsSave',wrap).onclick=()=>{
      const rawFx = { BGN_EUR: parseFloat($('#prefBGN_EUR',wrap)?.value)||DEFAULT_PREFS.fx.BGN_EUR, BGN_USD: parseFloat($('#prefBGN_USD',wrap)?.value)||DEFAULT_PREFS.fx.BGN_USD }
      const next = set({
        theme: $('#prefTheme',wrap)?.value||'dark',
        preferredCurrency: $('#prefCurrency',wrap)?.value||'BGN',
        fx: sanitizeFxRates(rawFx)
      })
      initThemeFromPrefs()
      try{ if(window.toast) toast('Настройки сохранены') }catch(_){ }
      try{ window.dispatchEvent(new CustomEvent('prefsChanged',{detail: next})) }catch(_){ }
      // Close modal properly without removing the content container to allow reopening later
      try{ o.style.display='none'; m.style.display='none' }catch(_){ }
      try{ c.innerHTML='' }catch(_){ }
    }
  }

  window.PREFS = { get, set, getFx, getFxDefaults, initThemeFromPrefs, toggleThemeByPrefs, openModal }
})()
