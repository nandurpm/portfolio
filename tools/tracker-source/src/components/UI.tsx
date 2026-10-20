import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, animate, useMotionValue, useTransform } from 'framer-motion';
import { X, Check, AlertCircle, ChevronRight, ArrowUpRight } from 'lucide-react';
import { registerDialog, isTopDialog } from '../navigation';
import { money } from '../domain/calculate';
import { usePlan, useEnvelope } from '../store';
type Confirm = {
  title: string;
  body: ReactNode;
  danger?: boolean;
  label?: string;
  resolve: (ok: boolean) => void;
};
const Ui = createContext({
  toast: (_message: string, _error = false) => {},
  confirm: async (_title: string, _body: ReactNode, _danger = false, _label = 'Continue') => false,
});
export const useUi = () => useContext(Ui);
export function UiProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<{ id: number; text: string; error: boolean }[]>([]),
    [question, setQuestion] = useState<Confirm | null>(null);
  const toast = (text: string, error = false) => {
    const id = Date.now() + Math.random();
    setNotices((x) => [...x, { id, text, error }]);
    setTimeout(() => setNotices((x) => x.filter((n) => n.id !== id)), 6500);
  };
  const confirm = (title: string, body: ReactNode, danger = false, label = 'Continue') =>
    new Promise<boolean>((resolve) => setQuestion({ title, body, danger, label, resolve }));
  return (
    <Ui.Provider value={{ toast, confirm }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        <AnimatePresence>
          {notices.map((n) => (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              key={n.id}
              className={`toast ${n.error ? 'error' : ''}`}
            >
              {n.error ? <AlertCircle size={19} /> : <Check size={19} />}
              <span>{n.text}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotices((x) => x.filter((q) => q.id !== n.id))}
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {question && (
        <Modal
          title={question.title}
          onClose={() => {
            question.resolve(false);
            setQuestion(null);
          }}
        >
          <div className="modal-copy">{question.body}</div>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => {
                question.resolve(false);
                setQuestion(null);
              }}
            >
              Cancel
            </button>
            <button
              className={`button ${question.danger ? 'danger' : ''}`}
              onClick={() => {
                question.resolve(true);
                setQuestion(null);
              }}
            >
              {question.label}
            </button>
          </div>
        </Modal>
      )}
    </Ui.Provider>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const close = () => closeRef.current();
    const unregister = registerDialog(close);
    const prev = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.querySelector<HTMLElement>(
      'input:not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled)',
    )?.focus();
    if (el && !el.contains(document.activeElement)) el.focus();
    const key = (e: KeyboardEvent) => {
      if (!isTopDialog(close)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      }
      if (e.key === 'Tab' && el) {
        const list = Array.from(
          el.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
          ),
        );
        const first = list[0],
          last = list.at(-1);
        const outside = !list.includes(document.activeElement as HTMLElement);
        if (!first) {
          e.preventDefault();
          el.focus();
        } else if (e.shiftKey && (document.activeElement === first || outside)) {
          last?.focus();
          e.preventDefault();
        } else if (!e.shiftKey && (document.activeElement === last || outside)) {
          first?.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      unregister();
      document.removeEventListener('keydown', key);
      if (prev?.isConnected) prev.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="modal-title">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
export function PageHead({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Section({
  title,
  caption,
  action,
  children,
  className = '',
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {caption && <p>{caption}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">₹</span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Edited() {
  return (
    <span className="edited" title="Edited from the default or imported value">
      edited
    </span>
  );
}
export function Field({
  label,
  children,
  hint,
  edited = false,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  edited?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label} {edited && <Edited />}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function NumberField({
  value,
  onCommit,
  min = 0,
  label,
  step = '0.01',
  className = '',
}: {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  label: string;
  step?: string;
  className?: string;
}) {
  const [v, set] = useState(String(value));
  const { toast } = useUi();
  useEffect(() => set(String(value)), [value]);
  const save = () => {
    const n = Number(v);
    if (!v.trim() || !Number.isFinite(n) || n < min) {
      toast(`Enter a valid ${label.toLowerCase()}.`, true);
      set(String(value));
      return;
    }
    if (n !== value) {
      try {
        onCommit(n);
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), true);
        set(String(value));
      }
    }
  };
  return (
    <input
      className={className}
      aria-label={label}
      type="number"
      min={min}
      step={step}
      value={v}
      onChange={(e) => set(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          save();
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          set(String(value));
          e.currentTarget.blur();
        }
      }}
    />
  );
}
export function TextField({
  value,
  onCommit,
  label,
  ...rest
}: {
  value: string;
  onCommit: (v: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  const [v, set] = useState(value);
  const { toast } = useUi();
  useEffect(() => set(value), [value]);
  const save = () => {
    if (v !== value)
      try {
        onCommit(v);
      } catch (e) {
        toast(String(e), true);
        set(value);
      }
  };
  return (
    <input
      {...rest}
      aria-label={label}
      value={v}
      onChange={(e) => set(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          set(value);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
export function Money({
  value,
  animateValue = false,
  decimals = 0,
}: {
  value: number;
  animateValue?: boolean;
  decimals?: number;
}) {
  const p = usePlan(),
    mv = useMotionValue(value),
    display = useTransform(mv, (v) => money(v, decimals));
  useEffect(() => {
    if (animateValue && p.settings.animations) {
      const control = animate(mv, value, { duration: 0.5, ease: 'easeOut' });
      return () => control.stop();
    }
    mv.set(value);
    return undefined;
  }, [value, mv, animateValue, p.settings.animations]);
  return <motion.span>{display}</motion.span>;
}
export function Stat({
  label,
  value,
  caption,
  tone = 'violet',
  icon,
}: {
  label: string;
  value: number;
  caption: string;
  tone?: string;
  icon: ReactNode;
}) {
  return (
    <motion.div whileHover={{ y: -3 }} className={`stat-card ${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon">{icon}</div>
      </div>
      <strong>
        <Money value={value} animateValue />
      </strong>
      <span className="stat-caption">
        {caption}
        <ArrowUpRight size={14} />
      </span>
    </motion.div>
  );
}
export function ProgressBar({ value, tone = 'income' }: { value: number; tone?: string }) {
  const p = usePlan();
  return (
    <div className={`progress-track ${tone}`}>
      <motion.div
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: p.settings.animations ? 0.5 : 0 }}
      />
    </div>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
export function useEdited(path: string) {
  const env = useEnvelope();
  return env.audit.some((a) => a.changes.some((c) => c.path.join('.') === path));
}
export function InlineLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ChevronRight size={16} />
    </button>
  );
}
