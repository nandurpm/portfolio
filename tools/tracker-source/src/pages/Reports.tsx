import { WEB_APP } from '../web-mode';
import { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Upload,
  Database,
  ArrowRight,
  Check,
  RefreshCw,
} from 'lucide-react';
import { store, usePlan, useEnvelope } from '../store';
import type { ImportPreview } from '../domain/types';
import { APP_NAME } from '../domain/types';
import { envelopeFrom } from '../domain/history';
import { monthLabel } from '../domain/dates';
import { saveBytes, saveText, chooseFile } from '../io/files';
import { exportWorkbook, exportRange, monthlyReport } from '../io/export';
import {
  readWorkbook,
  readCSV,
  defaultMapping,
  inspectColumns,
  csvExport,
  type ColumnMapping,
} from '../io/import';
import { RangeControl } from '../components/RangeControl';
import { PageHead, Section, Field, Badge, Toggle, useUi, Modal } from '../components/UI';
export default function Reports() {
  const p = usePlan(),
    env = useEnvelope(),
    { toast, confirm } = useUi(),
    [busy, setBusy] = useState(''),
    [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null),
    [headers, setHeaders] = useState<string[]>([]),
    [mapping, setMapping] = useState<ColumnMapping>(defaultMapping),
    [preview, setPreview] = useState<ImportPreview | null>(null),
    [error, setError] = useState(''),
    [mode, setMode] = useState('replace'),
    [remap, setRemap] = useState<Record<string, string>>({}),
    [pdfPreview, setPdfPreview] = useState(false);
  const [start, end] = exportRange(p);
  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    try {
      const result = await fn();
      if (result !== null) toast(`${label} complete.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), true);
    } finally {
      setBusy('');
    }
  }
  async function loadPreview(f = file, map = mapping) {
    if (!f) return;
    setBusy('Reading workbook');
    setError('');
    try {
      const pre = f.name.toLowerCase().endsWith('.csv')
        ? readCSV(new TextDecoder().decode(f.bytes), p, map)
        : await readWorkbook(f.bytes, p, map);
      pre.plan.source.filename = f.name;
      setPreview(pre);
      setRemap({});
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy('');
    }
  }
  async function openImport() {
    const f = await chooseFile(['xlsx', 'csv']);
    if (!f) return;
    setFile(f);
    setMode(f.name.toLowerCase().endsWith('.csv') ? 'append' : 'replace');
    try {
      const h = await inspectColumns(f.bytes, f.name);
      setHeaders(h);
      setMapping(defaultMapping);
      await loadPreview(f, defaultMapping);
    } catch (e) {
      setError(String(e));
    }
  }
  async function applyImport() {
    if (!preview) return;
    if (
      !(await confirm(
        mode === 'replace' ? 'Replace the current plan?' : 'Append imported entries?',
        `${preview.plan.entries.length} entries are ready. ${preview.warnings.length} warnings were reported. ${mode === 'replace' ? 'Your current plan can be restored with Undo or a backup.' : 'Existing transactions will be kept; identical imports can create duplicates.'}`,
        false,
        'Import',
      ))
    )
      return;
    try {
      const imported = structuredClone(preview.plan);
      for (const e of imported.entries) {
        const name = imported.categories.find((c) => c.id === e.categoryId)?.name ?? '';
        if (remap[name]) e.categoryId = remap[name];
      }
      const additions = p.categories.filter(
        (c) =>
          Object.values(remap).includes(c.id) && !imported.categories.some((i) => i.id === c.id),
      );
      imported.categories.push(...additions);
      store.change(`Import ${file?.name}`, (d) => {
        if (mode === 'replace') Object.assign(d, imported);
        else {
          for (const c of imported.categories)
            if (!d.categories.some((x) => x.id === c.id)) d.categories.push(c);
          d.entries.push(...imported.entries.map((e) => ({ ...e, id: crypto.randomUUID() })));
        }
      });
      toast('Import applied and saved.');
      setFile(null);
      setPreview(null);
    } catch (e) {
      toast(String(e), true);
    }
  }
  async function pdf() {
    const html = monthlyReport(p);
    if (window.desktop)
      return window.desktop.pdf(html, `${APP_NAME} - ${p.settings.selectedMonth}.pdf`);
    setPdfPreview(true);
    return null;
  }
  return (
    <>
      <PageHead
        eyebrow="REPORTS & DATA"
        title="Your data. Always yours."
        description="Move between Excel and the app, share a report, or keep a complete backup."
        action={<RangeControl kind="view" />}
      />
      <div className="export-range">
        <span>
          Export range{' '}
          <strong>
            {monthLabel(start)} → {monthLabel(end)}
          </strong>
        </span>
        <Toggle
          checked={p.settings.applyViewToExport}
          onChange={(v) =>
            store.change('Apply view range to export', (d) => {
              d.settings.applyViewToExport = v;
            })
          }
          label="Apply view range to export"
        />
      </div>
      <div className="export-cards">
        <div className="export-card">
          <span className="export-icon green">
            <FileSpreadsheet />
          </span>
          <h2>Excel workbook</h2>
          <p>
            Five formatted sheets, native editable charts, frozen headings and your monthly
            overrides.
          </p>
          <button
            disabled={!!busy}
            className="button"
            onClick={() =>
              void run('Excel export', async () =>
                saveBytes(`${APP_NAME}.xlsx`, await exportWorkbook(p, start, end), 'xlsx'),
              )
            }
          >
            <Download size={17} />
            Export .xlsx
          </button>
        </div>
        <div className="export-card">
          <span className="export-icon violet">
            <FileText />
          </span>
          <h2>Monthly PDF</h2>
          <p>
            Selected-month comparisons, category totals and your cumulative savings in a printable
            report.
          </p>
          <button
            disabled={!!busy}
            className="button secondary"
            onClick={() => void run('PDF report', pdf)}
          >
            <Download size={17} />
            {window.desktop ? 'Save PDF' : 'Print / save PDF'}
          </button>
        </div>
        <div className="export-card">
          <span className="export-icon orange">
            <Database />
          </span>
          <h2>Transactions CSV</h2>
          <p>
            Plain, portable transaction records for the chosen range, with safe spreadsheet text
            cells.
          </p>
          <button
            disabled={!!busy}
            className="button secondary"
            onClick={() =>
              void run('CSV export', () =>
                saveText(`${APP_NAME} - Transactions.csv`, csvExport(p, start, end), 'csv'),
              )
            }
          >
            <Download size={17} />
            Export .csv
          </button>
        </div>
      </div>
      <Section
        title="Bring your Excel plan with you"
        caption="Preview everything before importing. Original Dashboard / Daily entries / Budget workbooks are supported."
        action={
          <button
            className="button"
            disabled={!!busy}
            onClick={() => void run('Open import', openImport)}
          >
            <Upload size={17} />
            Import Excel or CSV
          </button>
        }
      >
        <div className="import-intro">
          <FileSpreadsheet size={36} />
          <div>
            <h3>Settings, categories, loan schedule and overrides</h3>
            <p>
              Formula defaults stay formulas. Typed monthly values stay overrides. Date and category
              mappings are shown before applying changes.
            </p>
          </div>
          <ArrowRight size={22} />
        </div>
        {file && (
          <div className="import-preview">
            <div className="panel-head">
              <div>
                <h3>{file.name}</h3>
                <p>Step 1 · Map the transaction columns</p>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
              >
                Cancel import
              </button>
            </div>
            <div className="form-grid three">
              {Object.entries(mapping).map(([k, v]) => (
                <Field key={k} label={k.slice(0, 1).toUpperCase() + k.slice(1)}>
                  <select
                    aria-label={`Map ${k}`}
                    value={v}
                    onChange={(e) => setMapping({ ...mapping, [k]: e.target.value })}
                  >
                    <option value="">Not present</option>
                    {[...new Set([v, ...headers])].filter(Boolean).map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <button
              className="button secondary"
              disabled={!!busy}
              onClick={() => void loadPreview()}
            >
              <RefreshCw size={16} />
              Refresh preview with mapping
            </button>
            {error && <div className="callout error">{error}</div>}
            {preview && (
              <>
                <h3>Step 2 · Review the import</h3>
                <div className="pill-row">
                  {preview.summary.map((x) => (
                    <Badge key={x} tone="violet">
                      {x}
                    </Badge>
                  ))}
                </div>
                {preview.unknownCategories.length > 0 && (
                  <>
                    <p>
                      New category names: keep them as new categories, or map their entries to an
                      existing category.
                    </p>
                    <div className="form-grid">
                      {preview.unknownCategories.map((name) => (
                        <Field key={name} label={name}>
                          <select
                            value={remap[name] ?? ''}
                            onChange={(e) => setRemap({ ...remap, [name]: e.target.value })}
                          >
                            <option value="">Keep new category (Living)</option>
                            {p.categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} · {c.group}
                              </option>
                            ))}
                          </select>
                        </Field>
                      ))}
                    </div>
                  </>
                )}
                {preview.warnings.length > 0 && (
                  <div className="callout warning">
                    <strong>{preview.warnings.length} warnings</strong>
                    <ul>
                      {preview.warnings.slice(0, 30).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                    {preview.warnings.length > 30 && (
                      <p>
                        {preview.warnings.length - 30} additional warnings. Correct the source file
                        before import if those records are needed.
                      </p>
                    )}
                  </div>
                )}
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.plan.entries.slice(0, 8).map((e) => (
                        <tr key={e.id}>
                          <td>{e.date}</td>
                          <td>
                            {preview.plan.categories.find((c) => c.id === e.categoryId)?.name}
                          </td>
                          <td>{e.description}</td>
                          <td>{e.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!preview.plan.entries.length && (
                    <p className="muted">
                      No transactions in this file. The plan settings and loan schedule are ready to
                      import.
                    </p>
                  )}
                </div>
                <div className="import-actions">
                  <Field label="Import mode">
                    <select value={mode} onChange={(e) => setMode(e.target.value)}>
                      <option value="replace">Replace plan and entries</option>
                      <option value="append">Append entries only</option>
                    </select>
                  </Field>
                  <button className="button" onClick={() => void applyImport()}>
                    <Check size={17} />
                    Apply import
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Section>
      <Section
        title="Complete backup & restore"
        caption="A JSON backup includes your complete plan, archived entries, preferences and full change history. It ignores export view filters."
      >
        <div className="backup-actions">
          <button
            className="button secondary"
            disabled={!!busy}
            onClick={() =>
              void run('Backup export', () =>
                saveText(`${APP_NAME} - Backup.json`, JSON.stringify(env, null, 2), 'json'),
              )
            }
          >
            <Download size={17} />
            Export full backup
          </button>
          <button
            className="button secondary"
            disabled={!!busy}
            onClick={() =>
              void run('Restore backup', async () => {
                const f = await chooseFile(['json']);
                if (!f) return null;
                const backup = envelopeFrom(JSON.parse(new TextDecoder().decode(f.bytes)));
                if (
                  !(await confirm(
                    'Restore this backup?',
                    `Replace the current plan with ${backup.data.entries.length} entries and ${backup.audit.length} history records?`,
                    false,
                    'Restore',
                  ))
                )
                  return null;
                store.restore(backup);
                return true;
              })
            }
          >
            <Upload size={17} />
            Restore JSON backup
          </button>
          {!WEB_APP && (
            <button
              className="button secondary"
              disabled={!!busy || !window.desktop}
              title={
                !window.desktop ? 'Automatic backup folder is available in the desktop app' : ''
              }
              onClick={() =>
                void run('Automatic backup', async () => {
                  await store.flush();
                  return store.backup();
                })
              }
            >
              Back up now
            </button>
          )}
        </div>
        <p className="footnote">
          {WEB_APP
            ? 'Export a full JSON backup to keep a separate copy of your complete plan and history.'
            : window.desktop?.platform === 'android'
              ? 'Changed data is backed up when the app moves to the background. The latest ten distinct snapshots are kept. Use Export full backup to choose a phone folder.'
              : 'Windows backs up on exit and retains ten copies. A second backup folder can be selected in Settings.'}
        </p>
      </Section>
      {busy && (
        <div className="busy-pill">
          <span className="spinner" />
          {busy}…
        </div>
      )}
      {pdfPreview && (
        <Modal title="Monthly report preview" onClose={() => setPdfPreview(false)} wide>
          <p className="muted">
            Use the browser’s Print dialog and choose Save as PDF. The installed desktop app saves
            PDF directly.
          </p>
          <iframe title="Monthly report" srcDoc={monthlyReport(p)} className="report-frame" />
          <div className="modal-actions">
            <button
              className="button"
              onClick={() => {
                const frame = document.querySelector<HTMLIFrameElement>('.report-frame');
                frame?.contentWindow?.print();
              }}
            >
              Print / save PDF
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
