const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#main-nav');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('is-open')){menu.click();menu.focus();}});
const filters=[...document.querySelectorAll('[data-filter]')],gallery=document.querySelector('[data-gallery]');
filters.forEach(button=>button.addEventListener('click',()=>{filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));gallery.querySelectorAll('[data-category]').forEach(item=>{item.hidden=button.dataset.filter!=='all'&&item.dataset.category!==button.dataset.filter;});}));
const dialog=document.querySelector('#lightbox');let current=0,links=[],opener;
const show=()=>{const a=links[current];if(!a)return;dialog.querySelector('img').src=a.href;dialog.querySelector('img').alt=a.querySelector('img').alt;dialog.querySelector('p').textContent=`${a.dataset.title} — ${current+1} / ${links.length}`;dialog.querySelectorAll('.lightbox-prev,.lightbox-next').forEach(b=>b.hidden=links.length<2);};
document.querySelectorAll('[data-lightbox]').forEach(a=>a.addEventListener('click',e=>{if(!dialog.showModal)return;e.preventDefault();opener=a;links=[...a.closest('.photo-grid,[data-lightbox-group]').querySelectorAll('[data-lightbox]')].filter(v=>!v.closest('[hidden]'));current=links.indexOf(a);show();dialog.showModal();document.body.style.overflow='hidden';}));
const advance=n=>{current=(current+n+links.length)%links.length;show();};
dialog.querySelector('.lightbox-close').addEventListener('click',()=>dialog.close());dialog.querySelector('.lightbox-prev').addEventListener('click',()=>advance(-1));dialog.querySelector('.lightbox-next').addEventListener('click',()=>advance(1));dialog.addEventListener('close',()=>{document.body.style.overflow='';opener?.focus();});dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();advance(1);}if(e.key==='ArrowLeft'){e.preventDefault();advance(-1);}});let touchX;dialog.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX;},{passive:true});dialog.addEventListener('touchend',e=>{const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>65)advance(delta<0?1:-1);},{passive:true});
const id=document.body.dataset.analytics,consent=document.querySelector('#consent');let enabled=false;
const readChoice=()=>{try{return localStorage.getItem('zam-analytics');}catch{return 'no';}};
function enable(){if(enabled||!/^G-[A-Z0-9]+$/.test(id))return;enabled=true;window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config',id,{allow_google_signals:false,allow_ad_personalization_signals:false});const script=document.createElement('script');script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${id}`;document.head.append(script);if(document.body.dataset.page==='project')window.gtag('event','portfolio_project_view',{page_path:location.pathname});if(document.body.dataset.page==='pricing')window.gtag('event','pricing_view',{page_path:location.pathname});}
if(id){if(readChoice()==='yes')enable();else if(readChoice()!=='no')consent.hidden=false;}
document.querySelectorAll('[data-consent]').forEach(b=>b.addEventListener('click',()=>{try{localStorage.setItem('zam-analytics',b.dataset.consent);}catch{}consent.hidden=true;if(b.dataset.consent==='yes')enable();}));
document.querySelector('#reset-consent')?.addEventListener('click',()=>{try{localStorage.removeItem('zam-analytics');}catch{}location.reload();});
document.querySelectorAll('a[href^="mailto:"]').forEach(a=>a.dataset.track='email_click');
document.querySelectorAll('a[href^="tel:"]').forEach(a=>a.dataset.track='phone_click');
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

// Inquiry drafts live only in this tab and expire after two hours.
(() => {
 const form=document.querySelector('#inquiry-form'), key='zam-inquiry-draft', pending='zam-inquiry-pending';
 const read=(key)=>{try{return JSON.parse(sessionStorage.getItem(key));}catch{return null;}};
 const write=(key,value)=>{try{sessionStorage.setItem(key,JSON.stringify(value));}catch{}};
 const remove=(key)=>{try{sessionStorage.removeItem(key);}catch{}};
 const fresh=item=>item&&Date.now()-item.time<2*60*60*1000;
 const track=name=>{if(enabled)window.gtag('event',name,{page_path:location.pathname});};
 const pendingSubmission=read(pending);
 if(document.body.dataset.page==='inquiry-confirmation'){
  const receipt=new URLSearchParams(location.search).get('submission');
  if(fresh(pendingSubmission)&&receipt&&receipt===pendingSubmission.receipt){
   document.querySelector('h1').textContent='Thank you. Your inquiry is on its way.';
   document.querySelector('#inquiry-confirmation').textContent='I’ll review the details and get back to you within 24 hours.';
   track('contact_form_submit');remove(key);remove(pending);history.replaceState(null,'',location.pathname);
  }
 }
 document.querySelectorAll('a[href="/contact/#inquiry"]').forEach(a=>a.addEventListener('click',()=>{
  const serviceType={'portrait-photographer-los-angeles':'Portrait','headshots-los-angeles':'Headshots','personal-branding-photographer-los-angeles':'Personal Branding','fashion-editorial-photographer-los-angeles':'Fashion / Editorial','commercial-photography-los-angeles':'Commercial'}[location.pathname.split('/')[1]];
  const value=a.dataset.inquiryType||serviceType||'';
  if(value){write('zam-inquiry-type',{time:Date.now(),value});if(form){form.elements.type.value=value;form.elements.type.dispatchEvent(new Event('change'));}}
 }));
 if(!form)return;
 const status=document.querySelector('#form-status'),commercial=document.querySelector('#commercial-fields');
 const showError=()=>{status.textContent='Something went wrong. Please try again or email me directly at dzamorskaya@icloud.com.';status.setAttribute('role','alert');};
 const controls=[...form.querySelectorAll('.form-grid input,.form-grid textarea,.form-grid select')];
 const draft=read(key);
 if(fresh(draft)){controls.forEach(el=>{if(el.type==='checkbox')el.checked=draft.values?.[el.name]===true;else if(typeof draft.values?.[el.name]==='string')el.value=draft.values[el.name];});}else remove(key);
 const requestedType=read('zam-inquiry-type');
 if(fresh(requestedType))form.elements.type.value=requestedType.value;
 const queryType=new URLSearchParams(location.search).get('type');
 if([...form.elements.type.options].some(option=>option.value===queryType))form.elements.type.value=queryType;
 remove('zam-inquiry-type');
 function commercialFields(){const show=form.elements.type.value==='Commercial';commercial.hidden=!show;commercial.disabled=!show;}
 commercialFields();form.elements.type.addEventListener('change',commercialFields);
 const flexible=form.elements.flexible_dates,date=form.elements.date;
 function flexibleDates(){date.disabled=flexible.checked;}
 flexibleDates();flexible.addEventListener('change',flexibleDates);
 function save(){write(key,{time:Date.now(),values:Object.fromEntries(controls.map(el=>[el.name,el.type==='checkbox'?el.checked:el.value]))});}
 let started=false;
 form.addEventListener('input',()=>{save();if(!started){started=true;track('contact_form_start');}});
 form.addEventListener('change',save);
 form.addEventListener('submit',event=>{
  if(form.dataset.enabled!=='true'){event.preventDefault();return;}
  if(!navigator.onLine){event.preventDefault();save();showError();return;}
  for(const name of ['name','email','message'])form.elements[name].value=form.elements[name].value.trim();
  if(!form.reportValidity()){event.preventDefault();return;}
  save();form.elements.submitted_at.value=new Date().toISOString();const receipt=crypto.randomUUID();const next=new URL(form.elements._next.value);next.searchParams.set('submission',receipt);form.elements._next.value=next.href;write(pending,{time:Date.now(),receipt});
  status.textContent='Continue to verification to finish sending your inquiry. If sending is interrupted, return here to recover your details.';
  // Native submission preserves provider spam protection and the client auto-response.
 });
 addEventListener('pageshow',()=>{
  if(fresh(read(pending)))showError();
 });
})();
