/* Optional export only: originals stay editable; no build is needed for hosting. */
const fs = require('node:fs');
const path = require('node:path');
const CleanCSS = require('clean-css');
const { minify } = require('terser');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, '.cache/minified-assets');
(async () => {
  for (const type of ['css', 'js']) {
    fs.mkdirSync(path.join(output,type),{recursive:true});
    for (const file of fs.readdirSync(path.join(root,'assets',type)).filter(f=>f.endsWith('.'+type))) {
      const source=fs.readFileSync(path.join(root,'assets',type,file),'utf8');
      const result=type==='css' ? new CleanCSS({level:1}).minify(source).styles : (await minify(source,{compress:true,mangle:true})).code;
      fs.writeFileSync(path.join(output,type,file),result);
    }
  }
  console.log('Optional exports written to .cache/minified-assets; production sources are unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
