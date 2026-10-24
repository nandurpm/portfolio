import fs from 'node:fs/promises';
import sharp from 'sharp';
const res = 'android/app/src/main/res';
let icon = await fs.readFile('public/icon.svg', 'utf8');
// Reuse the app's vector artwork, removing the tile and sparkles for an adaptive foreground.
let content = icon.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
content = content
  .replace(/<rect x="4"[^>]*\/>/, '')
  .replace(/<circle cx="202"[^>]*\/>/, '')
  .replace(/<path d="M51 71[^>]*\/>/, '');
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><g transform="translate(20.48 20.48) scale(.84)">${content}</g></svg>`;
const mono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><g transform="translate(20.48 20.48) scale(.84)" fill="white" stroke="white" stroke-linecap="round" stroke-linejoin="round"><path d="M62 136c-20-9-22 18-7 18 13 0 10-19-1-14" fill="none" stroke-width="9"/><path d="M86 176v24h22v-18m61-2v20h23v-36" stroke-width="8"/><ellipse cx="132" cy="142" rx="72" ry="48"/><path d="M166 113l4-27 26 24"/><rect x="190" y="126" width="25" height="31" rx="9"/><circle cx="125" cy="72" r="33"/></g></svg>`;
await fs.mkdir('assets', { recursive: true });
await fs.writeFile('assets/android-adaptive-foreground.svg', foreground);
await fs.writeFile('assets/android-monochrome.svg', mono);
for (const [density, scale] of Object.entries({
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
})) {
  const dir = `${res}/mipmap-${density}`;
  await sharp(Buffer.from(foreground))
    .resize(Math.round(108 * scale))
    .png()
    .toFile(`${dir}/ic_launcher_foreground.png`);
  await sharp(Buffer.from(mono))
    .resize(Math.round(108 * scale))
    .png()
    .toFile(`${dir}/ic_launcher_monochrome.png`);
}
for (const name of ['ic_launcher', 'ic_launcher_round'])
  await fs.writeFile(
    `${res}/mipmap-anydpi-v26/${name}.xml`,
    `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/><monochrome android:drawable="@mipmap/ic_launcher_monochrome"/></adaptive-icon>\n`,
  );
console.log('Transparent pig/coin foregrounds and themed monochrome icons generated.');
