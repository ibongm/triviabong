// Verifies stats (totalGames/totalAnswered/categoryStats/etc, not just
// level/xp/coins) actually follow an account across devices/browsers.
//
// WARNING: like golden-path.mjs, this writes REAL data to the LIVE
// production Firebase project (triviabong-web) - specifically, a throwaway
// email/password Auth account plus its Firestore users/{uid} doc. Run this
// manually/on-demand, not in default CI (see SKILL.md).
//
// Usage: node cross-device-sync-check.mjs [url]
import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:5173';
const EMAIL = `qa-sync-${Date.now()}@example.com`;
const PASSWORD = 'QaSyncCheck123!';

function clickText(page, text) {
  return page.evaluate((t) => {
    const els = [...document.querySelectorAll('button, a, [role="button"]')];
    const el = els.find(e => e.textContent?.trim() === t) ?? els.find(e => e.textContent?.includes(t));
    if (!el) return 'NOT_FOUND';
    el.click();
    return 'OK: ' + (el.textContent || '').trim().slice(0, 40);
  }, text);
}

function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

function clickFirstAnswer(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')].filter(b =>
      b.className.includes('rounded-2xl') && b.className.includes('text-left'));
    if (buttons.length === 0) return 'NO_OPTIONS';
    buttons[0].click();
    return 'clicked: ' + buttons[0].textContent.trim();
  });
}

async function readStats(page) {
  await clickText(page, 'Statistika');
  await page.waitForTimeout(300);
  const text = await bodyText(page);
  const totalGames = text.match(/(\d+)\s*\n?\s*ODIGRANO/)?.[1];
  const categoryLine = text.match(/Geografija\s*\n?\s*(\d+)%\s*\((\d+)\/(\d+)\)/);
  await clickText(page, 'Zatvori');
  return { totalGames, categoryAnswered: categoryLine?.[3] };
}

let failed = false;
function step(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${label}`);
  if (!ok) failed = true;
}

async function registerAndPlay(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Izaberi Kategoriju Kvizova', { timeout: 15000 });

  console.log(`=== [A] register ${EMAIL} ===`);
  await clickText(page, 'Prijava');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await clickText(page, 'Nemate račun? Registrirajte se');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await clickText(page, 'Registriraj se');
  await page.waitForSelector('input[type="email"]', { state: 'detached', timeout: 15000 });
  step('registered and modal closed', true);

  console.log('=== [A] play a partial round ===');
  await clickText(page, 'Geografija');
  await page.waitForSelector('text=Najbolji Rezultati', { timeout: 10000 });
  await clickText(page, 'Započni Kviz');
  await page.waitForSelector('text=Bodovi:', { timeout: 10000 });
  for (let i = 0; i < 3; i += 1) {
    const t = await bodyText(page);
    if (t.includes('Kraj Igre') || t.includes('Pobjeda')) break;
    const clicked = await clickFirstAnswer(page);
    if (clicked === 'NO_OPTIONS') break;
    await page.waitForTimeout(1500);
  }

  console.log('=== [A] read stats, wait for sync to Firestore ===');
  const localSnapshot = await readStats(page);
  console.log('context A local stats:', localSnapshot);
  step('context A shows non-zero games played', localSnapshot.totalGames && Number(localSnapshot.totalGames) > 0);
  step('context A shows non-zero Geografija answers', Number(localSnapshot.categoryAnswered) > 0);
  await page.waitForTimeout(2000); // let the persistence effect's Firestore write land

  return localSnapshot;
}

async function loginAndCheck(page, expected) {
  console.log(`=== [B] fresh context, login as ${EMAIL} ===`);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Izaberi Kategoriju Kvizova', { timeout: 15000 });
  await clickText(page, 'Prijava');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await clickText(page, 'Prijavi se');
  await page.waitForSelector('input[type="email"]', { state: 'detached', timeout: 15000 });
  step('logged in on fresh context', true);
  await page.waitForTimeout(1000); // onAuthStateChanged's server fetch

  const remoteSnapshot = await readStats(page);
  console.log('context B stats (should match A):', remoteSnapshot);
  step(`context B totalGames matches context A (${expected.totalGames})`, remoteSnapshot.totalGames === expected.totalGames);
  step(`context B Geografija answered-count matches context A (${expected.categoryAnswered})`,
    remoteSnapshot.categoryAnswered === expected.categoryAnswered);
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const contextA = await browser.newContext();
const contextB = await browser.newContext(); // fresh cookie/localStorage jar - simulates a second device
const pageA = await contextA.newPage();
const pageB = await contextB.newPage();
const consoleErrors = [];
pageA.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`[A] ${msg.text()}`); });
pageB.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`[B] ${msg.text()}`); });

try {
  const expected = await registerAndPlay(pageA);
  await loginAndCheck(pageB, expected);
} catch (e) {
  console.log('SCRIPT ERROR:', e.message);
  failed = true;
} finally {
  console.log(`\n=== console errors (${consoleErrors.length}) ===`);
  for (const l of consoleErrors) console.log(l);
  if (consoleErrors.length > 0) failed = true;

  console.log(`\n${failed ? 'FAILED' : 'ALL PASSED'}`);
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
