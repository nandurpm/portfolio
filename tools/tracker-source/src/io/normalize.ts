import JSZip from 'jszip';
/** ExcelJS 4.x expects unprefixed SpreadsheetML elements. Preserve values/formulas while
 * normalizing equivalent namespace-prefixed OOXML (including the supplied workbook). */
export async function excelCompatible(bytes: Uint8Array): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(bytes);
  let changed = false;
  for (const file of Object.values(zip.files)) {
    if (file.dir || !/\.(xml|rels)$/.test(file.name)) continue;
    let xml = await file.async('string');
    if (file.name.endsWith('.rels')) {
      const directory = file.name.replace(/(?:^|\/)_rels\/[^/]+$/, '');
      xml = xml.replace(/Target="\/([^"#]+)"/g, (_match, target: string) => {
        const from = directory.split('/').filter(Boolean),
          to = target.split('/');
        while (from.length && to.length && from[0] === to[0]) {
          from.shift();
          to.shift();
        }
        changed = true;
        return `Target="${'../'.repeat(from.length)}${to.join('/')}"`;
      });
      zip.file(file.name, xml);
      continue;
    }
    const namespaces = [
      ...xml.matchAll(
        /xmlns:([A-Za-z_][\w.-]*)=["']http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main["']/g,
      ),
    ];
    const hasDates = /<c\b[^>]*\bt=["']d["']/.test(xml);
    if (!namespaces.length && !hasDates) continue;
    for (const match of namespaces) {
      const prefix = match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      xml = xml
        .replace(new RegExp(`(<\\/?)(?:${prefix}):`, 'g'), '$1')
        .replace(match[0], 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"');
    }
    xml = xml.replace(/(<c\b[^>]*\bt=)["']d["']/g, '$1"str"');
    zip.file(file.name, xml);
    changed = true;
  }
  return changed ? zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }) : bytes;
}
