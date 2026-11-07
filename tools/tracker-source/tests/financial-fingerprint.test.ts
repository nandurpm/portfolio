import {test,expect} from 'vitest';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {financialFingerprints} from '../scripts/financial-fingerprint.mjs';
import {verifyFinancialParity} from '../scripts/verify-financial-parity.mjs';

test('Web and native manifests bind the same calculation and data-model source', async()=>{
  const {getBuildInfo}=await import('../build-info.mjs');
  const web=getBuildInfo('web'),native=getBuildInfo('release');
  expect(web.financialLogicSha256).toBe(native.financialLogicSha256);
  expect(web.dataModelSha256).toBe(native.dataModelSha256);
  const root=await mkdtemp(path.join(tmpdir(),'financial-source-'));
  try{
    await mkdir(path.join(root,'src/domain'),{recursive:true});await mkdir(path.join(root,'src/cloud'));
    for(const file of ['src/domain/types.ts','src/domain/validation.ts','src/cloud/model.ts'])await writeFile(path.join(root,file),'fixture\n');
    const before=financialFingerprints(root);
    for(const file of ['src/domain/types.ts','src/domain/validation.ts','src/cloud/model.ts'])await writeFile(path.join(root,file),'fixture\r\n');
    const crlf=financialFingerprints(root);
    for(const file of ['src/domain/types.ts','src/domain/validation.ts','src/cloud/model.ts'])await writeFile(path.join(root,file),'fixture\n');
    expect(financialFingerprints(root)).toEqual(crlf);
    await writeFile(path.join(root,'src/domain/round-money.ts'),'changed rounding');
    expect(financialFingerprints(root).financialLogicSha256).not.toBe(before.financialLogicSha256);
    expect(financialFingerprints(root).dataModelSha256).toBe(before.dataModelSha256);
  }finally{await rm(root,{recursive:true,force:true});}
});
test('payload parity checks reject both changed financial source and changed asset bytes',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'financial-payloads-'));
 const roots=['web','windows','android'].map(x=>path.join(root,x));
 const files={'index.html':'fixture','app.js':'fixture module'};
 const manifest={version:'1.0.0',sourceCommit:'a'.repeat(40),sourceTree:'b'.repeat(40),financialLogicSha256:'c'.repeat(64),dataModelSha256:'d'.repeat(64),dirty:false,mode:'release',files:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]))};
 try{
   for(const dir of roots){await mkdir(dir);for(const [file,data] of Object.entries(files))await writeFile(path.join(dir,file),data);await writeFile(path.join(dir,'build.json'),JSON.stringify({...manifest,mode:dir===roots[0]?'web':'release'}));}
   expect(await verifyFinancialParity(roots)).toMatchObject({verified:true,payloads:3});
   await writeFile(path.join(roots[2]!,'build.json'),JSON.stringify({...manifest,financialLogicSha256:'e'.repeat(64)}));
   await expect(verifyFinancialParity(roots)).rejects.toThrow('Platform mismatch');
   await writeFile(path.join(roots[2]!,'build.json'),JSON.stringify(manifest));
   await writeFile(path.join(roots[2]!,'app.js'),'changed');
   await expect(verifyFinancialParity(roots)).rejects.toThrow('checksum mismatch');
 }finally{await rm(root,{recursive:true,force:true});}
});
