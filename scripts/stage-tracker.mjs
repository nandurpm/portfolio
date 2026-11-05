import fs from 'node:fs/promises';
import path from 'node:path';
import { verifyBuild } from '../tools/tracker-source/scripts/verify-build.mjs';
const root=process.cwd();
const source=path.join(root,'tools/tracker-source/dist-web');
const target=path.join(root,'track');
const build=await verifyBuild(source);
const packageJson=JSON.parse(await fs.readFile(path.join(root,'tools/tracker-source/package.json'),'utf8'));
const version=packageJson.version;
const releaseTag=`tracker-v${version}`;
const releaseBase=`https://github.com/nandurpm/portfolio/releases/download/${releaseTag}`;
const html=await fs.readFile(path.join(source,'index.html'),'utf8');
if(!html.includes('noindex')||!html.includes('/track/assets/'))throw Error('Expected private web build');
// Replace generated web assets only; never touch financial storage or signing files.
await fs.mkdir(target,{recursive:true});
const current=new Set(await fs.readdir(path.join(source,'assets')));
for(const entry of await fs.readdir(path.join(target,'assets')).catch(()=>[])){
 if(!current.has(entry))await fs.unlink(path.join(target,'assets',entry));
}
await fs.cp(source,target,{recursive:true});
await fs.writeFile(path.join(target,'release.json'),JSON.stringify({...build,requiresSignIn:true,route:'/track/'})+'\n');
await fs.writeFile(
  path.join(target,'downloads.json'),
  JSON.stringify({
    version,
    releaseTag,
    releasePage:`https://github.com/nandurpm/portfolio/releases/tag/${releaseTag}`,
    windows:`${releaseBase}/Savings-and-Expense-Tracker-Setup-${version}.exe`,
    android:`${releaseBase}/Savings-and-Expense-Tracker-${version}.apk`,
    source:`${releaseBase}/Savings-and-Expense-Tracker-${version}-Source.zip`,
    checksums:`${releaseBase}/SHA256SUMS.txt`,
  },null,2)+'\n',
);
console.log('Staged sign-in-required /track/ build. No navigation links or sitemap entries added.');
