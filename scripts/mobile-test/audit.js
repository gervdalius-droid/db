(function(){
  const VW = window.innerWidth, out = {view: DB.currentView, vw: VW};
  const de = document.documentElement;
  out.hOverflow = {docScrollW: de.scrollWidth, bodyScrollW: document.body.scrollWidth, innerW: VW};
  const ca = document.querySelector('.content-area');
  if(ca) out.contentArea = {scrollW: ca.scrollWidth, clientW: ca.clientWidth, scrollH: ca.scrollHeight, clientH: ca.clientHeight};

  // helper: is el inside a horizontally scrollable ancestor?
  function inScroller(el){
    for(let p=el.parentElement; p && p!==document.body; p=p.parentElement){
      const ox=getComputedStyle(p).overflowX;
      if(ox==='auto'||ox==='scroll') return true;
    }
    return false;
  }
  const active=document.querySelector('.view.active');
  const scope=active||document.body;
  // 1. elements sticking out past the right edge
  const bleed=[];
  scope.querySelectorAll('*').forEach(el=>{
    if(!el.offsetParent && getComputedStyle(el).position!=='fixed') return;
    const r=el.getBoundingClientRect();
    if(r.width===0||r.height===0) return;
    if(r.right>VW+1 && !inScroller(el)){
      bleed.push({tag:el.tagName.toLowerCase(),cls:(el.className&&el.className.slice?el.className.slice(0,40):''),id:el.id,
        right:Math.round(r.right),w:Math.round(r.width),txt:(el.textContent||'').trim().slice(0,40)});
    }
  });
  // keep only outermost offenders
  out.bleed=bleed.filter((b,i)=>bleed.findIndex(o=>o.txt&&b.txt&&o.txt!==b.txt&&b.txt.startsWith(o.txt))===-1).slice(0,14);

  // 2. small tap targets
  const taps=[];
  scope.querySelectorAll('button,.btn,.nav-item,[onclick],a,select,input[type=checkbox]').forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.width===0||r.height===0) return;
    if(el.querySelector('button,.btn,[onclick]')) return; // container, not the target
    if(r.height<36||r.width<32) taps.push({tag:el.tagName.toLowerCase(),cls:(el.className&&el.className.slice?el.className.slice(0,30):''),
      h:Math.round(r.height),w:Math.round(r.width),txt:(el.textContent||'').trim().slice(0,28)});
  });
  out.smallTaps={count:taps.length,sample:taps.slice(0,12)};

  // 3. tiny fonts
  const tiny={};
  scope.querySelectorAll('*').forEach(el=>{
    if(!el.offsetParent) return;
    if(!el.textContent || !el.textContent.trim()) return;
    if(el.children.length) return;
    const fs=parseFloat(getComputedStyle(el).fontSize);
    if(fs<11) tiny[fs]=(tiny[fs]||0)+1;
  });
  out.tinyFonts=tiny;

  // 4. fixed bottom nav geometry
  const mn=document.getElementById('mobile-nav');
  if(mn){const r=mn.getBoundingClientRect();out.mobileNav={display:getComputedStyle(mn).display,top:Math.round(r.top),h:Math.round(r.height),bottom:Math.round(r.bottom)};}
  const sb=document.querySelector('.sidebar');
  if(sb) out.sidebarDisplay=getComputedStyle(sb).display;
  const si=document.getElementById('sync-indicator');
  if(si) out.syncIndicatorDisplay=getComputedStyle(si).display;
  const tb=document.querySelector('.topbar');
  if(tb) out.topbar={scrollW:tb.scrollWidth,clientW:tb.clientWidth,h:Math.round(tb.getBoundingClientRect().height)};
  return out;
})()
