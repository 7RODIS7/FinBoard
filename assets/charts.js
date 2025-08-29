function drawBarChart(c, labels, series, seriesNames){
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
  const colors=['#7bd88f','#ff6b6b']
  const bars=[]
  for(let g=0; g<groups; g++){
    for(let s=0;s<sCount;s++){
      const val=series[s][g]||0
      const h = gh * (val/max)
      const x = leftPad + g*barGroupW + gap + s*barW
      const y = topPad + gh - h
      ctx.fillStyle=colors[s%colors.length]
      roundRect(ctx, x, y, barW, h, 4*dpr)
      ctx.fill()
      bars.push({x,y,w:barW,h, label:labels[g], value:val, series:s})
    }
  }
  ctx.fillStyle='#9fb1c7'; ctx.font=`${10*dpr}px sans-serif`
  ctx.textAlign='center'
  for(let g=0; g<groups; g++){
    const x = leftPad + g*barGroupW + barGroupW/2
    ctx.fillText(labels[g], x, H-8*dpr)
  }
  attachBarTooltip(c, bars, dpr)
}

function drawLineChart(c, labels, values){
  const dpr=window.devicePixelRatio||1
  const W=c.clientWidth*dpr, H=c.clientHeight*dpr; c.width=W; c.height=H
  const ctx=c.getContext('2d'); ctx.clearRect(0,0,W,H)
  const topPad=48*dpr, bottomPad=28*dpr, leftPad=48*dpr, rightPad=16*dpr
  const gw= W-leftPad-rightPad, gh=H-topPad-bottomPad
  const n=labels.length
  
  // Исправляем расчет диапазона для корректного отображения отрицательных значений
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
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
  ctx.stroke()
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
  for(let i=0;i<labels.length;i++){
    const val=values[i]
    const ang= (val/total)*Math.PI*2
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.fillStyle=palette[i]
    ctx.arc(cx,cy,r,start,start+ang); ctx.closePath(); ctx.fill()
    start+=ang
  }
  ctx.globalCompositeOperation='destination-out'
  ctx.beginPath(); ctx.arc(cx,cy,r*0.55,0,Math.PI*2); ctx.fill()
  ctx.globalCompositeOperation='source-over'
  const legX = 12*dpr, legY = 12*dpr
  ctx.font=`${11*dpr}px sans-serif`; ctx.fillStyle='#c7d3e3'
  let y=legY
  for(let i=0;i<labels.length;i++){
    ctx.fillStyle=palette[i]
    ctx.fillRect(legX,y-8*dpr,10*dpr,10*dpr)
    ctx.fillStyle='#c7d3e3'
    const pct=((values[i]/total)*100).toFixed(1)
    ctx.fillText(`${labels[i]} · ${pct}%`, legX+16*dpr, y)
    y+=16*dpr
  }
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

function attachBarTooltip(canvas, bars, dpr){
  let tip=document.getElementById('chartTip')
  if(!tip){ tip=document.createElement('div'); tip.id='chartTip'; tip.style.display='none'; document.body.appendChild(tip) }
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
      const seriesName = b.series === 0 ? 'Доходы' : 'Расходы'
      const currency = window.STATE?.vault?.currency || 'BGN'
      const formattedValue = new Intl.NumberFormat('ru-RU', {style:'currency', currency, maximumFractionDigits:2}).format(b.value)
      tip.innerHTML = `<div style="font-weight:600;margin-bottom:2px;">${b.label}</div><div style="color:${b.series === 0 ? '#7bd88f' : '#ff6b6b'}">${seriesName}: ${formattedValue}</div>`
      tip.style.left=(e.clientX+12)+'px'
      tip.style.top=(e.clientY+12)+'px'
    }else{ tip.style.display='none' }
  }
  canvas.onmouseleave=()=>{ tip.style.display='none' }

  // Double-click to set month filter to clicked bar label
  canvas.ondblclick=(e)=>{
    const rect=canvas.getBoundingClientRect()
    const mx=(e.clientX-rect.left)*dpr, my=(e.clientY-rect.top)*dpr
    function findBar(mx,my){
      for(const b of bars){
        const minHeight = 20 * dpr
        const clickHeight = Math.max(b.h, minHeight)
        const clickY = b.y - (clickHeight - b.h) / 2
        const padding = 4 * dpr
        if(mx >= b.x - padding && mx <= b.x + b.w + padding && 
           my >= clickY - padding && my <= clickY + clickHeight + padding) return b
      }
      return null
    }
    const b=findBar(mx,my)
    if(b && window.PERIOD_FILTER){
      window.PERIOD_FILTER.mode='month'
      window.PERIOD_FILTER.singleMonth=b.label
      if(typeof window.render === 'function'){ window.render() }
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
      const formattedValue = new Intl.NumberFormat('ru-RU', {style:'currency', currency, maximumFractionDigits:2}).format(p.value)
      const valueColor = p.value >= 0 ? '#7bd88f' : '#ff6b6b'
      tip.innerHTML = `<div style="font-weight:600;margin-bottom:2px;">${p.label}</div><div style="color:${valueColor}">Чистый итог: ${formattedValue}</div>`
      tip.style.left=(e.clientX+12)+'px'
      tip.style.top=(e.clientY+12)+'px'
    }else{ tip.style.display='none' }
  }
  canvas.onmouseleave=()=>{ tip.style.display='none' }
}

