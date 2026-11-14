import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Landmark,
  Download,
  ChevronRight,
} from "lucide-react";
import { Modal } from "./UI";
const actions = [
  {
    id: "expense",
    title: "Add expense",
    detail: "Record a new expense",
    icon: ArrowUpRight,
  },
  {
    id: "income",
    title: "Add income",
    detail: "Record income received",
    icon: ArrowDownLeft,
  },
  {
    id: "transfer",
    title: "Transfer",
    detail: "Move money between accounts",
    icon: ArrowLeftRight,
  },
  {
    id: "loan",
    title: "Loan payment",
    detail: "Open loans and linked EMI receipts",
    icon: Landmark,
  },
  {
    id: "backup",
    title: "Backup",
    detail: "Export or restore your saved data",
    icon: Download,
  },
] as const;
export function AndroidQuickActions({
  onClose,
  action,
}: {
  onClose: () => void;
  action: (id: (typeof actions)[number]["id"]) => void;
}) {
  return (
    <Modal title="Quick actions" onClose={onClose}>
      <div className="android-action-list">
        {actions.map((item) => (
          <button type="button" data-action={item.id} key={item.id} onClick={() => action(item.id)}>
            <item.icon aria-hidden="true" />
            <span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
      </div>
      <button type="button" className="button secondary" onClick={onClose}>
        Cancel
      </button>
    </Modal>
  );
}
