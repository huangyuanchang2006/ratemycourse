/* Course contribution term picker. Calendar dates are verified entries, never annual guesses. */
window.createTermPicker = ({root, getLanguage, onChange}) => {
  const lifecycle=new AbortController(), options={signal:lifecycle.signal};let midnightTimer;
  const zh=()=>getLanguage()==='zh', say=(a,b)=>zh()?a:b;
  const starts={2026:{spring:'2026-04-01T00:00:00+09:00',fall:'2026-09-21T00:00:00+09:00'}};
  const clock=()=>new Date();
  const yearNow=()=>Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Tokyo',year:'numeric'}).format(clock()));
  let selected='', legacy='', draftYear=null, open=false, lastSignature='';
  const parse=value=>{const chinese=/^(\d{4})\s*年\s*(春季|秋季)$/.exec(value);if(chinese)return {year:+chinese[1],season:chinese[2]==='春季'?'spring':'fall'};const match=/^(spring|fall) (\d{4})$/i.exec(value)||/^(\d{4})-(spring|fall)$/i.exec(value);if(!match)return null;return /^\d/.test(match[1])?{year:+match[1],season:match[2].toLowerCase()}:{year:+match[2],season:match[1].toLowerCase()};};
  const availability=(year,season)=>{
    if(year<Math.max(2020,yearNow()-6))return 'old';
    if(year>yearNow())return 'future';
    if(year<yearNow())return 'available';
    const stamp=starts[year]?.[season];
    if(!stamp)return 'calendar';
    return clock().getTime()>=Date.parse(stamp)?'available':'future';
  };
  const seasonLabel=season=>season==='spring'?say('春季','Spring'):say('秋季','Fall');
  const label=value=>{if(value==='unknown')return say('修读学期不详','Term taken not known');const p=parse(value);return p?(zh()?`${p.year} 年${seasonLabel(p.season)}`:`${seasonLabel(p.season)} ${p.year}`):value;};
  const reasons={old:()=>say('超出新投稿时间范围','Outside the contribution window'),future:()=>say('尚未开始','Not started'),calendar:()=>say('校历待更新','Calendar update needed')};
  root.innerHTML=`<span id="term-label"></span><input type="hidden" name="term" id="term"><button type="button" class="term-trigger" aria-labelledby="term-label term-value" aria-haspopup="dialog" aria-expanded="false" aria-controls="term-panel"><span id="term-value"></span><svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="m5 7 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button><div id="term-panel" class="term-panel" role="dialog" aria-labelledby="term-panel-title" hidden></div><div class="term-secondary"><button type="button" class="term-unknown"></button><button type="button" class="term-clear" hidden></button></div><p class="muted term-help" id="term-help"></p><p class="term-notice" role="status" hidden></p>`;
  const input=root.querySelector('input'),trigger=root.querySelector('.term-trigger'),panel=root.querySelector('.term-panel'),notice=root.querySelector('.term-notice');
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currentStatus=()=>{const p=parse(selected);return p?availability(p.year,p.season):'';};
  function update(){
    root.querySelector('#term-label').textContent=say('修读学期','Term taken');
    root.querySelector('#term-value').textContent=label(selected)||say('选择年份与学期','Choose year and semester');
    trigger.classList.toggle('has-value',!!selected);trigger.setAttribute('aria-expanded',String(open));
    root.querySelector('.term-unknown').textContent=say('记不清学期','I don’t remember the term');
    root.querySelector('.term-unknown').setAttribute('aria-pressed',String(selected==='unknown'));
    root.querySelector('.term-clear').textContent=say('清除','Clear');root.querySelector('.term-clear').hidden=!selected;
    root.querySelector('.term-help').textContent=say('按实际修读时间选择；未来学期暂不可选。','Choose when you took the course. Future semesters are unavailable.');
    const status=currentStatus();
    notice.hidden=!legacy&&(!status||status==='available');
    notice.textContent=legacy?say('保留原记录：学期未按新格式记录。可重新选择或标记不详，原记录不会自动改写。','Original record retained: its term uses a previous format. Choose a term or mark it unknown; nothing is converted automatically.'):
      status&&status!=='available'?`${label(selected)} · ${reasons[status]()} · ${say('原选择已保留，请重新选择后预览。','Your selection is retained. Choose another term before previewing.')}`:'';
    if(open){
      const active=document.activeElement;
      const attr=['data-year','data-season','data-back','data-close'].find(key=>active.hasAttribute?.(key));
      const value=attr?active.getAttribute(attr):null;
      renderPanel();
      if(attr)(panel.querySelector(`[${attr}="${value}"]:not(:disabled)`)||panel.querySelector('[data-close]'))?.focus({preventScroll:true});
    }
  }
  function renderPanel(){
    panel.hidden=false;
    panel.style.top=(trigger.offsetTop+trigger.offsetHeight+4)+'px';
    const header=`<div class="term-panel-head">${draftYear!==null?`<button type="button" data-back aria-label="${say('返回选择年份','Back to years')}">← ${draftYear}</button>`:`<strong id="term-panel-title">${say('选择年份','Choose a year')}</strong>`}<button type="button" data-close aria-label="${say('关闭学期选择','Close term picker')}">×</button></div>`;
    if(draftYear===null){
      panel.innerHTML=header+`<p class="term-window">${say('新投稿年份范围','Contribution years')}: ${Math.max(2020,yearNow()-6)}–${yearNow()}</p><div class="term-years">${Array.from({length:16},(_,i)=>2020+i).map(y=>{const status=availability(y,'spring');const statusFall=availability(y,'fall');const disabled=status!=='available'&&statusFall!=='available';const p=parse(selected);return `<button type="button" data-year="${y}" ${disabled?'disabled':''} ${p?.year===y?'aria-pressed="true"':''}><span>${y}</span>${disabled?`<small>${reasons[status]()}</small>`:''}</button>`;}).join('')}</div>`;
    }else{
      panel.innerHTML=header+`<strong id="term-panel-title" class="term-step-title">${say('选择学期','Choose a semester')}</strong><div class="term-seasons">${['spring','fall'].map(season=>{const status=availability(draftYear,season);return `<button type="button" data-season="${season}" ${status!=='available'?'disabled':''}><strong>${seasonLabel(season)}</strong><span>${draftYear}</span>${status!=='available'?`<small>${reasons[status]()}</small>`:''}</button>`;}).join('')}</div>`;
    }
  }
  function close(restore=true){open=false;panel.hidden=true;trigger.setAttribute('aria-expanded','false');if(restore)trigger.focus({preventScroll:true});}
  function choose(value){selected=value;legacy='';input.value=selected;trigger.removeAttribute('aria-invalid');close();update();onChange();}
  trigger.onclick=()=>{if(open)return close();open=true;draftYear=null;update();const target=panel.querySelector('[aria-pressed=true]:not(:disabled)')||panel.querySelector(`[data-year="${yearNow()}"]:not(:disabled)`)||panel.querySelector('[data-year]:not(:disabled)')||panel.querySelector('[data-close]');target.focus({preventScroll:true});panel.scrollIntoView({block:'nearest',behavior:'instant'});};
  panel.onclick=event=>{const b=event.target.closest('button');if(!b||b.disabled)return;if(b.hasAttribute('data-close'))return close();if(b.hasAttribute('data-back')){draftYear=null;renderPanel();panel.querySelector(`[data-year="${parse(selected)?.year||yearNow()}"]:not(:disabled)`)?.focus({preventScroll:true});return;}if(b.dataset.year){draftYear=+b.dataset.year;renderPanel();panel.querySelector('[data-season]:not(:disabled)')?.focus({preventScroll:true});return;}if(b.dataset.season){if(availability(draftYear,b.dataset.season)!=='available'){update();return;}choose(`${draftYear}-${b.dataset.season}`);}};
  root.querySelector('.term-unknown').onclick=()=>choose('unknown');
  root.querySelector('.term-clear').onclick=()=>choose('');
  document.addEventListener('pointerdown',e=>{if(open&&!root.contains(e.target))close(false);},options);
  root.addEventListener('keydown',e=>{if(!open)return;if(e.key==='Escape'){e.preventDefault();close();}else if(['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End'].includes(e.key)&&panel.contains(e.target)){const controls=[...panel.querySelectorAll('[data-year]:not(:disabled),[data-season]:not(:disabled)')];if(!controls.length)return;let i=controls.indexOf(e.target);if(i<0)return;e.preventDefault();i=e.key==='Home'?0:e.key==='End'?controls.length-1:(i+(['ArrowUp','ArrowLeft'].includes(e.key)?-1:1)+controls.length)%controls.length;controls[i].focus({preventScroll:true});}});
  document.addEventListener('focusin',event=>{if(open&&!root.contains(event.target))close(false);},options);
  function refresh(){const sig=yearNow()+':'+['spring','fall'].map(s=>availability(yearNow(),s)).join(':');if(sig!==lastSignature){lastSignature=sig;update();}}
  window.addEventListener('focus',refresh,options);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();},options);
  window.addEventListener('resize',()=>{if(open)panel.style.top=(trigger.offsetTop+trigger.offsetHeight+4)+'px';},options);
  // Recheck shortly after each Japan calendar-day boundary, including while the panel stays open.
  function nextDay(){const now=Date.now(),jst=new Date(now+9*3600000);const boundary=Date.UTC(jst.getUTCFullYear(),jst.getUTCMonth(),jst.getUTCDate()+1)-9*3600000;midnightTimer=setTimeout(()=>{refresh();nextDay();},Math.max(100,boundary-now+25));}nextDay();
  refresh();
  return {label,close,refresh:()=>{update();},get value(){return selected;},set(value){selected=String(value||'');if(selected==='Unknown')selected='unknown';legacy=selected&&selected!=='unknown'&&!parse(selected)?selected:'';input.value=selected;update();},valid(){return selected==='unknown'||(!legacy&&currentStatus()==='available');},focus(){trigger.focus();trigger.setAttribute('aria-invalid','true');},destroy(){lifecycle.abort();clearTimeout(midnightTimer);close(false);}};
};
