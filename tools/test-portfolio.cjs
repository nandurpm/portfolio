/* Run with Node 24 after tracker npm ci; uses its pinned Playwright dependency.
 * This server emulates _headers for local CSP checks; it is not a Cloudflare emulator.
 */
const { chromium } = require('./tracker-source/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const rules = [];
for (const line of fs.readFileSync(path.join(root, '_headers'), 'utf8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue;
  if (!line.startsWith(' ')) rules.push({ pattern: line, entries: [] });
  else rules.at(-1).entries.push(line.trim());
}
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function headersFor(url) {
  const headers = {};
  for (const {pattern, entries} of rules) {
    if (!(pattern.endsWith('*') ? url.startsWith(pattern.slice(0,-1)) : url === pattern)) continue;
    for (const entry of entries) {
      if (entry.startsWith('! ')) delete headers[entry.slice(2).toLowerCase()];
      else { const n = entry.indexOf(':'); const key=entry.slice(0,n).toLowerCase(), value=entry.slice(n+1).trim(); headers[key]=headers[key] ? `${headers[key]}, ${value}` : value; }
    }
  }
  return headers;
}
const server = http.createServer((req,res) => {
  let pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file = path.resolve(root, '.'+pathname);
  if (!file.startsWith(root+path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, {'content-type':types[path.extname(file)] || 'application/octet-stream', ...headersFor(pathname)});
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  if (process.argv.includes('--serve')) { console.log(base); return; }
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  let checks=0;
  const pass=(message) => { checks++; console.log(`PASS ${message}`); };
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];const violations=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',msg=>{if(msg.type()==='error' && /Content Security Policy|violates.*directive/i.test(msg.text())) violations.push(msg.text());});
    await page.addInitScript(() => {
      new MutationObserver(() => { for(const card of document.querySelectorAll('article')) if(!card.dataset.original) card.dataset.original='yes'; }).observe(document,{childList:true,subtree:true});
    });
    const pages=['/','/about.html','/projects.html','/blog.html','/contact.html','/savings-tracker.html','/savings-tracker-privacy.html',...fs.readdirSync(path.join(root,'blog')).filter(f=>f.endsWith('.html')).map(f=>'/blog/'+f),...fs.readdirSync(path.join(root,'works')).filter(f=>f.endsWith('.html')).map(f=>'/works/'+f)];
    for (const url of pages) {
      await page.goto(base+url,{waitUntil:'networkidle'});
      assert.equal(await page.locator('h1').count(),1,url);
      assert(await page.locator('h1').isVisible(),url);
      assert.equal(await page.locator('link[rel="canonical"]').count(),1,url);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1),`mobile overflow: ${url}`);
      await page.locator('img').evaluateAll(imgs=>imgs.forEach(i=>{i.loading='eager';}));
      await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
      assert.equal(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.naturalWidth || !i.width || !i.height).length),0,url);
    }
    assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);
    pass(`${pages.length} mobile pages: HTML, metadata, images, overflow, JavaScript and CSP`);
    await page.goto(base+'/projects.html');
    await page.evaluate(()=>{window.originalCards=[...document.querySelectorAll('#projectsGrid article,#moreProjectsGrid article')];});
    await page.locator('#projectSearch').fill('unlikely-no-match-1234');
    assert.equal(await page.locator('#projectsGrid article:visible,#moreProjectsGrid article:visible').count(),0);
    await page.locator('#projectSearch').fill('');
    await page.locator('#projectSort').selectOption('name');
    assert(await page.evaluate(()=>window.originalCards.every(c=>c.isConnected)));
    assert.equal(await page.locator('#projectsGrid article:visible,#moreProjectsGrid article:visible').count(),33);
    pass('project search/sort preserves all 33 original cards');
    await page.goto(base+'/blog.html');
    await page.evaluate(()=>{window.originalCards=[...document.querySelectorAll('#blogList article')];});
    assert.equal(await page.locator('#blogList article:visible').count(),6);
    await page.locator('#blogPagination button').nth(1).click();
    assert.equal(await page.locator('#blogList article:visible').count(),4);
    await page.locator('#blogSearch').fill('documentation');
    assert(await page.locator('#blogList article:visible').count()>0);
    assert(await page.evaluate(()=>window.originalCards.every(c=>c.isConnected)));
    assert.equal(await page.locator('#blogList article a').count(),10);
    assert.equal(await page.locator('#blogList article[tabindex],#blogList article[role="link"]').count(),0);
    pass('blog pagination/filtering preserves nodes and uses one link per card');
    for(const hash of ['#1','#a:b','#%E0%A4%A']) { await page.goto(base+'/'+hash); }
    assert.deepEqual(errors,[]);pass('unusual and malformed hashes do not throw');
    await context.close();
    const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    const plain=await nojs.newPage();
    for(const url of ['/','/about.html','/projects.html','/blog.html']) {
      await plain.goto(base+url);
      assert.equal(await plain.locator('[data-reveal]').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).opacity==='0').length),0);
      assert(await plain.locator('.site-nav').isVisible());
      assert(await plain.locator('link[href$="polish.css"]').count());
    }
    pass('JavaScript disabled: content, navigation and responsive CSS remain available');
    await nojs.close();
    const blocked=await browser.newContext({colorScheme:'light',reducedMotion:'reduce'});
    await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError')}});});
    const privacy=await blocked.newPage();const storageErrors=[];privacy.on('pageerror',e=>storageErrors.push(e.message));
    await privacy.goto(base+'/about.html');
    assert.equal(await privacy.locator('html').getAttribute('data-theme'),'light');
    await privacy.locator('.theme-toggle').click();
    assert.equal(await privacy.locator('html').getAttribute('data-theme'),'dark');
    assert.deepEqual(storageErrors,[]);pass('storage denial: initial system theme and manual toggle work');
    await blocked.close();
    const saved=await browser.newContext({colorScheme:'dark'});
    await saved.addInitScript(()=>localStorage.setItem('portfolio-theme','light'));
    await saved.route('**/assets/js/theme.js',r=>r.abort());
    const early=await saved.newPage();await early.goto(base+'/');
    assert.equal(await early.locator('html').getAttribute('data-theme'),'light');
    assert.equal(await early.locator('html').getAttribute('class').then(c=>c.includes('js')),true);
    pass('saved theme is applied by the head bootstrap with theme.js unavailable');await saved.close();
    const contactContext=await browser.newContext({reducedMotion:'reduce'});
    const contact=await contactContext.newPage();await contact.goto(base+'/contact.html');
    await contact.locator('[name="name"]').fill('Test sender');
    await contact.locator('[name="email"]').fill('sender@example.com');
    await contact.locator('[name="subject"]').fill('Long message');
    await contact.locator('[name="message"]').fill('A'.repeat(2000));
    await contact.locator('button[type="submit"]').click();
    assert(await contact.locator('#emailFallback').isVisible());
    assert((await contact.locator('#emailFallback').inputValue()).includes('A'.repeat(2000)));
    assert((await contact.locator('#formNote').textContent()).includes('message is long'));
    pass('long contact messages provide a copyable fallback without navigation');await contactContext.close();
    const failure=await browser.newContext();await failure.route('**/assets/js/reveal.js',r=>r.abort());
    const failPage=await failure.newPage();await failPage.goto(base+'/');
    assert.equal(await failPage.locator('[data-reveal]').evaluateAll(ns=>ns.filter(n=>getComputedStyle(n).opacity==='0').length),0);
    pass('blocked reveal script leaves all content visible');await failure.close();
    const editor=await browser.newContext();const admin=await editor.newPage();const adminErrors=[];admin.on('pageerror',e=>adminErrors.push(e.message));
    await admin.goto(base+'/admin/?demo=1',{waitUntil:'networkidle'});
    const clean=await admin.evaluate(()=>{
      const dirty='<p onclick="alert(1)">Keep <strong>formatting</strong></p><script>alert(1)</script><style>body{display:none}</style><svg onload="alert(1)"></svg><math><mtext>x</mtext></math><a href="java\nscript:alert(1)">bad</a><img src="data:text/html,x"><img src="vbscript:x"><a href="https://example.com">good</a>';
      // Drive the real editor sanitizer via its source-mode UI below; also verify vendored library loaded.
      return {version:DOMPurify.version,dirty};
    });
    assert.equal(clean.version,'3.4.17');assert.deepEqual(adminErrors,[]);
    const result=await admin.evaluate(dirty=>window.sanitizePortfolioContent(dirty),clean.dirty);
    assert(result.includes('<strong>formatting</strong>'));assert(result.includes('https://example.com'));
    assert(!/<(?:script|style|svg|math)\b|\bonclick=|javascript:|vbscript:|data:/i.test(result),result);
    for (const dirty of ['<a href="java&#x09;script:alert(1)">x</a>', '<a href="vbscript:msgbox(1)">x</a>', '<img src="data:image/svg+xml,<svg onload=alert(1)>">', '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">']) {
      const sanitized=await admin.evaluate(d=>window.sanitizePortfolioContent(d),dirty);
      assert(!/<(?:script|style|svg|math)\b|\bonerror=|javascript:|vbscript:|data:/i.test(sanitized),sanitized);
    }
    assert.equal(await admin.evaluate(()=>sessionStorage.getItem('portfolio-studio-token')),null);
    pass('admin CSP loads; sanitizer strips adversarial markup and preserves safe formatting');await editor.close();
    const asset=fs.readdirSync(path.join(root,'track/assets')).find(f=>f.endsWith('.js'));
    assert.equal(headersFor('/track/assets/'+asset)['cache-control'],'public, max-age=31536000, immutable');
    assert.equal(headersFor('/track/')['cache-control'],'no-store');
    assert(!headersFor('/admin/')['content-security-policy'].includes("script-src 'self',"));
    pass('header matching: immutable tracker assets, uncached entry, separate admin CSP');
    console.log(`${checks} browser groups passed.`);
  } finally { await browser.close();server.close(); }
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
