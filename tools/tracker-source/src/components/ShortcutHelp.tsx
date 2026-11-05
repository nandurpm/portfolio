import { Modal } from './UI';
import { themePresets } from '../theme-presets';

const shortcuts = [
  ['?', 'Show or hide this shortcut guide'],
  ['Ctrl/Cmd + Z', 'Undo the last change'],
  ['Ctrl/Cmd + Shift + Z', 'Redo the last change'],
  ['Ctrl + Y', 'Redo the last change on Windows/Linux'],
  ['Ctrl + N', 'Open a new transaction'],
  ['Esc', 'Close the current dialog or menu'],
] as const;

export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose} wide>
      <div className="shortcut-help">
        <p className="modal-copy">
          Use these shortcuts anywhere in the tracker. Shortcuts are paused while you type in a form field.
        </p>
        <div className="shortcut-list" aria-label="General keyboard shortcuts">
          {shortcuts.map(([key, description]) => (
            <div className="shortcut-row" key={key}>
              <kbd>{key}</kbd>
              <span>{description}</span>
            </div>
          ))}
        </div>
        <h3 className="shortcut-section-title">Theme presets</h3>
        <div className="shortcut-list" aria-label="Theme preset shortcuts">
          {themePresets.map((preset) => (
            <div className="shortcut-row" key={preset.id}>
              <kbd>Alt + {preset.shortcut}</kbd>
              <span>{preset.name}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
