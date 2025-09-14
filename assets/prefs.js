// Preferences module for FinBoard (theme, currency, FX rates)
(function(){
  const PREFS_KEY = 'ofb_prefs'
  const DEFAULT_PREFS = {
    theme: 'dark',
    preferredCurrency: 'BGN',
    fx: { BGN_EUR: 1.949, BGN_USD: 1.773 }
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

  function getFx(){
    const fx = (get().fx)||{}
    return { BGN_EUR: +fx.BGN_EUR || DEFAULT_PREFS.fx.BGN_EUR, BGN_USD: +fx.BGN_USD || DEFAULT_PREFS.fx.BGN_USD }
  }

  function openModal(){
    const prefs = get()
    const wrap=document.createElement('div')
    wrap.style.position='fixed';wrap.style.inset='0';wrap.style.display='flex';wrap.style.alignItems='center';wrap.style.justifyContent='center';wrap.style.background='rgba(0,0,0,0.5)';wrap.style.zIndex='9998'
    wrap.innerHTML = `<div class="card" style="width:min(520px,95vw)">
      <h3 style="margin:0 0 8px 0">Настройки</h3>
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
          <input id="prefBGN_EUR" type="number" step="0.0001" value="${(prefs.fx?.BGN_EUR ?? DEFAULT_PREFS.fx.BGN_EUR)}"/>
        </div>
        <div>
          <label>Курс BGN→USD</label>
          <input id="prefBGN_USD" type="number" step="0.0001" value="${(prefs.fx?.BGN_USD ?? DEFAULT_PREFS.fx.BGN_USD)}"/>
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
        <button id="btnPrefsClose" class="btn">Закрыть</button>
      </div>
    </div>`
    document.body.appendChild(wrap)
    const $ = (sel,root=document)=>root.querySelector(sel)
    $('#btnPrefsClose',wrap).onclick=()=>wrap.remove()
    wrap.addEventListener('click',(e)=>{ if(e.target===wrap) wrap.remove() })
    window.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){ try{wrap.remove()}catch(_){ } window.removeEventListener('keydown', esc) } })

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
          $('#prefBGN_EUR',wrap).value = String(next.fx?.BGN_EUR ?? DEFAULT_PREFS.fx.BGN_EUR)
          $('#prefBGN_USD',wrap).value = String(next.fx?.BGN_USD ?? DEFAULT_PREFS.fx.BGN_USD)
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
        $('#prefBGN_EUR',wrap).value = String(next.fx?.BGN_EUR)
        $('#prefBGN_USD',wrap).value = String(next.fx?.BGN_USD)
      }catch(_){ }
      try{ window.dispatchEvent(new CustomEvent('prefsChanged',{detail: next})) }catch(_){ }
    }

    $('#btnPrefsSave',wrap).onclick=()=>{
      const next = set({
        theme: $('#prefTheme',wrap)?.value||'dark',
        preferredCurrency: $('#prefCurrency',wrap)?.value||'BGN',
        fx: { BGN_EUR: parseFloat($('#prefBGN_EUR',wrap)?.value)||DEFAULT_PREFS.fx.BGN_EUR, BGN_USD: parseFloat($('#prefBGN_USD',wrap)?.value)||DEFAULT_PREFS.fx.BGN_USD }
      })
      initThemeFromPrefs()
      try{ if(window.toast) toast('Настройки сохранены') }catch(_){ }
      try{ window.dispatchEvent(new CustomEvent('prefsChanged',{detail: next})) }catch(_){ }
      try{ wrap.remove() }catch(_){ }
    }
  }

  window.PREFS = { get, set, getFx, initThemeFromPrefs, toggleThemeByPrefs, openModal }
})()
