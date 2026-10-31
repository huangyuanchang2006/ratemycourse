/* RateMyCourse public landing. Real authentication is supplied by auth-client.js. */
(() => {
'use strict';
window.SILS_LANDING?.destroy?.();
const app=document.querySelector('#app'),modal=document.querySelector('#modal');
if(!app||!modal)return;
const $=(s,r=document)=>r.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const controller=new AbortController(),listen=(el,type,fn)=>el.addEventListener(type,fn,{signal:controller.signal});
let lang='en';try{lang=localStorage.getItem('odyssey-community-language')==='zh'?'zh':'en'}catch{}
const zh=()=>lang==='zh',t=(en,cn)=>zh()?cn:en;
let returnFocus=null,wallCleanup=()=>{},animCleanup=()=>{},wallAction=null,target='./#/browse',signingIn=false,destroyed=false;
const wallProfileIds={Chambers:'f6669b7c-2104-4dcb-ba10-decd41fc130f',Cindy:'d56cca0a-787e-413d-8b96-9a513beaf322',Richard:'dcd6262c-bbd0-442d-b639-9b39ad564cf7'};
let allowedWallIds=new Set(),wallPending=false;
const allowedPeople=()=>people.filter(person=>allowedWallIds.has(wallProfileIds[person.name]));
const previews = {
  "en": [
    {
      "id": "comprehensive-japanese-4d",
      "title": "Comprehensive Japanese 4",
      "provider": "CJL",
      "language": "Japanese",
      "takenBy": "Chambers",
      "excerpt": "Top-tier, but the workload is genuinely heavy and some assignments may feel pointless."
    },
    {
      "id": "comprehensive-japanese-4-cindy",
      "title": "Comprehensive Japanese 4",
      "provider": "CJL",
      "language": "Japanese",
      "takenBy": "Cindy",
      "excerpt": "Top-tier. Three in-person classes plus two days of online worksheets each week."
    },
    {
      "id": "manga-anime-japanese-5",
      "title": "Learning Japanese through Manga and Anime 5",
      "provider": "CJL",
      "language": "Japanese",
      "takenBy": "Chambers",
      "excerpt": "…students form interest-based groups and can visit real-life anime locations, draw manga, make a doujin magazine…"
    },
    {
      "id": "introductory-data-science-02",
      "title": "Introductory Data Science 02",
      "provider": "SILS",
      "language": "English",
      "takenBy": "Richard",
      "excerpt": "Average; the difficulty and workload are both low."
    }
  ],
  "zh": [
    {
      "id": "comprehensive-japanese-4d",
      "title": "Comprehensive Japanese 4",
      "provider": "CJL",
      "language": "Japanese",
      "takenBy": "Chambers",
      "excerpt": "人上人；课业量真的很大而且有些作业个人（包括身边大部分同学）感觉意义是不大的。"
    },
    {
      "id": "comprehensive-japanese-4-cindy",
      "title": "Comprehensive Japanese 4",
      "provider": "CJL",
      "language": "Japanese",
      "takenBy": "Cindy",
      "excerpt": "人上人。每周3次线下课+2天的线上work sheet, 作业量偏多，每周一次语法+词汇quiz算入总成绩，一学期两次发表+期中期末考试。"
    },
    {
      "id": "manga-anime-japanese-5",
      "title": "漫画・アニメから学ぶ日本語学習法5",
      "provider": "CJL",
      "language": "Japanese",
      "takenBy": "Chambers",
      "excerpt": "人上人；很神奇的课但是一点都不轻松，老师完全不讲课而是让你们根据兴趣分组，去圣地巡礼，去画漫画，做同人杂志，做（同人）虚拟角色音乐MV都可以。"
    },
    {
      "id": "introductory-data-science-02",
      "title": "Introductory Data Science 02",
      "provider": "SILS",
      "language": "English",
      "takenBy": "Richard",
      "excerpt": "NPC，低难度低任务量，划水一学期临时抱佛脚也能接近满分，但务必避雷SHINO, Junnosuke 篠　潤之介，日本口音集大成者…"
    }
  ]
};

const people=[{name:'Chambers',term:'SILS 26Spring',image:'chambers-portrait-web.jpg',focus:'Business, Economics, group work, and course-planning tools',focusZh:'商业、经济课程，小组合作与选课工具'},{name:'Richard',term:'SILS 25Fall',image:'richard-portrait-web.jpg',focus:'Humanities, history, and interdisciplinary courses',focusZh:'人文历史方向，跨学科课程体验'},{name:'Cindy',term:'SILS 26Spring',image:'cindy-portrait-web.png',focus:'Business, International Relations, people skills, and adapting to new environments',focusZh:'商科、国际关系课程；人际交往、环境适应能力'}];
const courseTargets={'comprehensive-japanese-4d':'ee944749-66f8-46b2-9602-2ef33c2ca42a','comprehensive-japanese-4-cindy':'12cf7746-042e-46a1-995b-a3e8346e62fa','manga-anime-japanese-5':'125a09c8-27a5-4fd0-95eb-14e656b3ca4b','introductory-data-science-02':'dda6db05-5c0f-4fa1-8013-6c3bf80294a5'};
function course(id){return previews[lang].find(c=>c.id===id)}
function previewExcerpt(c){return c.excerpt}
function header(){return `<header class="site-header"><a class="brand" href="./">RateMyCourse<small>${t('A student community, through courses.','从课程出发的学生社区。')}</small></a><nav class="site-nav" aria-label="${t('Main navigation','主导航')}"><button class="desktop-nav" data-gate="workspace">${t('Course library','课程库')}</button><a class="desktop-nav optional" href="#community">${t('Our community','我们的社区')}</a><a class="desktop-nav optional" href="guide.html">${t('Course guide','选课指南')}</a><button class="lang" data-action="language" aria-label="${t('Switch to Chinese','切换到英文')}">${t('中文','EN')}</button><button class="signin" data-action="signin">${window.SILS_AUTH?.session?t('My profile ↗','个人名片 ↗'):t('Sign in ↗','登录 ↗')}</button></nav></header>`}
function wall(){const displayPeople=allowedPeople();if(!displayPeople.length)return `<section class="community" id="community" hidden style="display:none"></section>`;return `<section class="community" id="community"><div class="section-head"><div><h2>${t('Meet the people behind the perspectives.','看见体验背后的人。')}</h2><p>${t('Different backgrounds. Different paths through university.','不同的背景，不同的大学旅程。')}</p></div><div class="wall-controls" ${displayPeople.length<2?'hidden style="display:none"':''}><button class="wall-toggle" data-action="wall-pause" aria-pressed="false">${t('Pause motion','暂停滚动')}</button><button class="icon-button" data-action="wall-prev" aria-label="${t('Previous contributors','上一组名片')}">←</button><button class="icon-button" data-action="wall-next" aria-label="${t('Next contributors','下一组名片')}">→</button></div></div><div class="people-viewport" tabindex="0" role="region" aria-label="${t('Contributors; scroll horizontally','贡献者名片，可横向滚动')}"><div class="people-track">${displayPeople.map(p=>`<article class="person-card"><img class="person-photo" src="landing/assets/${p.image}" width="132" height="215" alt="${esc(p.name)}" loading="lazy"><div class="person-copy"><h3>${p.name}</h3><p class="term">${p.term}</p><p class="focus-copy">${zh()?p.focusZh:p.focus}</p><button data-person="${p.name}">${t('Read their experiences','阅读修课经历')} ↗</button></div></article>`).join('')}</div></div></section>`}
function footer(){return `<footer class="site-footer"><div class="footer-top"><p>${t('A university journey.<br>A community along the way.','一段大学旅程。<br>一路同行的社区。')}</p><nav class="footer-links" aria-label="${t('Footer navigation','页脚导航')}"><a href="./">${t('Home','首页')}</a><button data-gate="workspace">${t('Courses','课程库')}</button><a href="#community">${t('Community','社区')}</a><a href="guide.html">${t('Course guide','选课指南')}</a></nav></div><div class="footer-wordmark">RateMyCourse</div><div class="footer-bottom"><span>© 2026 RateMyCourse · WaseCrew</span><span>${t('Built around student perspectives.','从学生的真实视角出发。')}</span></div></footer>`}
function landing(){const chosen=['comprehensive-japanese-4d','comprehensive-japanese-4-cindy','manga-anime-japanese-5','introductory-data-science-02'].map(course);return `${header()}<main id="main"><section class="hero"><div class="ship-background" aria-hidden="true"></div><div class="hero-content"><p class="journey">A university journey. A community along the way.</p><h1><span class="setup">Chart your</span><span class="focus">own <span class="course-word">course</span>.</span></h1><p class="copy">${t('Find the courses that fit you through real student experiences. Learn from those who have been there, and find your own way forward.','从真实的修课经历里，找到适合自己的课程。听听走过这段路的人怎么说，再决定自己的方向。')}</p><div class="actions"><a class="button" href="#preview">${t('Explore courses','探索课程')} <span class="arrow">↘</span></a><a class="text-link" href="#community">${t('Meet the community','认识社区里的同学')} ↗</a></div></div><img class="waves" src="landing/assets/sea-blue.svg" alt=""></section>${wall()}<section class="feature copy-first" id="features"><div class="feature-copy"><h2>${t('A syllabus tells you what.<br>Students tell you how it feels.','大纲告诉你学什么。<br>同学告诉你亲身感受。')}</h2><p>${t('Search by course, interest, or lecturer. Read about the projects, workload, and classroom moments that matter to your decision.','按课程、兴趣或老师检索。从作业、小组项目和课堂经历中，找到影响你选课的具体细节。')}</p><button class="text-link" data-gate="workspace">${t('Find a course','寻找课程')} ↗</button></div><div class="feature-sample search-sample"><div class="sample-search"><span>${t('Japanese · Creative projects','日语 · 创意项目')}</span><span>↵</span></div><div class="sample-result"><h3>${esc(course('manga-anime-japanese-5').title)}</h3><p>CJL · ${t('Japanese · Group project','日语 · 小组项目')}</p></div><div class="sample-result"><h3>${esc(course('comprehensive-japanese-4d').title)}</h3><p>CJL · ${t('Japanese · Presentations','日语 · 发表')}</p></div></div></section><section class="feature reverse"><div class="feature-copy"><h2>${t('There is a person<br>behind every perspective.','每一种看法背后，<br>都有一个具体的人。')}</h2><p>${t('A course can mean different things to different people. Get to know the students sharing their experiences, then decide what resonates with you.','同一门课，对不同的人有不同意义。认识分享经历的同学，理解他们的背景，再判断哪些经验适合自己。')}</p><a class="text-link" href="#community">${t('Meet the contributors','认识贡献者')} ↗</a></div><div class="feature-sample voice-layout"><img src="landing/assets/cindy-portrait-web.png" width="135" height="175" alt="Cindy" loading="lazy"><blockquote>${t('“Three in-person classes plus two days of online worksheets each week.”','“每周3次线下课+2天的线上work sheet, 作业量偏多”')}<cite>Cindy · Comprehensive Japanese 4</cite></blockquote></div></section><section class="future-feature"><div class="feature-copy"><span class="planned">${t('In development','规划中')}</span><h2>${t('Your goals.<br>A more personal starting point.','从你的目标出发，<br>找到更合适的起点。')}</h2><p>${t('We are planning an AI course assistant that uses your background and preferences to suggest courses, with reasons and sources you can check.','我们计划让 AI 助手结合你的背景与偏好推荐课程，并给出可核对的理由与来源。')}</p></div><div class="future-paper"><div class="prompt">${t('“I enjoy group projects.<br>What could fit my semester?”','“我喜欢小组项目，<br>这学期可以选哪些课？”')}</div><div class="rule"></div><p>${t('Course candidates, student perspectives, and the details still worth checking.','课程候选、真实修课视角，以及仍需核对的信息。')}</p></div></section><section class="preview" id="preview"><div class="section-head"><h2>${t('One course.<br>More than one point of view.','一门课，<br>不止一种感受。')}</h2><p>${t('Start with four excerpts from the community. Read the full experiences when you sign in.','先读四段真实的修课经历。登录后，继续了解完整体验。')}</p></div><div class="preview-grid">${chosen.map(c=>`<article class="preview-card"><div class="preview-meta"><span>${esc(c.provider)}</span><span>${esc(c.language)}</span></div><h3>${esc(c.title)}</h3><blockquote>“${esc(previewExcerpt(c))}”</blockquote><p class="author">${esc(c.takenBy)}</p><button class="text-link" data-course-gate="${c.id}">${t('Read full review','查看完整评价')} ↗</button></article>`).join('')}</div><div class="preview-unlock"><div><strong>${t('Find the experience that speaks to you.','找到与你相关的修课经历。')}</strong><p>${t('Log in to unlock full reviews. Reading is free.','登录后解锁完整评价，免费阅读。')}</p></div><button class="button" data-gate="workspace">${t('Read full reviews','查看完整评价')} <span class="arrow">↗</span></button></div></section></main>${footer()}`}
function showDialog(title,body,foot='',type=''){returnFocus=document.activeElement;modal.className='dialog '+type;modal.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="dialog-close" data-action="close" aria-label="${t('Close','关闭')}">×</button></div><div class="dialog-body">${body}</div>${foot?`<div class="dialog-foot">${foot}</div>`:''}`;if(!modal.open)modal.showModal();document.body.style.overflow='hidden';requestAnimationFrame(()=>modal.querySelector('input:not([type=hidden]),textarea,.google-button,.dialog-close')?.focus())}
function close(){delete modal.dataset.wallPerson;if(modal.open)modal.close();document.body.style.overflow='';returnFocus?.isConnected&&returnFocus.focus()}

function person(name){const p=allowedPeople().find(x=>x.name===name);if(!p)return;modal.dataset.wallPerson=p.name;showDialog(t('Meet the contributor','认识贡献者'),`<img class="person-dialog-image" src="landing/assets/${p.image}" alt="${p.name}"><h3 class="person-modal-name">${p.name}</h3><p class="muted">${p.term}</p><p>${zh()?p.focusZh:p.focus}</p>`,`<button class="button" data-author-gate="${p.name}">${t('Read their course experiences','阅读 TA 的修课经历')} ↗</button>`)}
function initWall(){
  const viewport=$('.people-viewport');if(!viewport)return;
  const track=$('.people-track',viewport),originals=[...track.children],toggle=$('[data-action="wall-pause"]');
  if(originals.length<2){wallAction=null;viewport.removeAttribute('tabindex');wallCleanup=()=>{wallAction=null};return}
  const reduced=matchMedia('(prefers-reduced-motion:reduce)'),mobile=matchMedia('(max-width:700px)');
  let paused=false,hover=false,focus=false,visible=false,raf=0,last=0,position=0,span=0,origin=0,manualTween=null,destroyed=false;
  const landing=!!$('.hero');
  function cloneGroup(){return originals.map(card=>{const clone=card.cloneNode(true);clone.dataset.wallClone='';clone.setAttribute('aria-hidden','true');clone.querySelectorAll('a,button,input,select,textarea,[tabindex]').forEach(el=>el.tabIndex=-1);return clone})}
  // Repeated visual groups frame the three original, keyboard-accessible cards.
  // Pointer actions keep the original author mapping; clones never enter Tab order.
  if(landing){track.prepend(...cloneGroup(),...cloneGroup());track.append(...cloneGroup(),...cloneGroup())}
  function setup(){manualTween?.kill();const loop=landing&&!mobile.matches;track.querySelectorAll('[data-wall-clone]').forEach(el=>el.hidden=!loop);span=loop?originals[1].offsetLeft-originals[0].offsetLeft:0;span*=originals.length;origin=loop?originals[0].offsetLeft-track.offsetLeft:0;position=origin;viewport.scrollLeft=position;last=0;const off=reduced.matches||mobile.matches;toggle.disabled=off;toggle.textContent=off?t('Motion off','已关闭自动滚动'):(paused?t('Resume motion','继续滚动'):t('Pause motion','暂停滚动'));toggle.setAttribute('aria-pressed',String(paused));}
  function normalise(){if(!span||focus)return;const lower=origin-span,upper=origin+span;if(position<lower||position>=upper){position=origin+((position-origin)%span+span)%span;viewport.scrollLeft=position}}
  function running(){return !destroyed&&!paused&&!hover&&!focus&&visible&&!document.hidden&&!modal.open&&!reduced.matches&&!mobile.matches&&viewport.scrollWidth>viewport.clientWidth}
  function tick(time){raf=0;const dt=Math.min(time-(last||time),45);last=time;if(running()){position+=dt*.036;normalise();viewport.scrollLeft=position}raf=requestAnimationFrame(tick)}
  function start(){if(!raf&&!destroyed){last=0;raf=requestAnimationFrame(tick)}}
  viewport.addEventListener('mouseenter',()=>{hover=true;manualTween?.kill();position=viewport.scrollLeft});viewport.addEventListener('mouseleave',()=>{hover=false;position=viewport.scrollLeft;last=0});viewport.addEventListener('focusin',()=>{focus=true;manualTween?.kill();position=viewport.scrollLeft});viewport.addEventListener('focusout',e=>{focus=viewport.contains(e.relatedTarget);position=viewport.scrollLeft;normalise();last=0});
  track.addEventListener('pointerdown',e=>{if(e.target.closest('[data-wall-clone]'))e.preventDefault()});
  viewport.addEventListener('pointerdown',()=>{manualTween?.kill();position=viewport.scrollLeft});viewport.addEventListener('wheel',()=>{manualTween?.kill();position=viewport.scrollLeft},{passive:true});
  viewport.addEventListener('scroll',()=>{if(!running()&&!manualTween){position=viewport.scrollLeft;normalise()}},{passive:true});
  wallAction=a=>{if(a==='wall-pause'){paused=!paused;toggle.textContent=paused?t('Resume motion','继续滚动'):t('Pause motion','暂停滚动');toggle.setAttribute('aria-pressed',String(paused));position=viewport.scrollLeft;last=0;return}paused=true;toggle.setAttribute('aria-pressed','true');if(!toggle.disabled)toggle.textContent=t('Resume motion','继续滚动');manualTween?.kill();position=viewport.scrollLeft;let target;if(span){const distance=originals[1].offsetLeft-originals[0].offsetLeft;target=position+(a==='wall-next'?1:-1)*distance}else{const max=Math.max(0,viewport.scrollWidth-viewport.clientWidth);const stops=[...new Set(originals.map(card=>Math.max(0,Math.min(max,card.offsetLeft-track.offsetLeft))))];target=a==='wall-next'?(stops.find(x=>x>position+1)??max):([...stops].reverse().find(x=>x<position-1)??0)}if(window.gsap&&!reduced.matches){const value={x:position};manualTween=gsap.to(value,{x:target,duration:.42,ease:'power2.out',onUpdate(){position=value.x;normalise();viewport.scrollLeft=position},onComplete(){manualTween=null;position=viewport.scrollLeft;normalise()}})}else{position=target;normalise();viewport.scrollLeft=position}};
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=0},{threshold:.05});observer.observe(viewport);reduced.addEventListener('change',setup);mobile.addEventListener('change',setup);window.addEventListener('resize',setup);setup();start();
  wallCleanup=()=>{destroyed=true;cancelAnimationFrame(raf);manualTween?.kill();observer.disconnect();reduced.removeEventListener('change',setup);mobile.removeEventListener('change',setup);window.removeEventListener('resize',setup);wallAction=null};
}
function initMotion(){
  if(!$('.hero'))return;
  app.classList.add('landing-app');
  const decor=(host,cls,src)=>{if(!host)return;const el=document.createElement(src?'img':'div');el.className=cls;el.setAttribute('aria-hidden','true');if(src){el.src=src;el.alt=''}host.prepend(el);return el};
  decor($('.hero'),'wave-depth','landing/assets/sea-blue.svg');
  decor($('#features'),'shallows-lines','landing/assets/sea-blue.svg');
  decor($('.feature.reverse'),'tide-surface');
  decor($('.feature.reverse'),'tide-lines','landing/assets/sea-blue.svg');
  decor($('.future-feature'),'deep-lines','landing/assets/sea-blue.svg');
  decor($('.preview'),'paper-shore');
  decor($('.site-footer'),'footer-tide','landing/assets/sea-blue.svg');
  if(!window.gsap||!window.ScrollTrigger)return;
  gsap.registerPlugin(ScrollTrigger);const mm=gsap.matchMedia();
  mm.add({full:'(min-width:701px)',small:'(max-width:700px)',reduce:'(prefers-reduced-motion:reduce)'},context=>{
    const {small,reduce}=context.conditions;if(reduce)return;
    const factor=small?.42:1;
    // Copy stays in the document flow. Only scenery travels at different depths.
    const hero=gsap.timeline({scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
    hero.to('.ship-background',{x:-95*factor,y:175*factor,scale:small?1.1:1.28,opacity:.14,ease:'none'},0)
      .to('.wave-depth',{x:-270*factor,y:-110*factor,scale:1.08,ease:'none'},0)
      .to('.waves',{x:235*factor,y:-210*factor,scale:1.16,opacity:.4,ease:'none'},0);
    gsap.fromTo('#features',{backgroundColor:'#ede7dc'},{backgroundColor:'#dcd6c5',ease:'none',scrollTrigger:{trigger:'#features',start:'top 90%',end:'bottom 20%',scrub:true}});
    gsap.fromTo('.shallows-lines',{x:210*factor,y:90*factor},{x:-160*factor,y:-100*factor,ease:'none',scrollTrigger:{trigger:'#features',start:'top bottom',end:'bottom top',scrub:true}});
    gsap.fromTo('.tide-surface',{xPercent:20,yPercent:45,rotate:-8},{xPercent:-14,yPercent:-30,rotate:7,ease:'none',scrollTrigger:{trigger:'.feature.reverse',start:'top bottom',end:'bottom top',scrub:true}});
    gsap.fromTo('.tide-lines',{x:130*factor,y:135*factor},{x:-210*factor,y:-150*factor,ease:'none',scrollTrigger:{trigger:'.feature.reverse',start:'top bottom',end:'bottom top',scrub:true}});
    gsap.fromTo('.future-feature',{backgroundColor:'#38212b'},{backgroundColor:'#191b1d',ease:'none',scrollTrigger:{trigger:'.future-feature',start:'top 85%',end:'bottom 20%',scrub:true}});
    gsap.fromTo('.deep-lines',{x:-140*factor,y:100*factor},{x:180*factor,y:-180*factor,ease:'none',scrollTrigger:{trigger:'.future-feature',start:'top bottom',end:'bottom top',scrub:true}});
    gsap.fromTo('.paper-shore',{scaleX:1.35,y:65*factor},{scaleX:1,y:-14*factor,ease:'none',scrollTrigger:{trigger:'.preview',start:'top bottom',end:'top 15%',scrub:true}});
    gsap.fromTo('.footer-tide',{x:110*factor,y:90*factor},{x:-200*factor,y:-100*factor,ease:'none',scrollTrigger:{trigger:'.site-footer',start:'top bottom',end:'bottom bottom',scrub:true}});
  });animCleanup=()=>{mm.revert();app.classList.remove('landing-app')};
}
function render(){wallCleanup();animCleanup();app.classList.add('landing-app');document.documentElement.lang=zh()?'zh-CN':'en';app.innerHTML=landing();initWall();initMotion()}
function auth(){showDialog('RateMyCourse',`<div class="auth-layout"><div class="auth-story"><h2>${t('A community<br>along the way.','一路同行的社区。')}</h2><p>${t('Read real course experiences. Get to know the people who shared them.','阅读真实修课经历，认识分享经历的人。')}</p></div><div class="auth-form"><h3>${t('Welcome to the community.','欢迎加入社区。')}</h3><p class="muted">${t('Sign in with Google to continue to the course community.','使用 Google 登录，继续进入课程社区。')}</p><button class="button outline google-button" data-action="google"><span class="google-letter" aria-hidden="true">G</span>${t('Continue with Google','使用 Google 继续')}</button><p class="form-error" id="auth-error" role="alert"></p><p class="auth-note">${t('Your profile and each review have their own visibility settings.','个人资料与每条评价均可分别选择公开方式。')}</p></div></div>`,'','auth-full')}
function navigate(destination){close();location.assign(destination)}
let authPromise=null;
function resolveAuth(){
  if(window.SILS_AUTH)return Promise.resolve(window.SILS_AUTH);
  if(authPromise)return authPromise;
  authPromise=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>finish(window.SILS_AUTH),15000);
    function finish(client){clearTimeout(timer);window.removeEventListener('sils:auth-ready',ready);window.removeEventListener('sils:auth-unavailable',unavailable);client?resolve(client):reject(new Error(t('Sign-in is unavailable. Please reload and try again.','登录暂不可用，请刷新后重试。')))}
    function ready(){finish(window.SILS_AUTH)}
    function unavailable(){finish(null)}
    window.addEventListener('sils:auth-ready',ready,{once:true});window.addEventListener('sils:auth-unavailable',unavailable,{once:true});
  }).finally(()=>authPromise=null);
  return authPromise;
}
function applyWallVisibility(ids){
  const changed=[...allowedWallIds].sort().join(',')!==[...ids].sort().join(',');
  allowedWallIds=ids;
  if(modal.dataset.wallPerson&&!allowedPeople().some(p=>p.name===modal.dataset.wallPerson))close();
  if(!changed)return;
  wallCleanup();
  const host=$('#community');if(host){host.outerHTML=wall();initWall();window.ScrollTrigger?.refresh()}
}
async function refreshWall(){
  if(destroyed||wallPending||document.visibilityState!=='visible')return;
  wallPending=true;let timeout;
  try{
    const authClient=await resolveAuth();await authClient.ready;
    if(destroyed)return;
    if(!authClient.client?.rpc)throw new Error('Wall unavailable');
    const result=await Promise.race([authClient.client.rpc('get_contributor_wall'),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Wall unavailable')),12000)})]);
    if(result.error||!Array.isArray(result.data?.people))throw new Error('Wall unavailable');
    const visibleIds=new Set(result.data.people.map(p=>p.id));
    if(!destroyed)applyWallVisibility(new Set(Object.values(wallProfileIds).filter(id=>visibleIds.has(id))));
  }catch(_){if(!destroyed)applyWallVisibility(new Set())}
  finally{clearTimeout(timeout);wallPending=false}
}
async function gate(destination='./#/browse'){
  target=destination;
  const hadSession=!!window.SILS_AUTH?.session;
  if(!hadSession)auth();
  try{
    const authClient=await resolveAuth();await authClient.ready;
    if(destroyed)return;
    if(!hadSession&&!modal.open)return;
    if(authClient.session){navigate(target);return}
  }catch(problem){if($('#auth-error'))$('#auth-error').textContent=problem.message}
}
async function google(){
  if(signingIn)return;
  const button=$('[data-action="google"]'),error=$('#auth-error');
  signingIn=true;button.disabled=true;button.setAttribute('aria-busy','true');error.textContent='';
  try{
    const client=await resolveAuth();await client.ready;
    if(!client?.signInWithGoogle)throw new Error(t('Sign-in is unavailable. Please reload and try again.','登录暂不可用，请刷新后重试。'));
    // auth-client.js preserves community# routes through the existing OAuth callback.
    await client.signInWithGoogle('community'+new URL(target,location.href).hash);
  }catch(problem){
    if(error.isConnected)error.textContent=problem?.message||t('Could not start Google sign-in. Try again.','未能启动 Google 登录，请重试。');
  }finally{signingIn=false;if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy')}}
}
listen(document,'click',event=>{
  const el=event.target.closest('[data-action],[data-gate],[data-course-gate],[data-person],[data-author-gate]');
  if(!el||(!app.contains(el)&&!modal.contains(el)))return;
  event.preventDefault();
  if(el.dataset.person){person(el.dataset.person);return}
  if(el.dataset.courseGate){const id=courseTargets[el.dataset.courseGate];void gate(id?'./#/course/'+id:'./#/browse');return}
  if(el.dataset.gate||el.dataset.authorGate){void gate();return}
  const action=el.dataset.action;
  if(action==='close')close();
  if(action==='signin')void gate(window.SILS_AUTH?.session?'./#/profile':'./#/browse');
  if(action==='google')void google();
  if(action==='language'){lang=zh()?'en':'zh';try{localStorage.setItem('odyssey-community-language',lang)}catch{}render()}
  if(action.startsWith('wall-'))wallAction?.(action);
});
listen(modal,'cancel',()=>document.body.style.overflow='');
listen(modal,'close',()=>document.body.style.overflow='');
listen(window,'sils:auth',()=>{const button=$('.site-nav .signin');if(button)button.textContent=window.SILS_AUTH?.session?t('My profile ↗','个人名片 ↗'):t('Sign in ↗','登录 ↗')});
const wallInterval=setInterval(()=>{if(document.visibilityState==='visible')void refreshWall()},60000);
listen(window,'focus',()=>void refreshWall());
listen(document,'visibilitychange',()=>{if(document.visibilityState==='visible')void refreshWall()});
window.SILS_LANDING={destroy(){destroyed=true;clearInterval(wallInterval);controller.abort();wallCleanup();animCleanup();if(modal.open)modal.close();document.body.style.overflow='';app.classList.remove('landing-app')}};
render();
void refreshWall();
})();
