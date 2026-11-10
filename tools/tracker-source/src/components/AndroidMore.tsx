import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, Calculator, BriefcaseBusiness, TrendingUp, FileChartColumn, Layers, ArrowLeftRight, ShieldCheck, Coins, Wallet, ChartNoAxesColumn, Settings, CloudUpload, Target, ChevronRight, Undo2, Redo2 } from 'lucide-react';
import { registerDialog, isTopDialog } from '../navigation';
import './android-more.css';

export const moreGroups = [
  { title: '', icon: Layers, cards: [
    { title: 'Loans & EMI', description: 'Manage loans, installments and closure', page: 'loan', icon: Calculator, tone: 'purple' },
    { title: 'Salary & PF', description: 'Salary, provident fund and increments', page: 'employment', icon: BriefcaseBusiness, tone: 'blue' },
    { title: 'Forecast', description: 'Savings forecast and financial planning', page: 'forecast', icon: TrendingUp, tone: 'mint' },
    { title: 'Reports', description: 'Reports, export and import', page: 'reports', icon: FileChartColumn, tone: 'peach' },
  ] },
  { title: 'Accounts & Money Flow', icon: Layers, cards: [
    { title: 'Reconciliation', description: 'Bank and cash reconciliation', page: 'balances', section: 'Balance reconciliation', icon: ArrowLeftRight, tone: 'mint' },
    { title: 'Transfers & Activity', description: 'Account transfers and transaction activity', page: 'accounts', section: 'Recent account activity', icon: ArrowLeftRight, tone: 'purple' },
  ] },
  { title: 'Planning & Financial Position', icon: Target, cards: [
    { title: 'Provisions & Reserves', description: 'Reserved funds and planned provisions', page: 'balances', section: 'Bills and provision balances', icon: ShieldCheck, tone: 'peach' },
    { title: 'Financial Position', description: 'Net worth, assets and liabilities', page: 'accounts', section: 'Your money at a glance', icon: Coins, tone: 'coral' },
  ] },
  { title: 'Balances & Overview', icon: Wallet, cards: [
    { title: 'Balances & Provisions', description: 'Your balances and reserved funds', page: 'balances', icon: Wallet, tone: 'purple' },
    { title: 'Forecast (Month-by-Month)', description: 'Explore your monthly financial plan', page: 'forecast', section: 'Full-month forecast', icon: ChartNoAxesColumn, tone: 'mint' },
  ] },
  { title: 'App & Data', icon: Settings, cards: [
    { title: 'Settings', description: 'Appearance, preferences and security', page: 'settings', icon: Settings, tone: 'blue' },
    { title: 'Backup & Sync', description: 'Backup, restore and account sync', page: 'settings', section: 'Account & cloud sync', icon: CloudUpload, tone: 'blue' },
  ] },
];

export function AndroidMore({ onClose, navigate, canUndo, canRedo, undo, redo }: {
  onClose: () => void;
  navigate: (page: string, section?: string) => void;
  canUndo: boolean; canRedo: boolean;
  undo: () => void; redo: () => void;
}) {
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const back = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dismiss = () => close.current();
    const unregister = registerDialog(dismiss);
    back.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isTopDialog(dismiss)) {
        event.preventDefault();
        dismiss();
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      unregister();
      document.removeEventListener('keydown', key);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  const term = query.trim().toLocaleLowerCase();
  const groups = moreGroups.map(group => ({ ...group, cards: group.cards.filter(card =>
    `${group.title} ${card.title} ${card.description}`.toLocaleLowerCase().includes(term),
  ) })).filter(group => group.cards.length);
  return (
    <section className="android-more" aria-labelledby="android-more-title">
      <header className="android-more-header">
        <button ref={back} type="button" aria-label="Back from More" onClick={onClose}><ArrowLeft aria-hidden="true" /></button>
        <div><h1 id="android-more-title">More</h1><p>All screens &amp; tools</p></div>
        <button type="button" aria-label="Search screens and tools" aria-expanded={search} aria-controls="android-more-search" onClick={() => { setSearch(!search); setQuery(''); }}><Search aria-hidden="true" /></button>
      </header>
      <div className="android-more-content">
        {search && <label className="android-more-search" id="android-more-search"><Search size={20} aria-hidden="true" /><span className="sr-only">Search screens and tools</span><input autoFocus type="search" value={query} placeholder="Search screens & tools" onChange={event => setQuery(event.target.value)} /></label>}
        <div className="android-more-groups">
          {groups.map((group, index) => <section key={group.title} aria-label={group.title || 'Main tools'}>
            {group.title && <h2><group.icon size={22} aria-hidden="true" />{group.title}</h2>}
            <div className={`android-more-grid ${index === 0 && !group.title ? 'primary' : ''}`}>
              {group.cards.map(card => <button type="button" className="android-more-card" aria-describedby={`more-description-${card.title.replace(/\W/g, '')}`} key={card.title} onClick={() => navigate(card.page, 'section' in card ? card.section : undefined)}>
                <span className={`android-more-icon ${card.tone}`}><card.icon aria-hidden="true" /></span>
                <span className="android-more-copy"><strong>{card.title}</strong><small id={`more-description-${card.title.replace(/\W/g, '')}`}>{card.description}</small></span>
                <ChevronRight className="android-more-chevron" size={18} aria-hidden="true" />
              </button>)}
            </div>
          </section>)}
          {!groups.length && <p role="status">No tools found. Try a different search.</p>}
        </div>
        <div className="android-more-history" aria-label="Change history controls">
          <button type="button" disabled={!canUndo} onClick={undo}><Undo2 size={21} aria-hidden="true" />Undo</button>
          <button type="button" disabled={!canRedo} onClick={redo}><Redo2 size={21} aria-hidden="true" />Redo</button>
        </div>
      </div>
    </section>
  );
}
