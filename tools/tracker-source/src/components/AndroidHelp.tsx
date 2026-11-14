import { useState } from "react";
import { ShortcutHelp } from "./ShortcutHelp";
import { Modal } from "./UI";
export function AndroidHelp({ onClose }: { onClose: () => void }) {
  const [keyboard, setKeyboard] = useState(false);
  if (keyboard) return <ShortcutHelp onClose={() => setKeyboard(false)} />;
  return (
    <Modal title="Help and Support" onClose={onClose}>
      <button
        type="button"
        className="button secondary"
        onClick={() => setKeyboard(true)}
      >
        Keyboard shortcuts
      </button>
      <h3>Record once</h3>
      <p>
        Use Add for income or expenses. Activity brings daily entries and
        account records together. Open a record to manage it in its original
        screen.
      </p>
      <h3>Move money</h3>
      <p>
        Use Transfer for money moving between accounts. Principal is not income
        or an expense; a fee is an expense. Reversals remain in account
        activity.
      </p>
      <h3>Protect your records</h3>
      <p>
        More → Backup and Restore exports your complete JSON backup and restores
        a backup after confirmation. More → Cloud Sync shows your sign-in and
        sync status.
      </p>
      <h3>Review your plan</h3>
      <p>
        Expand Full dashboard analysis on Home for reporting dates, comparisons,
        alerts and charts. More keeps budgets, loans, Salary &amp; PF, reports
        and settings available.
      </p>
      <p>
        For support, open the{" "}
        <a
          href="https://github.com/nandurpm/portfolio/issues"
          target="_blank"
          rel="noreferrer"
        >
          project issue tracker
        </a>
        . Describe the screen and error; do not attach financial backups,
        passwords or private account records.
      </p>
    </Modal>
  );
}
