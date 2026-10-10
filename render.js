// Weekly race card, done the way Alex does it by hand on jackpotcomps.netlify.app:
// Weekly Race Card tab → week start → "Use these dates" → colour 1-6 → ⬇ PNG + ⬇ .zip.
// It clicks the real buttons on the live site, so edits to the builder carry over.
//
//   node render.js                      next Monday, this week's colour
//   node render.js 2026-10-12           a given Monday
//   node render.js 2026-10-12 3         a given Monday and colour (1-6)
// (or the same through the WEEK / VARIANT env vars, which is how CI passes them)
//
// Prints a JSON line { week, variant, png, zip } for the workflow to publish.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SITE = process.env.SITE_URL || 'https://jackpotcomps.netlify.app/';
const TZ = process.env.TZ_ID || 'Asia/Bangkok';
const OUT = path.resolve(process.env.OUT_DIR || 'out');

// One colour per week (the builder's 1-6 switch), walking ROTATION one step a
// week. Week of Oct 5 2026 = ROTATION[0] = 2 Gold, the one Alex sent by hand.
// Override with the ROTATION env var, e.g. "1,2,6" to only use those three.
const ANCHOR_MONDAY = '2026-10-05';
const ROTATION = (process.env.ROTATION || '2,3,4,5,6,1').split(',').map(Number);

function nextMonday(now = new Date()) {
  // Same rule as the builder's nextMondayDate(), evaluated in Alex's timezone.
  const local = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  const day = local.getDay();
  local.setDate(local.getDate() + (day === 0 ? 1 : 8 - day));
  return ymd(local);
}
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function variantFor(monday) {
  const weeks = Math.round((Date.parse(monday) - Date.parse(ANCHOR_MONDAY)) / (7 * 864e5));
  return ROTATION[((weeks % ROTATION.length) + ROTATION.length) % ROTATION.length];
}

async function main() {
  const monday = process.argv[2] || process.env.WEEK || nextMonday();
  const variant = Number(process.argv[3] || process.env.VARIANT || variantFor(monday));
  if (!(variant >= 1 && variant <= 6)) throw new Error(`colour ${variant} is not 1-6`);
  if (new Date(monday + 'T00:00:00Z').getUTCDay() !== 1) throw new Error(`${monday} is not a Monday`);
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ acceptDownloads: true, timezoneId: TZ, viewport: { width: 1600, height: 1000 } });
  await page.goto(SITE, { waitUntil: 'load', timeout: 120000 });
  // Plates are base64 images decoded after load; wait until the weekly canvas has art on it.
  await page.waitForFunction(() => {
    const cv = document.getElementById('canvas-weekly');
    if (!cv) return false;
    const px = cv.getContext('2d').getImageData(cv.width / 2, cv.height / 2, 1, 1).data;
    return px[3] > 0;
  }, null, { timeout: 60000 });

  // The date pill is drawn in Poppins, which the site only gets from the system
  // (its Google Fonts @import sits after @font-face, so browsers drop it). If
  // Poppins is missing the pill silently falls back, so refuse to send that.
  const hasPoppins = await page.evaluate(() => {
    const c = document.createElement('canvas').getContext('2d');
    const w = f => { c.font = f; return c.measureText('OCTOBER 12 - 18').width; };
    return w('700 26px Poppins, monospace') !== w('700 26px monospace');
  });
  if (!hasPoppins) throw new Error('Poppins is not installed, the date pill would use the wrong font');

  await page.click('button.tab[data-tab="weekly"]');
  await page.fill('#weekly-start-date', monday);
  await page.dispatchEvent('#weekly-start-date', 'change');
  await page.click('#btnWeeklyApplyDates');
  await page.click(`#weekly-variant button[data-v="${variant}"]`);

  const tag = await page.inputValue('#weekly-tag');
  const name = await page.inputValue('#weekly-filename');

  const save = async (selector) => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click(selector)]);
    const file = path.join(OUT, dl.suggestedFilename());
    await dl.saveAs(file);
    return file;
  };
  const png = await save('[data-dl-canvas="canvas-weekly"]');
  const zip = await save('#btnWeeklyZip');
  const themeName = await page.evaluate(() => weeklyTheme().name);

  await browser.close();
  const result = { week: monday, tag, name, variant, themeName, png, zip };
  console.log(JSON.stringify(result));
  return result;
}

main().catch(e => { console.error(e); process.exit(1); });
