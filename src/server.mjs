import http from 'node:http';
import {readFile,writeFile,stat,mkdir,copyFile} from 'node:fs/promises';
import {join,resolve,extname} from 'node:path';
import {randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {build,root,validate} from '../scripts/build.mjs';
const preview=join(root,'.preview'),token=randomBytes(32).toString('hex'),port=Number(process.env.PORT||3000),origin=`http://127.0.0.1:${port}`;
await build();
const dataFile=join(root,'content/site.json'),manifestFile=join(root,'content/images.json');
const hash=s=>createHash('sha256').update(s).digest('hex');
const run=(cmd,args,input)=>new Promise((resolve,reject)=>{const c=spawn(cmd,args,{cwd:root,env:process.env});let out='',err='';c.stdout.on('data',v=>out+=v);c.stderr.on('data',v=>err+=v);c.on('error',reject);c.on('close',code=>code===0?resolve(out):reject(Error(err||out||`${cmd} failed`)));c.stdin.end(input);});
async function body(req,max=24000000){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>max)throw Error('File too large (maximum 16 MB photograph)');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString());}
const authorized=req=>{const value=(req.headers.authorization||'').replace(/^Bearer /,'');return value.length===token.length&&timingSafeEqual(Buffer.from(value),Buffer.from(token));};
let mutation=Promise.resolve();
const serial=fn=>{const next=mutation.then(fn);mutation=next.catch(()=>{});return next;};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.xml':'application/xml','.txt':'text/plain'};
const server=http.createServer(async(req,res)=>{
 const send=(code,data,type='application/json')=>{res.writeHead(code,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end(type==='application/json'?JSON.stringify(data):data);};
 try{
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host))return send(403,{error:'Invalid host'});
  const url=new URL(req.url,origin);
  if(url.pathname.startsWith('/api/')){
   if(!authorized(req))return send(401,{error:'Open the private editor link shown in Terminal.'});
   if(req.headers.origin&&req.headers.origin!==origin&&req.headers.origin!==`http://localhost:${port}`)return send(403,{error:'Invalid origin'});
   if(req.method==='GET'&&url.pathname==='/api/content'){
    const raw=await readFile(dataFile,'utf8');return send(200,{data:JSON.parse(raw),manifest:JSON.parse(await readFile(manifestFile,'utf8')),revision:hash(raw)});
   }
   if(req.method!=='POST')return send(405,{error:'Method not allowed'});
   const payload=await body(req);
   const result=await serial(async()=>{
    const raw=await readFile(dataFile,'utf8');
    if(payload.revision!==hash(raw))throw Error('Content changed. Reload the editor before saving.');
    if(url.pathname==='/api/save'){
     const manifest=JSON.parse(await readFile(manifestFile,'utf8'));validate(payload.data,manifest);
     await mkdir(join(root,'.runtime/backups'),{recursive:true});await writeFile(join(root,'.runtime/backups',`${Date.now()}.json`),raw);
     const updated=JSON.stringify(payload.data,null,2)+'\n';await writeFile(dataFile,updated);
     try{await build();}catch(e){await writeFile(dataFile,raw);throw e;}
     return {ok:true,revision:hash(updated)};
    }
    if(url.pathname==='/api/upload'){
     if(typeof payload.base64!=='string')throw Error('Choose a JPEG, PNG or WebP photograph');
     const bytes=Buffer.from(payload.base64,'base64');if(bytes.length>16000000)throw Error('Maximum image size is 16 MB');
     const key=`photo-${Date.now()}-${randomBytes(3).toString('hex')}`;
     const entry=JSON.parse(await run('python3',['scripts/upload.py',key],bytes));
     const manifest=JSON.parse(await readFile(manifestFile,'utf8'));manifest[key]=entry;await writeFile(manifestFile,JSON.stringify(manifest,null,2));
     const data=JSON.parse(raw);data.photos.push({id:key,image:key,title:String(payload.title||'Untitled photograph').slice(0,200),alt:String(payload.title||'Photograph by Daria Zamorskaia').slice(0,300),category:'portrait'});
     const updated=JSON.stringify(data,null,2)+'\n';await writeFile(dataFile,updated);await build();return{ok:true,data,manifest,revision:hash(updated)};
    }
    if(url.pathname==='/api/publish'){
     if(payload.confirm!==true)throw Error('Publishing must be confirmed');
     await build(root);
     const paths=['index.html','404.html','404','assets','images','work','services','about','contact','journal','publications','pricing','faq','privacy','terms',...JSON.parse(raw).services.map(v=>v.slug),'sitemap.xml','robots.txt','.nojekyll','.generated.json','content','src','scripts','test','package.json','.gitignore','README.md','Start Editor.command'];
     const exists=[];for(const p of paths)try{await stat(join(root,p));exists.push(p);}catch{}
     // Never include unrelated files or credentials in the publication commit.
     await run('git',['add','--',...exists]);
     const staged=await run('git',['diff','--cached','--name-only']);
     const allowed=staged.trim().split('\n').filter(Boolean).every(p=>exists.some(v=>p===v||p.startsWith(v+'/')));
     if(!allowed)throw Error('Unrelated staged changes exist. Review them in Git before publishing.');
     if(staged.trim())await run('git',['commit','-m','Update Daria Zamorskaia photography website']);
     await run('git',['push','origin','main']);return{ok:true,message:'Sent to GitHub. Pages deployment may take a few minutes.'};
    }
    throw Error('Unknown editor action');
   });return send(200,result);
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return send(405,{error:'Method not allowed'});
  if(url.pathname==='/admin'||url.pathname==='/admin/')return send(200,await readFile(join(root,'src/admin.html')),'text/html; charset=utf-8');
  let pathname=decodeURIComponent(url.pathname),file=resolve(preview,'.'+pathname);
  if(file!==preview&&!file.startsWith(preview+'/'))return send(403,{error:'Invalid path'});
  if(pathname.split('/').some(p=>p.startsWith('.')))return send(404,{error:'Not found'});
  try{const info=await stat(file);if(info.isDirectory()){if(!pathname.endsWith('/')){res.writeHead(302,{Location:pathname+'/'});return res.end();}file=join(file,'index.html');}const bytes=await readFile(file);return send(200,req.method==='HEAD'?'':bytes,mime[extname(file)]||'application/octet-stream');}catch{return send(404,await readFile(join(preview,'404.html')),'text/html; charset=utf-8');}
 }catch(e){send(400,{error:e.message});}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is in use. Run PORT=3002 npm start.`:e);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{console.log(`Preview: ${origin}\nPrivate local editor: ${origin}/admin/#${token}\nKeep this Terminal open. The editor link changes on restart. No editor is deployed to GitHub Pages.`);});
