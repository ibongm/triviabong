// TEMPORARY audit helper: captures lobby / game-over / leaderboard screenshots
// and reports console errors + failed (4xx/5xx) network requests.
//
//   node scripts/capture-audit-screens.mjs [url]     (default http://localhost:5173)
//
// Uses Playwright (the repo's browser driver, installed in the skill folder),
// not Puppeteer, which isn't a dependency here. Signs in as the fixed
// BongBotTest account via e2eCredentials.mjs (non-local targets need
// E2E_PASSWORD; emulator runs need nothing).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dismissWhatsNew, resolvePrimaryCredentials } from '../.claude/skills/run-triviabong/e2eCredentials.mjs';

const require = createRequire(new URL('../.claude/skills/run-triviabong/package.json', import.meta.url));
const { chromium } = require('playwright');

const BASE_URL = process.argv[2] || 'http://localhost:5173';
const { email: EMAIL, password: PASSWORD } = resolvePrimaryCredentials(BASE_URL);
const OUT = new URL('../screenshots/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(OUT, { recursive: true });

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

const consoleErrors = [];
const badRequests = [];

const clickText = (page, text) => page.evaluate((t) => {
  const els = [...document.querySelectorAll('button, a, [role="button"]')];
  const el = els.find(e => e.textContent?.trim() === t) ?? els.find(e => e.textContent?.includes(t));
  if (!el) return 'NOT_FOUND';
  el.click();
  return 'OK';
}, text);
const bodyText = (page) => page.evaluate(() => document.body.innerText);
const clickFirstAnswer = (page) => page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].filter(x => x.className.includes('rounded-2xl') && x.className.includes('text-left'));
  if (!b.length) return 'NO_OPTIONS';
  b[0].click();
  return 'OK';
});
const shot = async (page, name) => {
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log('screenshot:', `screenshots/${name}.png`);
};

async function signIn(page) {
  await clickText(page, 'Prijava');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await clickText(page, 'Prijavi se');
  try {
    await page.waitForSelector('input[type="email"]', { state: 'detached', timeout: 8000 });
    return 'logged-in';
  } catch {
    // Account missing (fresh emulator) - same login-or-register fallback as the E2E scripts.
    await clickText(page, 'Nemate račun? Registrirajte se');
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await clickText(page, 'Registriraj se');
    await page.waitForSelector('input[type="email"]', { state: 'detached', timeout: 15000 });
    return 'registered';
  }
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: MOBILE });
await dismissWhatsNew(context);
const page = await context.newPage();
// Deliberate sign-in probe failures (auth/user-not-found + its 400) are tracked
// separately so they don't read as real findings.
let probing = false;
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push({ text: m.text(), probe: probing, at: page.url() }); });
page.on('pageerror', (e) => consoleErrors.push({ text: `[pageerror] ${e.message}`, probe: false, at: page.url() }));
page.on('response', (r) => { if (r.status() >= 400) badRequests.push({ status: r.status(), url: r.url(), probe: probing }); });
page.on('requestfailed', (r) => badRequests.push({ status: 'FAILED', url: `${r.url()} (${r.failure()?.errorText})`, probe: probing }));

try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Odaberi kategoriju kvizova', { timeout: 15000 });
  await page.waitForTimeout(1500); // let rekordi/lobby data settle
  await shot(page, 'mobile-lobby');

  await page.setViewportSize(DESKTOP);
  await page.waitForTimeout(500);
  await shot(page, 'desktop-lobby');

  probing = true;
  console.log('sign-in:', await signIn(page));
  probing = false;

  // Mobile game-over: play a Geografija round to the end screen.
  await page.setViewportSize(MOBILE);
  await clickText(page, 'Geografija');
  await page.waitForSelector('text=Najbolji Rezultati', { timeout: 10000 });
  await clickText(page, 'Započni Kviz');
  await page.waitForSelector('text=Bodovi:', { timeout: 10000 });
  for (let i = 0; i < 15; i += 1) {
    const t = await bodyText(page);
    if (t.includes('Kraj Igre') || t.includes('Pobjeda')) break;
    if ((await clickFirstAnswer(page)) === 'NO_OPTIONS') break;
    await page.waitForTimeout(1500);
    await clickText(page, 'Dalje');
    await page.waitForTimeout(300);
  }
  const end = await bodyText(page);
  console.log('end screen reached:', end.includes('Kraj Igre') ? 'GAMEOVER' : end.includes('Pobjeda') ? 'VICTORY' : 'NO');
  await shot(page, 'mobile-gameover');

  // Desktop leaderboard: the category's "Najbolji Rezultati" screen.
  await clickText(page, 'Povratak u izbornik');
  await page.waitForSelector('text=Odaberi kategoriju kvizova', { timeout: 10000 });
  await page.setViewportSize(DESKTOP);
  await clickText(page, 'Geografija');
  await page.waitForSelector('text=Najbolji Rezultati', { timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(page, 'desktop-leaderboard');
} catch (err) {
  console.log('SCRIPT ERROR:', err.message);
  await shot(page, 'error-state').catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}

const real = (xs) => xs.filter(x => !x.probe);
const probe = (xs) => xs.filter(x => x.probe);
console.log(`\n=== console errors: ${real(consoleErrors).length} (+${probe(consoleErrors).length} expected sign-in probe) ===`);
for (const e of real(consoleErrors)) console.log(`  [${e.at}] ${e.text}`);
console.log(`=== 4xx/5xx or failed requests: ${real(badRequests).length} (+${probe(badRequests).length} expected sign-in probe) ===`);
for (const r of real(badRequests)) console.log(`  ${r.status} ${r.url}`);
