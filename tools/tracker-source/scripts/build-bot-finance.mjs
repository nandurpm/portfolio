import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
const target='supabase/functions/savings-tracker-bot/finance.js';
const result=await build({entryPoints:['src/domain/bot-finance.ts'],bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022',outfile:target,banner:{js:'// Generated from src/domain/bot-finance.ts; run node scripts/build-bot-finance.mjs. Do not edit.'}});
const generated=result.outputFiles[0].text;
if(process.argv.includes('--check')) {if(await readFile(target,'utf8')!==generated) throw Error('Bot calculations are stale. Run node scripts/build-bot-finance.mjs and commit the generated bundle.');}
else await writeFile(target,generated);
