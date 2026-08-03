// Drives TriviaBong end-to-end in headless Chromium and reports pass/fail.
// Run as a single script, NOT a REPL fed via stdin - see SKILL.md Gotchas for
// why (spawning the Chromium child process corrupts the parent's stdout on
// this Windows setup once a long-lived process keeps reading further stdin
// commands afterward; a straight run-to-completion script sidesteps that).
//
// Usage: node golden-path.mjs [url] [category-button-text]
//   node golden-path.mjs
//   node golden-path.mjs http://localhost:5173 Povijest
import { chromium } from 'playwright';
import * as fs from 'node:fs';

const URL = process.argv[2] || 'http://localhost:5173';
const CATEGORY = process.argv[3] || 'Geografija';
const SHOT_DIR = process.env.SCREENSHOT_DIR || 'C:\\Windows\\Temp\\triviabong-shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const consoleLog = [];
let shotN = 0;
async function ss(page, name) {
  shotN += 1;
  const f = `${SHOT_DIR}\\${String(shotN).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: f });
  console.log('screenshot:', f);
}

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
// its title attribute instead of visible text.
function clickByTitle(page, title) {
  return page.evaluate((t) => {
    const el = [...document.querySelectorAll('button, a, [role="button"]')].find(e => e.title === t);
    if (!el) return 'NOT_FOUND';
    el.click();
    return 'OK';
  }, title);
}

function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

// Quiz answer buttons are shuffled per question - no stable selector. They're
// the only <button>s with both these Tailwind classes while gameState is
// 'PLAYING'. Update this filter if App.jsx's markup changes.
function clickFirstAnswer(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')].filter(b =>
      b.className.includes('rounded-2xl') && b.className.includes('text-left'));
    if (buttons.length === 0) return 'NO_OPTIONS';
    buttons[0].click();
    return 'clicked: ' + buttons[0].textContent.trim();
  });
}

// CHROMIUM_PATH lets a sandbox/CI image point at a browser Playwright
// didn't download itself (version-mismatched bundles, offline runners).
// Unset locally, where Playwright finds its own bundled Chromium.
const browser = await chromium.launch({
  args: ['--no-sandbox'],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on('console', (msg) => consoleLog.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => consoleLog.push(`[pageerror] ${err.message}`));

let failed = false;
function step(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${label}`);
  if (!ok) failed = true;
}

try {
  console.log(`=== nav to ${URL} ===`);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Izaberi Kategoriju Kvizova', { timeout: 15000 });
  await ss(page, 'lobby');
  step('lobby loaded', true);

  console.log(`=== pick category: ${CATEGORY} ===`);
  const catClick = await clickText(page, CATEGORY);
  step(`clicked ${CATEGORY} (${catClick})`, catClick.startsWith('OK'));
  await page.waitForSelector('text=Najbolji Rezultati', { timeout: 10000 });
  await ss(page, 'leaderboard');

  console.log('=== start quiz ===');
  const startClick = await clickText(page, 'Započni Kviz');
  step(`clicked start quiz (${startClick})`, startClick.startsWith('OK'));
  await page.waitForSelector('text=Bodovi:', { timeout: 10000 });
  await ss(page, 'quiz-q1');

  console.log('=== answer a few questions ===');
  for (let i = 0; i < 4; i += 1) {
    const before = await bodyText(page);
    if (before.includes('Kraj Igre') || before.includes('Pobjeda')) break;
    const scoreBefore = before.match(/Bodovi:\s*(\d+)/)?.[1];
    const clicked = await clickFirstAnswer(page);
    console.log(`Q${i + 1}: score-before=${scoreBefore} ${clicked}`);
    await page.waitForTimeout(1500); // app auto-advances ~1.2-1.5s after an answer
  }
  const afterAnswers = await bodyText(page);
  step('score updated from answering', /Bodovi:\s*\d+/.test(afterAnswers));
  await ss(page, 'after-answers');

  console.log('=== joker buttons ===');
  if (afterAnswers.includes('Bodovi:')) {
    step('50:50 joker clicked', (await clickText(page, '50:50')).startsWith('OK'));
    await page.waitForTimeout(300);
    step('+10s joker clicked', (await clickText(page, '+10s')).startsWith('OK'));
    await page.waitForTimeout(300);
    step('skip joker clicked', (await clickText(page, 'Preskoči')).startsWith('OK'));
    await page.waitForTimeout(1500);
    await ss(page, 'after-jokers');
  } else {
    console.log('round already ended - skipping joker check');
  }

  console.log('=== play to an end screen ===');
  for (let i = 0; i < 12; i += 1) {
    const t = await bodyText(page);
    if (t.includes('Kraj Igre') || t.includes('Pobjeda')) break;
    const clicked = await clickFirstAnswer(page);
    if (clicked === 'NO_OPTIONS') break;
    await page.waitForTimeout(1500);
  }
  const finalText = await bodyText(page);
  const reachedEnd = finalText.includes('Kraj Igre') || finalText.includes('Pobjeda');
  step(`reached end screen (${finalText.includes('Kraj Igre') ? 'GAMEOVER' : finalText.includes('Pobjeda') ? 'VICTORY' : 'UNKNOWN'})`, reachedEnd);
  await ss(page, 'end-screen');

  console.log('=== save score ===');
  const nicknameInput = await page.$('input[placeholder="Unesite nadimak (Nickname)"]');
  if (nicknameInput) {
    await nicknameInput.fill('BongBotTest');
    await clickText(page, 'Spremi Rezultat');
    await page.waitForTimeout(1500);
    await ss(page, 'score-saved');
    const savedText = await bodyText(page);
    step('score save confirmed', savedText.includes('uspješno spremljen'));
  } else {
    console.log('(no nickname input - score already saved or unexpected state)');
  }

  console.log('=== stats modal shows level/XP progress ===');
  await clickByTitle(page, 'Razina i Statistika');
  await page.waitForTimeout(300);
  const statsText = await bodyText(page);
  step('stats modal shows level/XP progress', /Razina\s+\d+/.test(statsText) && statsText.includes('XP do sljedeće razine'));
  await ss(page, 'stats-modal');
  await clickText(page, 'Zatvori');
  await page.waitForTimeout(300);

  console.log('=== back to lobby ===');
  await clickText(page, 'Povratak u Izbornik');
  await page.waitForSelector('text=Izaberi Kategoriju Kvizova', { timeout: 10000 });
  step('returned to lobby', true);
  await ss(page, 'back-to-lobby');

} catch (e) {
  console.log('SCRIPT ERROR:', e.message);
  failed = true;
  await ss(page, 'error-state').catch(() => {});
} finally {
  const errs = consoleLog.filter(l => l.startsWith('[error]') || l.startsWith('[pageerror]'));
  console.log(`\n=== console errors (${errs.length}) ===`);
  for (const l of errs) console.log(l);
  if (errs.length > 0) failed = true;

  console.log(`\n${failed ? 'FAILED' : 'ALL PASSED'}`);
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
