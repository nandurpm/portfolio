/* CI-only browser audit. Run from the repository root after installing tools/site-audit. */
const {chromium}=require('./site-audit/node_modules/playwright');
const axe=require('./site-audit/node_modules/axe-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'.cache/audit');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});
 const pages=['index.html','about.html','projects.html','blog.html','contact.html','savings-tracker.html','savings-tracker-privacy.html','404.html',...['blog','works'].flatMap(dir=>fs.readdirSync(path.join(root,dir)).filter(x=>x.endsWith('.html')).map(x=>dir+'/'+x))];
 const report={widths:[320,375,768,1024,1280,1440],themes:['light','dark'],pages:pages.length,failures:[],axe:[],screenshots:[],checks:0,headerChecks:0};
 try{
 for(const theme of report.themes){
  const ctx=await browser.newContext({colorScheme:theme,reducedMotion:'reduce'});
  await ctx.addInitScript(value=>localStorage.getItem('portfolio-series-theme') === null && localStorage.setItem('portfolio-series-theme',value),theme);
  const page=await ctx.newPage();const runtime=[];page.on('pageerror',e=>runtime.push(String(e)));page.on('console',m=>{if(m.type()==='error')runtime.push(m.text());});page.on('response',r=>{if(r.status()>=400)runtime.push('HTTP '+r.status()+' '+r.url());});
  for(const width of report.widths){
   await page.setViewportSize({width,height:950});
   let headerBaseline;
   for(const url of pages){
    await page.goto(`${base}/${url}`,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);await page.locator('img').evaluateAll(images=>images.forEach(i=>{i.loading='eager';}));await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
    const issues=await page.evaluate(()=>{
      const errors=[];
      if(document.documentElement.scrollWidth>innerWidth+1)errors.push('horizontal overflow');
      if(document.querySelectorAll('h1').length!==1)errors.push('H1 count');
      let level=0;for(const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')){const n=+h.tagName[1];if(n>level+1)errors.push('heading skip: '+h.textContent);level=n;}
      for(const i of document.images){if(!i.hasAttribute('alt')||!i.hasAttribute('width')||!i.hasAttribute('height'))errors.push('image attributes: '+i.src);if(i.complete&&!i.naturalWidth)errors.push('broken image: '+i.src);}
      return errors;
    });
    // Every public page must share the same chrome, including its scrolled position.
    const headerState = await page.evaluate(() => {
      const header=document.querySelector('.site-header');
      if(!header)return null;
      const rect=element=>{const r=element.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(n=>Math.round(n));};
      return {header:rect(header),brand:rect(header.querySelector('.brand')),theme:rect(header.querySelector('.theme-toggle')),nav:rect(header.querySelector('.site-nav')),copy:header.querySelector('.brand').textContent};
    });
    if(!headerState)issues.push('missing shared header');
    else {
      headerBaseline ||= headerState;
      if(JSON.stringify(headerState)!==JSON.stringify(headerBaseline))issues.push('header geometry or copy differs between pages');
      await page.evaluate(()=>scrollTo({top:700,behavior:'instant'}));
      const sticky = await page.evaluate(()=>{
        const h=document.querySelector('.site-header'),r=h.getBoundingClientRect();
        const hit=document.elementFromPoint(innerWidth/2,Math.min(r.height-4,35));
        return {top:r.top,position:getComputedStyle(h).position,background:getComputedStyle(h).backgroundColor,covered:h.contains(hit)};
      });
      if(Math.abs(sticky.top)>1||sticky.position!=='sticky')issues.push('header does not remain at viewport top after scrolling');
      if(!sticky.covered)issues.push('page content overlaps the header');
      if(!/rgb\(/.test(sticky.background))issues.push('header background is not opaque');
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      report.headerChecks++;
    }
    for(const issue of issues)report.failures.push({theme,width,url,issue});report.checks++;
    if(width===375){await page.addScriptTag({content:axe.source});const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));for(const v of result.violations)report.axe.push({theme,url,id:v.id,nodes:v.nodes.map(x=>x.target)});}
   }
   if([375,1440].includes(width))for(const url of ['index.html','projects.html','about.html']){
     await page.goto(base+'/'+url);await page.evaluate(()=>document.fonts.ready);
     await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));
     await page.screenshot({path:path.join(out,`header-${url.replace('.html','')}-${theme}-${width}.png`)});
   }
   if([375,1440].includes(width)){
     await page.goto(base+'/about.html');await page.evaluate(()=>document.fonts.ready);
     await page.locator('.hero-profile-section').evaluate(section=>scrollTo({top:section.getBoundingClientRect().top+scrollY-document.querySelector('.site-header').getBoundingClientRect().height-16,behavior:'instant'}));
     await page.screenshot({path:path.join(out,`about-portrait-${theme}-${width}.png`)});
   }
   if([375,1440].includes(width)){await page.goto(base+'/');await page.screenshot({path:path.join(out,`home-${theme}-${width}.png`),fullPage:true});report.screenshots.push(`home-${theme}-${width}.png`);}
  }
  await page.setViewportSize({width:375,height:950});await page.goto(base+'/');
  await page.locator('.nav-toggle').click();assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'),'false');
  await page.locator('.nav-toggle').click();await page.locator('h1').click();assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'),'false');
  await page.locator('.nav-toggle').click();await page.setViewportSize({width:1440,height:950});await page.setViewportSize({width:375,height:950});assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'),'false');
  await page.locator('.theme-toggle').click();assert.equal(await page.locator('html').getAttribute('data-theme'),theme==='dark'?'light':'dark');await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),theme==='dark'?'light':'dark');
  await page.goto(base+'/projects.html');await page.locator('#projectSearch').fill('unlikely-no-match-1234');assert.equal(await page.locator('#projectsGrid article:visible,#moreProjectsGrid article:visible').count(),0);
  await page.goto(base+'/blog.html');assert.equal(await page.locator('#blogList article:visible').count(),6);await page.locator('#blogPagination button').nth(1).click();assert.equal(await page.locator('#blogList article:visible').count(),4);
  report.failures.push(...runtime.map(issue=>({theme,issue})));await ctx.close();
 }
 const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}});const page=await plain.newPage();await page.goto(base+'/');assert(await page.locator('.site-nav').isVisible());assert(await page.locator('h1').isVisible());await plain.close();
 }finally{await browser.close();server.close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));}
 assert.equal(report.failures.length,0,JSON.stringify(report.failures));assert.equal(report.axe.length,0,JSON.stringify(report.axe));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
