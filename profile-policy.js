(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SILS_PROFILE_POLICY=api;})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const fields=['display_name','bio','programme','study_year','avatar_path'];
  const missing=profile=>fields.filter(key=>!String(profile?.[key]||'').trim());
  const complete=profile=>missing(profile).length===0;
  const defaults=profile=>profile?{is_public:Boolean(profile.is_public),show_on_wall:Boolean(profile.is_public&&profile.show_on_wall)}:{is_public:true,show_on_wall:true};
  function destination(value,base){
    try{const root=new URL('.',base),url=new URL(value||'./#/browse',root);
      if(url.origin!==root.origin||![root.pathname,`${root.pathname}analytics.html`,`${root.pathname}guide.html`].includes(url.pathname))return new URL('./#/browse',root).href;
      if(url.pathname===root.pathname&&url.hash.startsWith('#/profile'))return new URL('./#/browse',root).href;
      return url.href;
    }catch(_){return new URL('./#/browse',base).href;}
  }
  return Object.freeze({fields,missing,complete,defaults,destination});
});
