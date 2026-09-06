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
test('All internal pages and assets resolve; site has no enquiry forms',async()=>{
 for(const[path,html]of pages){
  assert.ok(!/<form\b/i.test(html),path+' contains a form');
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
 assert.ok(!nav.includes('href="/journal/"'));assert.ok(nav.includes('Book a shoot'));
});
