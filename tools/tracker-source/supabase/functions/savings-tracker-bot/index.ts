import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const HOOK_HASH = "62bebaca4a6106dad90a394e70388235d4a2647692bec817e87a0371b04015f4";
const CRON_HASH = "100cf671ab64982dd918ec7d3dc401a19882572fc2c56c8e9b7cafa94eb366de";
const TZ = "Asia/Kolkata";
const APP_URL = "https://nandakumarm.dpdns.org/track/";
type AnyRow = Record<string, any>;
const respond = (data: AnyRow, status=200) => new Response(JSON.stringify(data), {status,headers:{"content-type":"application/json","cache-control":"no-store"}});
function keyDate(date=new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
}
function previousMonth(month:string) {
  const y=Number(month.slice(0,4)), m=Number(month.slice(5,7));
  return m===1 ? String(y-1)+"-12" : String(y)+"-"+String(m-1).padStart(2,"0");
}
const amt=(n:number) => "₹"+new Intl.NumberFormat("en-IN",{maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
const rs=(n:number) => "Rs. "+new Intl.NumberFormat("en-IN",{maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
const num=(x:unknown) => typeof x==="number"&&Number.isFinite(x)?x:Number(x)||0;
function escape(t:unknown):string {return String(t??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}
function button(label:string,code:string){return {text:label,callback_data:code};}
const homeKeyboard = () => ({inline_keyboard:[
 [button("📊 Dashboard","dashboard"),button("📅 Month","month")],
 [button("🧾 Entries","entries"),button("🗂️ Plan","plan")],
 [button("💸 Budgets","budgets"),button("🏦 Reconcile","reconcile")],
 [button("💳 EMI & Loans","emi"),button("📈 Forecast","forecast")],
 [button("📄 PDF Reports","reports"),button("🔔 Alerts","alerts")],
 [button("🔄 Sync Check","sync"),button("⚙️ Settings","settings")],
 [button("🗄️ Backups","backups"),button("🛡️ Edit History","history")],
 [button("🔐 Edit Mode","e:open"),button("📊 Today","day")],
 [button("➕ New Entry","e:add"),button("ℹ️ Help & Privacy","help")],
 [{text:"🔐 Open Full Tracker",url:APP_URL},button("🟢 Status","status")]
]});
const back=(code="menu")=>({inline_keyboard:[[button("🏠 Main Menu",code)]]});
const pdfMenu=()=>({inline_keyboard:[
 [button("📄 Today PDF","pdfday"),button("📑 This Month PDF","pdfmonth")],
 [button("📆 Previous Month PDF","pdfprev")],
 [button("🏠 Main Menu","menu")]
]});
async function sha(value:string) {
 const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));
 return Array.from(bytes).map(n=>n.toString(16).padStart(2,"0")).join("");
}
function authChat(raw:unknown,chat:string) {
 return typeof raw==="number"&&String(raw)===chat;
}
function owns(update:AnyRow,owner:string) {
 const cb=update.callback_query, msg=update.message;
 const user=cb?.from??msg?.from, chat=cb?.message?.chat??msg?.chat;
 return user && !user.is_bot && authChat(user.id,owner) && chat?.type==="private" && authChat(chat.id,owner);
}
function secrets() {
 const token=Deno.env.get("TRACKER_TELEGRAM_BOT_TOKEN")?.trim()??"";
 const owner=Deno.env.get("TRACKER_TELEGRAM_CHAT_ID")?.trim()??"";
 if(!token||!/^[1-9][0-9]{3,15}$/.test(owner)) throw Error("Telegram bot configuration unavailable");
 return {token,owner};
}
async function telegram(method:string,token:string,body:AnyRow) {
 const res=await fetch("https://api.telegram.org/bot"+token+"/"+method,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(28000)});
 const ans=await res.json();
 if(!ans?.ok)throw Error("Telegram "+method+" failed");
 return ans.result;
}
async function message(token:string,owner:string,html:string,keyboard?:AnyRow,messageId?:number) {
 if(messageId) {
  try {await telegram("editMessageText",token,{chat_id:owner,message_id:messageId,text:html.slice(0,4000),parse_mode:"HTML",link_preview_options:{is_disabled:true},...(keyboard?{reply_markup:keyboard}:{})});return;}
  catch { /* A stale or unchanged panel falls back to a fresh message. */ }
 }
 await telegram("sendMessage",token,{chat_id:owner,text:html.slice(0,4000),parse_mode:"HTML",protect_content:true,link_preview_options:{is_disabled:true},...(keyboard?{reply_markup:keyboard}:{})});
}
function adminClient() {
 const url=Deno.env.get("SUPABASE_URL");
 const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const newer=Deno.env.get("SUPABASE_SECRET_KEYS");
 let secret=legacy;
 if(!secret&&newer)secret=JSON.parse(newer).default;
 if(!url||!secret)throw Error("Supabase server-side access is not configured");
 return createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
}
async function syncedPlan() {
 const {data,error}=await adminClient().from("tracker_plans").select("user_id,data,revision,updated_at").limit(2);
 if(error)throw Error("Unable to read tracker data");
 if(!data||data.length!==1)throw Error("Expected exactly one tracker plan; no financial data was returned");
 const plan=data[0].data as AnyRow;
 if(plan?.schemaVersion!==1||!Array.isArray(plan.entries)||!Array.isArray(plan.categories)||typeof plan.settings!=="object")
  throw Error("Unsupported tracker schema");
 return {plan,revision:data[0].revision,userId:String(data[0].user_id),updated:String(data[0].updated_at)};
}
function groupOf(entry:AnyRow,map:Map<string,AnyRow>) {return String(map.get(String(entry.categoryId))?.group??"Unknown");}
function dateRange(plan:AnyRow,begin:string,end:string) {
 const map=new Map<string,AnyRow>(plan.categories.map((c:AnyRow)=>[String(c.id),c]));
 const entries=(plan.entries as AnyRow[]).filter(e=>typeof e.date==="string"&&e.date>=begin&&e.date<=end);
 let income=0,living=0,debt=0,unknown=0;
 const byCat=new Map<string,number>();
 for(const e of entries) {
  const group=groupOf(e,map), amount=num(e.amount);
  if(group==="Income")income+=amount;
  else if(group==="Living")living+=amount;
  else if(group==="Debt")debt+=amount;
  else unknown+=amount;
  byCat.set(String(e.categoryId),(byCat.get(String(e.categoryId))??0)+amount);
 }
 return {entries,byCat,map,income,living,debt,unknown,expense:living+debt,net:income-living-debt};
}
function monthData(plan:AnyRow, month:string) {
 const last=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();
 return dateRange(plan,month+"-01",month+"-"+last);
}
function planPeriod(plan:AnyRow) {
 return String(plan.settings.planStart)+"-01";
}
function cashEstimate(plan:AnyRow, date:string) {
 const start=planPeriod(plan), end=String(plan.settings.planEnd)+"-31";
 if(date<start)return num(plan.settings.opening);
 return num(plan.settings.opening)+dateRange(plan,start,date>end?end:date).net;
}
function displayDate(value:string) {
 const d=new Date(value.length===10?value+"T00:00:00Z":value);
 if(!Number.isFinite(d.getTime()))return value;
 return new Intl.DateTimeFormat("en-GB",{timeZone:TZ,day:"2-digit",month:"short",year:"numeric"}).format(d).replaceAll(" ","-");
}
function validDate(value:string) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+"T00:00:00Z");
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function syncInfo(updated:string) {
 const days=Math.max(0,Math.floor((Date.now()-Date.parse(updated))/86400000));
 return "\n\n🔄 <i>Last cloud sync: "+escape(displayDate(updated))+(days>2?" · ⚠️ "+days+" days ago":"")+"</i>";
}
function categoriesByType(plan:AnyRow,group:string) {
 return (plan.categories as AnyRow[]).filter(c=>c.group===group&&c.active);
}
function entriesText(plan:AnyRow,updated:string) {
 const entries=(plan.entries as AnyRow[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,12);
 const map=new Map<string,string>(plan.categories.map((c:AnyRow)=>[String(c.id),String(c.name)]));
 const lines=entries.map(e=>"• "+escape(e.date)+" · "+escape(map.get(e.categoryId)||e.categoryId)+" · "+amt(num(e.amount))+" · "+escape(e.payment||"Other"));
 return "🧾 <b>RECENT SYNCED ENTRIES</b>\n━━━━━━━━━━━━━━━━━━\n"+(lines.join("\n")||"No transactions recorded.")+"\n\n<i>Showing the most recent 12 entries. Add or edit entries in the authenticated tracker.</i>"+syncInfo(updated);
}
function planText(plan:AnyRow,updated:string) {
 const s=plan.settings;
 return "🗂️ <b>FINANCIAL PLAN</b>\n━━━━━━━━━━━━━━━━━━\n"+
 "🗓️ Start: <b>"+escape(s.planStart)+"</b>\n"+
 "🏁 End: <b>"+escape(s.planEnd)+"</b>\n"+
 "💵 Opening savings: <b>"+amt(num(s.opening))+"</b>\n"+
 "💼 Base salary: <b>"+amt(num(s.salary31))+"</b>\n"+
 "📈 Salary after raise: <b>"+amt(num(s.raisedSalary))+"</b>\n"+
 "🔢 Categories: <b>"+plan.categories.length+"</b>\n"+
 "🧾 Cloud transactions: <b>"+plan.entries.length+"</b>\n\n"+
 "<i>Detailed forecasts and plan editing remain in the tracker app.</i>"+syncInfo(updated);
}
function budgetsText(plan:AnyRow,month:string,updated:string) {
 const parts=["💸 <b>BUDGETS — "+escape(month)+"</b>","━━━━━━━━━━━━━━━━━━"];
 let base=0;
 for(const group of ["Income","Living","Debt"]) {
  parts.push("\n<b>"+(group==="Income"?"💵 Income":group==="Living"?"🛒 Living":"💳 Debt")+"</b>");
  let shown=0;
  for(const c of categoriesByType(plan,group)) {
    if(Array.isArray(c.months)&&c.months.length&&!c.months.includes(Number(month.slice(5,7))))continue;
    if(c.role==="closure")continue;
    const v=num(c.amount);base+=group==="Income"?0:v;
    if(shown++<13)parts.push("• "+escape(c.name)+": "+amt(v));
  }
 }
 parts.push("\n<i>Base category amounts only. EMI timing, salary changes, overrides, and provisions may alter the full forecast shown in the app.</i>");
 return parts.join("\n")+syncInfo(updated);
}
function reportText(plan:AnyRow,mode:"day"|"month",date:string,updated:string) {
 const period=mode==="day"?date:date.slice(0,7);
 const out=mode==="day"?dateRange(plan,date,date):monthData(plan,period);
 const title=mode==="day"?"DAILY REPORT":"MONTHLY REPORT";
 const within=period>=String(plan.settings.planStart).slice(0,mode==="day"?7:7) && period.slice(0,7)<=String(plan.settings.planEnd);
 const lines=[
 "💰 <b>"+title+"</b>","━━━━━━━━━━━━━━━━━━",
 "📅 <b>"+escape(period)+"</b>",
 "💵 Income: <b>"+amt(out.income)+"</b>",
 "🛒 Living: "+amt(out.living),
 "💳 Debt/EMI: "+amt(out.debt),
 "📉 Total expenses: <b>"+amt(out.expense)+"</b>",
 "📈 Net savings: <b>"+amt(out.net)+"</b>",
 "🧾 Transactions: "+out.entries.length,
 ];
 if(mode==="day"||mode==="month") {
  const map=Array.from(out.byCat.entries()).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,7);
  if(map.length){lines.push("\n<b>Category breakdown</b>");for(const [id,val] of map) lines.push("• "+escape(out.map.get(id)?.name||id)+": "+amt(val));}
 }
 if(!within)lines.push("\n⚠️ <i>Period is outside your active financial plan. Entries are shown, but balances may not apply.</i>");
 else lines.push("\n🏦 <b>Estimated tracker cash:</b> "+amt(cashEstimate(plan,mode==="day"?date:date.slice(0,7)+"-"+new Date(Date.UTC(+date.slice(0,4),+date.slice(5,7),0)).getUTCDate())));
 lines.push("<i>Calculated from synced records; not a bank-verified balance.</i>");
 return lines.join("\n")+syncInfo(updated);
}
function balanceText(plan:AnyRow,updated:string) {
 const today=keyDate();
 const s=plan.settings, active=today>=planPeriod(plan)&&today<=String(s.planEnd)+"-31";
 return "🏦 <b>BALANCE OVERVIEW</b>\n━━━━━━━━━━━━━━━━━━\n"+
 "💰 Plan opening savings: <b>"+amt(num(s.opening))+"</b>\n"+
 "📈 Recorded cash estimate: <b>"+amt(cashEstimate(plan,today))+"</b>\n"+
 (active?"":"⚠️ <i>The plan is not active on today's date.</i>\n")+
 "\n<i>This is opening savings plus recorded in-plan transactions, not an independently reconciled bank or UPI balance. Transfers are not assumed.</i>"+syncInfo(updated);
}
function emiText(plan:AnyRow,updated:string) {
 const today=keyDate();
 const loans=[...(plan.loan?.rows||[]).map((r:AnyRow)=>({...r,label:"Main loan"})),...(plan.additionalLoans||[]).flatMap((l:AnyRow)=>(l.rows||[]).map((r:AnyRow)=>({...r,label:l.name||"Additional EMI"})))];
 const coming=loans.filter((r:AnyRow)=>String(r.dueDate||"")>=today && !r.paid).sort((a:AnyRow,b:AnyRow)=>String(a.dueDate).localeCompare(String(b.dueDate))).slice(0,8);
 const lines=coming.map((r:AnyRow)=>"• "+escape(r.dueDate)+" · "+escape(r.label)+" · "+amt(num(r.emi)-num(r.paidAmount)));
 return "💳 <b>UPCOMING EMI / LOANS</b>\n━━━━━━━━━━━━━━━━━━\n"+(lines.join("\n")||"No upcoming unpaid installments found.")+
 "\n\n<i>Payment dates and installment due dates differ. Confirm all actual payments in the tracker.</i>"+syncInfo(updated);
}
function savingsText(plan:AnyRow,updated:string) {
 const now=keyDate(),d=monthData(plan,now.slice(0,7)),s=plan.settings;
 return "📈 <b>SAVINGS PROGRESS</b>\n━━━━━━━━━━━━━━━━━━\n"+
 "🗓️ Month: "+escape(now.slice(0,7))+"\n"+
 "💵 Recorded income: "+amt(d.income)+"\n"+
 "📉 Recorded expenses: "+amt(d.expense)+"\n"+
 "💰 Net change: <b>"+amt(d.net)+"</b>\n"+
 "🏦 Estimated cash: <b>"+amt(cashEstimate(plan,now))+"</b>\n\n"+
 "<i>Actual entries only. Budget forecasts, EMI reserves and reconciliation are separate.</i>"+syncInfo(updated);
}
function pdfLines(plan:AnyRow,mode:"day"|"month",date:string,updated:string):string[] {
 const month=date.slice(0,7),byDay=mode==="day";
 const range=byDay?dateRange(plan,date,date):monthData(plan,month);
 const lines=[
  "FINANCIAL REPORT OVERVIEW",
  "Reporting period: "+(byDay?date:month),
  "Cloud last synced: "+updated,
  "Plan period: "+plan.settings.planStart+" to "+plan.settings.planEnd,
  "",
  "RECORDED TRANSACTIONS (ACTUAL)",
  "Income received: "+rs(range.income),
  "Living expenses paid: "+rs(range.living),
  "Debt / EMI payments recorded: "+rs(range.debt),
  "Total recorded expenses: "+rs(range.expense),
  "Recorded net change: "+rs(range.net),
  "Transaction count: "+range.entries.length,
  "Recorded cash estimate: "+rs(cashEstimate(plan,byDay?date:month+"-"+new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).getUTCDate())),
 ];
 if(daysSince(updated)>2) lines.push("WARNING: Cloud data is "+daysSince(updated)+" days old and may be incomplete.");
 if(!isInPlan(plan,month))lines.push("WARNING: This period is outside the plan; budget comparison is unavailable.");
 const prev=monthData(plan,previousMonth(month));
 if(!byDay&&prev.entries.length>0){
  lines.push("Previous month recorded net: "+rs(prev.net));
  lines.push("Month-on-month recorded net change: "+rs(range.net-prev.net));
 }
 if(!byDay&&isInPlan(plan,month)){
  const items=categoryBudgetItems(plan,month);
  const planned=items.reduce((a:number,x:AnyRow)=>a+x.planned,0);
  const spent=items.reduce((a:number,x:AnyRow)=>a+x.actual,0);
  lines.push("","REGULAR CATEGORY BUDGET VS ACTUAL",
    "Planned regular categories: "+rs(planned),
    "Actual recorded in regular categories: "+rs(spent),
    "Remaining / over budget: "+rs(planned-spent),
    "Excludes salary, EMI loans, provisions, and closure scenarios.",
    "","BUDGET COMPARISON CHART");
  lines.push("","CATEGORY DETAILS: RECORDED / PLANNED / GAP");
  for(const r of items.slice(0,45)){
   lines.push(String(r.cat.name).slice(0,35)+": "+rs(r.actual)+" / "+rs(r.planned)+" / "+rs(r.planned-r.actual));
  }
 }
 lines.push("","CATEGORY-WISE RECORDED TOTALS");
 const rows=[...range.byCat.entries()].sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
 for(const [id,value] of rows.slice(0,50)){
  lines.push(String(range.map.get(id)?.name||id).slice(0,38)+" : "+rs(value));
 }
 lines.push("","EXPENSES BY PAYMENT METHOD");
 const byPay=new Map<string,number>();
 for(const entry of range.entries){
  const group=range.map.get(entry.categoryId)?.group;
  if(group==="Living"||group==="Debt")byPay.set(String(entry.payment||"Other"),(byPay.get(String(entry.payment||"Other"))||0)+num(entry.amount));
 }
 for(const [method,value] of [...byPay.entries()].sort((a,b)=>b[1]-a[1]))lines.push(method+": "+rs(value));
 if(!byPay.size)lines.push("No recorded expense payments in period.");
 lines.push("","LOANS AND INSTALLMENTS (SCHEDULED - NOT CASH)");
 const now=date;
 const all=[
 ...(plan.loan?.rows||[]).map((r:AnyRow)=>({...r,label:"Main loan"})),
 ...(plan.additionalLoans||[]).flatMap((loan:AnyRow)=>(loan.rows||[]).map((r:AnyRow)=>({...r,label:loan.name||"Additional loan"})))
 ];
 const due=all.filter((r:AnyRow)=>r.dueDate>=now&&!r.paid&&!r.paidBeforeOpening).sort((a:AnyRow,b:AnyRow)=>String(a.dueDate).localeCompare(String(b.dueDate))).slice(0,8);
 for(const r of due)lines.push(String(r.dueDate)+" | "+r.label+" | outstanding "+rs(Math.max(0,num(r.emi)-num(r.paidAmount))));
 if(!due.length)lines.push("No upcoming unpaid installments found in synced plan.");
 lines.push("","BANK / CASH RECONCILIATION");
 const reconciliations=Array.isArray(plan.reconciliations)?plan.reconciliations:[];
 if(!reconciliations.length)lines.push("No verified statement reconciliation recorded.");
 else{
  const r=reconciliations[reconciliations.length-1];
  let income=0,expenses=0;
  const catMap=new Map<string,AnyRow>((plan.categories||[]).map((c:AnyRow)=>[c.id,c]));
  for(const e of plan.entries){
   if(e.date<r.fromDate||e.date>r.throughDate||(r.methods?.length&&!r.methods.includes(e.payment)))continue;
   if(catMap.get(e.categoryId)?.group==="Income")income+=num(e.amount);else expenses+=num(e.amount);
  }
  const calc=num(r.openingBalance)+income-expenses;
  lines.push("Latest: "+r.label+" ("+r.fromDate+" to "+r.throughDate+")",
   "Statement: "+rs(num(r.statementBalance))+" | Calculated: "+rs(calc),
   "Difference (statement - calculated): "+rs(num(r.statementBalance)-calc));
 }
 lines.push("","TRANSACTION LEDGER (ACTUAL)");
 const entries=range.entries.slice().sort((a:AnyRow,b:AnyRow)=>String(b.date).localeCompare(String(a.date))).slice(0,150);
 for(const entry of entries){
  lines.push(String(entry.date)+" | "+String(range.map.get(entry.categoryId)?.name||entry.categoryId).slice(0,23)+
   " | "+rs(num(entry.amount))+" | "+String(entry.payment||"Other"));
 }
 if(range.entries.length>entries.length)lines.push("Additional transactions omitted; see authenticated tracker for the full ledger.");
 lines.push("","DISCLAIMER");
 lines.push("This is a personal tracking summary, not an official bank statement.");
 lines.push("Recorded cash estimate is not a bank-verified or reconciled balance.");
 lines.push("Monthly budget comparison excludes EMI, loan closure and provisions.");
 return lines;
}
function ascii(value:string) {
 return value.normalize("NFKD").replace(/[^\x20-\x7e]/g,"?").replace(/\s+/g," ").trim();
}
async function sendPdf(token:string,owner:string,plan:AnyRow,mode:"day"|"month",date:string,updated:string) {
 const pdf=await PDFDocument.create();
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const pageSize:[number,number]=[595,842];
 let page=pdf.addPage(pageSize),y=742,number=1;
 function drawLayout() {
  page.drawRectangle({x:0,y:783,width:595,height:59,color:rgb(0.06,0.17,0.28)});
  page.drawText("SAVINGS  /  EXPENSE TRACKER",{x:42,y:807,size:17,font:bold,color:rgb(1,1,1)});
  page.drawText(mode==="day"?"DAILY FINANCIAL REPORT":"MONTHLY FINANCIAL REPORT",{x:43,y:793,size:9,font:regular,color:rgb(.68,.82,.92)});
  page.drawLine({start:{x:43,y:54},end:{x:552,y:54},thickness:0.5,color:rgb(.68,.75,.82)});
  page.drawText("PRIVATE - PERSONAL USE ONLY  |  INR",{x:43,y:41,size:8,font:regular,color:rgb(.40,.48,.57)});
  page.drawText("Page "+number,{x:505,y:41,size:8,font:regular,color:rgb(.40,.48,.57)});
 }
 drawLayout();
 function nextPage(){page=pdf.addPage(pageSize);number++;y=746;drawLayout();}
 function drawLine(text:string,header=false,first=false) {
  if(y<73)nextPage();
  const font=header?bold:regular,size=first?12:header?10.5:9;
  let line=ascii(text);
  while(line&&font.widthOfTextAtSize(line,size)>508)line=line.slice(0,-1);
  page.drawText(line||" ",{x:44,y,size,font,color:header?rgb(0.07,.34,.53):rgb(.14,.21,.28)});
  y-=header?23:15.5;
 }
 const headers=new Set(["FINANCIAL REPORT OVERVIEW","RECORDED TRANSACTIONS (ACTUAL)",
  "REGULAR CATEGORY BUDGET VS ACTUAL","BUDGET COMPARISON CHART",
  "CATEGORY DETAILS: RECORDED / PLANNED / GAP","CATEGORY-WISE RECORDED TOTALS",
  "EXPENSES BY PAYMENT METHOD","LOANS AND INSTALLMENTS (SCHEDULED - NOT CASH)",
  "BANK / CASH RECONCILIATION","TRANSACTION LEDGER (ACTUAL)","DISCLAIMER"]);
 const lines=pdfLines(plan,mode,date,updated);
 for(let i=0;i<lines.length;i++){
  const line=lines[i];const header=headers.has(line);
  if(line==="BUDGET COMPARISON CHART"&&mode==="month"&&isInPlan(plan,date.slice(0,7))){
   drawLine(line,true);
   const items=categoryBudgetItems(plan,date.slice(0,7)).filter((x:AnyRow)=>x.planned>0||x.actual>0)
    .sort((a:AnyRow,b:AnyRow)=>b.actual-a.actual).slice(0,6);
   if(!items.length)drawLine("No regular-category budget data is available.");
   for(const row of items){
    if(y<100)nextPage();
    const name=ascii(String(row.cat.name)).slice(0,23);
    const ceiling=Math.max(row.planned,row.actual,1);
    const plannedWidth=Math.min(186,186*row.planned/ceiling),actualWidth=Math.min(186,186*row.actual/ceiling);
    page.drawText(name,{x:46,y,size:9,font:regular,color:rgb(.14,.21,.28)});
    page.drawRectangle({x:206,y:y-1,width:plannedWidth,height:9,color:rgb(.77,.83,.88)});
    page.drawRectangle({x:206,y:y-1,width:actualWidth,height:4,color:rgb(.06,.52,.70)});
    page.drawText(ascii(rs(row.actual)).slice(0,17),{x:404,y,size:8,font:regular,color:rgb(.11,.28,.39)});
    y-=21;
   }
   drawLine("Gray = planned regular category budget; Blue = recorded paid amount.");
   continue;
  }
  drawLine(line,header,i===0);
 }
 const bytes=await pdf.save();
 const blob=new Blob([bytes],{type:"application/pdf"});
 const form=new FormData();
 form.append("chat_id",owner);
 form.append("document",blob,"Savings_"+(mode==="day"?"Daily_":"Monthly_")+date.replaceAll("-","")+".pdf");
 form.append("caption","📄 Private "+(mode==="day"?"daily":"monthly")+" financial report · "+date);
 form.append("protect_content","true");
 const response=await fetch("https://api.telegram.org/bot"+token+"/sendDocument",{method:"POST",body:form,signal:AbortSignal.timeout(45000)});
 const body=await response.json();
 if(!body.ok)throw Error("PDF was not accepted by Telegram");
}
async function showAction(action:string,token:string,owner:string,messageId?:number) {
 const {plan,updated}=await syncedPlan();
 const today=keyDate(),month=today.slice(0,7);
 let report:string|undefined;let kb:AnyRow=back();
 if(action==="menu"||action==="start") {
  report="⚡ <b>SAVINGS &amp; EXPENSE TRACKER</b>\n━━━━━━━━━━━━━━━━━━\n🔐 Your private money dashboard\n\n📊 Reports · Budgets · Savings · EMI\n📄 Private PDF reports\n✏️ Add and edit with your separate PIN\n\n👇 <b>Choose an option:</b>"+syncInfo(updated);kb=homeKeyboard();
 } else if(action==="plan")report=planText(plan,updated);
 else if(action==="dashboard")report=dashboardText(plan,updated);
 else if(action==="entries")report=entriesText(plan,updated);
 else if(action==="reconcile")report=reconciliationText(plan,updated);
 else if(action==="compare")report=budgetCompareText(plan,month,updated);
 else if(action==="sync")report=syncStatusText(plan,updated);
 else if(action==="forecast")report=forecastText(plan,updated);
 else if(action==="history")report=await auditText(updated);
 else if(action==="backups")report=await backupText();
 else if(action==="alerts")report=alertPreview(plan,updated,await botPreferences(owner));
 else if(action==="settings"){const prefs=await botPreferences(owner);report=settingsText(prefs);kb=settingsKeyboard(prefs);}
 else if(action==="pref:threshold") {
  report="💰 <b>CHANGE LOW-CASH THRESHOLD</b>\n━━━━━━━━━━━━━━━━━━\nSend a command such as:\n\n<code>/threshold 1500</code>\n\nThe threshold is based on estimated recorded cash, not your actual bank balance.";
  kb=back("settings");
 }
 else if(action==="/threshold"){
  report="Usage: <code>/threshold 1500</code>\nEnter an amount from ₹0 to ₹1,00,00,000.";
  kb=back("settings");
 }
 else if(action.startsWith("/threshold ")){
  const match=action.match(/^\/threshold\s+([0-9]+(?:\.[0-9]{1,2})?)$/);
  const amount=match?Number(match[1]):NaN;
  if(!Number.isFinite(amount)||amount<0||amount>10000000)report="⚠️ Invalid threshold. Send <code>/threshold 1500</code>.";
  else{
    const pref=await botPreferences(owner);
    const {error}=await adminClient().from("tracker_bot_preferences")
    .upsert({...pref,owner_chat_id:owner,low_balance_threshold:amount,updated_at:new Date().toISOString()},{onConflict:"owner_chat_id"});
    if(error)throw Error("Unable to set threshold");
    report="✅ New low estimated-cash threshold: <b>"+amt(amount)+"</b>.";
  }
  kb=back("settings");
 }
 else if(action.startsWith("pref:")){
  const prefs=await togglePreference(owner,action.slice(5));
  report="✅ <b>Notification setting updated.</b>\n\n"+settingsText(prefs);kb=settingsKeyboard(prefs);
 }
 else if(action==="budgets"){report=budgetCompareText(plan,month,updated);kb={inline_keyboard:[[button("🧾 Base Budget Details","budgetbase"),button("📅 Prior Month","compareprev")],[button("🏠 Main Menu","menu")]]};}
 else if(action==="budgetbase")report=budgetsText(plan,month,updated);
 else if(action==="compareprev")report=budgetCompareText(plan,previousMonth(month),updated);
 else if(action==="balance")report=balanceText(plan,updated);
 else if(action==="emi")report=emiText(plan,updated);
 else if(action==="savings")report=savingsText(plan,updated);
 else if(action==="day")report=reportText(plan,"day",today,updated);
 else if(action==="month")report=reportText(plan,"month",today,updated);
 else if(action==="prev")report=reportText(plan,"month",previousMonth(month)+"-01",updated);
 else if(action==="reports"){report="📄 <b>PRIVATE PDF REPORTS</b>\n━━━━━━━━━━━━━━━━━━\nYour reports are generated from your synced tracker records and delivered only to this chat.\n\nSelect a report:";kb=pdfMenu();}
 else if(action==="add") {
  report="➕ <b>ADD / EDIT ENTRY</b>\n━━━━━━━━━━━━━━━━━━\nFor financial-data safety, changes must still be entered in your authenticated tracker. Telegram can immediately display them after cloud sync.\n\n<a href=\""+APP_URL+"\">Open tracker to add an entry</a>";
  kb={inline_keyboard:[[{text:"🔐 Open Tracker",url:APP_URL}],[button("🏠 Main Menu","menu")]]};
 }
 else if(["pdfday","pdfmonth","pdfprev"].includes(action)) {
  const type=action==="pdfday"?"day":"month";
  const period=action==="pdfprev"?previousMonth(month)+"-01":today;
  await sendPdf(token,owner,plan,type,period,updated);
  report="✅ <b>PDF report delivered.</b>\n\nThe document contains synchronized summaries, categories, and transactions.";
  kb=pdfMenu();
 }
 else if(action==="status"){
  const state=await editState(owner);
  report="🟢 <b>BOT STATUS</b>\n\n🔐 Access: owner-only private chat\n✏️ Edit Mode: <b>"+(isUnlocked(state)?"Unlocked":"Locked")+"</b>\n🧾 Synced entries: "+plan.entries.length+"\n\n<i>Reports use cloud-synced records. Unsynced app changes will not appear yet.</i>"+syncInfo(updated);
  kb={inline_keyboard:[[button("🔐 Edit Mode","e:open"),button("🔒 Lock Now","e:lock")],[button("🏠 Main Menu","menu")]]};
 }
 else if(action==="help"){
  report="🧭 <b>COMMANDS</b>\n/start · /today · /month · /plan · /entries · /budget · /compare · /reconcile · /balance · /emi · /savings · /forecast · /sync · /alerts · /settings · /backups · /history · /pdf · /edit · /lock\n\nOnly the owner can access this bot. Editing requires a separate PIN.\n\n/lock locks editing immediately; /cancel abandons a pending edit. /status shows sync and edit-session state. Reports remain available while editing is locked. Every change requires Confirm & Save.";
  kb=homeKeyboard();
 }
 else {report="Unknown option. Select one below.";kb=homeKeyboard();}
 if(["day","month","prev","balance","savings","entries","plan"].includes(action)) {
  kb={inline_keyboard:[[button("📊 Today","day"),button("📅 Month","month")],[button("📄 PDF Reports","reports"),button("➕ New Entry","e:add")],[button("🏠 Main Menu","menu")]]};
 }
 await message(token,owner,report||"Please choose an option.",kb,messageId);
}
async function scheduled(kind:string,token:string,owner:string) {
 const {plan,updated}=await syncedPlan();const today=keyDate();
 if(kind==="alerts"){return await sendAlerts(token,owner,plan,updated);}
 if(kind==="daily"){
  if(!isInPlan(plan,today.slice(0,7)))return;
  await message(token,owner,"⏰ <b>Scheduled 9 PM report</b>\n\n"+reportText(plan,"day",today,updated),homeKeyboard());
 }
 else if(kind==="monthly") {
  const prev=previousMonth(today.slice(0,7));
  if(!isInPlan(plan,prev))return;
  await message(token,owner,"📅 <b>Previous month's summary</b>\n\n"+reportText(plan,"month",prev+"-01",updated),pdfMenu());
  if((await botPreferences(owner)).monthly_pdf_enabled)await sendPdf(token,owner,plan,"month",prev+"-01",updated);
 }
 else throw Error("Invalid schedule type");
}

