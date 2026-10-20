/* First-party, aggregate-only measurement. No login identifiers or raw URLs. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {root.SILS_ANALYTICS_CORE=api;root.SILS_ANALYTICS=api.create(root);}
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const allowed=new Set(['browse','course','guide','profile','mine','share','person']);
  const uuid=/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;
  const idleMs=60000,sessionMs=1800000;
  function create(env){
    const doc=env.document,config=env.SILS_SUPABASE_CONFIG;
    const now=()=>env.performance.now(),wall=()=>env.Date.now();
    const read=(storage,key)=>{try{return storage.getItem(key);}catch{return null;}};
    const save=(storage,key,value)=>{try{storage.setItem(key,value);}catch{}};
    const local=()=>{try{return env.localStorage;}catch{return null;}};
    const tab=()=>{try{return env.sessionStorage;}catch{return null;}};
    const id=()=>env.crypto.randomUUID();
    const locked=env.navigator.doNotTrack==='1'||env.navigator.globalPrivacyControl===true;
    let optedOut=read(local(),'rmc-metrics-opt-out')==='1';
    const isTest=['localhost','127.0.0.1'].includes(env.location.hostname)||new URL(env.location.href).searchParams.get('analytics_test')==='1';
    let visitor=read(local(),'rmc-metrics-visitor');
    let session;
    try{session=JSON.parse(read(local(),'rmc-metrics-session')||'null');}catch{}
    let current=null,lastPage=null,lastMark=now(),lastActivity=lastMark,foreground=!doc.hidden&&doc.hasFocus(),busy=false,rerun=false;
    let pending=[];
    try{const stored=JSON.parse(read(tab(),'rmc-metrics-queue')||'[]');if(Array.isArray(stored))pending=stored.filter(item=>item&&uuid.test(item.viewId||'')&&uuid.test(item.visitorId||'')&&uuid.test(item.sessionId||'')&&allowed.has(item.page)&&item.isTest===isTest&&Number.isFinite(item.activeMs)&&item.activeMs>=0&&item.activeMs<=86400000&&wall()-item.createdAt<86400000).slice(-20);}catch{}
    function enabled(){return !locked&&!optedOut&&!!config?.url&&!!config?.publishableKey;}
    function persist(){save(tab(),'rmc-metrics-queue',JSON.stringify(pending.slice(-20)));}
    function ensureIdentity(){
      if(!uuid.test(visitor||'')){visitor=id();save(local(),'rmc-metrics-visitor',visitor);}
      try{const shared=JSON.parse(read(local(),'rmc-metrics-session')||'null');if(shared&&uuid.test(shared.id||''))session=shared;}catch{}
      if(!session||!uuid.test(session.id||'')||wall()-session.last>sessionMs)session={id:id(),last:wall()};
      session.last=wall();save(local(),'rmc-metrics-session',JSON.stringify(session));
    }
    function advance(){
      const time=now();
      if(current&&enabled()&&foreground){const end=Math.min(time,lastActivity+idleMs);current.activeMs=Math.min(86400000,current.activeMs+Math.max(0,end-lastMark));}
      lastMark=time;
    }
    function queueCurrent(){
      if(!current||!enabled())return;
      const index=pending.findIndex(item=>item.viewId===current.viewId);
      const item={...current,activeMs:Math.floor(current.activeMs)};
      if(index<0)pending.push(item);else pending[index]=item;
      pending=pending.slice(-20);persist();
    }
    async function send(item,activeMs){
      const response=await env.fetch(`${config.url}/rest/v1/rpc/record_site_activity`,{
        method:'POST',keepalive:true,headers:{apikey:config.publishableKey,'Content-Type':'application/json'},
        body:JSON.stringify({p_view_id:item.viewId,p_visitor_id:item.visitorId,p_session_id:item.sessionId,p_page:item.page,p_course_id:item.courseId,p_active_ms:activeMs,p_is_test:item.isTest,p_started_at:new Date(item.createdAt).toISOString()})
      });
      if(!response.ok)throw new Error('Measurement unavailable');
    }
    async function drain(){
      if(!enabled())return;
      if(busy){rerun=true;return;}busy=true;
      try{
        // An acknowledged zero-time start always precedes engagement, including
        // after offline recovery. Same IDs and cumulative maxima dedupe retries.
        for(const item of [...pending]){
          if(!enabled())break;
          if(!item.started){await send(item,0);item.started=true;if(current?.viewId===item.viewId)current.started=true;}
          if(!enabled())break;
          if(item.activeMs>0)await send(item,item.activeMs);
          const live=pending.find(entry=>entry.viewId===item.viewId);
          if(live&&live.activeMs<=item.activeMs)pending=pending.filter(entry=>entry.viewId!==item.viewId);
          else if(live)live.started=true;
          persist();
        }
      }catch{ /* Measurements are best effort and must not break the product. */ }
      finally{busy=false;if(rerun){rerun=false;env.setTimeout(()=>drain(),1000);}}
    }
    function flush(){advance();queueCurrent();return drain();}
    function page({page,courseId=null,viewKey=null}){
      if(!allowed.has(page)||(page==='course'&&!uuid.test(courseId||'')))return;
      lastPage={page,courseId,viewKey};
      // Person IDs are used only for local transition deduplication; never sent.
      const key=page==='course'?`course:${courseId}`:page==='person'?`person:${viewKey||''}`:page;
      if(current?.key===key)return;
      advance();queueCurrent();
      if(!enabled()){current=null;return;}
      ensureIdentity();lastMark=lastActivity=now();foreground=!doc.hidden&&doc.hasFocus();
      current={viewId:id(),visitorId:visitor,sessionId:session.id,page,courseId:page==='course'?courseId:null,key,activeMs:0,started:false,isTest,createdAt:wall()};
      queueCurrent();void drain();
    }
    function activity(){
      advance();lastActivity=now();foreground=!doc.hidden&&doc.hasFocus();
      if(enabled())ensureIdentity();
    }
    function visibility(){advance();foreground=!doc.hidden&&doc.hasFocus();if(foreground)lastActivity=now();void flush();}
    function preference(){
      const footer=doc.querySelector('footer');if(!footer)return;
      let control=footer.querySelector('[data-metrics-privacy]');
      if(!control){control=doc.createElement('button');control.type='button';control.className='quiet';control.dataset.metricsPrivacy='';footer.append(control);control.addEventListener('click',()=>setOptOut(!optedOut));}
      const zh=doc.documentElement.lang.startsWith('zh');
      control.textContent=locked?(zh?'访问统计已按浏览器设置关闭':'Analytics disabled by browser preference'):optedOut?(zh?'匿名访问统计：已关闭':'Anonymous analytics: off'):(zh?'匿名访问统计：已开启':'Anonymous analytics: on');
      control.title=zh?'统计页面浏览和前台阅读时长，不记录姓名、邮箱或评价正文。点击切换。':'Measures page views and foreground reading time without names, emails, or review text. Click to toggle.';
      control.disabled=locked;control.setAttribute('aria-pressed',String(enabled()));
    }
    function setOptOut(value){
      advance();optedOut=!!value;save(local(),'rmc-metrics-opt-out',optedOut?'1':'0');
      pending=[];persist();current=null;preference();
      if(!optedOut&&lastPage)page(lastPage);
      env.dispatchEvent(new env.CustomEvent('rmc:analytics-preference'));
    }
    doc.addEventListener('visibilitychange',visibility);env.addEventListener('focus',visibility);env.addEventListener('blur',visibility);
    for(const event of ['pointerdown','keydown','scroll','touchstart'])env.addEventListener(event,activity,{passive:true});
    env.addEventListener('pagehide',()=>{void flush();});env.addEventListener('online',()=>{void flush();});
    env.addEventListener('storage',event=>{if(event.key==='rmc-metrics-opt-out'){optedOut=event.newValue==='1';if(optedOut){current=null;pending=[];persist();}else if(lastPage)page(lastPage);preference();}});
    const timer=env.setInterval(()=>{advance();if(foreground){queueCurrent();void drain();}},15000);
    new env.MutationObserver(preference).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
    preference();if(enabled()&&pending.length)void drain();
    return Object.freeze({page,flush,setOptOut,get enabled(){return enabled();},get isTest(){return isTest;},stop(){env.clearInterval(timer);},snapshot(){advance();return current?{page:current.page,activeMs:Math.floor(current.activeMs),isTest}:null;}});
  }
  return Object.freeze({create});
});
