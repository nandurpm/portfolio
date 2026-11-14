/* Pinned browser tooling is reused from tracker-source; its application is not built or changed.
 * The test server emulates static routes and _headers, not Cloudflare itself. */
const { chromium }=require('./tracker-source/node_modules/playwright');
const { AxeBuilder }=require('./tracker-source/node_modules/@axe-core/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const rules=[];
for(const line of fs.readFileSync(path.join(root,'_headers'),'utf8').split('\n')) {
 if(!line.trim()||line.startsWith('#')) continue;
 if(!line.startsWith(' ')) rules.push({pattern:line,entries:[]}); else rules.at(-1).entries.push(line.trim());
}
function headersFor(url) {
 const headers={};
 for(const {pattern,entries} of rules) if(pattern.endsWith('*')?url.startsWith(pattern.slice(0,-1)):url===pattern) for(const entry of entries) {
  if(entry.startsWith('! ')) delete headers[entry.slice(2).toLowerCase()];
  else { const n=entry.indexOf(':'),key=entry.slice(0,n).toLowerCase(),value=entry.slice(n+1).trim(); headers[key]=headers[key]?`${headers[key]}, ${value}`:value; }
 }
 return headers;
}
const redirects=new Map(fs.readFileSync(path.join(root,'_redirects'),'utf8').trim().split('\n').map(l=>{const [from,to,status]=l.split(/\s+/);return[from,{to,status:Number(status)}]}));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(redirects.has(url.pathname)){const {to,status}=redirects.get(url.pathname);res.writeHead(status,{location:to+url.search}).end();return;}
 let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 const missing=!fs.existsSync(file);
 if(missing)file=path.join(root,'404.html');
 res.writeHead(missing?404:200,{'content-type':types[path.extname(file)]||'application/octet-stream',...headersFor(url.pathname)});
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 let browser;
 try {
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
  const base=`http://127.0.0.1:${server.address().port}`;
  fs.mkdirSync(path.join(root,'.cache/portfolio-audit'),{recursive:true});
  let checks=0;const pass=m=>{console.log(`PASS ${m}`);checks++};
  const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:'light',reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.cspErrors=[];document.addEventListener('securitypolicyviolation',e=>window.cspErrors.push(`${e.violatedDirective}: ${e.blockedURI}`))});
  await page.goto(`${base}/projects.html`);
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.locator('.theme-toggle').click();await page.emulateMedia({colorScheme:'light'});await page.emulateMedia({colorScheme:'dark'});
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');pass('system theme follows OS until explicit saved choice');
  const total=await page.locator('#projectsGrid article, #moreProjectsGrid article').count();
  assert.equal(await page.locator('#projectResults').count(),1);
  assert.match(await page.locator('#projectResults').innerText(),new RegExp(`^${total} matching`));
  await page.selectOption('#projectSort','name');
  for(const grid of ['projectsGrid','moreProjectsGrid']) {
   const names=await page.locator(`#${grid} article`).evaluateAll(nodes=>nodes.map(n=>n.dataset.name));
   assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b)));
  }
  await page.fill('#projectSearch','zzzz-no-match');assert.equal(await page.locator('.empty-state:visible').count(),1);
  await page.fill('#projectSearch','');assert.equal(await page.locator('#projectsGrid article:visible, #moreProjectsGrid article:visible').count(),total);
  pass('both project grids sort, counts reconcile, one empty state, all cards preserved');
  await page.goto(`${base}/blog.html`);await page.fill('#blogSearch','zzzz-no-match');
  assert.equal(await page.locator('#blogResults').innerText(),'0 articles found');
  await page.fill('#blogSearch','');assert.ok(await page.locator('#blogList article:visible').count()>0);
  await page.getByRole('button',{name:'Open blog page 2'}).click();assert.equal(await page.locator('#blogPagination [aria-current="page"]').innerText(),'2');
  pass('article search, results announcement and keyboard-friendly pagination');
  await page.goto(`${base}/missing/deep/page`);assert.equal((await page.locator('link[rel="stylesheet"]').getAttribute('href')).startsWith('/assets/'),true);
  assert.equal(await page.locator('link[rel="canonical"]').count(),0);assert.equal(await page.locator('.site-nav a').nth(3).getAttribute('href'),'/about.html');
  assert.equal(await page.locator('body').evaluate(n=>getComputedStyle(n).fontFamily.includes('Inter')),true);
  pass('nested custom 404 loads themed assets and root recovery links');
  await page.goto(`${base}/resume.html`);await page.waitForURL('**/about.html#resume');assert.equal(await page.locator('a[download][href="/assets/files/resume.pdf"]').count(),1);
  for(const alias of ['about','projects','blog']){await page.goto(`${base}/${alias}/`);assert.equal(new URL(page.url()).pathname,`/${alias}.html`)}
  pass('aliases and old résumé route reach canonical pages');
  for(const mode of ['light','dark']) for(const width of [360,390,768,1100,1280,1440]) for(const route of ['/','/about.html','/projects.html','/blog.html','/contact.html','/savings-tracker.html']) {
   await page.setViewportSize({width,height:900});await page.evaluate(mode=>localStorage.setItem('portfolio-series-theme',mode),mode);await page.goto(base+route);
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(100);
   const size=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(size.doc<=size.viewport+1,`${route} ${mode} ${width}: horizontal overflow ${size.doc}`);
   assert.deepEqual(await page.evaluate(()=>window.cspErrors),[],`${route}: CSP violation`);
   if([390,1100,1280].includes(width)&&['/','/about.html'].includes(route))await page.screenshot({path:path.join(root,`.cache/portfolio-audit/${route==='/'?'home':'about'}-${mode}-${width}.png`),fullPage:true});
  }
  pass('72 page/theme/viewport combinations without horizontal overflow or CSP violations');
  for(const route of ['/','/about.html','/projects.html','/blog.html','/contact.html','/savings-tracker.html','/savings-tracker-privacy.html']) {
   await page.goto(base+route);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   const serious=result.violations.filter(v=>['serious','critical'].includes(v.impact));
   fs.writeFileSync(path.join(root,`.cache/portfolio-audit/axe-${route==='/'?'home':route.slice(1)}.json`),JSON.stringify(result,null,2));
   assert.deepEqual(serious.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`${route}: serious accessibility violations`);
  }
  pass('axe WCAG checks: no serious/critical violations on seven primary pages');
  const nojs=await browser.newContext({javaScriptEnabled:false,colorScheme:'light',viewport:{width:360,height:800}});const plain=await nojs.newPage();
  await plain.goto(`${base}/projects.html`);assert.equal(await plain.locator('article').count()>=total,true);assert.equal(await plain.locator('html').evaluate(n=>getComputedStyle(n).getPropertyValue('--bg').trim()),'#f6f3ef');
  const denied=await browser.newContext({colorScheme:'light'});await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage denied')}}));const dp=await denied.newPage();await dp.goto(base);assert.equal(await dp.locator('html').getAttribute('data-theme'),'light');await dp.locator('.theme-toggle').click();assert.equal(await dp.locator('html').getAttribute('data-theme'),'dark');
  assert.deepEqual(errors,[]);pass('no-JavaScript content and theme, denied storage, no page exceptions');
  console.log(`${checks} browser regression groups passed`);
 } finally {await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
