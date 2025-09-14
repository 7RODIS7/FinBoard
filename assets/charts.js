function drawBarChart(c, labels, series, seriesNames, opts){
  const dpr=window.devicePixelRatio||1
  const W=c.clientWidth*dpr, H=c.clientHeight*dpr; c.width=W; c.height=H
  const ctx=c.getContext('2d'); ctx.clearRect(0,0,W,H)
  const topPad=48*dpr, bottomPad=28*dpr, leftPad=48*dpr, rightPad=16*dpr
  const gw= W-leftPad-rightPad, gh=H-topPad-bottomPad
  const n=labels.length, groups=n
  const sCount=series.length
  const flat=[...series[0],...(series[1]||[])]
  const max = Math.max(1, Math.ceil(Math.max(...flat)*1.2))
  const barGroupW = gw / Math.max(1,groups)
  const barW = Math.max(8*dpr, (barGroupW*0.7)/sCount)
  const gap = (barGroupW - barW*sCount)/2
  ctx.strokeStyle='#223041'; ctx.lineWidth=1*dpr
  const steps=5
  for(let i=0;i<=steps;i++){
    const y=topPad + gh - (i/steps)*gh
    ctx.globalAlpha=0.5; ctx.beginPath(); ctx.moveTo(leftPad,y); ctx.lineTo(W-rightPad,y); ctx.stroke()
    ctx.globalAlpha=1; ctx.fillStyle='#9fb1c7'; ctx.font=`${10*dpr}px sans-serif`
    const v = (max*i/steps)
    ctx.fillText(formatShort(v), 6*dpr, y-2*dpr)
  }
  const colors = (opts && Array.isArray(opts.seriesColors) && opts.seriesColors.length)
    ? opts.seriesColors
    : ['#7bd88f','#ff6b6b','#4ea1ff','#ffa14f','#c59cff']
  const bars=[]
  for(let g=0; g<groups; g++){
    for(let s=0;s<sCount;s++){
      const val=series[s][g]||0
      const h = gh * (val/max)
      const x = leftPad + g*barGroupW + gap + s*barW
      const y = topPad + gh - h
      const isForecast = opts && Number.isInteger(opts.forecastFrom) && g >= opts.forecastFrom
      if(isForecast){
        ctx.save()
        ctx.globalAlpha=0.45
        ctx.fillStyle=colors[s%colors.length]
        roundRect(ctx, x, y, barW, h, 4*dpr)
        ctx.fill()
        ctx.restore()
      } else {
        ctx.fillStyle=colors[s%colors.length]
        roundRect(ctx, x, y, barW, h, 4*dpr)
        ctx.fill()
      }
      bars.push({x,y,w:barW,h, label:labels[g], value:val, series:s})
    }
  }
  ctx.fillStyle='#9fb1c7'; ctx.font=`${10*dpr}px sans-serif`
  ctx.textAlign='center'
  for(let g=0; g<groups; g++){
    const x = leftPad + g*barGroupW + barGroupW/2
    ctx.fillText(labels[g], x, H-8*dpr)
  }
  // Сохраняем геометрию и метки для надёжного определения группы по X
  try{ c._barMeta = { labels:[...labels], leftPad, rightPad, barGroupW, groups } }catch(_){ }
  attachBarTooltip(c, bars, dpr, Array.isArray(seriesNames)?seriesNames:null)
}

