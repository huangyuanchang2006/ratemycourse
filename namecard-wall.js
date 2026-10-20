/* Historical cards remain until a verified account replaces them. New cards opt in. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {root.SILS_NAMECARD_WALL=api;root.mountNamecardWall=api.mount;}
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const legacy=[
    {key:'richard',name:'Richard',term:'SILS 25Fall',image:'richard-portrait-web.jpg',zh:'人文历史方向，跨学科课程体验',en:'Humanities, history, and interdisciplinary courses',wechat:'KatsuragiZakura',instagram:'katsuragizakura'},
    {key:'chambers',name:'Chambers',term:'SILS 26Spring',image:'chambers-portrait-web.jpg',zh:'商业、经济课程，小组合作与选课工具',en:'Business, Economics, group work, and course-planning tools',wechat:'Chambers0603',instagram:'chambers_s_s',xhs:true,author:true},
    {key:'cindy',name:'Cindy',term:'SILS 26Spring',image:'cindy-portrait-web.png',zh:'商科、国际关系课程；人际交往、环境适应能力',en:'Business, International Relations, people skills, and adapting to new environments',wechat:'im_Cccccindyyyyy',instagram:'im_ccccindyyyyyyy'}
  ];
  function buildPeople(data={},language='en',assetBase='./assets/'){
    const zh=language==='zh',replaced=new Set(data.replaced_legacy_keys||[]),seen=new Set();
    const people=legacy.filter(p=>!replaced.has(p.key)).map(p=>({...p,wallKey:`legacy:${p.key}`,focus:p[language]||p.en,imageUrl:assetBase+p.image,reviewIds:data.legacy_review_ids?.[p.key]||[]}));
    for(const profile of data.people||[]){
      if(!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(profile.id||'')||!String(profile.display_name||'').trim()||seen.has(profile.id))continue;
      seen.add(profile.id);
      const previous=legacy.find(p=>p.key===profile.legacy_author_key)||{};
      const old=people.findIndex(p=>p.key===profile.legacy_author_key);if(old>=0)people.splice(old,1);
      // Cindy's approved historical presentation stays separate from her account identity.
      const display=previous.key==='cindy'?{name:previous.name,term:previous.term,focus:previous[language]||previous.en,imageUrl:assetBase+previous.image}:{name:profile.display_name,
        term:[profile.programme,profile.study_year].filter(Boolean).join(' · '),focus:profile.bio||(zh?'作者尚未填写简介。':'This contributor has not added a bio yet.'),
        imageUrl:profile.avatar_url||'',photoCrop:profile.photo_crops?.wall};
      people.push({...previous,...display,wallKey:`profile:${profile.id}`,profileId:profile.id,reviewIds:[...new Set(profile.review_ids||[])]});
    }
    return people;
  }
  function mount(host,{language='en',assetBase='./assets/',data={},onCourses=()=>{}}={}){
    const zh=language==='zh',people=buildPeople(data,language,assetBase);
    const card=p=>{
      const name=escape(p.name),initial=escape(Array.from(p.name)[0]?.toUpperCase()||'?');
      const profileUrl=p.profileId?`./#/people/${encodeURIComponent(p.profileId)}`:'';
      const photo=p.imageUrl?`<img src="${escape(p.imageUrl)}" alt="${name}" width="344" height="208" loading="lazy" ${p.photoCrop?`style="${escape(globalThis.SILS_PHOTO?.style(p.photoCrop,'wall')||'')}"`:''}>`:'';
      const contacts=[p.wechat?`<button type="button" data-wechat="${escape(p.wechat)}" aria-label="${zh?'复制':'Copy'} ${name} WeChat">${zh?'微信':'WeChat'}</button>`:'',p.instagram?`<a href="https://www.instagram.com/${encodeURIComponent(p.instagram)}/" target="_blank" rel="noreferrer">Instagram ↗</a>`:'',p.xhs?`<a href="https://www.xiaohongshu.com/search_result?keyword=Chambers%E5%9C%A8%E4%B8%9C%E4%BA%AC" target="_blank" rel="noreferrer">${zh?'小红书':'Xiaohongshu'} ↗</a>`:''].join('');
      return `<article class="namecard${p.author?' namecard--author':''}" data-wall-key="${escape(p.wallKey)}"><div class="namecard__portrait${p.photoCrop?' namecard__portrait--framed':''}">${photo}<span class="namecard__initial" ${photo?'hidden':''}>${initial}</span></div><div class="namecard__body"><p class="namecard__role">${p.author?(zh?'网站作者':'Website creator'):(zh?'课程分享者':'Course contributor')}</p><h3>${profileUrl?`<a href="${profileUrl}">${name}</a>`:name}</h3><p class="namecard__term">${escape(p.term)}</p><p class="namecard__focus">${escape(p.focus)}</p>${profileUrl?`<a class="text-link namecard__profile" href="${profileUrl}">${zh?'查看公开名片':'View profile card'} ↗</a>`:''}${contacts?`<div class="namecard__contacts">${contacts}</div>`:''}${!p.profileId||p.reviewIds.length?`<button class="namecard__action" type="button" data-wall-courses="${escape(p.wallKey)}"><span>${zh?'查看课程体验':'Explore course experiences'}${p.profileId?` · ${p.reviewIds.length}`:''}</span><span aria-hidden="true">↗</span></button>`:`<p class="small">${zh?'暂无署名公开体验':'No attributed public experiences yet'}</p>`}</div></article>`;
    };
    host.className='namecard-wall';
    host.innerHTML=`<div class="namecard-wall__head"><div><h2>${zh?'看见体验背后的人':'Meet the people behind the perspectives'}</h2><p class="namecard-wall__intro">${zh?'不同的基础、兴趣和选课目标，带来不同的课程体验。':'Different backgrounds, interests, and goals shape every course experience.'}</p></div><button class="namecard-wall__toggle" type="button" aria-pressed="false">${zh?'暂停滚动':'Pause motion'}</button></div><div class="namecard-wall__viewport" tabindex="0" role="region" aria-label="${zh?'课程分享者名片，可横向滚动':'Course contributors, scroll horizontally'}"><div class="namecard-wall__track">${people.map(card).join('')}</div></div>${people.length?'':`<p class="namecard-wall__status">${zh?'暂时没有公开展示的名片。':'No contributor cards are currently on display.'}</p>`}<p class="namecard-wall__status" aria-live="polite"></p>`;
    const viewport=host.querySelector('.namecard-wall__viewport'),track=host.querySelector('.namecard-wall__track'),toggle=host.querySelector('.namecard-wall__toggle'),status=host.querySelector('[aria-live]');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width: 640px), (pointer: coarse)');
    let paused=host.dataset.motionPaused==='true',hovered=false,focused=false,visible=false,frame=0,previous=0,span=0,position=0,destroyed=false;
    const originals=[...track.children];
    const clones=originals.length>1?[...originals,...originals].map(el=>{const clone=el.cloneNode(true);clone.dataset.wallClone='';clone.setAttribute('aria-hidden','true');clone.querySelectorAll('a,button').forEach(a=>a.tabIndex=-1);track.append(clone);return clone;}):[];
    function setup(){const manual=mobile.matches||reduced.matches||originals.length<2;clones.forEach(c=>c.hidden=manual);span=manual?0:track.children[originals.length].offsetLeft-track.children[0].offsetLeft;toggle.hidden=manual;if(manual)viewport.scrollLeft=0;else if(!focused)viewport.scrollLeft=span;resume();}
    function active(){return !destroyed&&span>0&&!paused&&!hovered&&!focused&&visible&&!document.hidden&&!mobile.matches&&!reduced.matches;}
    function resume(){if(active()&&!frame){previous=0;position=viewport.scrollLeft;frame=requestAnimationFrame(tick);}}
    function tick(time){frame=0;if(!active())return;const dt=Math.min(time-(previous||time),50);previous=time;position-=dt*.018;if(position<=0)position+=span;viewport.scrollLeft=position;frame=requestAnimationFrame(tick);}
    function over(){hovered=true;}function out(){hovered=false;resume();}function focus(){focused=true;}function blur(event){focused=viewport.contains(event.relatedTarget);resume();}
    function updatePause(){host.dataset.motionPaused=String(paused);toggle.setAttribute('aria-pressed',String(paused));toggle.textContent=paused?(zh?'继续滚动':'Resume motion'):(zh?'暂停滚动':'Pause motion');}
    function pause(){paused=!paused;updatePause();resume();}
    async function click(event){const button=event.target.closest('[data-wechat],[data-wall-courses]');if(!button)return;if(button.dataset.wallCourses){const person=people.find(p=>p.wallKey===button.dataset.wallCourses);if(person)onCourses(person);return;}try{await navigator.clipboard.writeText(button.dataset.wechat);status.textContent=(zh?'已复制微信号：':'WeChat ID copied: ')+button.dataset.wechat;}catch{status.textContent=(zh?'请手动复制微信号：':'Copy this WeChat ID: ')+button.dataset.wechat;}}
    function imageError(event){const image=event.target;if(image.tagName==='IMG'&&image.closest('.namecard__portrait')){image.hidden=true;image.nextElementSibling.hidden=false;}}
    viewport.addEventListener('mouseenter',over);viewport.addEventListener('mouseleave',out);viewport.addEventListener('focusin',focus);viewport.addEventListener('focusout',blur);
    toggle.addEventListener('click',pause);host.addEventListener('click',click);host.addEventListener('error',imageError,true);updatePause();
    const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);resume();});observer.observe(host);
    const resize=new ResizeObserver(setup);resize.observe(viewport);reduced.addEventListener('change',setup);mobile.addEventListener('change',setup);document.addEventListener('visibilitychange',resume);setup();
    return ()=>{destroyed=true;cancelAnimationFrame(frame);host.removeEventListener('click',click);host.removeEventListener('error',imageError,true);document.removeEventListener('visibilitychange',resume);observer.disconnect();resize.disconnect();reduced.removeEventListener('change',setup);mobile.removeEventListener('change',setup);host.replaceChildren();};
  }
  return Object.freeze({buildPeople,mount});
});
