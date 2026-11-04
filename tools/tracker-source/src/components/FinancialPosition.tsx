import { useMemo } from "react";
import { Wallet, Landmark, ReceiptText } from "lucide-react";
import { usePlan } from "../store";
import { cumulative, money, reportDate } from "../domain/calculate";
import { displayDate } from "../domain/dates";
import { netWorthSnapshot } from "../domain/net-worth";
import { Section, Stat } from "./UI";

/** Both pages show this same dated financial position and allocation explanation. */
export function FinancialPosition({ onManage }: { onManage?: () => void }) {
  const p = usePlan(),
    date = reportDate(p);
  const result = useMemo(() => {
    try {
      return {
        position: netWorthSnapshot(p, date),
        savings: cumulative(p, date).actual.savings,
        error: "",
      };
    } catch (e) {
      return { position: null, savings: 0, error: String(e) };
    }
  }, [p, date]);
  const w = result.position;
  return (
    <Section
      title="Your money at a glance"
      caption={`As of ${displayDate(date, p.settings.dateFormat)} · Based on recorded balances and payments.`}
    >
      {!w ? (
        <p role="alert">
          Financial position unavailable: {result.error}. Correct the source
          records; balances have not been replaced with zero.
        </p>
      ) : (
        <>
          <div className="stats-grid">
            <Stat
              icon={<Wallet />}
              label="Money available"
              value={w.spendable}
              tone="income"
              caption={`${money(w.cash)} in bank, cash and wallets, less ${money(w.reserved)} set aside for bills`}
            />
            <Stat
              icon={<ReceiptText />}
              label={w.estimated ? "Money owed (estimated)" : "Money owed"}
              value={w.liabilities}
              tone="expense"
              caption="Outstanding loan principal and other recorded debts; future interest excluded"
            />
            <Stat
              icon={<Landmark />}
              label={w.estimated ? "Net worth (estimated)" : "Net worth"}
              value={w.netWorth}
              caption={`${money(w.assets)} owned − ${money(w.liabilities)} owed`}
            />
            <Stat
              icon={<Wallet />}
              label="Income minus spending"
              value={result.savings}
              caption="Since tracking began; your opening balance is excluded"
            />
          </div>
          <p>
            {w.netWorth < 0
              ? `Your recorded debts exceed your assets by ${money(-w.netWorth)}. Repayments follow your installment schedules.`
              : `Your recorded assets exceed your debts by ${money(w.netWorth)}.`}
            {result.savings < 0
              ? ` You have spent ${money(-result.savings)} more than you have received since tracking began.`
              : ` You have received ${money(result.savings)} more than you have spent since tracking began.`}
          </p>
          <details className="position-breakdown">
            <summary>Balance breakdown</summary>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Financial position details">
            <table
              className="data-table"
              aria-label="Cross-module balance reconciliation"
            >
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>Amount or count</th>
                  <th>Scope</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Dashboard recorded liquid cash</th>
                  <td>{money(w.cash)}</td>
                  <td>Bank, cash and wallets; before earmarked reserves</td>
                </tr>
                <tr>
                  <th>Named account liquid balances</th>
                  <td>{money(w.namedCash)}</td>
                  <td>
                    Account openings, ledger movements and assigned Entries
                  </td>
                </tr>
                <tr>
                  <th>Unallocated cash / difference</th>
                  <td>{money(w.unallocatedCash)}</td>
                  <td>
                    Dashboard cash minus named liquid balances; not extra income
                  </td>
                </tr>
                <tr>
                  <th>Entries without an account</th>
                  <td>{w.unlinkedCount}</td>
                  <td>
                    Included in cash and savings; their account location is
                    unassigned
                  </td>
                </tr>
                <tr>
                  <th>Earmarked reserves</th>
                  <td>{money(w.reserved)}</td>
                  <td>Still part of cash and net worth</td>
                </tr>
                <tr>
                  <th>Spendable cash after reserves</th>
                  <td>{money(w.spendable)}</td>
                  <td>
                    Recorded cash less earmarked reserves; credit limits
                    excluded
                  </td>
                </tr>
                <tr>
                  <th>PF balance</th>
                  <td>{money(w.pf)}</td>
                  <td>Recorded contributions less claims through this date</td>
                </tr>
                <tr>
                  <th>Other recorded assets</th>
                  <td>{money(w.nonCashAssets)}</td>
                  <td>
                    Receivables, fixed deposits and investments at recorded cost
                  </td>
                </tr>
                <tr>
                  <th>Plan loan principal</th>
                  <td>{money(w.planLoans)}</td>
                  <td>
                    Uses recorded payments; future scheduled interest is
                    excluded
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {w.estimated && (
            <p>
              Loan principal includes a proportional estimate where the lender’s
              principal allocation is unavailable. It is not a lender-confirmed
              settlement balance.
            </p>
          )}
          <p>
            Record external assets and debts in Accounts. Unknown or unrecorded
            balances are not inferred. Opening source:{" "}
            {p.settings.openingFromAccounts
              ? "sum of named cash, bank and wallet opening balances"
              : "total opening savings in Budget & Plan; named openings allocate that total"}
            .
          </p>
          </details>
          {(Math.abs(w.unallocatedCash) >= 0.01 || w.unlinkedCount > 0) && (
            <p role="status" className="callout">
              Account allocation needs review: {money(w.unallocatedCash)}{" "}
              remains unallocated and {w.unlinkedCount} Entries have no account.
              Assign their actual account in Daily Entries; do not add duplicate
              transactions or income to close this difference.
            </p>
          )}
          {onManage && (
            <button className="button secondary" onClick={onManage}>
              Manage accounts
            </button>
          )}
        </>
      )}
    </Section>
  );
}