function drawLineChart(c, labels, values, opts){
  const dpr=window.devicePixelRatio||1
  const W=c.clientWidth*dpr, H=c.clientHeight*dpr; c.width=W; c.height=H
  const ctx=c.getContext('2d'); ctx.clearRect(0,0,W,H)
  const topPad=48*dpr, bottomPad=28*dpr, leftPad=48*dpr, rightPad=16*dpr
  const gw= W-leftPad-rightPad, gh=H-topPad-bottomPad
  const n=labels.length
  if(!Array.isArray(labels) || !labels.length || !Array.isArray(values) || !values.length){
    ctx.fillStyle='#9fb1c7'; ctx.textAlign='center'; ctx.font=`${12*dpr}px sans-serif`
    ctx.fillText('Нет данных', W/2, H/2)
    return
  }
  
  // Исправляем расчет диапазона для корректного отображения отрицательных значений
  const extra = (opts && Array.isArray(opts.baselineValues)) ? opts.baselineValues : null
  const allVals = extra ? [...values, ...extra] : values
  const minVal = Math.min(...allVals)
  const maxVal = Math.max(...allVals)
  const range = maxVal - minVal
  const padding = range * 0.1 // 10% отступ сверху и снизу
  const yMin = minVal - padding
  const yMax = maxVal + padding
  const yRange = yMax - yMin
  
  // Нулевая линия
  const zeroY = topPad + gh - ((0 - yMin) / yRange) * gh
  
  ctx.strokeStyle='#223041'; ctx.lineWidth=1*dpr
  const steps=5
  for(let i=0;i<=steps;i++){
    const y=topPad + gh - (i/steps)*gh
    ctx.globalAlpha=0.5; ctx.beginPath(); ctx.moveTo(leftPad,y); ctx.lineTo(W-rightPad,y); ctx.stroke()
    ctx.globalAlpha=1; ctx.fillStyle='#9fb1c7'; ctx.font=`${10*dpr}px sans-serif`
    const v = yMin + (yRange * i/steps)
    ctx.fillText(formatShort(v), 6*dpr, y-2*dpr)
  }
  
  // Особо выделяем нулевую линию если она в диапазоне
  if (yMin <= 0 && yMax >= 0) {
    ctx.strokeStyle='#4a5568'; ctx.lineWidth=1*dpr; ctx.globalAlpha=0.8
    ctx.beginPath(); ctx.moveTo(leftPad, zeroY); ctx.lineTo(W-rightPad, zeroY); ctx.stroke()
    ctx.globalAlpha=1
  }
  
  const points = []
  ctx.strokeStyle='#4ea1ff'; ctx.lineWidth=2*dpr; ctx.beginPath()
  for(let i=0;i<n;i++){
    const x = leftPad + (gw*(i/(Math.max(1,n-1))))
    const y = topPad + gh - ((values[i] - yMin) / yRange) * gh
    points.push({x, y, label: labels[i], value: values[i]})
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y)
  }
  if(opts && Number.isInteger(opts.forecastFrom)){
    const cut = Math.max(0, Math.min(n-1, opts.forecastFrom-1))
    // Нарисуем фактическую линию до cut
    ctx.save(); ctx.strokeStyle='#4ea1ff'; ctx.setLineDash([]); ctx.beginPath()
    for(let i=0;i<=cut;i++){ const p=points[i]; if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y) }
    ctx.stroke(); ctx.restore()
    // Прогноз — пунктиром
    ctx.save(); ctx.strokeStyle='#4ea1ff'; ctx.globalAlpha=0.7; ctx.setLineDash([6*dpr,6*dpr]); ctx.beginPath()
    for(let i=cut;i<n;i++){ const p=points[i]; if(i===cut) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y) }
    ctx.stroke(); ctx.restore()
  }else{
    ctx.stroke()
  }
  // Бейзлайн (например, среднее 12м)
  if(extra && extra.length===n){
    ctx.save()
    ctx.strokeStyle='#c7d3e3'
    ctx.globalAlpha=0.9
    ctx.setLineDash([4*dpr,4*dpr])
    ctx.lineWidth=1.5*dpr
    ctx.beginPath()
    for(let i=0;i<n;i++){
      const x = leftPad + (gw*(i/(Math.max(1,n-1))))
      const y = topPad + gh - ((extra[i] - yMin) / yRange) * gh
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y)
    }
    ctx.stroke()
    ctx.restore()
  }
  ctx.fillStyle='#4ea1ff'
  for(const p of points){
    ctx.beginPath(); ctx.arc(p.x, p.y, 4*dpr, 0, Math.PI*2); ctx.fill()
  }
  ctx.fillStyle='#9fb1c7'; ctx.font=`${10*dpr}px sans-serif`; ctx.textAlign='center'
  for(let i=0;i<n;i++){
    const x = leftPad + (gw*(i/(Math.max(1,n-1))))
    ctx.fillText(labels[i], x, H-8*dpr)
  }
  
  attachLineTooltip(c, points, dpr)
}

