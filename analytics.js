(() => {
  'use strict';
  const auth=window.SILS_AUTH,main=document.querySelector('#main'),account=document.querySelector('#metrics-account');
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let language=localStorage.getItem('odyssey-community-language')==='en'?'en':'zh',session=null,authorized=false,generation=0;
  const day=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
  let start=day(new Date(Date.now()-29*86400000)),end=day(new Date()),includeTest=false;
  const zh=()=>language==='zh';
  const text=(cn,en)=>zh()?cn:en;
  const count=value=>Number(value||0).toLocaleString(zh()?'zh-CN':'en');
  const time=value=>{const seconds=Math.round(Number(value||0)/1000);return `${Math.floor(seconds/60)}${text('分','m')} ${seconds%60}${text('秒','s')}`;};
  function heading(){
    document.documentElement.lang=zh()?'zh-CN':'en';document.title=text('数据概览 · RateMyCourse','Analytics · RateMyCourse');
    document.querySelector('#language-toggle').textContent=zh()?'English':'中文';
    account.innerHTML=session?`<button class="quiet" type="button" data-signout>${text('退出','Sign out')}</button>`:'';
  }
  function gate(message){
    main.innerHTML=`<div class="empty-state"><p class="eyebrow">ADMIN ANALYTICS</p><h1>${text('数据概览','Site analytics')}</h1><p>${escape(message)}</p>${!session?`<button class="button" type="button" data-signin>${text('使用 Google 继续','Continue with Google')}</button>`:''}<p><a class="text-link" href="./#/browse">${text('返回课程浏览','Back to courses')}</a></p></div>`;
  }
  function shell(){
    main.innerHTML=`<p class="eyebrow">ADMIN ANALYTICS · JST</p><h1>${text('网站数据概览','Site analytics')}</h1><p class="subtext">${text('仅管理员可见。按日本时间查看访问、阅读与贡献情况。','Administrator access only. Views, reading, and contributions, grouped by Japan time.')}</p><form id="metrics-filters" class="panel metrics-filters"><div class="field"><label for="metrics-start">${text('开始日期','Start date')}</label><input id="metrics-start" name="start" type="date" required value="${start}"></div><div class="field"><label for="metrics-end">${text('结束日期','End date')}</label><input id="metrics-end" name="end" type="date" required value="${end}"></div><label class="check"><input type="checkbox" name="include_test" ${includeTest?'checked':''}><span>${text('包含测试流量','Include test traffic')}</span></label><button class="button" type="submit">${text('刷新数据','Refresh')}</button></form><p id="metrics-status" class="metrics-status" role="status"></p><section id="metrics-report"></section>`;
  }
  function render(report){
    const totals=report.totals;
    const metrics=[
      [text('页面浏览量','Page views'),count(totals.page_views)],
      [text('浏览器访客（估算）','Browser visitors (estimated)'),count(totals.visitors)],
      [text('访问会话（估算）','Sessions (estimated)'),count(totals.sessions)],
      [text('课程详情访问','Course detail views'),count(totals.course_views)],
      [text('有效阅读总时长','Active reading time'),time(totals.active_ms)],
      [text('每次浏览平均阅读时长','Average active time per view'),time(totals.average_active_ms)],
      [text('期间新增账号','New accounts in range'),count(totals.registrations)],
      [text('当前注册账号总数','Current registered accounts'),count(totals.current_accounts)],
      [text('期间首次投稿','First submissions in range'),count(totals.submissions)]
    ];
    const table=(headers,rows)=>`<div class="metrics-table"><table><thead><tr>${headers.map(value=>`<th scope="col">${escape(value)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map(value=>`<td>${escape(value)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">${text('暂无记录','No records')}</td></tr>`}</tbody></table></div>`;
    const pages={browse:text('课程浏览','Browse'),course:text('课程详情','Course details'),guide:text('选课指南','Guide'),profile:text('编辑名片','Edit profile'),person:text('公开名片','Public profile'),share:text('投稿表单','Contribution form'),mine:text('我的投稿','My contributions')};
    document.querySelector('#metrics-report').innerHTML=`<dl class="metrics-grid">${metrics.map(([label,value])=>`<div class="metric"><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl><div class="notice">${text('访问统计开始于','Page tracking started at')} ${escape(new Date(report.tracking_started_at).toLocaleString(zh()?'zh-CN':'en',{timeZone:'Asia/Tokyo'}))} JST${report.includes_test?` · ${text('当前包含测试流量','Test traffic included')}`:''}</div><h2>${text('每日数据','Daily activity')}</h2>${table([text('日期 · JST','Date · JST'),text('浏览','Views'),text('访客','Visitors'),text('有效阅读','Active reading'),text('新增账号','New accounts'),text('首次投稿','First submissions')],report.daily.map(row=>[row.day,count(row.page_views),count(row.visitors),time(row.active_ms),count(row.registrations),count(row.submissions)]))}<h2>${text('页面类型','Page types')}</h2>${table([text('页面','Page'),text('浏览','Views'),text('有效阅读','Active reading')],report.pages.map(row=>[pages[row.page]||row.page,count(row.page_views),time(row.active_ms)]))}<h2>${text('课程详情访问 · 前十','Course detail views · Top 10')}</h2>${table([text('课程','Course'),text('浏览','Views'),text('有效阅读','Active reading')],report.top_courses.map(row=>[row.title,count(row.page_views),time(row.active_ms)]))}<div class="metrics-notes"><p>${text('浏览量按页面／课程路由进入去重，切换语言和同页重绘不增加。访客与会话依赖浏览器随机标识；跨设备、隐身、清理存储与拦截会影响估算，不能当作精确人数。','Views count page/course entries; language changes and re-renders do not add views. Random browser identifiers estimate visitors and sessions; devices, private browsing, cleared storage, and blocking affect counts.')}</p><p>${text('有效阅读仅累计页面前台且有焦点的时间，连续60秒无操作后暂停；离开上报和断网重试为尽力发送，可能有缺失。默认排除测试、管理员报表，以及选择关闭统计或启用浏览器DNT／GPC的访问。','Active reading counts visible, focused time and pauses after 60 seconds without activity. Exit delivery and offline recovery are best effort. Test traffic, this dashboard, opt-outs, DNT, and GPC are excluded by default.')}</p><p>${text('新增账号来自服务器创建记录；现有账号保留真实创建日期。首次投稿仅从本次上线后开始记录，不包含44条历史导入或同一评价的再次编辑。没有收集上线前浏览历史，也没有把新增账号／访客相除当成注册转化率。','New accounts use server creation records, preserving existing account dates. First submissions start with this release and exclude the 44 legacy imports and later edits. Earlier page history is unavailable. Account-to-visitor ratios are not presented as registration conversion.')}</p></div>`;
  }
  async function load(){
    const ticket=++generation;
    if(!authorized)return;
    const status=document.querySelector('#metrics-status'),button=document.querySelector('#metrics-filters button');
    status.textContent=text('正在读取…','Loading…');button.disabled=true;
    try{
      const {data,error}=await auth.client.rpc('site_metrics_report',{p_start:start,p_end:end,p_include_test:includeTest});
      if(ticket!==generation)return;
      if(error)throw error;
      render(data);status.textContent=text('已更新 · JST','Updated · JST');
    }catch(error){if(ticket===generation){document.querySelector('#metrics-report').innerHTML='';status.textContent=text('读取失败，请检查日期范围（最多366天）与管理员登录状态后重试。','Could not load. Check the date range (up to 366 days), administrator access, and retry.');}}
    finally{if(ticket===generation)button.disabled=false;}
  }
  async function show(next){
    const ticket=++generation;session=next||null;authorized=false;heading();
    if(!session){gate(text('登录管理员账号后查看。','Sign in with the administrator account.'));return;}
    gate(text('正在验证管理员权限…','Checking administrator access…'));
    try{const {data,error}=await auth.client.rpc('site_metrics_admin_status');if(ticket!==generation)return;if(error||data!==true){gate(text('此账号没有查看网站统计的权限。','This account does not have access to site analytics.'));return;}authorized=true;shell();void load();}
    catch{if(ticket===generation)gate(text('权限验证暂时不可用，请稍后刷新。','Access verification is unavailable. Please reload later.'));}
  }
  main.addEventListener('submit',event=>{if(event.target.id!=='metrics-filters')return;event.preventDefault();const values=new FormData(event.target);start=String(values.get('start'));end=String(values.get('end'));includeTest=values.has('include_test');void load();});
  document.addEventListener('click',event=>{if(event.target.closest('[data-signin]'))auth.signInWithGoogle('analytics').catch(()=>gate(text('登录未完成，请重试。','Sign-in did not complete. Try again.')));if(event.target.closest('[data-signout]'))auth.signOut().catch(()=>{});});
  document.querySelector('#language-toggle').addEventListener('click',()=>{language=zh()?'en':'zh';localStorage.setItem('odyssey-community-language',language);heading();if(authorized){shell();void load();}else void show(session);});
  if(!auth){gate(text('登录服务不可用，请刷新。','Authentication is unavailable. Reload to retry.'));return;}
  auth.ready.then(show);window.addEventListener('sils:auth',event=>{if(event.detail.session?.user.id!==session?.user.id)void show(event.detail.session);});
})();
