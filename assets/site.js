const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#main-nav');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('is-open')){menu.click();menu.focus();}});
const filters=[...document.querySelectorAll('[data-filter]')],gallery=document.querySelector('[data-gallery]');
filters.forEach(button=>button.addEventListener('click',()=>{filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));let count=0;gallery.querySelectorAll('.photo-item').forEach(item=>{item.hidden=button.dataset.filter!=='all'&&item.dataset.category!==button.dataset.filter;if(!item.hidden)count++;});document.querySelector('.empty-gallery').hidden=count>0;}));
const dialog=document.querySelector('#lightbox');let current=0,links=[],opener;
const show=()=>{const a=links[current];if(!a)return;dialog.querySelector('img').src=a.href;dialog.querySelector('img').alt=a.querySelector('img').alt;dialog.querySelector('p').textContent=`${a.dataset.title} — ${current+1} / ${links.length}`;dialog.querySelectorAll('.lightbox-prev,.lightbox-next').forEach(b=>b.hidden=links.length<2);};
document.querySelectorAll('[data-lightbox]').forEach(a=>a.addEventListener('click',e=>{if(!dialog.showModal)return;e.preventDefault();opener=a;links=[...a.closest('.photo-grid').querySelectorAll('[data-lightbox]')].filter(v=>!v.closest('[hidden]'));current=links.indexOf(a);show();dialog.showModal();document.body.style.overflow='hidden';}));
const advance=n=>{current=(current+n+links.length)%links.length;show();};
dialog.querySelector('.lightbox-close').addEventListener('click',()=>dialog.close());dialog.querySelector('.lightbox-prev').addEventListener('click',()=>advance(-1));dialog.querySelector('.lightbox-next').addEventListener('click',()=>advance(1));dialog.addEventListener('close',()=>{document.body.style.overflow='';opener?.focus();});dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();advance(1);}if(e.key==='ArrowLeft'){e.preventDefault();advance(-1);}});let touchX;dialog.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX;},{passive:true});dialog.addEventListener('touchend',e=>{const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>65)advance(delta<0?1:-1);},{passive:true});
const id=document.body.dataset.analytics,consent=document.querySelector('#consent');let enabled=false;
const readChoice=()=>{try{return localStorage.getItem('zam-analytics');}catch{return 'no';}};
function enable(){if(enabled||!/^G-[A-Z0-9]+$/.test(id))return;enabled=true;window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config',id,{allow_google_signals:false,allow_ad_personalization_signals:false});const script=document.createElement('script');script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${id}`;document.head.append(script);if(['service','project'].includes(document.body.dataset.page))window.gtag('event',`${document.body.dataset.page}_view`,{page_path:location.pathname});}
if(id){if(readChoice()==='yes')enable();else if(readChoice()!=='no')consent.hidden=false;}
document.querySelectorAll('[data-consent]').forEach(b=>b.addEventListener('click',()=>{try{localStorage.setItem('zam-analytics',b.dataset.consent);}catch{}consent.hidden=true;if(b.dataset.consent==='yes')enable();}));
document.querySelector('#reset-consent')?.addEventListener('click',()=>{try{localStorage.removeItem('zam-analytics');}catch{}location.reload();});
document.querySelectorAll('[data-track]').forEach(a=>a.addEventListener('click',()=>{if(enabled)window.gtag('event',a.dataset.track,{page_path:location.pathname});}));

// Motion progressively enhances visible content; navigation and scrolling stay native.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)');
  const header = document.querySelector('.site-header');
  const candidates = [...document.querySelectorAll('.photo-item, .project-grid article, .publication-cover, .about-image, .page-heading h1, .section-heading h2')];
  let observer, frame = 0;
  const moving = [...document.querySelectorAll('.hero-photo img')];
  const active = new Set();
  const visible = element => { element.classList.remove('motion-pending'); observer?.unobserve(element); };
  function configure() {
    observer?.disconnect();
    candidates.forEach(element => element.classList.remove('motion-pending', 'motion-reveal'));
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) visible(entry.target); });
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    candidates.forEach((element, index) => {
      element.style.setProperty('--reveal-delay', `${desktop.matches ? (index % 2) * 75 : 0}ms`);
      // Never conceal content already on screen, including restored scroll positions.
      if (element.getBoundingClientRect().top >= innerHeight) {
        element.classList.add('motion-reveal', 'motion-pending');
        observer.observe(element);
      }
    });
    schedule();
  }
  function paint() {
    frame = 0;
    header?.classList.toggle('is-scrolled', scrollY > 32);
    moving.forEach(img => {
      if (reduced.matches || !desktop.matches) { img.style.removeProperty('translate'); return; }
      if (!active.has(img)) return;
      const rect = img.parentElement.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)));
      img.style.translate = `0 ${(progress - .5) * 32}px`;
    });
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(paint); }
  if ('IntersectionObserver' in window) {
    const viewport = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? active.add(entry.target) : active.delete(entry.target));
      schedule();
    });
    moving.forEach(img => viewport.observe(img));
  }
  document.addEventListener('focusin', event => {
    const element = event.target.closest('.motion-pending');
    if (element) visible(element);
  });
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    candidates.filter(element => !element.hidden).forEach(visible);
  }));
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('pageshow', configure);
  reduced.addEventListener('change', () => { configure(); schedule(); });
  desktop.addEventListener('change', () => { configure(); schedule(); });
  configure();
  schedule();
})();