function drawDonutChart(c, labels, values){
  const dpr=window.devicePixelRatio||1
  const W=c.clientWidth*dpr, H=c.clientHeight*dpr; c.width=W; c.height=H
  const ctx=c.getContext('2d'); ctx.clearRect(0,0,W,H)
  const cx=W/2, cy=H/2, r=Math.min(W,H)/2-16*dpr
  const total=values.reduce((a,b)=>a+b,0)
  if(total<=0){ ctx.fillStyle='#9fb1c7'; ctx.textAlign='center'; ctx.font=`${12*dpr}px sans-serif`; ctx.fillText('Нет данных', cx, cy); return }
  const palette = genPalette(labels.length)
  let start=-Math.PI/2
  const slices=[]
  for(let i=0;i<labels.length;i++){
    const val=values[i]
    const ang= (val/total)*Math.PI*2
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.fillStyle=palette[i]
    ctx.arc(cx,cy,r,start,start+ang); ctx.closePath(); ctx.fill()
    slices.push({start,end:start+ang,label:labels[i],value:val,color:palette[i]})
    start+=ang
  }
  ctx.globalCompositeOperation='destination-out'
  ctx.beginPath(); ctx.arc(cx,cy,r*0.55,0,Math.PI*2); ctx.fill()
  ctx.globalCompositeOperation='source-over'
  // Build legend entries sorted by value desc, but preserve slice colors
  const legX = 12*dpr, legY = 12*dpr
  const entries = labels.map((label,i)=>({ label, value:values[i], color:palette[i], pct: ((values[i]/total)*100) }))
    .sort((a,b)=> b.value - a.value)
  ctx.font=`${11*dpr}px sans-serif`; ctx.fillStyle='#c7d3e3'
  let y=legY
  for(let i=0;i<entries.length;i++){
    const e=entries[i]
    ctx.fillStyle=e.color
    ctx.fillRect(legX,y-8*dpr,10*dpr,10*dpr)
    ctx.fillStyle='#c7d3e3'
    ctx.fillText(`${e.label} · ${e.pct.toFixed(1)}%`, legX+16*dpr, y)
    y+=16*dpr
  }

  // Tooltip on hover
  let tip=document.getElementById('chartTip')
  if(!tip){ tip=document.createElement('div'); tip.id='chartTip'; tip.style.display='none'; tip.style.pointerEvents='none'; tip.style.position='fixed'; tip.style.zIndex='9999'; document.body.appendChild(tip) }
  c.onmousemove=(e)=>{
    const rect=c.getBoundingClientRect()
    const mx=(e.clientX-rect.left)*dpr, my=(e.clientY-rect.top)*dpr
    const ang=Math.atan2(my-cy, mx-cx)
    const dist=Math.hypot(mx-cx,my-cy)
    const a = ang< -Math.PI/2 ? ang+Math.PI*2 : ang
    if(dist>=r*0.55 && dist<=r){
      const s = slices.find(s=> a>=s.start && a<=s.end)
      if(s){
        const currency = window.STATE?.vault?.currency || 'BGN'
        const formattedValue = (window.formatAmountDisplay ? window.formatAmountDisplay(s.value) : new Intl.NumberFormat('ru-RU', {style:'currency', currency, maximumFractionDigits:2}).format(s.value))
        const pct = ((s.value/total)*100).toFixed(1)
        tip.style.display='block'
        tip.innerHTML = `<div style="font-weight:600;margin-bottom:2px;">${s.label}</div><div>${formattedValue} · ${pct}%</div>`
        tip.style.left=(e.clientX+12)+'px'
        tip.style.top=(e.clientY+12)+'px'
        return
      }
    }
    tip.style.display='none'
  }
  c.onmouseleave=()=>{ let t=document.getElementById('chartTip'); if(t) t.style.display='none' }

  // Tooltip from legend hover (hit test on legend rows)
  c.onmousemove = c.onmousemove // keep slice hover
  const onLegendMove=(e)=>{
    const rect=c.getBoundingClientRect()
    const lx=(e.clientX-rect.left)*dpr, ly=(e.clientY-rect.top)*dpr
    // Legend hitbox: each row height = 16*dpr, first row top at (legY - 8*dpr)
    const rowH = 16*dpr
    const top0 = legY - 8*dpr
    const legWidth = Math.max(220*dpr, ctx.measureText('MMMMMMMMMMMMMMMMMMMM').width)
    if(lx>=legX && lx<=legX+legWidth && ly>=top0 && ly<=top0 + entries.length*rowH){
      const idx = Math.floor((ly - top0)/rowH)
      if(idx>=0 && idx<entries.length){
        const currency = window.STATE?.vault?.currency || 'BGN'
        const eEntry = entries[idx]
        const formattedValue = (window.formatAmountDisplay ? window.formatAmountDisplay(eEntry.value) : new Intl.NumberFormat('ru-RU', {style:'currency', currency, maximumFractionDigits:2}).format(eEntry.value))
        tip.style.display='block'
        tip.innerHTML = `<div style="font-weight:600;margin-bottom:2px;">${eEntry.label}</div><div>${formattedValue} · ${eEntry.pct.toFixed(1)}%</div>`
        tip.style.left=(e.clientX+12)+'px'
        tip.style.top=(e.clientY+12)+'px'
        return
      }
    }
  }
  c.addEventListener('mousemove', onLegendMove)
}

