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
      <input id="addCat" type="text" placeholder="Категория (напр. Корректировки)" />
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
    const cat=$('#addCat',wrap).value.trim()||'Корректировки'
    if(!d||!isFinite(a)){ toast('Введите дату и сумму','warn'); return }
    addManual({id:uid(),date:d,desc,amount:a,category:cat||null,source:'manual'})
    saveVault(); render(); toast('Запись добавлена'); wrap.remove()
  }
}

