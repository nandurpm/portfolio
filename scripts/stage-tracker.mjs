import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const source=path.join(root,'tools/tracker-source/dist-web');
const target=path.join(root,'track');
const html=await fs.readFile(path.join(source,'index.html'),'utf8');
if(!html.includes('noindex')||!html.includes('/track/assets/'))throw Error('Expected private web build');
// Replace generated web assets only; never touch financial storage or signing files.
await fs.mkdir(target,{recursive:true});
const current=new Set(await fs.readdir(path.join(source,'assets')));
for(const entry of await fs.readdir(path.join(target,'assets')).catch(()=>[])){
 if(!current.has(entry))await fs.unlink(path.join(target,'assets',entry));
}
await fs.cp(source,target,{recursive:true});
await fs.writeFile(path.join(target,'release.json'),JSON.stringify({version:'1.4.1',requiresSignIn:true,route:'/track/'})+'\n');
console.log('Staged sign-in-required /track/ build. No navigation links or sitemap entries added.');