function genPalette(n){
  const cols=['#7bd88f','#ff6b6b','#6dd3a6','#f5c25c','#4ea1ff','#c59cff','#ffa14f','#8bd3dd','#f08dcc','#9bd5a0']
  const res=[]; for(let i=0;i<n;i++) res.push(cols[i%cols.length]); return res
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath()
  ctx.moveTo(x+r,y)
  ctx.arcTo(x+w,y,x+w,y+h,r)
  ctx.arcTo(x+w,y+h,x,y+h,r)
  ctx.arcTo(x,y+h,x,y,r)
  ctx.arcTo(x,y,x+w,y,r)
  ctx.closePath()
}

function formatShort(v){
  const abs=Math.abs(v)
  if(abs>=1e9) return (v/1e9).toFixed(1)+'B'
  if(abs>=1e6) return (v/1e6).toFixed(1)+'M'
  if(abs>=1e3) return (v/1e3).toFixed(1)+'k'
  return String(Math.round(v))
}

function attachBarTooltip(canvas, bars, dpr, seriesNames){
  let tip=document.getElementById('chartTip')
  if(!tip){
    tip=document.createElement('div');
    tip.id='chartTip';
    tip.style.display='none';
    tip.style.pointerEvents='none';
    tip.style.position='fixed';
    tip.style.zIndex='9999';
    document.body.appendChild(tip)
  } else {
    tip.style.pointerEvents='none'
  }
  function findBar(mx,my){
    for(const b of bars){ 
      // Увеличиваем область клика: минимум 20px по высоте и добавляем отступы
      const minHeight = 20 * dpr
      const clickHeight = Math.max(b.h, minHeight)
      const clickY = b.y - (clickHeight - b.h) / 2
      const padding = 4 * dpr
      if(mx >= b.x - padding && mx <= b.x + b.w + padding && 
         my >= clickY - padding && my <= clickY + clickHeight + padding) return b
    }
    return null
  }
  canvas.onmousemove=(e)=>{
    const rect=canvas.getBoundingClientRect()
    const mx=(e.clientX-rect.left)*dpr, my=(e.clientY-rect.top)*dpr
    const b=findBar(mx,my)
    if(b){
      tip.style.display='block'
      const seriesName = Array.isArray(seriesNames) && seriesNames[b.series] ? seriesNames[b.series] : (b.series === 0 ? 'Доходы' : 'Расходы')
      const currency = window.STATE?.vault?.currency || 'BGN'
      const formattedValue = (window.formatAmountDisplay ? window.formatAmountDisplay(b.value) : new Intl.NumberFormat('ru-RU', {style:'currency', currency, maximumFractionDigits:2}).format(b.value))
      tip.innerHTML = `<div style="font-weight:600;margin-bottom:2px;">${b.label}</div><div style="color:${b.series === 0 ? '#7bd88f' : '#ff6b6b'}">${seriesName}: ${formattedValue}</div>`
      tip.style.left=(e.clientX+12)+'px'
      tip.style.top=(e.clientY+12)+'px'
    }else{ tip.style.display='none' }
  }
  canvas.onmouseleave=()=>{ tip.style.display='none' }

  // Double-click to set month filter to clicked bar label
  canvas.ondblclick=(e)=>{
    e.preventDefault(); e.stopPropagation();
    const rect=canvas.getBoundingClientRect()
    const mx=(e.clientX-rect.left)*dpr, my=(e.clientY-rect.top)*dpr
    function _findBar(mx,my){
      for(const b of bars){
        const minHeight = 24 * dpr
        const clickHeight = Math.max(b.h||0, minHeight)
        const clickY = (b.y||0) - (clickHeight - (b.h||0)) / 2
        const padding = 12 * dpr
        if(mx >= (b.x - padding) && mx <= (b.x + b.w + padding) && 
           my >= (clickY - padding) && my <= (clickY + clickHeight + padding)) return b
      }
      return null
    }
    let b=null
    if(Array.isArray(bars) && bars.length){
      b = _findBar(mx,my)
    }
    if(!b){
      const meta = canvas._barMeta
      if(meta && Array.isArray(meta.labels) && meta.labels.length){
        const { leftPad, barGroupW, labels } = meta
        const xLocal = mx - leftPad
        const g = Math.floor(xLocal / barGroupW)
        if(Number.isFinite(g) && g >= 0 && g < labels.length){
          const bestLabel = labels[g]
          b = { label: bestLabel, value: 0, series: 0 }
        }
      }
    }
    if(b && (typeof PERIOD_FILTER !== 'undefined')){
      const aggMode = (window.UI && UI.aggMode) ? UI.aggMode : 'month'
      const isMonth = /^\d{4}-\d{2}$/.test(b.label)
      const isWeek = /^\d{4}-W\d{2}$/.test(b.label)
      const isDay  = /^\d{4}-\d{2}-\d{2}$/.test(b.label)

      if(aggMode==='day' && isDay){
        // Выбор конкретного дня
        try{
          const [y,m,d] = b.label.split('-').map(Number)
          PERIOD_FILTER.mode='day'
          PERIOD_FILTER.dayYear=String(y)
          PERIOD_FILTER.dayMonth=m
          PERIOD_FILTER.dayDay=d
          const dayRadio = document.querySelector('input[name="filterMode"][value="day"]')
          if(dayRadio){ dayRadio.checked = true; if(typeof dayRadio.onchange==='function') dayRadio.onchange() }
          const dy=document.getElementById('dayYear'); if(dy){ dy.value=String(y); if(typeof dy.onchange==='function') dy.onchange() }
          const dm=document.getElementById('dayMonth'); if(dm){ dm.value=String(m); if(typeof dm.onchange==='function') dm.onchange() }
          const dd=document.getElementById('dayDay'); if(dd){ dd.value=String(d); if(typeof dd.onchange==='function') dd.onchange() }
        }catch(_){ }
        // Агрегация остаётся День, синхронизируем радиокнопку
        try{ const ra=document.querySelector('input[name="aggMode"][value="day"]'); if(ra){ ra.checked=true; if(typeof ra.onchange==='function') ra.onchange() } }catch(_){ }
        if(typeof window.updateAllCharts==='function') window.updateAllCharts()
        return
      }

      if(aggMode==='week' && isWeek){
        // Выбор недели и углубление до дней этой недели
        try{
          const [yPart,wPart] = b.label.split('-W')
          PERIOD_FILTER.mode='week'
          PERIOD_FILTER.weekYear=String(yPart)
          PERIOD_FILTER.weekNumber=parseInt(wPart)||1
          const weekRadio = document.querySelector('input[name="filterMode"][value="week"]')
          if(weekRadio){ weekRadio.checked = true; if(typeof weekRadio.onchange==='function') weekRadio.onchange() }
          const wy=document.getElementById('weekYear'); if(wy){ wy.value=String(yPart); if(typeof wy.onchange==='function') wy.onchange() }
          const wn=document.getElementById('weekNumber'); if(wn){ wn.value=String(parseInt(wPart)||1); if(typeof wn.onchange==='function') wn.onchange() }
          window.UI = window.UI || {}
          UI.aggMode = 'day'
          // Переключим радиокнопку агрегации на День
          try{ const ra=document.querySelector('input[name="aggMode"][value="day"]'); if(ra){ ra.checked=true; if(typeof ra.onchange==='function') ra.onchange() } }catch(_){ }
        }catch(_){ }
        if(typeof window.updateAllCharts==='function') window.updateAllCharts()
        return
      }

      // По умолчанию — месяц
      if(isMonth){
        if(PERIOD_FILTER.mode==='month' && PERIOD_FILTER.singleMonth===b.label){
          // Уже выбран этот месяц — меняем агрегацию на Неделя
          window.UI = window.UI || {}
          UI.aggMode = 'week'
          try{ const ra=document.querySelector('input[name="aggMode"][value="week"]'); if(ra){ ra.checked=true; if(typeof ra.onchange==='function') ra.onchange() } }catch(_){ }
          if(typeof window.updateAllCharts === 'function') window.updateAllCharts()
          return
        }
        PERIOD_FILTER.mode='month'
        PERIOD_FILTER.singleMonth=b.label
        try{
          const monthRadio = document.querySelector('input[name="filterMode"][value="month"]')
          if(monthRadio){ monthRadio.checked = true; if(typeof monthRadio.onchange === 'function') monthRadio.onchange() }
          const sel = document.getElementById('globalSingleMonth')
          if(sel){ sel.value = b.label; if(typeof sel.onchange === 'function') sel.onchange() }
        }catch(_){ }
        if(typeof window.closeExpanded === 'function'){ try{ window.closeExpanded() }catch(_){ } }
        try{ if(typeof window.updateAllCharts === 'function') window.updateAllCharts(); else if(typeof window.render === 'function') window.render() }catch(_){ }
      }
    }
  }
}