// Private Edit Mode: only the configured Telegram account can enter here.
// PINs are salted and stretched with PBKDF2; never echo or log plaintext PINs.
type EditState = {
 owner_chat_id:string; pin_hash:string|null; pin_salt:string|null;
 unlocked_until:string|null; step:string; pending:Record<string,any>;
 failed_attempts:number; blocked_until:string|null; updated_at?:string;
};
function defaultEditState(owner:string):EditState {
 return {owner_chat_id:owner,pin_hash:null,pin_salt:null,unlocked_until:null,step:"locked",pending:{},failed_attempts:0,blocked_until:null};
}
async function editState(owner:string):Promise<EditState> {
 const {data,error}=await adminClient().from("tracker_telegram_edit_state").select("*").eq("owner_chat_id",owner).maybeSingle();
 if(error)throw Error("Private edit session unavailable");
 return data||defaultEditState(owner);
}
async function writeEditState(state:EditState) {
 const {error}=await adminClient().from("tracker_telegram_edit_state").upsert({...state,updated_at:new Date().toISOString()},{onConflict:"owner_chat_id"});
 if(error)throw Error("Unable to save private edit session");
}
function isUnlocked(state:EditState):boolean {
 return Boolean(state.pin_hash&&state.unlocked_until&&Date.parse(state.unlocked_until)>Date.now());
}
function lockoutActive(state:EditState):boolean {
 return Boolean(state.blocked_until&&Date.parse(state.blocked_until)>Date.now());
}
function newSalt() {
 const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
 return Array.from(bytes).map(v=>v.toString(16).padStart(2,"0")).join("");
}
async function pinHash(pin:string,salt:string):Promise<string> {
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),{name:"PBKDF2"},false,["deriveBits"]);
 const saltBytes=Uint8Array.from(salt.match(/.{2}/g)!.map(x=>parseInt(x,16)));
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:saltBytes,iterations:250000,hash:"SHA-256"},key,256);
 return Array.from(new Uint8Array(bits)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function sameHash(a:string,b:string):boolean {
 if(a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
async function eraseSecret(token:string,owner:string,update:AnyRow) {
 const msg=update.message;
 if(!msg?.message_id)return;
 try {await telegram("deleteMessage",token,{chat_id:owner,message_id:msg.message_id});} catch { /* Message may already have been removed */ }
}
const editMenu=()=>({inline_keyboard:[
 [button("➕ New Entry","e:add"),button("✏️ Edit Entry","e:entries")],
 [button("💸 Change Budget","e:budget")],
 [button("🔒 Lock Edit Mode","e:lock")],
 [button("🏠 Reports Menu","menu"),{text:"🔐 Full Tracker",url:APP_URL}]
]});
function editIntro() {
 return "🔓 <b>EDIT MODE UNLOCKED</b>\n━━━━━━━━━━━━━━━━━━\n"+
 "Choose a task. Saving requires a separate confirmation.\n"+
 "⏳ <i>Session expires after 10 minutes.</i>\n\n"+
 "🛡️ The bot rejects cloud changes made after you opened an edit.";
}
async function editSend(token:string,owner:string,htmlText:string,keyboard?:AnyRow){
 await message(token,owner,htmlText,keyboard||back());
}
function editCategories(plan:AnyRow,what:"add"|"budget"):AnyRow[] {
 return (plan.categories||[]).filter((c:AnyRow)=>c.active && c.role!=="emi" && c.role!=="closure" &&
    (what==="add" || (!plan.provisions?.some((p:AnyRow)=>p.enabled&&p.categoryId===c.id) && c.role!=="salary")));
}
function editKeyboard(rows:AnyRow[],prefix:string,backCode="e:menu") {
 const controls=rows.slice(0,30).map((c,i)=>[button((c.group==="Income"?"💵 ":c.group==="Debt"?"💳 ":"🛒 ")+String(c.name).slice(0,32),prefix+i)]);
 controls.push([button("↩️ Back",backCode)]);
 return {inline_keyboard:controls};
}
function recentEditableEntries(plan:AnyRow):AnyRow[] {
 return (plan.entries||[]).filter((e:AnyRow)=>!e.loanRowId&&!e.provisionId)
 .slice().sort((a:AnyRow,b:AnyRow)=>String(b.date).localeCompare(String(a.date))).slice(0,12);
}
function updatePreview(state:EditState,plan:AnyRow):string {
 const p=state.pending;
 if(p.action==="add"){
  const cat=plan.categories.find((c:AnyRow)=>c.id===p.categoryId);
  return "➕ <b>CONFIRM NEW ENTRY</b>\n━━━━━━━━━━━━━━━━━━\n"+
  "📅 Date: "+escape(p.date)+"\n"+
  "📁 Category: "+escape(cat?.name||"Unknown")+"\n"+
  "💰 Amount: "+amt(p.amount)+"\n"+
  "📝 Details: "+escape(p.description)+"\n"+
  "💳 Paid via: "+escape(p.payment)+"\n\n"+
  "<b>Save this transaction to your synced tracker?</b>";
 }
 if(p.action==="budget"){
  const cat=plan.categories.find((c:AnyRow)=>c.id===p.categoryId);
  return "💸 <b>CONFIRM BUDGET CHANGE</b>\n━━━━━━━━━━━━━━━━━━\n"+
  "📁 "+escape(cat?.name||"Unknown")+"\n"+
  "Before: "+amt(p.before)+"\nAfter: <b>"+amt(p.amount)+"</b>\n\n"+
  "<i>Updates the category's base amount. Monthly overrides are retained.</i>\n\n"+
  "<b>Save this budget change?</b>";
 }
 const entry=plan.entries.find((e:AnyRow)=>e.id===p.entryId);
 if(p.action==="editamount"){
  return "✏️ <b>CONFIRM ENTRY CHANGE</b>\n━━━━━━━━━━━━━━━━━━\n"+
  "📅 "+escape(entry?.date)+"\n"+
  "Before: "+amt(p.before)+"\nAfter: <b>"+amt(p.amount)+"</b>\n\n"+
  "<b>Update this transaction?</b>";
 }
 return "🗑️ <b>CONFIRM DELETE</b>\n━━━━━━━━━━━━━━━━━━\n"+
 "📅 "+escape(entry?.date)+"\n💰 "+amt(num(entry?.amount))+"\n\n"+
 "⚠️ <b>Delete this transaction permanently?</b>";
}
const saveKeyboard=()=>({inline_keyboard:[[button("✅ Confirm & Save","e:confirm"),button("❌ Cancel","e:cancel")]]});
async function saveEdit(plan:AnyRow,userId:string,revision:number,state:EditState):Promise<boolean> {
 const pending=state.pending;
 if(pending.revision!==revision)throw Error("stale_revision");
 if(!["add","budget","editamount","delete"].includes(pending.action))throw Error("invalid_edit");
 const payload:any = pending.action==="add"
  ? {id:pending.id,date:pending.date,categoryId:pending.categoryId,description:pending.description,amount:pending.amount,payment:pending.payment}
  : pending.action==="budget" ? {categoryId:pending.categoryId,amount:pending.amount}
  : pending.action==="delete" ? {entryId:pending.entryId}
  : {entryId:pending.entryId,amount:pending.amount};
 const {data,error}=await adminClient().rpc("tracker_bot_apply_edit",{
  p_owner:userId,p_expected_revision:revision,p_action:pending.action,p_payload:payload
 });
 if(error)throw Error("Atomic tracker edit failed");
 return data?.ok===true;
}
async function handleEdit(update:AnyRow,raw:string,token:string,owner:string):Promise<void> {
 const state=await editState(owner);
 const isText=!!update.message&&typeof update.message?.text==="string";
 const now=Date.now();
 const prepared=state.step==="setup"||state.step==="setupConfirm"||state.step==="pin"||state.step==="amount"||
   state.step==="date"||state.step==="description"||state.step==="budgetAmount"||state.step==="entryAmount";
 if(isText&&prepared&&!raw.startsWith("/")&&!raw.startsWith("e:")){
  if(["setup","setupConfirm","pin"].includes(state.step)) {
   await eraseSecret(token,owner,update);
   if(lockoutActive(state)){await editSend(token,owner,"🔒 Too many attempts. Try again after your temporary lockout.");return;}
   if(!/^[0-9]{6}$/.test(raw)){await editSend(token,owner,"⚠️ Enter <b>exactly six digits</b>. Do not reuse an account password.");return;}
   if(state.step==="setup"){
    const salt=newSalt(),digest=await pinHash(raw,salt);
    state.pending={salt,digest};
    state.step="setupConfirm";await writeEditState(state);
    await editSend(token,owner,"🔐 <b>Confirm your new PIN</b>\n\nSend the same six digits again. Your PIN message will be deleted where Telegram permits.");
    return;
   }
   if(state.step==="setupConfirm"){
    const digest=await pinHash(raw,state.pending.salt);
    if(!sameHash(digest,state.pending.digest)) {
     state.step="setup";state.pending={};await writeEditState(state);
     await editSend(token,owner,"⚠️ PINs did not match. Choose a new six-digit PIN.");
     return;
    }
    state.pin_salt=state.pending.salt;state.pin_hash=digest;
    state.pending={};state.step="menu";state.unlocked_until=new Date(now+600000).toISOString();
    state.failed_attempts=0;state.blocked_until=null;await writeEditState(state);
    await editSend(token,owner,"✅ <b>Your Edit Mode PIN is set.</b>\n\n"+editIntro(),editMenu());
    return;
   }
   const valid=sameHash(await pinHash(raw,state.pin_salt||"00".repeat(16)),state.pin_hash||"");
   if(!valid){
    state.failed_attempts=Math.min(5,(state.failed_attempts||0)+1);
    if(state.failed_attempts>=5){state.blocked_until=new Date(now+30*60000).toISOString();state.step="locked";}
    await writeEditState(state);
    await editSend(token,owner,state.failed_attempts>=5?"🔒 Locked for 30 minutes after five incorrect PINs.":"❌ Incorrect PIN. "+(5-state.failed_attempts)+" attempt(s) remaining.");
    return;
   }
   state.unlocked_until=new Date(now+600000).toISOString();state.failed_attempts=0;state.blocked_until=null;
   state.step="menu";state.pending={};await writeEditState(state);
   await editSend(token,owner,editIntro(),editMenu());return;
  }
  if(!isUnlocked(state)){state.step="locked";state.pending={};await writeEditState(state);await editSend(token,owner,"🔒 Edit session expired. Open Edit Mode to unlock.");return;}
  const p=state.pending;
  if(state.step==="amount"||state.step==="budgetAmount"||state.step==="entryAmount"){
   const n=Number(raw.replaceAll(",","").replace(/^₹/,"").trim());
   if(!/^(?:\d{1,8})(?:\.\d{1,2})?$/.test(raw.replaceAll(",","").replace(/^₹/,"").trim()) || !Number.isFinite(n) || n>(state.step==="budgetAmount"?10000000:10000000) || n<(state.step==="budgetAmount"?0:0.01)){
    await editSend(token,owner,"⚠️ Enter a valid nonnegative amount in rupees with up to 2 decimal places.");return;
   }
   p.amount=n;
   if(state.step==="amount"){state.step="date";await writeEditState(state);await editSend(token,owner,"📅 Enter the transaction date as <b>YYYY-MM-DD</b>.\n\nIt must be within the plan period.");return;}
   state.step="confirm";await writeEditState(state);
   const {plan}=await syncedPlan();
   await editSend(token,owner,updatePreview(state,plan),saveKeyboard());return;
  }
  if(state.step==="date"){
   if(!validDate(raw)){
    await editSend(token,owner,"📅 Invalid date. Enter a valid <b>YYYY-MM-DD</b> date.");return;
   }
   const {plan}=await syncedPlan();
   if(raw.slice(0,7)<plan.settings.planStart||raw.slice(0,7)>plan.settings.planEnd){
    await editSend(token,owner,"⚠️ Date is outside your plan. Choose a date between "+escape(plan.settings.planStart)+" and "+escape(plan.settings.planEnd)+".");return;
   }
   p.date=raw;state.step="description";await writeEditState(state);
   await editSend(token,owner,"📝 Enter a short transaction description (up to 100 characters).");return;
  }
  if(state.step==="description"){
   const value=raw.trim();
   if(value.length<1||value.length>100){await editSend(token,owner,"Enter a description between 1 and 100 characters.");return;}
   p.description=value;state.step="payment";await writeEditState(state);
   await editSend(token,owner,"💳 Select the payment method:",{inline_keyboard:[
    [button("UPI","e:pay:UPI"),button("Bank","e:pay:Bank")],
    [button("Cash","e:pay:Cash"),button("Card","e:pay:Card")],
    [button("Other","e:pay:Other")],
    [button("❌ Cancel","e:cancel")]
   ]});return;
  }
 }
 if(raw==="/lock"||raw==="e:lock"){state.step="locked";state.unlocked_until=null;state.pending={};await writeEditState(state);await editSend(token,owner,"🔒 <b>Edit Mode locked.</b>\nReporting and PDF commands are still available.",back());return;}
 if(raw==="/cancel"||raw==="e:cancel"){state.step=isUnlocked(state)?"menu":"locked";state.pending={};await writeEditState(state);await editSend(token,owner,isUnlocked(state)?editIntro():"Edit operation cancelled.",isUnlocked(state)?editMenu():back());return;}
 if(raw==="/edit"||raw==="e:open"){
  if(!state.pin_hash){
   await editSend(token,owner,"🔐 <b>FIRST-TIME EDIT MODE SETUP</b>\n━━━━━━━━━━━━━━━━━━\nCreate your own unique six-digit PIN using the button below.\n\n⚠️ Telegram bot chats are <b>not end-to-end encrypted</b>. Do not reuse your bank, Google, or tracker password.\nPIN messages are deleted when supported.",{inline_keyboard:[[button("🔢 Create 6-digit PIN","e:setup")],[button("🏠 Reports Menu","menu")]]});return;
  }
  if(isUnlocked(state)){await editSend(token,owner,editIntro(),editMenu());return;}
  if(lockoutActive(state)){await editSend(token,owner,"🔒 Editing is temporarily locked due to incorrect PIN attempts.");return;}
  await editSend(token,owner,"🔒 <b>EDIT MODE IS LOCKED</b>\n\nReporting remains available. Tap Unlock to enter your separate six-digit PIN.",{inline_keyboard:[[button("🔓 Unlock Edit Mode","e:unlock")],[button("🏠 Reports Menu","menu")]]});return;
 }
 if(raw==="e:setup"){
  if(state.pin_hash){await editSend(token,owner,"PIN already configured. Unlock Edit Mode to continue.");return;}
  state.step="setup";state.pending={};await writeEditState(state);
  await editSend(token,owner,"🔢 <b>Create your separate six-digit PIN</b>\n\nSend a six-digit number now. Do not reuse a banking PIN or primary password.");return;
 }
 if(raw==="e:unlock"){
  if(!state.pin_hash){await editSend(token,owner,"Create your PIN first using Edit Mode.");return;}
  if(lockoutActive(state)){await editSend(token,owner,"🔒 Too many incorrect PIN attempts. Try again later.");return;}
  state.step="pin";state.pending={};await writeEditState(state);
  await editSend(token,owner,"🔐 Enter your six-digit Edit Mode PIN. It will be deleted from the chat where permitted.");return;
 }
 if(!isUnlocked(state)){await editSend(token,owner,"🔒 Editing is locked. Open Edit Mode to unlock.",{inline_keyboard:[[button("🔓 Edit Mode","e:open")]]});return;}
 if(raw==="e:menu"){state.step="menu";state.pending={};await writeEditState(state);await editSend(token,owner,editIntro(),editMenu());return;}
 if(raw==="e:add"||raw==="e:budget"){
  const {plan,revision}=await syncedPlan();
  const what=raw==="e:add"?"add":"budget";state.step="select";state.pending={action:what,revision};
  await writeEditState(state);await editSend(token,owner,
    what==="add"?"➕ <b>NEW TRANSACTION</b>\n\nSelect a category:":"💸 <b>CHANGE BASE BUDGET</b>\n\nSelect a regular category:",
    editKeyboard(editCategories(plan,what),what==="add"?"e:cat:":"e:bcat:"));return;
 }
 if(raw==="e:entries"){
  const {plan,revision}=await syncedPlan();state.step="selectEntry";state.pending={revision};await writeEditState(state);
  const rows=recentEditableEntries(plan);
  const keyboard=rows.map((e,i)=>[button(String(e.date)+" · "+String(e.categoryId).slice(0,14)+" · "+amt(num(e.amount)),"e:row:"+i)]);
  keyboard.push([button("↩️ Edit Menu","e:menu")]);
  await editSend(token,owner,"✏️ <b>EDIT OR DELETE ENTRY</b>\n\nChoose one of the recent, unlinked transactions.\n<i>Loan or provision payments are edited in the tracker app.</i>",{inline_keyboard:keyboard});return;
 }
 if(raw.startsWith("e:cat:")||raw.startsWith("e:bcat:")){
  const {plan,revision}=await syncedPlan();
  const type=raw.startsWith("e:cat:")?"add":"budget";
  if(state.pending?.action!==type||state.pending.revision!==revision){await editSend(token,owner,"Tracker changed. Open Edit Mode and restart this action.");return;}
  const index=Number(raw.split(":")[2]),arr=editCategories(plan,type);
  if(!Number.isInteger(index)||index<0||index>=arr.length)return;
  state.pending.categoryId=arr[index].id;
  if(type==="add"){state.pending.id=crypto.randomUUID();state.step="amount";await writeEditState(state);await editSend(token,owner,"💰 Enter transaction amount in rupees (e.g. <code>150.00</code>).");}
  else {state.pending.before=num(arr[index].amount);state.step="budgetAmount";await writeEditState(state);await editSend(token,owner,"💸 Current base amount: "+amt(state.pending.before)+"\n\nEnter the new monthly base budget amount.");}
  return;
 }
 if(raw.startsWith("e:row:")){
  const {plan,revision}=await syncedPlan();
  if(state.pending.revision!==revision||state.step!=="selectEntry"){await editSend(token,owner,"Tracker changed. Restart entry editing.");return;}
  const index=Number(raw.split(":")[2]),entries=recentEditableEntries(plan);
  if(!Number.isInteger(index)||index<0||index>=entries.length)return;
  state.pending.entryId=entries[index].id;state.pending.before=num(entries[index].amount);state.step="entryOptions";await writeEditState(state);
  await editSend(token,owner,"✏️ <b>ENTRY OPTIONS</b>\n\nDate: "+escape(entries[index].date)+"\nAmount: "+amt(entries[index].amount),{inline_keyboard:[
   [button("✏️ Change Amount","e:change")],[button("🗑️ Delete Entry","e:delete")],[button("↩️ Back","e:entries")]
  ]});return;
 }
 if(raw==="e:change"){
  if(state.step!=="entryOptions")return;
  state.pending.action="editamount";state.step="entryAmount";await writeEditState(state);
  await editSend(token,owner,"💰 Enter the updated amount for this transaction.");return;
 }
 if(raw==="e:delete"){
  if(state.step!=="entryOptions")return;
  state.pending.action="delete";state.step="confirm";await writeEditState(state);
  const {plan}=await syncedPlan();await editSend(token,owner,updatePreview(state,plan),saveKeyboard());return;
 }
 if(raw.startsWith("e:pay:")){
  if(state.step!=="payment"||state.pending.action!=="add")return;
  const payment=raw.slice(6);
  if(!["UPI","Bank","Cash","Card","Other"].includes(payment))return;
  state.pending.payment=payment;state.step="confirm";await writeEditState(state);
  const {plan}=await syncedPlan();await editSend(token,owner,updatePreview(state,plan),saveKeyboard());return;
 }
 if(raw==="e:confirm"){
  if(state.step!=="confirm"){await editSend(token,owner,"This edit is no longer awaiting confirmation.");return;}
  const {plan,revision,userId}=await syncedPlan();
  let saved=false;
  try{saved=await saveEdit(plan,userId,revision,state);}
  catch(e){console.error("Tracker edit rejected: ",e instanceof Error?e.message:"invalid");}
  state.step="menu";state.pending={};await writeEditState(state);
  await editSend(token,owner,saved?"✅ <b>Saved successfully!</b>\nYour tracker will receive the change at its next cloud sync.":"⚠️ <b>Change was NOT saved.</b>\nThe tracker changed or the update was invalid. Refresh your tracker and retry.",editMenu());return;
 }
 await editSend(token,owner,editIntro(),editMenu());
}

const PROFILE_JPEG = "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";
async function configureBranding(token:string,owner:string) {
 const photoBytes=Uint8Array.from(atob(PROFILE_JPEG),c=>c.charCodeAt(0));
 const form=new FormData();
 form.append("photo",JSON.stringify({type:"static",photo:"attach://avatar"}));
 form.append("avatar",new Blob([photoBytes],{type:"image/jpeg"}),"savings.jpg");
 const res=await fetch("https://api.telegram.org/bot"+token+"/setMyProfilePhoto",{method:"POST",body:form,signal:AbortSignal.timeout(28000)});
 const photo=await res.json();if(!photo.ok)throw Error("Profile photo update failed");
 await telegram("setMyName",token,{name:"Savings & Expense Tracker"});
 await telegram("setMyShortDescription",token,{short_description:"Your private money dashboard: reports, budgets, savings, EMI and PIN-protected editing."});
 await telegram("setMyDescription",token,{description:"Your private Savings & Expense Tracker companion.\n\nView synced reports, budgets, savings and EMI. Download PDF reports. Add and edit entries using a separate PIN, with confirmation before saving.\n\nOwner-only access. Send /start to open your dashboard."});
 const commands=[
  ["dashboard","Open your financial dashboard"],["forecast","View forecast information"],["reconcile","Bank and cash reconciliation"],["compare","Compare budgets and actuals"],["sync","Check cloud synchronization"],["alerts","Preview private alerts"],["settings","Notification settings"],["history","Review edit history"],["backups","View available backups"],["plan","View financial plan"],["start","Open your private dashboard"],["today","Today's income and expenses"],
  ["month","This month's report"],["entries","Recent transactions"],["budgets","View category budgets"],
  ["balance","View recorded balance estimate"],["emi","Upcoming loan installments"],
  ["pdf","Download a private PDF report"],["edit","Unlock PIN-protected editing"],
  ["lock","Lock Edit Mode now"],["cancel","Cancel the pending edit"],["status","Sync and edit-session status"],["help","Help and privacy"]
 ].map(([command,description])=>({command,description}));
 await telegram("setMyCommands",token,{commands,scope:{type:"chat",chat_id:Number(owner)}});
 for(const type of ["default","all_private_chats","all_group_chats","all_chat_administrators"])
  await telegram("deleteMyCommands",token,{scope:{type}});
 await telegram("setChatMenuButton",token,{chat_id:Number(owner),menu_button:{type:"commands"}});
 const me=await telegram("getMe",token,{});
 const photos=await telegram("getUserProfilePhotos",token,{user_id:me.id,limit:1});
 const description=await telegram("getMyShortDescription",token,{});
 if(!photos.total_count||!description.short_description?.includes("private money dashboard"))throw Error("Branding verification failed");
 await message(token,owner,"✨ <b>Your private dashboard has been refreshed</b>\n\nNew profile picture, clearer navigation and updated editing help. Your existing PIN and tracker data are unchanged.\n\nUse /status for sync and edit-session status.",homeKeyboard());
 return {ok:true,profile_verified:true,commands:commands.length};
}


// Financial reporting uses independent labels for actuals, budgets, estimates and reconciliation.
function daysSince(updated:string) {return Math.max(0,Math.floor((Date.now()-Date.parse(updated))/86400000));}
function isInPlan(plan:AnyRow,month:string) {
 return month>=String(plan.settings?.planStart)&&month<=String(plan.settings?.planEnd);
}
function budgetAmount(plan:AnyRow,cat:AnyRow,month:string):number|null {
 if(!isInPlan(plan,month)||cat.active!==true||cat.role!=="regular")return null;
 if(Array.isArray(cat.months)&&cat.months.length&&!cat.months.includes(Number(month.slice(5,7))))return 0;
 if((plan.provisions||[]).some((r:AnyRow)=>r.enabled&&r.categoryId===cat.id))return null;
 const override=plan.overrides?.[month+"|"+cat.id];
 return num(override===undefined?cat.amount:override);
}
function categoryBudgetItems(plan:AnyRow,month:string) {
 const a=monthData(plan,month);
 return (plan.categories||[]).filter((c:AnyRow)=>c.group==="Living"||c.group==="Debt")
 .map((cat:AnyRow)=>({cat,planned:budgetAmount(plan,cat,month),actual:a.byCat.get(String(cat.id))||0}))
 .filter((x:AnyRow)=>x.planned!==null);
}
function diffAmount(n:number){return (n>=0?"+":"-")+amt(Math.abs(n));}
function budgetCompareText(plan:AnyRow,month:string,updated:string) {
 if(!isInPlan(plan,month))return "📊 <b>BUDGET VS ACTUAL</b>\n\nPlan period: "+escape(plan.settings.planStart)+" to "+escape(plan.settings.planEnd)+". Select a month within the plan.";
 const rows=categoryBudgetItems(plan,month);
 const p=rows.reduce((n:number,x:AnyRow)=>n+x.planned,0);
 const actual=rows.reduce((n:number,x:AnyRow)=>n+x.actual,0);
 const lines=["📊 <b>BUDGET VS ACTUAL</b>","━━━━━━━━━━━━━━━━━━","🗓️ "+escape(month),
 "📋 Regular category budget: <b>"+amt(p)+"</b>",
 "🧾 Recorded spending: <b>"+amt(actual)+"</b>",
 "📉 Budget remaining: <b>"+diffAmount(p-actual)+"</b>","\n<b>Regular categories</b>"];
 for(const x of rows.slice(0,15)){
  const percent=x.planned>0?Math.round(x.actual/x.planned*100):x.actual>0?999:0;
  lines.push("• "+escape(x.cat.name)+": "+amt(x.actual)+" / "+amt(x.planned)+(x.planned>0?" · "+percent+"%":""));
 }
 lines.push("\n<i>Excludes salary, loans, EMI schedules, provision reserves and closure calculations. Category overrides are included.</i>");
 return lines.join("\n")+syncInfo(updated);
}
function reconciliationText(plan:AnyRow,updated:string){
 const list=Array.isArray(plan.reconciliations)?plan.reconciliations:[];
 if(!list.length)return "🏦 <b>BANK & CASH RECONCILIATION</b>\n━━━━━━━━━━━━━━━━━━\nNo saved reconciliation was found in the latest synced plan.\n\nBank, UPI and Card often share one bank account, so they must not be added as independent balances.\n\n<a href=\""+APP_URL+"\">Open tracker to set up reconciliation</a>"+syncInfo(updated);
 const lines=["🏦 <b>RECONCILIATION</b>","━━━━━━━━━━━━━━━━━━"];
 const map=new Map<string,AnyRow>(plan.categories.map((c:AnyRow)=>[c.id,c]));
 for(const r of list.slice(-5)){
   let inc=0,out=0;
   for(const e of plan.entries){
     if(e.date<r.fromDate||e.date>r.throughDate|| (r.methods?.length&&!r.methods.includes(e.payment)))continue;
     const c=map.get(e.categoryId);if(!c)continue;
     if(c.group==="Income")inc+=num(e.amount);else out+=num(e.amount);
   }
   const calculated=num(r.openingBalance)+inc-out;
   const difference=num(r.statementBalance)-calculated;
   lines.push("\n<b>"+escape(r.label)+"</b>","Period: "+escape(r.fromDate)+" to "+escape(r.throughDate),
    "Recorded estimate: "+amt(calculated),"Statement balance: "+amt(num(r.statementBalance)),
    "Difference: <b>"+diffAmount(difference)+"</b>");
 }
 lines.push("\n<i>Comparison only. No automatic adjustment was inserted.</i>");
 return lines.join("\n")+syncInfo(updated);
}
function paymentSummary(plan:AnyRow,month:string){
 const d=monthData(plan,month),by=new Map<string,number>();
 for(const e of d.entries)by.set(e.payment||"Other",(by.get(e.payment||"Other")||0)+num(e.amount)*(d.map.get(e.categoryId)?.group==="Income"?1:-1));
 return [...by.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
}
function dashboardText(plan:AnyRow,updated:string) {
 const date=keyDate(),month=date.slice(0,7),d=monthData(plan,month);
 return "📊 <b>PERSONAL FINANCE DASHBOARD</b>\n━━━━━━━━━━━━━━━━━━\n"+
 "📅 "+escape(date)+"\n"+
 "💵 Recorded monthly income: "+amt(d.income)+"\n"+
 "💸 Recorded monthly expenses: "+amt(d.expense)+"\n"+
 "💰 Recorded monthly net: <b>"+amt(d.net)+"</b>\n"+
 "🧾 Synced transactions: "+plan.entries.length+"\n"+
 "🏦 Estimated recorded cash: "+amt(cashEstimate(plan,date))+"\n\n"+
 (isInPlan(plan,month)?"":"⚠️ Plan does not begin until "+escape(plan.settings.planStart)+".\n")+
 (daysSince(updated)>2?"⚠️ <b>Cloud data is stale; reports may be incomplete.</b>\n":"")+
 "<i>Recorded amounts are not bank-verified balances. Planned bills and unpaid EMIs are not recorded expenses.</i>"+syncInfo(updated);
}
function syncStatusText(plan:AnyRow,updated:string){
 const age=daysSince(updated);
 return "🔄 <b>CLOUD SYNCHRONIZATION</b>\n━━━━━━━━━━━━━━━━━━\n"+
 "Last sync: <b>"+escape(updated)+"</b>\n"+
 "Data age: "+age+" day(s)\n"+
 "Synced transactions: "+plan.entries.length+"\n"+
 "Plan period: "+escape(plan.settings.planStart)+" to "+escape(plan.settings.planEnd)+"\n\n"+
 (age>=2?"⚠️ <b>Warning: Data has not been updated recently.</b>\nOpen the tracker on your phone or computer and sync before trusting reports.":"✅ Cloud data was recently updated.")+
 "\n\n<a href=\""+APP_URL+"\">Open authenticated tracker</a>";
}
async function botPreferences(owner:string) {
 const {data,error}=await adminClient().from("tracker_bot_preferences").select("*").eq("owner_chat_id",owner).maybeSingle();
 if(error)throw Error("Preferences unavailable");
 return data||{owner_chat_id:owner,alerts_enabled:true,emi_reminders:true,budget_alerts:true,
 sync_alerts:true,low_balance_alerts:true,low_balance_threshold:1000,monthly_pdf_enabled:true};
}
const prefOptions:Record<string,string>={
 all:"alerts_enabled",emi:"emi_reminders",budget:"budget_alerts",
 sync:"sync_alerts",balance:"low_balance_alerts",pdf:"monthly_pdf_enabled"
};
function settingsKeyboard(p:AnyRow) {
 const b=(label:string,key:string,val:boolean)=>button((val?"✅ ":"⬜ ")+label,"pref:"+key);
 return {inline_keyboard:[
  [b("Enable alerts","all",p.alerts_enabled)],
  [b("EMI reminders","emi",p.emi_reminders),b("Budget alerts","budget",p.budget_alerts)],
  [b("Sync warnings","sync",p.sync_alerts),b("Low balance","balance",p.low_balance_alerts)],
  [b("Monthly PDF","pdf",p.monthly_pdf_enabled)],
  [button("💰 Change low-cash threshold","pref:threshold")],
  [button("🔄 Sync status","sync"),button("🏠 Main Menu","menu")]
 ]};
}
function settingsText(p:AnyRow){
 return "⚙️ <b>NOTIFICATIONS & SETTINGS</b>\n━━━━━━━━━━━━━━━━━━\n"+
 "Alerts: "+(p.alerts_enabled?"On":"Off")+
 "\nEMI reminders: "+(p.emi_reminders?"On":"Off")+
 "\nBudget alerts: "+(p.budget_alerts?"On":"Off")+
 "\nSync warnings: "+(p.sync_alerts?"On":"Off")+
 "\nLow-balance warnings: "+(p.low_balance_alerts?"On":"Off")+
 "\nEstimated cash threshold: "+amt(num(p.low_balance_threshold))+
 "\nMonthly PDF: "+(p.monthly_pdf_enabled?"On":"Off")+
 "\n\n<i>Alerts use synced tracker data and are not bank transaction notifications. Settings do not require an editing PIN.</i>";
}
async function togglePreference(owner:string,key:string){
 const field=prefOptions[key];if(!field)throw Error("Unknown setting");
 const p=await botPreferences(owner);
 const next={owner_chat_id:owner,[field]:!Boolean(p[field]),updated_at:new Date().toISOString()};
 const {error}=await adminClient().from("tracker_bot_preferences").upsert({...p,...next},{onConflict:"owner_chat_id"});
 if(error)throw Error("Preference update rejected");
 return await botPreferences(owner);
}
async function auditText(updated:string){
 const {data,error}=await adminClient().from("tracker_bot_audit")
 .select("operation,category_or_entry,revision_before,revision_after,amount_before,amount_after,occurred_at")
 .order("occurred_at",{ascending:false}).limit(10);
 if(error)throw Error("Unable to read audit history");
 const lines=["🛡️ <b>TELEGRAM EDIT HISTORY</b>","━━━━━━━━━━━━━━━━━━"];
 for(const e of (data||[])){
  lines.push("• "+escape(e.occurred_at.slice(0,10))+" · "+escape(e.operation)+" · "+
    escape(String(e.category_or_entry).slice(0,18))+
    (e.amount_after===null?"":(" · "+amt(num(e.amount_after))))+
    " · rev "+e.revision_after);
 }
 if(!data?.length)lines.push("No Telegram-origin edits have been recorded.");
 lines.push("\n<i>All saved edits use revision checks and recovery snapshots.</i>");
 return lines.join("\n")+syncInfo(updated);
}
async function backupText(){
 const {data,error}=await adminClient().from("tracker_bot_backups").select("snapshot_date,revision,created_at")
 .order("snapshot_date",{ascending:false}).limit(6);
 if(error)throw Error("Unable to read backup catalog");
 return "🗄️ <b>PROTECTED CLOUD BACKUPS</b>\n━━━━━━━━━━━━━━━━━━\n"+
 ((data||[]).map((e:AnyRow)=>"• "+escape(e.snapshot_date)+" · revision "+e.revision).join("\n")||"No snapshots yet.")+
 "\n\nSnapshots are restricted to the server and retained for up to 90 days. Restoring is intentionally not available through Telegram.";
}
function forecastText(plan:AnyRow,updated:string){
 const today=keyDate(),start= today.slice(0,7)<plan.settings.planStart?plan.settings.planStart:today.slice(0,7);
 const list: string[]=[];
 for(let i=0;i<3;i++){
   const [y,m]=start.split("-").map(Number),d=new Date(Date.UTC(y,m-1+i,1)),month=d.toISOString().slice(0,7);
   if(!isInPlan(plan,month))break;
   const categories=plan.categories||[];
   const regular=categories.filter((c:AnyRow)=>c.role==="regular"&&c.group!=="Income")
     .map((c:AnyRow)=>budgetAmount(plan,c,month)).filter((v:number|null)=>v!==null).reduce((a:number,b:number)=>a+b,0);
   const salary=previousMonth(month)<plan.settings.raiseStart?num(plan.settings.salary31):num(plan.settings.raisedSalary);
   const due=[...(plan.loan?.rows||[]),...(plan.additionalLoans||[]).flatMap((l:AnyRow)=>l.rows||[])];
   const emi=due.filter((r:AnyRow)=>{
     const dueMonth=String(r.dueDate||"").slice(0,7);
     const [yy,mm]=dueMonth.split("-").map(Number);
     const pm=new Date(Date.UTC(yy,mm-2,1)).toISOString().slice(0,7);
     return (plan.settings.emiPreviousMonth?pm:dueMonth)===month&&!r.paidBeforeOpening;
   }).reduce((a:number,r:AnyRow)=>a+Math.max(0,num(r.emi)-num(r.paidAmount)),0);
   list.push("• <b>"+month+"</b>: Income "+amt(salary)+", base living "+amt(regular)+", remaining EMI "+amt(emi));
 }
 return "📈 <b>3-MONTH ILLUSTRATIVE OUTLOOK</b>\n━━━━━━━━━━━━━━━━━━\n"+
 (list.join("\n")||"No forecast months remain in the plan.")+
 "\n\n<i>Base forecast only; excludes month-specific salary receipt timing, loan early-closure effects, provisions, unexpected costs and other cash movements. Not a bank-balance prediction.</i>"+syncInfo(updated);
}
function alertItems(plan:AnyRow,updated:string,prefs:AnyRow,date=keyDate()){
 const list:{key:string;html:string}[]=[];
 const month=date.slice(0,7);
 if(prefs.sync_alerts&&daysSince(updated)>=2)
  list.push({key:"sync:"+date,html:"🔄 <b>SYNC WARNING</b>\nCloud tracker last updated "+escape(updated.slice(0,10))+
    ". Please sync your current tracker before relying on its reports."});
 if(!isInPlan(plan,month)||!prefs.alerts_enabled)return prefs.alerts_enabled?list:[];
 const d=monthData(plan,month);
 if(prefs.budget_alerts)for(const row of categoryBudgetItems(plan,month)){
   if(row.planned<=0||row.actual<=0)continue;
   const pct=row.actual/row.planned;
   const tier=pct>=1?"100":pct>=.8?"80":"";
   if(tier){
    list.push({key:"budget:"+month+":"+row.cat.id+":"+tier,html:"💸 <b>BUDGET ALERT</b>\n"+
    escape(row.cat.name)+" recorded "+amt(row.actual)+" of "+amt(row.planned)+
    " ("+Math.round(pct*100)+"%).\n<i>Regular category budget only.</i>"});
   }
 }
 if(prefs.emi_reminders){
  const loans=[...(plan.loan?.rows||[]).map((r:AnyRow)=>({...r,label:"Main loan"})),
   ...(plan.additionalLoans||[]).flatMap((l:AnyRow)=>(l.rows||[]).map((r:AnyRow)=>({...r,label:l.name||"Additional EMI"})))];
  const now=Date.parse(date+"T00:00:00Z");
  for(const row of loans){
   if(row.paidBeforeOpening||row.paid)continue;
   const due=String(row.dueDate||"");if(!/^\d{4}-\d{2}-\d{2}$/.test(due))continue;
   const days=Math.round((Date.parse(due+"T00:00:00Z")-now)/86400000);
   if(days<0||days>5)continue;
   const outstanding=Math.max(0,num(row.emi)-num(row.paidAmount));if(outstanding<0.01)continue;
   const tier=days===0?"today":days<=2?"near":"ahead";
   list.push({key:"emi:"+String(row.id)+":"+tier,html:"💳 <b>EMI PAYMENT REMINDER</b>\n"+
   escape(row.label)+" due "+escape(due)+" · Remaining "+amt(outstanding)+
   ".\n<i>Check the tracker to confirm any advance payment before paying again.</i>"});
  }
 }

 // Salary is an expected income event, not actual income until recorded.
 if(prefs.emi_reminders){
  const salaryCat=(plan.categories||[]).find((c:AnyRow)=>c.role==="salary"&&c.active);
  const payDay=Math.min(31,Math.max(1,num(plan.settings.salaryDay)));
  if(salaryCat && Number(date.slice(8,10))>=payDay && !plan.entries.some((e:AnyRow)=>e.categoryId===salaryCat.id&&e.date.slice(0,7)===month)){
   list.push({key:"salary:"+month,html:"💵 <b>SALARY CHECK</b>\nSalary has not been recorded in your synced tracker for "+
    escape(month)+".\n<i>Verify whether salary arrived; this is not confirmation of nonpayment.</i>"});
  }
  for(const c of (plan.categories||[])){
   if(!c.active||c.role!=="regular"||c.group!=="Living"||c.timing!=="Fixed day"||
    !/(mobile|recharge|dth)/i.test(String(c.name||"")))continue;
   if(Array.isArray(c.months)&&c.months.length&&!c.months.includes(Number(month.slice(5,7))))continue;
   const todayDay=Number(date.slice(8,10)),dueDay=Math.min(num(c.day),new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).getUTCDate());
   const remaining=dueDay-todayDay;
   if(remaining<0||remaining>2)continue;
   if(plan.entries.some((e:AnyRow)=>e.categoryId===c.id&&e.date.slice(0,7)===month))continue;
   list.push({key:"recharge:"+month+":"+c.id,html:"📱 <b>UPCOMING RECHARGE</b>\n"+
    escape(c.name)+" scheduled for day "+dueDay+" of "+escape(month)+".\n"+
    "<i>Check actual billing and recorded payment before paying.</i>"});
  }
  for(const pr of (plan.provisions||[])){
   if(!pr.enabled||!pr.firstDueMonth||!pr.everyMonths)continue;
   const first=String(pr.firstDueMonth),diff=(+month.slice(0,4)-+first.slice(0,4))*12+
     +month.slice(5,7)-+first.slice(5,7);
   if(diff<0||diff%pr.everyMonths!==0)continue;
   const dueDay=Math.min(num(pr.dueDay),new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).getUTCDate());
   const delta=dueDay-Number(date.slice(8,10));if(delta<0||delta>3)continue;
   const paid=plan.entries.some((e:AnyRow)=>e.categoryId===pr.categoryId&&e.date.slice(0,7)===month);
   if(paid)continue;
   const cat=(plan.categories||[]).find((c:AnyRow)=>c.id===pr.categoryId);
   list.push({key:"bill:"+month+":"+pr.id,html:"⚡ <b>UPCOMING PERIODIC BILL</b>\n"+
    escape(cat?.name||"Bill")+" due around "+dueDay+"-"+escape(month)+
    ". Planned bill: "+amt(num(pr.billAmount))+".\n<i>The monthly provision is a reserve, not a payment.</i>"});
  }
 }

 if(prefs.low_balance_alerts){
  const amount=cashEstimate(plan,date);
  if(amount<num(prefs.low_balance_threshold))list.push({key:"balance:"+date,html:"⚠️ <b>LOW ESTIMATED CASH</b>\n"+
   "Recorded tracker estimate: "+amt(amount)+" (threshold "+amt(num(prefs.low_balance_threshold))+")."+
   "\n<i>Not a verified bank balance. Check latest sync and reconciliations.</i>"});
 }
 return list.slice(0,14);
}
async function sendAlerts(token:string,owner:string,plan:AnyRow,updated:string) {
 const prefs=await botPreferences(owner);if(!prefs.alerts_enabled)return {delivered:0};
 const items=alertItems(plan,updated,prefs);
 let delivered=0;
 for(const item of items){
  const {data:exists,error}=await adminClient().from("tracker_bot_sent_alerts").select("alert_key")
   .eq("owner_chat_id",owner).eq("alert_key",item.key).maybeSingle();
  if(error||exists)continue;
  await message(token,owner,item.html);
  const saved=await adminClient().from("tracker_bot_sent_alerts").upsert({owner_chat_id:owner,alert_key:item.key,delivered_at:new Date().toISOString()},{onConflict:"owner_chat_id,alert_key"});
  if(saved.error)console.error("Alert deduplication storage unavailable");
  delivered++;
 }
 return {delivered};
}
function alertPreview(plan:AnyRow,updated:string,prefs:AnyRow){
 const items=alertItems(plan,updated,prefs);
 return "🔔 <b>CURRENT ALERT PREVIEW</b>\n━━━━━━━━━━━━━━━━━━\n"+
 (items.length?items.map(x=>x.html).join("\n\n"):"✅ No alerts based on your currently synced data.")+
 "\n\n<i>Preview only. No duplicate notifications were created.</i>";
}

Deno.serve(async (request:Request) => {
 if(request.method!=="POST")return respond({error:"method_not_allowed"},405);
 try {
  const {token,owner}=secrets();
  const hook=request.headers.get("x-telegram-bot-api-secret-token")??"";
  const cron=request.headers.get("x-savings-cron-secret")??"";
  if(cron && (await sha(cron))===CRON_HASH) {
   const payload=await request.json();
   if(payload?.kind==="branding")return respond(await configureBranding(token,owner));
   if(!["daily","monthly","alerts"].includes(payload?.kind))return respond({error:"invalid_period"},400);
   await scheduled(payload.kind,token,owner);
   return respond({ok:true,sent:payload.kind});
  }
  if(!hook||(await sha(hook))!==HOOK_HASH)return respond({error:"forbidden"},403);
  const update=await request.json();
  // Telegram does not offer truly hidden bots; enforce owner-only access and
  // leave any group/channel even if somebody adds the bot there.
  const room=update.my_chat_member?.chat ?? update.message?.chat ??
    update.channel_post?.chat ?? update.callback_query?.message?.chat;
  if(room && ["group","supergroup","channel"].includes(room.type)) {
    if(typeof room.id==="number" && room.id<0) {
      try {await telegram("leaveChat",token,{chat_id:room.id});}
      catch { /* A restricted bot may lack leave permissions in this chat */ }
    }
    return respond({ok:true,ignored:true});
  }
  if(!owns(update,owner))return respond({ok:true,ignored:true});
  if(update.callback_query?.id) {
   await telegram("answerCallbackQuery",token,{callback_query_id:update.callback_query.id});
  }
  const raw=update.callback_query?.data||update.message?.text||"/start";
  const route:Record<string,string>={
   "/start":"menu","/menu":"menu","/help":"help","/today":"day","/day":"day",
   "/month":"month","/plan":"plan","/entries":"entries","/budget":"budgets","/budgets":"budgets",
   "/balance":"balance","/emi":"emi","/savings":"savings","/pdf":"reports",
   "/status":"status","/pdfdaily":"pdfday","/pdfmonth":"pdfmonth","/add":"/edit", "/dashboard":"dashboard","/reconcile":"reconcile","/compare":"compare","/forecast":"forecast","/sync":"sync","/alerts":"alerts","/settings":"settings","/reminders":"alerts","/history":"history","/backups":"backups","/edit":"/edit","/lock":"/lock","/cancel":"/cancel"
  };
  const action=String(route[raw]||raw);
  if(action==="/edit" || action==="/lock" || action==="/cancel" || action.startsWith("e:")) {
    await handleEdit(update,action,token,owner);
  } else if(update.message?.text && !action.startsWith("/") && !action.startsWith("e:")) {
    const state=await editState(owner);
    if(["setup","setupConfirm","pin","amount","date","description","budgetAmount","entryAmount"].includes(state.step)) await handleEdit(update,action,token,owner);
    else await showAction(action,token,owner,update.callback_query?.message?.message_id);
  } else await showAction(action,token,owner,update.callback_query?.message?.message_id);
  return respond({ok:true});
 }catch(e){console.error("Savings tracker bot: request failed",e instanceof Error?e.message:"unknown");return respond({error:"report_unavailable"},500);}
});
