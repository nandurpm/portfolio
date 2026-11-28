import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { verifyBuild } from '../tools/tracker-source/scripts/verify-build.mjs';
const root=process.cwd();
const source=path.join(root,'tools/tracker-source/dist-web');
const target=path.join(root,'track');
const build=await verifyBuild(source);
const packageJson=JSON.parse(await fs.readFile(path.join(root,'tools/tracker-source/package.json'),'utf8'));
const version=packageJson.version;
if (build.version !== version) throw Error('Web build and package versions do not match');
const releaseTag=`tracker-v${version}`;
const releaseBase=`https://github.com/nandurpm/portfolio/releases/download/${releaseTag}`;
if (process.argv.includes('--wait-for-native')) {
  const active = await fs.readFile(path.join(target, 'downloads.json'), 'utf8').then(JSON.parse).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  // Existing same-version web hotfixes can still ship. New versions must not
  // link to missing APK/EXE assets while the signed release job is building.
  if (active?.version !== version) {
    const targets = packageJson.trackerReleasePlatforms ?? ['android', 'windows'];
    const names = [
      `Savings-and-Expense-Tracker-${version}.apk`,
      `Savings-and-Expense-Tracker-${version}-Source.zip`,
      'SHA256SUMS.txt',
      ...(targets.includes('windows') ? [`Savings-and-Expense-Tracker-Setup-${version}.exe`] : []),
    ];
    const until = Date.now() + 35 * 60_000;
    let ready = false;
    do {
      try {
        const release = JSON.parse(execFileSync('gh', [
          'release', 'view', releaseTag, '--repo', 'nandurpm/portfolio',
          '--json', 'isDraft,isPrerelease,tagName,assets',
        ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15_000 }));
        if (!release.isDraft && !release.isPrerelease && release.tagName === releaseTag &&
            names.every(name => release.assets.some(asset => asset.name === name && asset.size > 0))) {
          execFileSync('git', ['fetch', '--quiet', '--depth=1', 'origin', `refs/tags/${releaseTag}`], {timeout: 30_000});
          const tree = execFileSync('git', [
            'rev-parse', 'FETCH_HEAD^{commit}:tools/tracker-source',
          ], { encoding: 'utf8' }).trim();
          ready = tree === build.sourceTree;
        }
      } catch {
        // The release or its artifacts may not exist yet.
      }
      if (ready) break;
      console.log(`Waiting for complete ${releaseTag} downloads from the same source tree.`);
      await setTimeout(30_000);
    } while (Date.now() < until);
    if (!ready) throw Error('Matching native release not available; the previous web build was retained.');
  }
}
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
    androidVersionCode: build.androidVersionCode,
    releaseTag,
    releasePage:`https://github.com/nandurpm/portfolio/releases/tag/${releaseTag}`,
    windows:(packageJson.trackerReleasePlatforms ?? ['android','windows']).includes('windows')
      ? `${releaseBase}/Savings-and-Expense-Tracker-Setup-${version}.exe` : null,
    android:`${releaseBase}/Savings-and-Expense-Tracker-${version}.apk`,
    source:`${releaseBase}/Savings-and-Expense-Tracker-${version}-Source.zip`,
    checksums:`${releaseBase}/SHA256SUMS.txt`,
  },null,2)+'\n',
);
console.log('Staged sign-in-required /track/ build. No navigation links or sitemap entries added.');
