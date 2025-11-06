import fs from 'fs';
import { chromium } from 'playwright';

(async () => {
  const url = process.argv[2] || 'http://localhost:5173/';
  const out = process.argv[3] || './console-log.txt';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    console.log(text);
    logs.push(text);
  });

  page.on('pageerror', err => {
    const text = `[pageerror] ${err.stack || err.message || String(err)}`;
    console.log(text);
    logs.push(text);
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    // wait a bit for background tasks
    await page.waitForTimeout(4000);
  } catch (e) {
    const text = `[goto-error] ${e.stack || e.message || String(e)}`;
    console.log(text);
    logs.push(text);
  }

  await browser.close();
  fs.writeFileSync(out, logs.join('\n\n'), 'utf8');
  console.log('Saved console log to', out);
})();
