import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {renderSite,esc,safeUrl} from '../src/render.mjs';
import {build,root,validate} from '../scripts/build.mjs';
const data=JSON.parse(await readFile(join(root,'content/site.json'),'utf8'));
const manifest=JSON.parse(await readFile(join(root,'content/images.json'),'utf8'));
const pages=renderSite(data,manifest);
await build();
test('All internal pages and assets resolve; each page has one heading and canonical',async()=>{
 for(const[path,html]of pages){
  assert.equal((html.match(/<h1>/g)||[]).length,1,path+' must have one h1');
  assert.ok(html.includes(`rel="canonical" href="${data.settings.domain}${path}"`));
  assert.ok(html.includes(`mailto:${data.settings.email}`));
  for(const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)){
   const url=match[1];if(pages.has(url))continue;
   const file=join(root,'.preview',url);assert.ok((await stat(file)).isFile(),`${path} broken ${url}`);
  }
 }
});
test('Five services, projects, journal, legal pages and contact routes exist',()=>{
 for(const s of data.services)assert.ok(pages.has('/'+s.slug+'/'));
 for(const route of ['/work/','/about/','/journal/','/publications/','/pricing/','/faq/','/contact/','/privacy/','/terms/'])assert.ok(pages.has(route));
 assert.ok(!data.services.some(s=>/street/i.test(s.title)));
});
test('No stale domain, Cloudflare email decoder, fake scarcity or embedded analytics',()=>{
 for(const html of pages.values())for(const stale of ['cdn-cgi','zamphoto.com','4 spots','gtag/js?id='])assert.ok(!html.includes(stale));
 const titles=[...pages.values()].map(h=>h.match(/<title>(.*?)<\/title>/)[1]);assert.equal(new Set(titles).size,titles.length);
});
test('Untrusted content is escaped; dangerous external links rejected',()=>{
 assert.equal(esc('<script>"'), '&lt;script&gt;&quot;');assert.equal(safeUrl('javascript:alert(1)'),'#');
 const d=structuredClone(data);d.projects[0].title='<img src=x onerror=alert(1)>';
 for(const html of renderSite(d,manifest).values())assert.ok(!html.includes('<img src=x'));
});
test('CMS validation rejects duplicate addresses and missing images',()=>{
 const d=structuredClone(data);d.projects[0].slug='../contact';assert.throws(()=>validate(d,manifest));
 const x=structuredClone(data);x.projects[0].photos=['missing'];assert.throws(()=>validate(x,manifest));
});
test('Unpublishing a project removes its route and home link',()=>{
 const d=structuredClone(data);d.projects[0].published=false;const result=renderSite(d,manifest);assert.ok(!result.has('/work/'+d.projects[0].slug+'/'));assert.ok(!result.get('/').includes('href="/work/'+d.projects[0].slug+'/"'));
});
test('All responsive images have files and meaningful alt descriptions',async()=>{
 for(const p of data.photos){assert.ok(p.alt.length>10);for(const v of manifest[p.image].variants)assert.ok((await stat(join(root,'.preview',v.src))).size>0);}
});
test('Hero photo can be selected independently and links to its own project',()=>{
 const d=structuredClone(data);d.settings.heroImage='desert';const html=renderSite(d,manifest).get('/');
 assert.ok(html.includes('class="hero-photo" href="/work/somewhere-out-west/"'));
 assert.ok(html.includes('01 — Somewhere out west'));
});
test('Empty journal is omitted from main navigation',()=>{
 const d=structuredClone(data);d.journal.forEach(j=>j.published=false);
 const nav=renderSite(d,manifest).get('/').match(/<nav id="main-nav".*?<\/nav>/)[0];
 assert.ok(!nav.includes('href="/journal/"'));assert.ok(nav.includes('Book a Shoot'));
});
test('Direct contact links include email, Instagram and callable phone',()=>{
 const contact=pages.get('/contact/');
 for(const target of ['mailto:dzamorskaya@icloud.com','https://instagram.com/zam.photo','tel:+14248447381'])assert.ok(contact.includes('href="'+target+'"'));
 assert.ok(contact.includes('+1 424 844 7381'));
});
test('No unconfirmed testimonials or removed positioning on any public page',()=>{
 for(const [path,html]of pages){assert.ok(!/Sofia M\.|James K\.|Elena (?:&amp;|&) Marcus|\bcouples\b|love story|\bengagement\b|\bwedding\b/i.test(html),path);assert.ok(!html.includes('class="quotes"'),path);}
});
test('Pricing only displays owner-approved amounts and commercial stays quote-based',()=>{
 const d=structuredClone(data);d.services[0].price='Starting at $999';d.services[0].priceApproved=false;
 let p=renderSite(d,manifest);assert.ok(!p.get('/pricing/').includes('$999'));
 d.services[0].priceApproved=true;p=renderSite(d,manifest);assert.ok(p.get('/pricing/').includes('$999'));
 const c=d.services.find(s=>s.category==='commercial');c.price='$777';c.priceApproved=true;
 p=renderSite(d,manifest);assert.ok(!p.get('/pricing/').includes('$777'));assert.ok(!p.get('/'+c.slug+'/').includes('$777'));
});
test('Journal URLs remain available while absent from navigation',()=>{
 assert.ok(pages.has('/journal/'));assert.ok(pages.has('/journal/planning-an-editorial-portrait/'));
 for(const html of pages.values())assert.ok(!html.match(/<nav id="main-nav".*?<\/nav>/)[0].includes('/journal/'));
});
test('Headshots has no unrelated portfolio imagery or made-up session facts',()=>{
 const html=pages.get('/headshots-los-angeles/');assert.ok(!/<img src=/.test(html));assert.ok(html.includes('property="og:image"'));assert.ok(html.includes('Starting at $300'));assert.ok(html.includes('Up to 45 minutes'));
});
test('Confirmed PDF packages are consistent between pricing and service pages',()=>{
 for(const [category,price,count] of [['portrait','$350','10'],['headshots','$300','3'],['branding','$500','15'],['editorial','$600','20']]){
  const service=data.services.find(s=>s.category===category);
  for(const route of ['/pricing/',`/${service.slug}/`]){
   const html=pages.get(route);assert.ok(html.includes('Starting at '+price),route);assert.ok(html.includes(count+' professionally retouched images'),route);
  }
 }
 assert.ok(pages.get('/pricing/').includes('Studio rental, if needed, is paid separately'));
});
test('Hidden violet series and empty portfolio categories stay out of public pages',()=>{
 assert.equal(data.projects.filter(p=>p.published!==false).length,7);
 for(const html of pages.values())assert.ok(!html.includes('violet-')&&!html.includes('Violet hour'));
 const work=pages.get('/work/');for(const category of ['headshots','branding','commercial'])assert.ok(!work.includes(`data-filter="${category}"`));
});
test('Service FAQs and author biography do not substitute unrelated content',()=>{
 const commercial=pages.get('/commercial-photography-los-angeles/');assert.ok(commercial.includes('How is commercial usage priced?'));assert.ok(!commercial.includes('Do I need modelling experience?'));
 const withoutPortrait=structuredClone(data);withoutPortrait.settings.portraitImage='';withoutPortrait.settings.aboutSecondaryImage='';assert.ok(!/<div class="about-image">/.test(renderSite(withoutPortrait,manifest).get('/about/')));
 assert.ok(pages.get('/headshots-los-angeles/').includes('How many looks can I bring?'));
});
test('Inquiry form uses native provider protection; activation gate never claims success',()=>{
 const d=structuredClone(data);d.settings.formEnabled=true;
 const html=renderSite(d,manifest).get('/contact/');
 assert.ok(html.includes('action="https://formsubmit.co/dzamorskaya@icloud.com" method="POST"'));
 for(const name of ['name','email','type','message','_autoresponse','_honey','submitted_at'])assert.ok(html.includes(`name="${name}"`));
 assert.ok(!html.includes('name="_captcha"'));assert.ok(html.includes('fieldset class="commercial-fields"'));
 d.settings.formEnabled=false;assert.ok(renderSite(d,manifest).get('/contact/').includes('type="submit" disabled'));
 assert.ok(!pages.get('/contact/thank-you/').includes('Your inquiry is on its way.'));
 assert.ok(pages.get('/contact/thank-you/').includes('noindex,follow'));
});
test('Final UX cleanup keeps publications inert and booking links at the inquiry form',()=>{
 const d=structuredClone(data);d.publications.forEach(p=>p.url='https://example.com/magazine');
 for(const [route,html] of renderSite(d,manifest)){
  for(const block of html.matchAll(/<div class="publication-grid">(.*?)<\/section>/gs))assert.ok(!/<a\b|data-lightbox/.test(block[1]),route);
  for(const a of html.matchAll(/<a\b([^>]*)>(.*?)<\/a>/gs)){
   if(/Book a Shoot|Start your project|Retouching Inquiry/.test(a[2]))assert.match(a[1],/href="\/contact\/(?:\?type=Retouching)?#inquiry"/,route);
  }
 }
 const contact=pages.get('/contact/');
 assert.match(contact,/id="commercial-fields" hidden disabled/);
 assert.match(contact,/Tell me about your project/);
 assert.match(contact,/My dates are flexible/);
 assert.ok(!contact.includes('The commercial details section is optional'));
 assert.ok(!pages.get('/work/').includes('Let’s discuss your session.'));
});
