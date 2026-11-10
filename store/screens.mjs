// "store" demos: the official App Store screenshots and icon, for phone apps and anything that needs an
// account or personal data. Uses Apple's public lookup API (no key). Writes out/screens/NN.jpg, out/icon.jpg
// and out/media.json.   Usage: node store/screens.mjs <appStoreId> [country=in] [mac|iphone]
import fs from 'node:fs';
const [id, country = 'in', kind = 'iphone'] = process.argv.slice(2);
if (!id) { console.error('usage: node store/screens.mjs <appStoreId> [country] [mac|iphone]'); process.exit(1); }
const ent = kind === 'mac' ? '&entity=macSoftware' : '';
const r = await (await fetch(`https://itunes.apple.com/lookup?id=${id}&country=${country}${ent}`)).json();
const app = r.results?.[0];
if (!app) { console.error(`No App Store app ${id} in ${country}`); process.exit(1); }
// Ask for full-size images: the URLs end in e.g. /392x696bb.jpg and accept larger sizes.
const big = (u, size) => u.replace(/\/[0-9]+x[0-9]+bb\.(jpg|png|webp)$/, `/${size}bb.jpg`);
const shots = (app.screenshotUrls?.length ? app.screenshotUrls : app.ipadScreenshotUrls) || [];
fs.mkdirSync('out/screens', {recursive: true});
const save = async (url, file) => fs.writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
const screens = [];
for (const [i, u] of shots.slice(0, 6).entries()) {
  const f = `screens/${String(i).padStart(2, '0')}.jpg`;
  await save(big(u, kind === 'mac' ? '2880x1800' : '1290x2796'), `out/${f}`);
  screens.push(f);
}
if (app.artworkUrl512) await save(app.artworkUrl512, 'out/icon.jpg');
// Real pixel size of a JPEG (store images vary by device class)
const jpegSize = (buf) => {
  for (let i = 2; i < buf.length;) {
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return {height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7)};
    i += 2 + len;
  }
  return null;
};
const size = screens.length ? jpegSize(fs.readFileSync(`out/${screens[0]}`)) : null;
const media = {
  type: 'screens', screens, frame: 'card',
  width: size?.width || 1290, height: size?.height || 2796,
  icon: app.artworkUrl512 ? 'icon.jpg' : undefined,
  credit: 'Screens: official App Store listing',
  store: {name: app.trackName, seller: app.sellerName, price: app.formattedPrice, url: app.trackViewUrl},
};
fs.writeFileSync('out/media.json', JSON.stringify(media, null, 2));
console.log(`Saved ${screens.length} screenshots of ${app.trackName} (${app.sellerName})`);
