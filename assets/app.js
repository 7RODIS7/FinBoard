function renderOpsTable(){
  const curr=STATE.vault.currency
  const rows=[...STATE.vault.transactions].sort((a,b)=>new Date(b.date)-new Date(a.date))
  $('#opsTable').innerHTML = `
    <table>
      <thead><tr><th>Дата</th><th>Описание</th><th>Категория</th><th style="text-align:right">Сумма</th></tr></thead>
      <tbody>
        ${rows.map(t=>`<tr><td>${dateFmt.format(new Date(t.date))}</td><td>${escapeHtml(t.desc||'')}</td><td>${escapeHtml(t.category||'')}</td><td style="text-align:right;color:${t.amount>=0?'var(--ok)':'var(--danger)'}">${new Intl.NumberFormat('ru-RU',{style:'currency',currency:curr}).format(t.amount)}</td></tr>`).join('')}
      </tbody>
    </table>`
}

function openAddModal(){
  const wrap=document.createElement('div')
  wrap.style.position='fixed';wrap.style.inset='0';wrap.style.display='flex';wrap.style.alignItems='center';wrap.style.justifyContent='center';wrap.style.background='rgba(0,0,0,0.5)';wrap.style.zIndex='9998'
  wrap.innerHTML=`<div class="card" style="width:min(560px,90vw)">
    <h3 style="margin:0 0 10px 0">Добавить запись</h3>
    <div class="grid-sm">
      <input id="addDate" type="date" value="${new Date().toISOString().slice(0,10)}" />
      <input id="addAmount" type="number" step="0.01" placeholder="Сумма (+ доход, − расход)" />
      <input id="addDesc" type="text" placeholder="Описание" />
      <select id="addCatSel"><option value="">(без категории)</option>${(STATE?.vault?.categories||[]).map(c=>`<option>${c}</option>`).join('')}</select>
    </div>
    <div class="hr"></div>
    <div class="inline"><button id="addConfirm" class="primary">Добавить</button><button id="addCancel" class="btn">Отмена</button></div>
  </div>`
  document.body.appendChild(wrap)
  // перехват ESC и клик по подложке
  wrap.addEventListener('click',(e)=>{ if(e.target===wrap) wrap.remove() })
  window.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){ wrap.remove(); window.removeEventListener('keydown', esc) } })
  $('#addCancel',wrap).onclick=()=>wrap.remove()
  $('#addConfirm',wrap).onclick=()=>{
    const d=$('#addDate',wrap).value
    const a=parseFloat($('#addAmount',wrap).value)
    const desc=$('#addDesc',wrap).value.trim()
    const catSel=$('#addCatSel',wrap)
    const cat=(catSel && catSel.value) ? catSel.value : null
    if(!d||!isFinite(a)){ toast('Введите дату и сумму','warn'); return }
    addManual({id:uid(),date:d,desc,amount:a,category:cat||null,source:'manual'})
    saveVault(); render(); toast('Запись добавлена'); wrap.remove()
  }
}

