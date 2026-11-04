import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react';
import { useMemo } from 'react';
import { money } from '../domain/calculate';
import { displayDate } from '../domain/dates';
import { ledgerPostingFlow } from '../domain/ledger';
import { usePlan } from '../store';
import { usePhone } from './usePhone';

type Activity = {
  id: string;
  date: string;
  title: string;
  detail: string;
  amount: number;
  kind: 'income' | 'expense' | 'movement';
  destination: 'entries' | 'accounts';
};

export function MobileRecentActivity({ navigate }: { navigate: (page: string) => void }) {
  const phone = usePhone();
  const plan = usePlan();
  const rows = useMemo(() => {
    const categories = new Map(plan.categories.map((row) => [row.id, row]));
    const accounts = new Map((plan.accounts ?? []).map((row) => [row.id, row]));
    const legacy: Activity[] = plan.entries.map((row) => {
      const category = categories.get(row.categoryId);
      const income = category?.group === 'Income';
      return {
        id: `entry-${row.id}`,
        date: row.date,
        title: row.description || category?.name || 'Recorded transaction',
        detail: category?.name ?? 'Daily entry',
        amount: income ? row.amount : -row.amount,
        kind: income ? 'income' : 'expense',
        destination: 'entries',
      };
    });
    const ledger: Activity[] = (plan.ledgerTransactions ?? []).map((row) => {
      const flow = ledgerPostingFlow(plan, row);
      const amount = flow.income || (flow.expenses ? -flow.expenses : 0);
      const source = row.sourceAccountId ? accounts.get(row.sourceAccountId)?.name : '';
      const destination = row.destinationAccountId ? accounts.get(row.destinationAccountId)?.name : '';
      return {
        id: `ledger-${row.id}`,
        date: row.date,
        title: row.description || row.kind.replaceAll('-', ' '),
        detail: [source, destination].filter(Boolean).join(' → ') || 'Account transaction',
        amount,
        kind: amount > 0 ? 'income' : amount < 0 ? 'expense' : 'movement',
        destination: 'accounts',
      };
    });
    return [...legacy, ...ledger]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, 5);
  }, [plan]);

  if (!phone) return null;
  return (
    <section className="mobile-recent" aria-labelledby="mobile-recent-title">
      <header>
        <div>
          <span className="dashboard-section-kicker">RECENT ACTIVITY</span>
          <h2 id="mobile-recent-title">Latest money movements</h2>
        </div>
        <button className="text-button" onClick={() => navigate('entries')}>View all</button>
      </header>
      {rows.length ? (
        <ul>
          {rows.map((row) => {
            const Icon = row.kind === 'income' ? ArrowDownLeft : row.kind === 'expense' ? ArrowUpRight : ArrowLeftRight;
            return (
              <li key={row.id}>
                <button onClick={() => navigate(row.destination)} aria-label={`Open ${row.title}`}>
                  <span className={`mobile-recent-icon ${row.kind}`}><Icon size={18} /></span>
                  <span className="mobile-recent-copy">
                    <strong>{row.title}</strong>
                    <small>{row.detail} · {displayDate(row.date, plan.settings.dateFormat)}</small>
                  </span>
                  <strong className={`mobile-recent-amount ${row.kind}`}>
                    {row.kind === 'movement' ? 'Transfer' : money(row.amount)}
                  </strong>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">No activity yet. Use Add to record your first income or expense.</p>
      )}
    </section>
  );
}
