import { useMemo, useState } from 'react';
import { ArrowLeftRight, Landmark, Plus, ReceiptText, WalletCards } from 'lucide-react';
import { ledgerSummary } from '../domain/ledger';
import type { AccountKind, LedgerKind } from '../domain/types';
import { store, usePlan } from '../store';
import { Empty, Field, Money, PageHead, Section, Stat, useUi } from '../components/UI';

const accountKinds: { value: AccountKind; label: string }[] = [
  { value: 'bank', label: 'Bank account' }, { value: 'cash', label: 'Cash' },
  { value: 'wallet', label: 'Wallet' }, { value: 'credit-card', label: 'Credit card' },
  { value: 'receivable', label: 'Money lent' }, { value: 'liability', label: 'Loan / borrowing' },
  { value: 'fixed-deposit', label: 'Fixed deposit' }, { value: 'investment', label: 'Investment' },
];
const transactionKinds: { value: LedgerKind; label: string }[] = [
  { value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' }, { value: 'lend', label: 'Lend money' },
  { value: 'repayment-received', label: 'Repayment received' }, { value: 'borrow', label: 'Borrow money' },
  { value: 'principal-repayment', label: 'Repay loan' }, { value: 'shopping', label: 'Shopping' },
  { value: 'refund', label: 'Refund' }, { value: 'credit-card-purchase', label: 'Credit-card purchase' },
  { value: 'credit-card-payment', label: 'Pay credit card' }, { value: 'fd-deposit', label: 'Create / add fixed deposit' },
  { value: 'fd-withdrawal', label: 'Withdraw fixed deposit' }, { value: 'investment-deposit', label: 'Add investment' },
  { value: 'investment-withdrawal', label: 'Withdraw investment' },
];

export default function Accounts() {
  const plan = usePlan(), { toast } = useUi();
  const accounts = plan.accounts ?? [], rows = plan.ledgerTransactions ?? [];
  const summary = useMemo(() => ledgerSummary({ accounts, ledgerTransactions: rows }), [accounts, rows]);
  const [showAccount, setShowAccount] = useState(false), [showTransaction, setShowTransaction] = useState(false);
  const [name, setName] = useState(''), [accountKind, setAccountKind] = useState<AccountKind>('bank');
  const [opening, setOpening] = useState('0'), [kind, setKind] = useState<LedgerKind>('expense');
  const [amount, setAmount] = useState(''), [source, setSource] = useState(''), [destination, setDestination] = useState('');
  const [description, setDescription] = useState(''), [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const addAccount = () => {
    const value = Number(opening);
    if (!name.trim() || !Number.isFinite(value)) return toast('Enter an account name and valid opening balance.', true);
    try {
      store.change('Add financial account', d => {
        d.accounts ??= []; d.ledgerTransactions ??= [];
        d.accounts.push({ id: crypto.randomUUID(), name: name.trim(), kind: accountKind, openingBalance: value, active: true, note: '' });
      });
      setName(''); setOpening('0'); setShowAccount(false);
    } catch (error) { toast(String(error), true); }
  };
  const addTransaction = () => {
    const value = Number(amount);
    if (!date || !Number.isFinite(value) || value <= 0 || Math.round(value * 100) !== value * 100)
      return toast('Enter a date and positive amount with at most two decimal places.', true);
    const both = new Set<LedgerKind>(['transfer','lend','repayment-received','borrow','principal-repayment','fd-deposit','fd-withdrawal','investment-deposit','investment-withdrawal','credit-card-payment']);
    if ((both.has(kind) && (!source || !destination)) || (kind === 'income' && !destination) || (['expense','shopping'].includes(kind) && !source) || (kind === 'credit-card-purchase' && !destination))
      return toast('Choose the required source and destination accounts.', true);
    try {
      store.change('Add account transaction', d => {
        d.accounts ??= []; d.ledgerTransactions ??= [];
        d.ledgerTransactions.push({ id: crypto.randomUUID(), date, kind, amount: value,
          sourceAccountId: source || undefined, destinationAccountId: destination || undefined,
          description: description.trim() || transactionKinds.find(x => x.value === kind)?.label || 'Transaction', note: '' });
      });
      setAmount(''); setDescription(''); setShowTransaction(false);
    } catch (error) { toast(String(error), true); }
  };
  return <div className="page accounts-page">
    <PageHead eyebrow="SHARED MONEY LEDGER" title="Accounts & transactions" description="Track where money lives and move it without counting transfers, loan principal or card payments twice." action={<div className="page-actions"><button className="button secondary" onClick={() => setShowAccount(!showAccount)}><Plus size={18}/> Account</button><button className="button" disabled={!accounts.length} onClick={() => setShowTransaction(!showTransaction)}><Plus size={18}/> Transaction</button></div>} />
    <div className="stats-grid ledger-stats">
      <Stat label="Net worth" value={summary.netWorth} caption="Assets less liabilities" icon={<WalletCards/>}/>
      <Stat label="Assets" value={summary.assets} caption="Cash, bank and investments" tone="green" icon={<Landmark/>}/>
      <Stat label="Liabilities" value={summary.liabilities} caption="Cards and borrowings" tone="orange" icon={<ReceiptText/>}/>
      <Stat label="Net savings" value={summary.income-summary.expenses} caption="Income less expenses" tone="blue" icon={<ArrowLeftRight/>}/>
    </div>
    {showAccount && <Section title="Add an account" caption="Opening balance is carried forward; it is not income."><div className="form-grid three"><Field label="Account name"><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Salary bank"/></Field><Field label="Account type"><select value={accountKind} onChange={e=>setAccountKind(e.target.value as AccountKind)}>{accountKinds.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></Field><Field label="Opening balance"><input type="number" step="0.01" value={opening} onChange={e=>setOpening(e.target.value)}/></Field></div><div className="modal-actions"><button className="button secondary" onClick={()=>setShowAccount(false)}>Cancel</button><button className="button" onClick={addAccount}>Save account</button></div></Section>}
    {showTransaction && <Section title="Record a transaction" caption="Transfers and principal movements affect balances but not income or spending."><div className="form-grid three"><Field label="Type"><select value={kind} onChange={e=>setKind(e.target.value as LedgerKind)}>{transactionKinds.filter(x=>x.value!=='refund').map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></Field><Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field><Field label="Amount"><input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></Field><Field label="From account"><select value={source} onChange={e=>setSource(e.target.value)}><option value="">Not applicable</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field><Field label="To account"><select value={destination} onChange={e=>setDestination(e.target.value)}><option value="">Not applicable</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field><Field label="Description"><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Optional note"/></Field></div><div className="modal-actions"><button className="button secondary" onClick={()=>setShowTransaction(false)}>Cancel</button><button className="button" onClick={addTransaction}>Save transaction</button></div></Section>}
    <Section title="Your accounts" caption="Current balances after every recorded ledger transaction.">{!accounts.length ? <Empty title="No shared accounts yet" detail="Add your cash, bank, wallet, cards, loans or investments to begin. Your existing tracker entries remain unchanged." action={<button className="button" onClick={()=>setShowAccount(true)}>Add first account</button>}/> : <div className="account-card-grid">{accounts.map(a=><article className="account-card" key={a.id}><span>{accountKinds.find(x=>x.value===a.kind)?.label}</span><h3>{a.name}</h3><strong><Money value={summary.balances[a.id] ?? 0} decimals={2}/></strong></article>)}</div>}</Section>
    <Section title="Recent account activity" caption="A balance-safe audit trail shared by web, Windows and Android.">{!rows.length ? <Empty title="No account transactions" detail="Income, expenses and movements recorded here will appear on every signed-in device."/> : <div className="ledger-list">{[...rows].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100).map(r=><article key={r.id}><div><strong>{r.description}</strong><span>{r.date} · {transactionKinds.find(x=>x.value===r.kind)?.label}</span></div><Money value={r.amount} decimals={2}/></article>)}</div>}</Section>
  </div>;
}