// ===== КАТЕГОРИИ И ПРАВИЛА =====
function openCategoriesModal(){
  const wrap=document.createElement('div')
  wrap.style.position='fixed';wrap.style.inset='0';wrap.style.display='flex';wrap.style.alignItems='center';wrap.style.justifyContent='center';wrap.style.background='rgba(0,0,0,0.5)';wrap.style.zIndex='9998'
  const cats = STATE?.vault?.categories || []
  wrap.innerHTML = `<div class="card" style="width:min(900px,95vw)">
    <h3 style="margin:0 0 10px 0">Категории и правила</h3>
    <div class="grid-sm">
      <div>
        <label>Добавить категорию</label>
        <div class="inline"><input id="newCatName" type="text" placeholder="Напр. Продукты"/><button id="btnAddCat" class="btn">Добавить</button></div>
        <div class="table-scroll" style="max-height:220px;margin-top:8px">
          <table>
            <thead><tr><th>Категория</th><th style="text-align:right">Правил</th><th style="width:48px"></th></tr></thead>
            <tbody id="catsTableBody"></tbody>
          </table>
        </div>
      </div>
      <div>
        <label>Правила выбранной категории</label>
        <div class="inline">
          <input id="ruleMatch" type="text" placeholder="Напр. LIDL, KAUFLAND, EBAG"/>
          <button id="btnAddRule" class="btn">Добавить правило</button>
        </div>
        <div class="table-scroll" style="max-height:220px;margin-top:8px">
          <table>
            <thead><tr><th>Совпадение</th><th style="width:48px"></th></tr></thead>
            <tbody id="rulesBody"></tbody>
          </table>
        </div>
        <div class="help">Правила применяются к описанию операции без учета регистра. Первое подходящее правило задает категорию.</div>
      </div>
    </div>
    <div class="hr"></div>
    <div class="inline"><button id="btnApplyRules" class="primary">Применить к существующим</button><button id="closeCats" class="btn">Закрыть</button></div>
  </div>`
  document.body.appendChild(wrap)

  let selectedCat = (STATE.vault.categories||[])[0] || ''
  function refreshCatsTable(){
    const body=$('#catsTableBody',wrap); if(!body) return
    const cats=STATE.vault.categories||[]
    const rules=STATE.vault.catRules||[]
    body.innerHTML = cats.map(c=>{
      const count = rules.filter(r=>r.category===c).length
      const isSel = c===selectedCat
      return `<tr data-cat-row="${c}" style="${isSel?'background:var(--chip)':''}"><td>${escapeHtml(c)}</td><td style="text-align:right">${count}</td><td style="text-align:right"><button class="btn-small" title="Удалить" data-del-cat="${c}">🗑</button></td></tr>`
    }).join('')
    $$('[data-cat-row]',body).forEach(tr=>{
      tr.onclick=()=>{ selectedCat = tr.getAttribute('data-cat-row'); refreshCatsTable(); refreshRulesTable(); }
    })
    $$('[data-del-cat]',body).forEach(b=>{ b.onclick=(e)=>{ e.stopPropagation(); confirmDeleteCategoryWithRules(b.getAttribute('data-del-cat')); refreshCatsTable(); refreshRulesTable(); } })
  }
  function refreshRulesTable(){
    const body=$('#rulesBody',wrap); if(!body) return
    const rules=STATE.vault.catRules||[]
    const list = rules.filter(r=>r.category===selectedCat)
    body.innerHTML = list.map(r=>`<tr><td>${escapeHtml(r.match)}</td><td style="text-align:right"><button class="btn-small" title="Удалить" data-del-rule="${r.id}">🗑</button></td></tr>`).join('')
    $$('[data-del-rule]',body).forEach(b=>{ b.onclick=()=>{ removeRule(b.getAttribute('data-del-rule')); refreshRulesTable(); refreshCatsTable(); saveVault(); render(); } })
  }

  $('#closeCats',wrap).onclick=()=>wrap.remove()
  wrap.addEventListener('click',(e)=>{ if(e.target===wrap) wrap.remove() })
  window.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){ wrap.remove(); window.removeEventListener('keydown', esc) } })

  $('#btnAddCat',wrap).onclick=()=>{
    const name=$('#newCatName',wrap).value.trim(); if(!name) return
    addCategory(name); $('#newCatName',wrap).value=''; if(!selectedCat) selectedCat=name; refreshCatsTable(); refreshRulesTable(); saveVault(); render();
  }
  $('#btnAddRule',wrap).onclick=()=>{
    const m=$('#ruleMatch',wrap).value.trim(); const c=selectedCat
    if(!m||!c){ toast('Выберите категорию и введите шаблон','warn'); return }
    addRule(m,c); $('#ruleMatch',wrap).value=''; refreshRulesTable(); refreshCatsTable(); saveVault(); render();
  }
  $('#btnApplyRules',wrap).onclick=()=>{ applyCategoryRulesToAll(); saveVault(); render(); toast('Правила применены'); }

  refreshCatsTable()
  refreshRulesTable()
}

function addCategory(name){
  STATE.vault.categories = Array.from(new Set([...(STATE.vault.categories||[]), name]))
}
function removeCategory(name){
  STATE.vault.categories = (STATE.vault.categories||[]).filter(c=>c!==name)
  // не удаляем категории из транзакций, чтобы не терять данные; пользователь может переназначить
  // чистим правила с такой категорией
  STATE.vault.catRules = (STATE.vault.catRules||[]).filter(r=>r.category!==name)
}
function confirmDeleteCategoryWithRules(name){
  const ruleCount = (STATE.vault.catRules||[]).filter(r=>r.category===name).length
  if(ruleCount>0){
    if(!confirm(`Категория "${name}" имеет ${ruleCount} правил. Удалить категорию и связанные правила?`)) return
  }
  removeCategory(name); saveVault(); render();
}
function addRule(match, category){
  const r = {id:uid(), match, category}
  STATE.vault.catRules = [...(STATE.vault.catRules||[]), r]
}
function removeRule(id){
  STATE.vault.catRules = (STATE.vault.catRules||[]).filter(r=>r.id!==id)
}
function applyCategoryRulesToAll(){
  const rules=(STATE.vault.catRules||[]).map(r=>({id:r.id,match:r.match.toLowerCase(),category:r.category}))
  for(const t of STATE.vault.transactions){
    const d=(t.desc||'').toLowerCase()
    const hit = rules.find(r=> d.includes(r.match))
    if(hit){ t.category = hit.category }
  }
}

