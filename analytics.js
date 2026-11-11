(() => {
  'use strict';
  if (window.__ytkAnalyticsLoaded) return;
  window.__ytkAnalyticsLoaded = true;
  const local = ['localhost','127.0.0.1'].includes(location.hostname);
  if (!local && location.hostname !== 'young-tak.github.io') return;
  if (!['/','/index.html'].includes(location.pathname)) return;
  const endpoint = (local ? location.origin : 'https://youngtak-site-analytics.wellchar512.chatgpt.site') + '/api/collect';
  const OPTOUT_KEY='ytk-analytics-optout', SESSION_KEY='ytk-analytics-tab-session';
  const excluded = () => {
    if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1') return true;
    try { return localStorage.getItem(OPTOUT_KEY) === '1'; } catch (_) { return false; }
  };
  if (excluded()) return;
  let sessionId;
  const makeId = () => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const hex=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  };
  try {
    sessionId=sessionStorage.getItem(SESSION_KEY);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId||'')) {sessionId=makeId();sessionStorage.setItem(SESSION_KEY,sessionId);}
  } catch (_) { try {sessionId=makeId();} catch (_) {return;} }
  let referrer='';
  try {referrer=new URL(document.referrer).hostname.toLowerCase();} catch (_) {}
  const language=typeof navigator.language==='string'?navigator.language.split('-')[0].slice(0,10):'';
  const screenWidth=innerWidth<640?375:innerWidth<1024?768:1280;
  const knownSections=new Set(['research','publications','background','patents','service','contact']);
  const recent=new Map(), started=new Set(), completed=new Set();
  function send(type,label='') {
    if (excluded()) return;
    const key=type+':'+label, now=Date.now();
    if (now-(recent.get(key)||0)<1000) return;
    recent.set(key,now);
    const data=JSON.stringify({type,label,path:'/',sessionId,referrer,language,screenWidth});
    // keepalive preserves navigation clicks without sending cookies or a Referer header.
    try {fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:data,mode:'cors',credentials:'omit',keepalive:true,referrerPolicy:'no-referrer'}).catch(()=>{});} catch (_) {}
  }
  send('pageview');
  document.addEventListener('click',event=>{
    if (!(event.target instanceof Element)) return;
    const link=event.target.closest('a');if(!link)return;
    if (link.matches('.section-nav a')) {
      const label=link.hash.slice(1);if(knownSections.has(label))send('section',label);return;
    }
    if (link.matches('.cv-link') || link.getAttribute('href')==='assets/Young_Tak_Kim_CV_2026.pdf') {send('cv_download','cv');return;}
    if (link.matches('.pub-title a')) {
      const label=link.closest('.publication')?.id;if(/^pub-\d{2}$/.test(label||''))send('publication_click',label);
    }
  },{passive:true});
  document.querySelectorAll('.publication video').forEach(video=>{
    const label=video.closest('.publication')?.id;if(!/^pub-\d{2}$/.test(label||''))return;
    video.addEventListener('play',()=>{if(!started.has(label)){started.add(label);send('video_start',label);}},{passive:true});
    video.addEventListener('ended',()=>{if(!completed.has(label)){completed.add(label);send('video_complete',label);}},{passive:true});
  });
})();
