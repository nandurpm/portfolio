export function assertPublicPath(name) {
  const p = name.replaceAll('\\', '/');
  if (
    /(?:^|\/)(?:private[^/]*|\.signing|\.env[^/]*|node_modules|plan\.json|password[^/]*|.*signing.*backup.*)(?:\/|$)/i.test(
      p,
    ) ||
    /\.(?:jks|keystore|p12|pfx)$/i.test(p)
  )
    throw Error(`Private file blocked: ${name}`);
}
export async function checkArchive(zip) {
  for (const file of Object.values(zip.files)) {
    assertPublicPath(file.name);
    if (!file.dir && /\.(?:zip|apk)$/i.test(file.name)) {
      const { default: JSZip } = await import('jszip');
      await checkArchive(await JSZip.loadAsync(await file.async('uint8array')));
    }
  }
}
