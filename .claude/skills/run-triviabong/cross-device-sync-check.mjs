// Verifies stats (totalGames/totalAnswered/categoryStats/etc, not just
// level/xp/coins) actually follow an account across devices/browsers.
//
// Drives the app purely through the browser (no Firebase SDK import here),
// so it transparently follows wherever the app's own firebase.js is
// pointed. Run with VITE_USE_FIREBASE_EMULATOR=true set before `npm run
// dev` (see SKILL.md) to target the local Firebase Emulator Suite instead
// of live production - the recommended default, safe to loop/automate.
//
// Without that env var, this writes REAL data to the LIVE production
// Firebase project (triviabong-web) - specifically the shared BongBotTest
// Auth account plus its Firestore users/{uid} doc. Only run that way
// manually/on-demand, never in a loop (see SKILL.md).
//
// One FIXED account is reused across runs rather than a fresh throwaway per
// run: per-run accounts accumulated in production forever, and their
// generated names (qa-sync-<13-digit epoch> = 21 chars) exceeded the 20-char
// displayName cap in firestore.rules, which silently broke the admin panel's
// "Popuni sve profile" backfill for every player. "BongBotTest" is 11 chars.
// Stats accumulating across runs is fine - the assertions below compare
// context A against context B within a single run, never absolute values.
//
// Usage: node cross-device-sync-check.mjs [url]
import { chromium } from 'playwright';
import { resolvePrimaryCredentials } from './e2eCredentials.mjs';

const URL = process.argv[2] || 'http://localhost:5173';
// Resolved after URL so the guard can see the target: a non-local run without
// E2E_PASSWORD throws here, before a browser is opened, rather than letting the
// register fallback below mint a junk production account.
const { email: EMAIL, password: PASSWORD } = resolvePrimaryCredentials(URL);

function clickText(page, text) {
  return page.evaluate((t) => {
    const els = [...document.querySelectorAll('button, a, [role="button"]')];
    const el = els.find(e => e.textContent?.trim() === t) ?? els.find(e => e.textContent?.includes(t));
    if (!el) return 'NOT_FOUND';
    el.click();
    return 'OK: ' + (el.textContent || '').trim().slice(0, 40);
  }, text);
}

// The header's Statistika access point is now the "Razina" pill (icon +
// level number, no text label) rather than a labelled button - click by
// its title attribute instead of visible text (see golden-path.mjs, which
// already made this change). Matched as a PREFIX: the title also has the
// player's current level title appended, which varies by level.
function clickByTitle(page, titlePrefix) {
  return page.evaluate((t) => {
    const el = [...document.querySelectorAll('button, a, [role="button"]')].find(e => e.title?.startsWith(t));
    if (!el) return 'NOT_FOUND';
    el.click();
    return 'OK';
  }, titlePrefix);
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
  await clickByTitle(page, 'Razina i Statistika');
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

// Signs in as the fixed BongBotTest account, creating it the first time this
// ever runs against a given Firebase project (which, against the Firebase
// Emulator Suite, is *every* run unless emulator state was explicitly
// exported/imported - emulator data doesn't persist between sessions).
// Login is attempted first because once the account exists, registering
// first would fail with auth/email-already-in-use.
//
// The login-probe-then-register fallback below deliberately triggers a
// Firebase SDK-internal console.error("auth/user-not-found") (plus the
// underlying failed request's "Failed to load resource: ... 400" line) on
// first-ever run - expected and self-healing (registration immediately
// follows), not a real failure. Filtered out of consoleErrors below via
// isExpectedAuthProbeError so it doesn't fail every emulator-mode run,
// where "first-ever run" is the norm (emulator state doesn't persist
// between sessions) rather than the rare case it was against prod.
function isExpectedAuthProbeError(text) {
  return text.includes('auth/user-not-found') || text.includes('Failed to load resource');
}

async function signIn(page, label) {
  await clickText(page, 'Prijava');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await clickText(page, 'Prijavi se');

  try {
    await page.waitForSelector('input[type="email"]', { state: 'detached', timeout: 8000 });
    console.log(`=== [${label}] logged in as existing ${EMAIL} ===`);
    return 'logged-in';
  } catch {
    // Modal still open - assume the account doesn't exist yet and register.
    console.log(`=== [${label}] login failed, registering ${EMAIL} ===`);
    await clickText(page, 'Nemate račun? Registrirajte se');
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await clickText(page, 'Registriraj se');
    await page.waitForSelector('input[type="email"]', { state: 'detached', timeout: 15000 });
    return 'registered';
  }
}

async function registerAndPlay(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Izaberi Kategoriju Kvizova', { timeout: 15000 });

  const how = await signIn(page, 'A');
  step(`signed in (${how}) and modal closed`, true);

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
  // Context A guaranteed the account exists, so this is always a plain login.
  await signIn(page, 'B');
  step('logged in on fresh context', true);
  await page.waitForTimeout(1000); // onAuthStateChanged's server fetch

  const remoteSnapshot = await readStats(page);
  console.log('context B stats (should match A):', remoteSnapshot);
  step(`context B totalGames matches context A (${expected.totalGames})`, remoteSnapshot.totalGames === expected.totalGames);
  step(`context B Geografija answered-count matches context A (${expected.categoryAnswered})`,
    remoteSnapshot.categoryAnswered === expected.categoryAnswered);
}

// CHROMIUM_PATH lets a sandbox/CI image point at a browser Playwright
// didn't download itself (version-mismatched bundles, offline runners).
// Unset locally, where Playwright finds its own bundled Chromium.
const browser = await chromium.launch({
  args: ['--no-sandbox'],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const contextA = await browser.newContext();
const contextB = await browser.newContext(); // fresh cookie/localStorage jar - simulates a second device
const pageA = await contextA.newPage();
const pageB = await contextB.newPage();
const consoleErrors = [];
pageA.on('console', (msg) => { if (msg.type() === 'error' && !isExpectedAuthProbeError(msg.text())) consoleErrors.push(`[A] ${msg.text()}`); });
pageB.on('console', (msg) => { if (msg.type() === 'error' && !isExpectedAuthProbeError(msg.text())) consoleErrors.push(`[B] ${msg.text()}`); });

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
