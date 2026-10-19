export async function saveBytes(name: string, bytes: Uint8Array, extension: string) {
  if (window.desktop) return window.desktop.saveFile(name, bytes, extension);
  const blob = new Blob([new Uint8Array(bytes)], {
    type:
      extension === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : extension === 'json'
          ? 'application/json'
          : 'text/csv',
  });
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return name;
}
export const saveText = (name: string, text: string, extension: string) =>
  saveBytes(name, new TextEncoder().encode(text), extension);
export async function chooseFile(
  extensions: string[],
): Promise<{ name: string; bytes: Uint8Array } | null> {
  if (window.desktop) return window.desktop.openFile(extensions);
  return new Promise((resolve) => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = extensions.map((e) => '.' + e).join(',');
    i.onchange = async () => {
      const f = i.files?.[0];
      resolve(f ? { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) } : null);
    };
    i.oncancel = () => resolve(null);
    i.click();
  });
}
export const xmlEscape = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
