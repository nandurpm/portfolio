const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const code=stripTypeScriptTypes(fs.readFileSync(__dirname+'/index.ts','utf8').replace(/^import .*;\r?\n/gm,''));
const rows=new Map();let sends=0,fail=null;
function client(){return {from(table){assert.equal(table,'tracker_bot_sent_alerts');let key,owner,op;return {
 select(){op='select';return this},eq(field,value){if(field==='alert_key')key=value;else if(field==='owner_chat_id')owner=value;return this},
 maybeSingle(){return Promise.resolve({data:rows.get(owner+':'+key)||null,error:null})},
 insert(row){const k=row.owner_chat_id+':'+row.alert_key;if(rows.has(k))return Promise.resolve({error:{code:'23505'}});rows.set(k,row);return Promise.resolve({error:null})},
 upsert(row){rows.set(row.owner_chat_id+':'+row.alert_key,row);return Promise.resolve({error:null})},
 delete(){op='delete';return this},then(resolve,reject){return Promise.resolve().then(()=>{assert.equal(op,'delete');rows.delete(owner+':'+key);return {error:null}}).then(resolve,reject)}
 }}}}
const box={console,Intl,Date,Number,TextEncoder,Uint8Array,Map,structuredClone,crypto:require('node:crypto').webcrypto,Response,Request,Blob,FormData,atob,AbortSignal,Deno:{env:{get:()=>undefined},serve:()=>{}},createClient:client};
vm.createContext(box);vm.runInContext(code,box);const run=x=>vm.runInContext(x,box);
run('adminClient=()=>globalThis.mockClient();message=async(...args)=>globalThis.deliver(...args)');
box.mockClient=client;box.deliver=async(...args)=>{if(fail)throw fail;sends++;box.last=args};
const tag='tracker-v2.2.2',root='https://github.com/nandurpm/portfolio/releases/';
const release={tag_name:tag,draft:false,prerelease:false,published_at:'2026-11-05T01:00:00Z',html_url:root+'tag/'+tag,body:'- Fix <unsafe> & preserve data',assets:['Savings-and-Expense-Tracker-2.2.2.apk','Savings-and-Expense-Tracker-Setup-2.2.2.exe','SHA256SUMS.txt'].map(name=>({name,state:'uploaded',size:123,digest:'sha256:'+'a'.repeat(64),browser_download_url:root+'download/'+tag+'/'+name}))};
box.release=release;
(async()=>{
 assert.equal(run('verifiedTrackerRelease(release).version'),'2.2.2');
 for(const patch of [{draft:true},{prerelease:true},{published_at:null},{tag_name:'electro-v9.0.0'},{html_url:'https://evil.test'},{assets:release.assets.slice(1)},{assets:release.assets.map(a=>({...a,digest:null}))},{assets:release.assets.map(a=>({...a,browser_download_url:'javascript:alert(1)'}))},{assets:release.assets.map(a=>({...a,state:'new'}))}]){
  box.invalid={...release,...patch};assert.equal(run('verifiedTrackerRelease(invalid)'),null);
 }
 assert.match(run('releaseText(verifiedTrackerRelease(release))'),/&lt;unsafe&gt; &amp;/);
 assert.doesNotMatch(run('releaseText(verifiedTrackerRelease(release))'),/ðŸ|UPDATE AVAILABLE/);
 assert.equal(run('releaseKeyboard(verifiedTrackerRelease(release)).inline_keyboard[0][0].text'),'🤖 Android APK');
 box.fetch=async url=>{assert.match(url,/releases\?per_page=100$/);return {ok:true,json:async()=>[{...release,tag_name:'other-v9.0.0'},release]}};
 assert.equal((await run('trackerReleases()')).length,1);
 assert.equal((await run('sendReleaseUpdate("t","123")')).delivered,1);
 assert.equal(sends,1);assert.equal((await run('sendReleaseUpdate("t","123")')).delivered,0);assert.equal(sends,1);
 rows.clear();fail=Object.assign(Error('explicit rejection'),{deliveryRejected:true});
 await assert.rejects(run('sendReleaseUpdate("t","123")'));
 assert.equal(rows.size,0,'Explicit rejection is retryable and not delivered');
 fail=null;assert.equal((await run('sendReleaseUpdate("t","123")')).delivered,1);
 rows.clear();fail=Error('transport timeout');await assert.rejects(run('sendReleaseUpdate("t","123")'));
 assert.equal(rows.has('123:software-pending:'+tag),true);assert.equal(rows.has('123:software-release:'+tag),false);
 fail=null;assert.equal((await run('sendReleaseUpdate("t","123")')).delivered,0,'Ambiguous delivery must not duplicate');
 rows.clear();await run('softwareAction("software:off","t","123")');
 assert.equal(await run('softwareEnabled("123")'),false);assert.equal((await run('sendReleaseUpdate("t","123")')).delivered,0);
 await run('softwareAction("software:on","t","123")');assert.equal(await run('softwareEnabled("123")'),true);
 for(const status of [403,429,500]){box.fetch=async()=>({ok:false,status});await assert.rejects(run('trackerReleases()'));assert.equal((await run('sendReleaseUpdate("t","123")')).delivered,0);}
 rows.clear();box.fetch=async()=>({ok:true,json:async()=>[release]});
 const both=await Promise.all([run('sendReleaseUpdate("t","123")'),run('sendReleaseUpdate("t","123")')]);
 assert.equal(both.reduce((n,r)=>n+r.delivered,0),1,'Concurrent checks deliver once');
 console.log('Telegram release regression checks passed: filtering, assets, escaping, rate limits, preferences, concurrent checks, rejection retries and ambiguous delivery.');
})().catch(e=>{console.error(e);process.exitCode=1});
