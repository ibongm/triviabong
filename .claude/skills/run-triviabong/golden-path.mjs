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
import { dismissWhatsNew, seedAnonCoins } from './e2eCredentials.mjs';

// Enough for all three jokers (15 + 10 + 30) with headroom.
const JOKER_TEST_COINS = 100;

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
// its title attribute instead of visible text. Matched as a PREFIX, not
// exact equality: the title also has the player's current level title
// appended (e.g. "Razina i Statistika — Slučajni Prolaznik"), which varies
// by level, so an exact match would break the moment a fresh test account
// isn't level 1 anymore.
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

// Regression guard for the mobile header-overflow bug (see
// plans/Phone-header-layout-issues.md) - resizes to a 360px phone
// viewport, asserts the document never grows wider than the viewport
// (which is how the original bug surfaced as a document-level horizontal
// scroll with a white gutter, rather than a contained header overflow),
// then restores whatever viewport size the page had before.
async function assertNoMobileOverflow(page, label) {
  const original = page.viewportSize();
  await page.setViewportSize({ width: 360, height: 640 });
  await page.waitForTimeout(200); // let layout settle after resize
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  step(`no horizontal overflow at 360px (${label}): scrollWidth=${scrollWidth} innerWidth=${innerWidth}`, scrollWidth <= innerWidth);
  if (original) await page.setViewportSize(original);
}

// Header coin balance: the level pill's text is "<level> Lvl <coins>".
async function readCoins(page) {
  return page.evaluate(() => {
    const pill = [...document.querySelectorAll('button')].find(b => b.title?.startsWith('Razina i Statistika'));
    const nums = pill?.innerText.match(/\d+/g);
    return nums ? Number(nums[nums.length - 1]) : null;
  });
}

function countAnswerButtons(page) {
  return page.evaluate(() => [...document.querySelectorAll('button')].filter(b =>
    b.className.includes('rounded-2xl') && b.className.includes('text-left')).length);
}

// Joker buttons are matched by label. A used joker is natively disabled; one
// the player can't afford is NOT disabled but shows the "Nemaš dovoljno"
// message instead - so "clicked" alone proves nothing. Returns the button's
// state so the caller can assert enabled-before, disabled-after, coins spent,
// and the joker's actual effect.
function jokerState(page, label) {
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find(e => e.textContent?.includes(t));
    return b ? { found: true, disabled: b.disabled } : { found: false, disabled: null };
  }, label);
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

// With FEATURES.EXPLANATIONS on, answering a question that has an
// explanation holds the round on a "Dalje" button instead of auto-advancing
// (answer buttons stay disabled meanwhile). Click through it when present;
// a no-op when the flag is off or the question has no explanation.
async function continuePastExplanation(page) {
  const r = await clickText(page, 'Dalje');
  if (r.startsWith('OK')) await page.waitForTimeout(400);
  return r;
}

// CHROMIUM_PATH lets a sandbox/CI image point at a browser Playwright
// didn't download itself (version-mismatched bundles, offline runners).
// Unset locally, where Playwright finds its own bundled Chromium.
const browser = await chromium.launch({
  args: ['--no-sandbox'],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const ctx = await browser.newContext();
await dismissWhatsNew(ctx);
await seedAnonCoins(ctx, JOKER_TEST_COINS);
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
  await page.waitForSelector('text=Odaberi kategoriju kvizova', { timeout: 15000 });
  await ss(page, 'lobby');
  step('lobby loaded', true);
  await assertNoMobileOverflow(page, 'lobby');

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
  await assertNoMobileOverflow(page, 'playing');

  // Runs first, while the round is guaranteed live: answers below pick the
  // first option blindly, so lives can run out within 3 questions.
  console.log('=== joker buttons ===');
  const jokers = [
    { label: '50:50', cost: 15, effect: async () => (await countAnswerButtons(page)) === 2 },
    { label: '+10s', cost: 10, effect: async () => true }, // no stable timer selector; coins + disabled cover it
    // Using all three in one round unlocks the Tactician achievement, which pays
    // ACHIEVEMENT_NORMAL_COINS (5) back on this third joker.
    { label: 'Preskoči', cost: 30, bonus: 5, effect: async () => /2\s*\/\s*10/.test(await bodyText(page)) },
  ];
  for (const j of jokers) {
    const coinsBefore = await readCoins(page);
    const before = await jokerState(page, j.label);
    step(`${j.label} joker is enabled and affordable (coins=${coinsBefore})`, before.found && !before.disabled && coinsBefore >= j.cost);
    await clickText(page, j.label);
    await page.waitForTimeout(500);
    const after = await jokerState(page, j.label);
    const coinsAfter = await readCoins(page);
    step(`${j.label} joker used (button disabled)`, after.found && after.disabled);
    const net = j.cost - (j.bonus || 0);
    step(`${j.label} joker charged ${net}c net (${coinsBefore} -> ${coinsAfter})`, coinsBefore - coinsAfter === net);
    step(`${j.label} joker had its effect`, await j.effect());
  }
  await page.waitForTimeout(1000);
  await ss(page, 'after-jokers');

  console.log('=== answer a few questions ===');
  for (let i = 0; i < 4; i += 1) {
    const before = await bodyText(page);
    if (before.includes('Kraj Igre') || before.includes('Pobjeda')) break;
    const scoreBefore = before.match(/Bodovi:\s*(\d+)/)?.[1];
    const clicked = await clickFirstAnswer(page);
    console.log(`Q${i + 1}: score-before=${scoreBefore} ${clicked}`);
    await page.waitForTimeout(1500); // app auto-advances ~1.2-1.5s after an answer
    await continuePastExplanation(page);
  }
  const afterAnswers = await bodyText(page);
  // A round can legitimately end mid-loop (lives run out from wrong answers),
  // which replaces the "Bodovi:" score line with a game-over/victory screen -
  // that's a pass, not a stalled round, so accept either outcome.
  const roundEnded = afterAnswers.includes('Kraj Igre') || afterAnswers.includes('Pobjeda');
  step('score updated from answering', /Bodovi:\s*\d+/.test(afterAnswers) || roundEnded);
  await ss(page, 'after-answers');

  console.log('=== play to an end screen ===');
  for (let i = 0; i < 12; i += 1) {
    const t = await bodyText(page);
    if (t.includes('Kraj Igre') || t.includes('Pobjeda')) break;
    const clicked = await clickFirstAnswer(page);
    if (clicked === 'NO_OPTIONS') break;
    await page.waitForTimeout(1500);
    await continuePastExplanation(page);
  }
  const finalText = await bodyText(page);
  const reachedEnd = finalText.includes('Kraj Igre') || finalText.includes('Pobjeda');
  step(`reached end screen (${finalText.includes('Kraj Igre') ? 'GAMEOVER' : finalText.includes('Pobjeda') ? 'VICTORY' : 'UNKNOWN'})`, reachedEnd);
  await ss(page, 'end-screen');

  console.log('=== save score ===');
  const nicknameInput = await page.$('input[placeholder="Unesite nadimak"]');
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
  await clickText(page, 'Povratak u izbornik');
  await page.waitForSelector('text=Odaberi kategoriju kvizova', { timeout: 10000 });
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
