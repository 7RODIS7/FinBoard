// Gross/Net calculator logic adapted for FinBoard (vanilla JS)
(function(){
  const $ = (sel,root=document)=>root.querySelector(sel)
  function fmtNum(n){ return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n||0) }
  function fmtBGN(n){ return new Intl.NumberFormat('ru-RU',{style:'currency',currency:'BGN',maximumFractionDigits:2}).format(n||0) }
  function fmtCurr(n, cur){ return `${fmtNum(n)} ${cur}` }
  const monthNames=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"]
  const GN_LS_KEY = 'gn_state'

  // Expose current display currency for charts tooltips
  try{ window.getDisplayCurrency = function(){ try{ return document.getElementById('selCurrency').value }catch(_){ return 'BGN' } } }catch(_){ }

  function getFx(){
    try{ if(window.PREFS && PREFS.getFx){ return PREFS.getFx() } }catch(_){ }
    try{ if(window.PREFS && PREFS.getFxDefaults){ return PREFS.getFxDefaults() } }catch(_){ }
    return { BGN_EUR: 1.95583, BGN_USD: 1.65230 }
  }
  function convertFromBGN(amountBGN, currency){
    if(!Number.isFinite(amountBGN)) amountBGN = 0
    const fx = getFx()
    switch(String(currency||'BGN')){
      case 'EUR': return amountBGN / fx.BGN_EUR
      case 'USD': return amountBGN / fx.BGN_USD
      default: return amountBGN
    }
  }

  function getOrthodoxEaster(year){
    const a = year % 19
    const b = year % 7
    const c = year % 4
    const d = (19 * a + 15) % 30
    const e = (2 * c + 4 * b - d + 34) % 7
    const month = Math.floor((d + e + 114) / 31)
    const day = ((d + e + 114) % 31) + 1
    const julianEaster = new Date(year, month - 1, day)
    julianEaster.setDate(julianEaster.getDate() + 13)
    return julianEaster
  }
  function getBulgariaHolidays(year){
    const holidays=[]
    holidays.push(new Date(year,0,1))
    holidays.push(new Date(year,2,3))
    holidays.push(new Date(year,4,1))
    holidays.push(new Date(year,4,6))
    holidays.push(new Date(year,4,24))
    holidays.push(new Date(year,8,6))
    holidays.push(new Date(year,8,22))
    holidays.push(new Date(year,10,1))
    holidays.push(new Date(year,11,24))
    holidays.push(new Date(year,11,25))
    holidays.push(new Date(year,11,26))
    const easter = getOrthodoxEaster(year)
    const goodFriday = new Date(easter); goodFriday.setDate(easter.getDate()-2)
    const holySaturday = new Date(easter); holySaturday.setDate(easter.getDate()-1)
    const easterMonday = new Date(easter); easterMonday.setDate(easter.getDate()+1)
    holidays.push(goodFriday, holySaturday, easter, easterMonday)
    return holidays
  }
  function calculateDayCounts(year, month){
    const totalDays = new Date(year, month + 1, 0).getDate()
    const holidays = getBulgariaHolidays(year).filter(d=> d.getMonth()===month && d.getFullYear()===year)
    let workingDays=0, weekendDays=0, holidayDays=0
    for(let day=1; day<=totalDays; day++){
      const date=new Date(year,month,day)
      const dow=date.getDay()
      const isHoliday = holidays.some(h=> h.getDate()===day && h.getMonth()===month)
      if(dow===0||dow===6){ weekendDays++ }
      else if(isHoliday){ holidayDays++ }
      else { workingDays++ }
    }
    return { totalDays, workingDays, weekendDays, holidayDays }
  }

  function byId(id){ const el=document.getElementById(id); if(!el) throw new Error('Missing element: '+id); return el }

  function serializeState(){
    try{
      return {
        monthly: parseFloat(byId('inpMonthly').value)||0,
        annual: parseFloat(byId('inpAnnual').value)||0,
        seniority: parseFloat(byId('inpSeniority').value)||0,
        annualWithSen: parseFloat(byId('inpAnnualWithSen').value)||0,
        month: parseInt(byId('selMonth').value)||new Date().getMonth(),
        year: parseInt(byId('inpYear').value)||new Date().getFullYear(),
        currency: (function(){ try{ return byId('selCurrency').value }catch(_){ return 'BGN' } })(),
        sick: byId('chkSick').checked,
        sickDays: parseFloat(byId('inpSickDays').value)||0,
        over: byId('chkOver').checked,
        overAmt: parseFloat(byId('inpOverAmt').value)||0,
        overType: byId('selOverType').value||'days',
        sport: byId('chkSport').checked,
        sportA: parseFloat(byId('inpSportA').value)||0,
        sportAVal: parseFloat(byId('inpSportAVal').value)||0,
        sportC: parseFloat(byId('inpSportC').value)||0,
        sportCVal: parseFloat(byId('inpSportCVal').value)||0,
        ins: byId('chkIns').checked,
        insCount: parseFloat(byId('inpInsCount').value)||0,
        insVal: parseFloat(byId('inpInsVal').value)||0,
        corr: byId('chkCorr').checked,
        corrVal: parseFloat(byId('inpCorrVal').value)||0,
        cmp1: (function(){ try{ const el=document.getElementById('inpCmp1'); return parseFloat(el && el.value)||0 }catch(_){ return 0 } })(),
        cmp2: (function(){ try{ const el=document.getElementById('inpCmp2'); return parseFloat(el && el.value)||0 }catch(_){ return 0 } })()
      }
    }catch(_){ return null }
  }

  function applyState(s){
    if(!s || typeof s!=='object') return
    function setIf(id, v){ try{ const el=byId(id); if(el!=null && v!=null && v!==undefined) el.value=String(v) }catch(_){ } }
    function setChk(id, v){ try{ const el=byId(id); if(el!=null) el.checked=!!v }catch(_){ } }
    setIf('inpMonthly', s.monthly)
    setIf('inpAnnual', s.annual)
    setIf('inpSeniority', s.seniority)
    setIf('inpAnnualWithSen', s.annualWithSen)
    if(Number.isFinite(s.month)){ try{ byId('selMonth').value=String(Math.max(0,Math.min(11,s.month))) }catch(_){ } }
    if(Number.isFinite(s.year)){ setIf('inpYear', s.year) }
    if(s.currency){ try{ byId('selCurrency').value = String(s.currency) }catch(_){ } }
    setChk('chkSick', s.sick)
    setIf('inpSickDays', s.sickDays)
    setChk('chkOver', s.over)
    setIf('inpOverAmt', s.overAmt)
    if(s.overType){ try{ byId('selOverType').value=String(s.overType) }catch(_){ } }
    setChk('chkSport', s.sport)
    setIf('inpSportA', s.sportA)
    setIf('inpSportAVal', s.sportAVal)
    setIf('inpSportC', s.sportC)
    setIf('inpSportCVal', s.sportCVal)
    setChk('chkIns', s.ins)
    setIf('inpInsCount', s.insCount)
    setIf('inpInsVal', s.insVal)
    setChk('chkCorr', s.corr)
    setIf('inpCorrVal', s.corrVal)
    setIf('inpCmp1', s.cmp1)
    setIf('inpCmp2', s.cmp2)
  }

  function setup(){
    const selMonth = byId('selMonth')
    const inpYear = byId('inpYear')
    const selCurrency = byId('selCurrency')
    // Set initial selects
    selMonth.innerHTML = monthNames.map((n,i)=>`<option value="${i}">${n}</option>`).join('')
    const now=new Date(); selMonth.value=String(now.getMonth()); inpYear.value=String(now.getFullYear())
    // Preferred currency from prefs
    try{ if(window.PREFS && PREFS.get){ const prefCur = PREFS.get().preferredCurrency||'BGN'; if(selCurrency){ selCurrency.value = prefCur } } }catch(_){ }
    // Restore saved state if present (before binding so toggles reflect checkboxes)
    try{
      const raw = localStorage.getItem(GN_LS_KEY)
      if(raw){ const s=JSON.parse(raw); if(s){ applyState(s) } }
    }catch(_){ }
    bind()
    recalc()
    try{ window.addEventListener('prefsChanged', ()=>{ 
      try{ if(window.PREFS && PREFS.get){ const prefCur = PREFS.get().preferredCurrency||'BGN'; const sc = document.getElementById('selCurrency'); if(sc){ sc.value = prefCur } } }catch(_){ }
      recalc() 
    }) }catch(_){ }
  }

  function numVal(id){ return parseFloat(byId(id).value)||0 }
  function setNum(id, v){ byId(id).value = String(v) }

  function bind(){
    const ids=['inpMonthly','inpAnnual','inpSeniority','inpAnnualWithSen','selMonth','inpYear','selCurrency','chkSick','inpSickDays','chkOver','inpOverAmt','selOverType','chkSport','inpSportA','inpSportAVal','inpSportC','inpSportCVal','chkIns','inpInsCount','inpInsVal','chkCorr','inpCorrVal']
    ids.forEach(id=>{ const el=byId(id); el.oninput=recalc; el.onchange=recalc })
    // Keep PREFS.preferredCurrency in sync with header select
    try{ const sc = byId('selCurrency'); if(sc){ sc.addEventListener('change', ()=>{ try{ if(window.PREFS && PREFS.set){ PREFS.set({ preferredCurrency: sc.value }) } }catch(_){ } recalc() }) } }catch(_){ }
    // sync monthly/annual
    byId('inpMonthly').addEventListener('input',()=>{
      const m=numVal('inpMonthly'); setNum('inpAnnual', m*12); recalc()
    })
    byId('inpAnnual').addEventListener('input',()=>{
      const a=numVal('inpAnnual'); setNum('inpMonthly', a/12); recalc()
    })
    // allow editing annual-with-seniority to back-calc monthly
    byId('inpAnnualWithSen').addEventListener('input',()=>{
      const target = parseFloat(byId('inpAnnualWithSen').value)||0
      const staj = numVal('inpSeniority')
      const monthly = target / (12 * (1 + 0.006 * staj))
      setNum('inpMonthly', monthly)
      setNum('inpAnnual', monthly*12)
      // keep comparison current synced to annual-with-seniority for convenience
      try{ setNum('inpCmp1', target) }catch(_){ }
      recalc()
    })
    // toggle option blocks
    const toggle=(chkId, blockId)=>{ byId(blockId).style.display = byId(chkId).checked ? 'block' : 'none' }
    const idsToggle=[
      ['chkSick','sickBlock'],
      ['chkOver','overBlock'],
      ['chkSport','sportBlock'],
      ['chkIns','insBlock'],
      ['chkCorr','corrBlock']
    ]
    idsToggle.forEach(([c,b])=>{ const el=byId(c); el.addEventListener('change',()=>{ toggle(c,b); recalc() }); toggle(c,b) })
    // hotkeys save/restore
    window.addEventListener('keydown', (e)=>{
      if(e.ctrlKey && e.altKey && (e.key==='+'||e.key==='=')){
        const stored={ staj: numVal('inpSeniority'), annualWithStaj: annualGrossWithSeniority() }
        try{ localStorage.setItem('gn_local', JSON.stringify(stored)) }catch(_){ }
      }
      if(e.ctrlKey && e.altKey && e.key==='0'){
        try{ const raw=localStorage.getItem('gn_local'); if(raw){ const obj=JSON.parse(raw); if(obj){ setNum('inpSeniority', obj.staj||0); setNum('inpAnnualWithSen', obj.annualWithStaj||0); // sync monthly from annual w/ staj
          const monthly = (obj.annualWithStaj||0) / (12 * (1 + 0.006 * numVal('inpSeniority')))
          setNum('inpMonthly', monthly); setNum('inpAnnual', monthly*12); recalc() } } }catch(_){ }
      }
    })
    // Compare modal opener
    try{ const btn=document.getElementById('btnOpenCompare'); if(btn){ btn.addEventListener('click', openCompareModal) } }catch(_){ }
  }

  function annualGrossWithSeniority(){
    const monthly=numVal('inpMonthly'), staj=numVal('inpSeniority')
    return monthly * (1 + 0.006 * staj) * 12
  }

  function recalc(){
    const cur = (function(){ try{ return byId('selCurrency').value }catch(_){ return 'BGN' } })()
    // keep annual-with-seniority field in sync for convenience
    setNum('inpAnnualWithSen', annualGrossWithSeniority().toFixed(2))

    const monthlyGross=numVal('inpMonthly')
    const staj=numVal('inpSeniority')
    const month=parseInt(byId('selMonth').value)||new Date().getMonth()
    const year=parseInt(byId('inpYear').value)||new Date().getFullYear()
    const { totalDays, workingDays } = calculateDayCounts(year, month)
    const dayStatsEl = document.getElementById('dayStats')
    if(dayStatsEl){
      const all = calculateDayCounts(year, month)
      dayStatsEl.textContent = `Всего: ${all.totalDays} · Рабочих: ${all.workingDays} · Выходных: ${all.weekendDays} · Праздничных: ${all.holidayDays}`
    }

    const includeSick = byId('chkSick').checked
    const sickDays = numVal('inpSickDays')
    const includeOver = byId('chkOver').checked
    const overAmt = numVal('inpOverAmt')
    const overType = byId('selOverType').value||'days'
    const carAllowance = false
    const sport = byId('chkSport').checked
    const sportA = numVal('inpSportA')
    const sportAVal = numVal('inpSportAVal')
    const sportC = numVal('inpSportC')
    const sportCVal = numVal('inpSportCVal')
    const ins = byId('chkIns').checked
    const insCount = numVal('inpInsCount')
    const insVal = numVal('inpInsVal')
    const corr = byId('chkCorr').checked
    const corrVal = numVal('inpCorrVal')

    const seniorityBonus = monthlyGross * 0.006 * staj
    let baseGross = monthlyGross + seniorityBonus
    let effectiveGross = baseGross
    let employerSickPay = 0 // сумма за дни 1–2 (70%), не облагается 10% НДФЛ
    if(includeSick && sickDays>0 && workingDays>0){
      const dailyWage = baseGross / workingDays
      const daysEmployer70 = Math.min(2, Math.max(0, Math.floor(sickDays)), workingDays)
      const daysBeyond = Math.max(0, Math.floor(sickDays) - daysEmployer70)
      const reduction = (daysBeyond * dailyWage) + (daysEmployer70 * dailyWage * 0.3)
      employerSickPay = daysEmployer70 * dailyWage * 0.7
      effectiveGross = Math.max(0, baseGross - reduction)
    }
    let overtimePay=0
    if(includeOver && overAmt>0 && workingDays>0){
      const dailyRate = effectiveGross / workingDays
      const hourlyRate = dailyRate / 8
      overtimePay = (overType==='days' ? overAmt * dailyRate * 2 : overAmt * hourlyRate * 2)
    }
    const grossWithOvertime = effectiveGross + overtimePay
    // Осигурителен доход: лимит 3750 (до 03.2025) и 4130 (с 04.2025)
    function maxOsigIncomeFor(year, month){
      if(year===2025 && month<3) return 3750
      return 4130
    }
    const cap = maxOsigIncomeFor(year, month)
    const osigIncome = Math.min(grossWithOvertime, cap)
    // Вклад работника: 13.78% (ДОО 8.38% + УПФ 2.20% при р.>1959 + ЗО 3.20%)
    const employeeContrib = osigIncome * 0.1378
    // Налоговая база: исключаем сумму работодателя за дни 1–2 (70%), т.к. не облагается 10%
    const taxBase = Math.max(0, grossWithOvertime - employeeContrib - employerSickPay)
    const ddlf = taxBase * 0.1
    let net = grossWithOvertime - (employeeContrib + ddlf)
    if(carAllowance){ net -= 5 }
    if(sport){ net -= sportA*sportAVal + sportC*sportCVal }
    if(ins){ net -= insCount * insVal }
    if(corr){ net += corrVal }
    if(net<0) net=0

    const netMonthBGN = net
    const netYearBGN = net*12
    const netDayCalendarBGN = totalDays? net/totalDays : 0
    const netDayWorkBGN = workingDays? net/workingDays : 0
    const netHourCalendarBGN = totalDays? net/(totalDays*24) : 0
    const netHourWorkBGN = workingDays? net/(workingDays*8) : 0

    const grossMonthBGN = grossWithOvertime
    const grossYearBGN = grossMonthBGN*12
    const grossDayCalendarBGN = totalDays? grossMonthBGN/totalDays : 0
    const grossDayWorkBGN = workingDays? grossMonthBGN/workingDays : 0
    const grossHourCalendarBGN = totalDays? grossMonthBGN/(totalDays*24) : 0
    const grossHourWorkBGN = workingDays? grossMonthBGN/(workingDays*8) : 0

    try{ const kcur = byId('kpiCurrency'); if(kcur) kcur.textContent = cur }catch(_){ }

    $('#kGrossMonth').textContent = fmtCurr(convertFromBGN(grossMonthBGN, cur), cur)
    $('#kNetMonth').textContent   = fmtCurr(convertFromBGN(netMonthBGN,   cur), cur)

    $('#kGrossYear').textContent = fmtCurr(convertFromBGN(grossYearBGN, cur), cur)
    $('#kNetYear').textContent   = fmtCurr(convertFromBGN(netYearBGN,   cur), cur)

    $('#kGrossDay').textContent = `${fmtNum(convertFromBGN(grossDayWorkBGN, cur))} / ${fmtNum(convertFromBGN(grossDayCalendarBGN, cur))} ${cur}`
    $('#kNetDay').textContent   = `${fmtNum(convertFromBGN(netDayWorkBGN,   cur))} / ${fmtNum(convertFromBGN(netDayCalendarBGN,   cur))} ${cur}`

    $('#kGrossHour').textContent = `${fmtNum(convertFromBGN(grossHourWorkBGN, cur))} / ${fmtNum(convertFromBGN(grossHourCalendarBGN, cur))} ${cur}`
    $('#kNetHour').textContent   = `${fmtNum(convertFromBGN(netHourWorkBGN,   cur))} / ${fmtNum(convertFromBGN(netHourCalendarBGN,   cur))} ${cur}`

    // Секция сравнения: трактуем значения как BGN; UI без указания валюты

    try{
      const c1El=document.getElementById('inpCmp1')
      const c2El=document.getElementById('inpCmp2')
      const diffEl=document.getElementById('cmpDiff')
      if(c1El && c2El){
        const c1=Math.max(0, parseFloat(c1El.value)||0)
        const c2=Math.max(0, parseFloat(c2El.value)||0)
        const diff=c2-c1
        const pct=c1!==0 ? (diff/c1)*100 : 0
        if(diffEl){ diffEl.textContent = `Разница: ${fmtNum(diff)} (${fmtNum(pct)}%)` }
      }
    }catch(_){ }

    // redraw bar chart: [Месяц, Год] Gross vs Net
    try{
      const c = document.getElementById('gnBar')
      if(c && typeof drawBarChart==='function'){
        const labels=['Год','Месяц']
        const series=[
          [ convertFromBGN(grossYearBGN, cur), convertFromBGN(grossMonthBGN, cur) ],
          [ convertFromBGN(netYearBGN,   cur), convertFromBGN(netMonthBGN,   cur) ]
        ]
        drawBarChart(c, labels, series, ['Брутто','Нетто'])
      }
    }catch(_){ }

    // Persist current state
    try{ const st = serializeState(); if(st) localStorage.setItem(GN_LS_KEY, JSON.stringify(st)) }catch(_){ }
  }

  function openCompareModal(){
    try{
      const o=document.getElementById('dashOverlay')
      const m=document.getElementById('dashModal')
      const t=document.getElementById('dashModalTitle')
      const c=document.getElementById('dashModalContent')
      if(!o||!m||!t||!c) return
      t.textContent = 'Сравнение'
      c.innerHTML = `
        <div class="grid-sm">
          <div>
            <label>Текущая</label>
            <input id="inpCmp1" type="number" step="0.01" min="0" value="0" />
          </div>
          <div>
            <label>Другая</label>
            <input id="inpCmp2" type="number" step="0.01" min="0" value="0" />
          </div>
        </div>
        <div class="warnbox" style="margin-top:8px" id="cmpDiff"></div>
      `
      // Bind fresh fields to recalc
      try{ const a=document.getElementById('inpCmp1'); if(a){ a.oninput=recalc; a.onchange=recalc } }catch(_){ }
      try{ const b=document.getElementById('inpCmp2'); if(b){ b.oninput=recalc; b.onchange=recalc } }catch(_){ }
      // Initialize defaults: current = annual-with-seniority; other = current + 5%
      try{ 
        const tgtBGN = parseFloat(byId('inpAnnualWithSen').value)||0; 
        const a=document.getElementById('inpCmp1'); 
        const b=document.getElementById('inpCmp2'); 
        if(a){ a.value=String(tgtBGN.toFixed(2)) }
        if(b){ b.value=String((tgtBGN*1.05).toFixed(2)) }
      }catch(_){ }
      // Show
      o.style.display='block'; m.style.display='block'
      // Wire close
      try{ const closeBtn=document.getElementById('btnCloseDashModal'); if(closeBtn){ closeBtn.onclick = ()=>{ try{ o.style.display='none'; m.style.display='none' }catch(_){ } } } }catch(_){ }
      o.onclick = ()=>{ try{ o.style.display='none'; m.style.display='none' }catch(_){ } }
      // Compute initial diff
      recalc()
    }catch(_){ }
  }

  try{ setup() }catch(_){ document.addEventListener('DOMContentLoaded', setup) }
})()