function attachLineTooltip(canvas, points, dpr){
  let tip=document.getElementById('chartTip')
  if(!tip){ tip=document.createElement('div'); tip.id='chartTip'; tip.style.display='none'; document.body.appendChild(tip) }
  
  function findPoint(mx, my){
    const radius = 12 * dpr // Увеличенная область для клика
    for(const p of points){
      const dist = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2)
      if(dist <= radius) return p
    }
    return null
  }
  
  canvas.onmousemove=(e)=>{
    const rect=canvas.getBoundingClientRect()
    const mx=(e.clientX-rect.left)*dpr, my=(e.clientY-rect.top)*dpr
    const p=findPoint(mx,my)
    if(p){
      tip.style.display='block'
      const currency = window.STATE?.vault?.currency || 'BGN'
      const formattedValue = (window.formatAmountDisplay ? window.formatAmountDisplay(p.value) : new Intl.NumberFormat('ru-RU', {style:'currency', currency, maximumFractionDigits:2}).format(p.value))
      const valueColor = p.value >= 0 ? '#7bd88f' : '#ff6b6b'
      tip.innerHTML = `<div style="font-weight:600;margin-bottom:2px;">${p.label}</div><div style="color:${valueColor}">Чистый итог: ${formattedValue}</div>`
      tip.style.left=(e.clientX+12)+'px'
      tip.style.top=(e.clientY+12)+'px'
    }else{ tip.style.display='none' }
  }
  canvas.onmouseleave=()=>{ tip.style.display='none' }
}

