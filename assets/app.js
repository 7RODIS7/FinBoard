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
  const o=document.querySelector('#dashOverlay'), m=document.querySelector('#dashModal'), t=document.querySelector('#dashModalTitle'), c=document.querySelector('#dashModalContent')
  if(!o||!m||!t||!c) return
  o.style.display='block'; m.style.display='block'
  t.textContent = 'Добавить запись'
  const rs=t.parentElement && t.parentElement.querySelector('.right'); if(rs) rs.innerHTML=''
  c.innerHTML=`<div class="grid-sm">
      <input id="addDate" type="date" value="${new Date().toISOString().slice(0,10)}" />
      <input id="addAmount" type="number" step="0.01" placeholder="Сумма (+ доход, − расход)" />
      <input id="addDesc" type="text" placeholder="Описание" />
      <select id="addCatSel"><option value="">(без категории)</option>${(STATE?.vault?.categories||[]).map(c=>`<option>${c}</option>`).join('')}</select>
    </div>
    <div class="hr"></div>
    <div class="inline"><span class="right"></span><button id="addConfirm" class="primary">Добавить</button></div>`
  const mEl=m
  const closeBtn=document.querySelector('#btnCloseDashModal'); if(closeBtn){ closeBtn.onclick=()=>{ try{ o.style.display='none'; m.style.display='none'; }catch(_){} } }
  document.querySelector('#addConfirm')?.addEventListener('click',()=>{
    const d=document.querySelector('#addDate').value
    const a=parseFloat(document.querySelector('#addAmount').value)
    const desc=document.querySelector('#addDesc').value.trim()
    const catSel=document.querySelector('#addCatSel')
    const cat=(catSel && catSel.value) ? catSel.value : null
    if(!d||!isFinite(a)){ toast('Введите дату и сумму','warn'); return }
    addManual({id:uid(),date:d,desc,amount:a,category:cat||null,source:'manual'})
    saveVault(); render(); toast('Запись добавлена'); try{ o.style.display='none'; mEl.style.display='none' }catch(_){}
  })
}

// ===== КАТЕГОРИИ И ПРАВИЛА =====
function openCategoriesModal(){
  const o=document.querySelector('#dashOverlay'), m=document.querySelector('#dashModal'), t=document.querySelector('#dashModalTitle'), c=document.querySelector('#dashModalContent')
  if(!o||!m||!t||!c) return
  o.style.display='block'; m.style.display='block'
  t.textContent = 'Категории и правила'
  const rs=t.parentElement && t.parentElement.querySelector('.right'); if(rs) rs.innerHTML=''
  const cats = STATE?.vault?.categories || []
  c.innerHTML = `
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
    <div class="inline"><button id="btnImportCatsModal" class="btn">Импорт</button><button id="btnExportCatsModal" class="btn">Экспорт</button><span class="right"></span><button id="btnApplyRules" class="primary">Применить к существующим</button><input id="inputImportCatsModal" type="file" accept="application/json,.json" class="hidden" /></div>
  `
  const closeBtn=document.querySelector('#btnCloseDashModal'); if(closeBtn){ closeBtn.onclick=()=>{ try{ o.style.display='none'; m.style.display='none'; }catch(_){} } }

  let selectedCat = (STATE.vault.categories||[])[0] || ''
  function refreshCatsTable(){
    const body=$('#catsTableBody',c); if(!body) return
    const cats=STATE.vault.categories||[]
    const rules=STATE.vault.catRules||[]
    body.innerHTML = cats.map(c=>{
      const count = rules.filter(r=>r.category===c).length
      const isSel = c===selectedCat
      return `<tr data-cat-row="${c}" style="${isSel?'background:var(--chip)':''}"><td>${escapeHtml(c)}</td><td style="text-align:right">${count}</td><td style="text-align:right"><button class="icon-btn" title="Удалить" data-del-cat="${c}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button></td></tr>`
    }).join('')
    $$('[data-cat-row]',body).forEach(tr=>{
      tr.onclick=()=>{ selectedCat = tr.getAttribute('data-cat-row'); refreshCatsTable(); refreshRulesTable(); }
    })
    $$('[data-del-cat]',body).forEach(b=>{ b.onclick=(e)=>{ e.stopPropagation(); confirmDeleteCategoryWithRules(b.getAttribute('data-del-cat')); refreshCatsTable(); refreshRulesTable(); } })
  }
  function refreshRulesTable(){
    const body=$('#rulesBody',c); if(!body) return
    const rules=STATE.vault.catRules||[]
    const list = rules.filter(r=>r.category===selectedCat)
    body.innerHTML = list.map(r=>`<tr><td>${escapeHtml(r.match)}</td><td style="text-align:right"><button class="icon-btn" title="Удалить" data-del-rule="${r.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button></td></tr>`).join('')
    $$('[data-del-rule]',body).forEach(b=>{ b.onclick=()=>{ removeRule(b.getAttribute('data-del-rule')); refreshRulesTable(); refreshCatsTable(); saveVault(); render(); } })
  }

  // esc/overlay already handled by common modal; no local close button

  $('#btnAddCat',c).onclick=()=>{
    const name=$('#newCatName',c).value.trim(); if(!name) return
    addCategory(name); $('#newCatName',c).value=''; if(!selectedCat) selectedCat=name; refreshCatsTable(); refreshRulesTable(); saveVault(); render();
  }
  $('#btnAddRule',c).onclick=()=>{
    const m=$('#ruleMatch',c).value.trim(); const c=selectedCat
    if(!m||!c){ toast('Выберите категорию и введите шаблон','warn'); return }
    addRule(m,c); $('#ruleMatch',c).value=''; refreshRulesTable(); refreshCatsTable(); saveVault(); render();
  }
  $('#btnApplyRules',c).onclick=()=>{ applyCategoryRulesToAll(); saveVault(); render(); toast('Правила применены'); }

  // Экспорт/импорт категорий внутри диалога
  const btnExportCatsModal = $('#btnExportCatsModal', c)
  if(btnExportCatsModal){
    btnExportCatsModal.onclick = () => {
      const payload = { categories: STATE.vault.categories||[], catRules: STATE.vault.catRules||[] }
      download(`ofb-categories-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(payload,null,2))
    }
  }
  const inputImportCatsModal = $('#inputImportCatsModal', c)
  const btnImportCatsModal = $('#btnImportCatsModal', c)
  if(btnImportCatsModal && inputImportCatsModal){
    btnImportCatsModal.onclick = () => inputImportCatsModal.click()
  }
  if(inputImportCatsModal){
    inputImportCatsModal.onchange = async (e) => {
      const f=e.target.files[0]; if(!f) return
      const t=await f.text();
      try{
        const parsed = JSON.parse(t)
        if(!parsed || typeof parsed!== 'object') throw new Error('bad json')
        const cats = Array.isArray(parsed.categories) ? parsed.categories : []
        const rules = Array.isArray(parsed.catRules) ? parsed.catRules : []
        STATE.vault.categories = cats
        STATE.vault.catRules = rules.map(r=>({id: r.id || uid(), match: String(r.match||'').trim(), category: String(r.category||'').trim()})).filter(r=>r.match && r.category)
        if(typeof applyCatRulesToAllTransactions === 'function'){ applyCatRulesToAllTransactions() } else { applyCategoryRulesToAll() }
        await saveVault(); render(); toast('Категории и правила импортированы и применены')
        refreshCatsTable(); refreshRulesTable();
      }catch(err){ toast('Некорректный JSON категорий','warn') }
      e.target.value=''
    }
  }

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

