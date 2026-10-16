// E2E check for the async duel lifecycle (engagement plan Phase 4) with two
// real, concurrently active browser contexts: BongBotTest challenges
// BongBotTest2, BongBotTest2 accepts and plays its 10 questions, BongBotTest
// finishes its own run, and the duel must resolve to `complete` with a
// consistent winner, claimed rewards, match-history entries and win stats.
//
// EMULATOR ONLY. Async duels are dark in production (FEATURES.ASYNC_DUELS), so
// the dev server needs both env vars below; src/constants/features.js only
// honours VITE_FORCE_ASYNC_DUELS together with VITE_USE_FIREBASE_EMULATOR.
//
//   npx firebase emulators:start --only firestore,auth
//   VITE_USE_FIREBASE_EMULATOR=true VITE_FORCE_ASYNC_DUELS=true npm run dev
//   node scripts/async-duel-check.mjs [url]
//
// Drives the app purely through the browser; the final data checks read the
// Firestore emulator over its REST API (no Firebase SDK import). Credentials
// come from the run-triviabong skill's e2eCredentials.mjs (fixed accounts,
// never throwaway usernames - see AGENTS.md "Test Account Rule").
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolveBothCredentials } from '../.claude/skills/run-triviabong/e2eCredentials.mjs';

// playwright lives in the skill folder's own node_modules, not the repo root.
const require = createRequire(new URL('../.claude/skills/run-triviabong/package.json', import.meta.url));
const { chromium } = require('playwright');

const URL_ARG = process.argv[2] || 'http://localhost:5173';
const CATEGORY_LABEL = 'Geografija';
const FIRESTORE_REST = 'http://127.0.0.1:8080/v1/projects/triviabong-web/databases/(default)/documents';

if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(URL_ARG)) {
  console.error(`Refusing to run against ${URL_ARG}: this check only works against the local emulator + dev server.`);
  process.exit(2);
}
const { p1: P1, p2: P2 } = resolveBothCredentials(URL_ARG);

let failed = false;
function step(label, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${label}${extra ? ' - ' + extra : ''}`);
  if (!ok) failed = true;
}

// First-ever login attempt on a fresh emulator triggers a self-healing
// auth/user-not-found before registration (same filter as two-player-match-check).
const isExpectedAuthProbeError = (text) => text.includes('auth/user-not-found') || text.includes('Failed to load resource');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const bodyText = (page) => page.evaluate(() => document.body.innerText);

function clickText(page, text) {
  return page.evaluate((t) => {
    const els = [...document.querySelectorAll('button, a, [role="button"]')];
    const el = els.find((e) => e.textContent?.trim() === t) ?? els.find((e) => e.textContent?.includes(t));
    if (!el) return 'NOT_FOUND';
    el.click();
    return 'OK: ' + (el.textContent || '').trim().slice(0, 40);
  }, text);
}

// question text -> correct answer text, from the same static JSON the app
// bundles. The duel is created in CATEGORY_LABEL's category, so this covers
// every question it can serve. Lets each player answer deterministically
// (all right / all wrong), so the winner is known up front and the score and
// reward paths are really exercised rather than a 0-0 tiebreak.
const CORRECT_BY_QUESTION = new Map(
  JSON.parse(readFileSync(new URL('../src/data/categories/geografija.json', import.meta.url), 'utf8'))
    .map((q) => [q.question, q.correct_answer]),
);

// Same answer-button fingerprint as the other E2E scripts (rounded-2xl +
// text-left). mode 'correct' clicks the right option, 'wrong' a wrong one.
function clickAnswer(page, mode) {
  return page.evaluate(([correctByQuestion, wantCorrect]) => {
    const map = new Map(correctByQuestion);
    const heading = [...document.querySelectorAll('h2')].find((h) => map.has(h.textContent?.trim()));
    if (!heading) return 'NO_QUESTION';
    const correct = map.get(heading.textContent.trim());
    const buttons = [...document.querySelectorAll('button')].filter((b) =>
      b.className.includes('rounded-2xl') && b.className.includes('text-left') && !b.disabled);
    const target = buttons.find((b) => (b.textContent?.trim() === correct) === wantCorrect);
    if (!target) return 'NO_OPTIONS';
    target.click();
    return 'clicked';
  }, [[...CORRECT_BY_QUESTION], mode === 'correct']);
}

// Polls `predicate(bodyText)` until it is truthy or the timeout passes.
async function waitForText(page, predicate, timeoutMs = 15000, intervalMs = 300) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await bodyText(page);
    if (predicate(text)) return text;
    await sleep(intervalMs);
  }
  return null;
}

async function signIn(page, label, { email, password }) {
  await page.goto(URL_ARG, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Odaberi kategoriju kvizova', { timeout: 15000 });
  await clickText(page, 'Prijava');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await clickText(page, 'Prijavi se');
  try {
    await page.waitForSelector('input[type="email"]', { state: 'detached', timeout: 8000 });
    console.log(`=== [${label}] logged in as existing ${email} ===`);
  } catch {
    console.log(`=== [${label}] login failed, registering ${email} ===`);
    await clickText(page, 'Nemate račun? Registrirajte se');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await clickText(page, 'Registriraj se');
    await page.waitForSelector('input[type="email"]', { state: 'detached', timeout: 15000 });
  }
}

// Plays answers until the end-of-run screen ("Natrag u lobi") is showing.
// 20 s per question is the app's own timer, so budget generously.
async function playRunToSummary(page, label, mode, maxIterations = 120) {
  for (let i = 0; i < maxIterations; i += 1) {
    const text = await bodyText(page);
    if (text.includes('Natrag u lobi')) {
      await sleep(1500); // let the opponent/duel reads that build the summary settle
      return bodyText(page);
    }
    await clickAnswer(page, mode);
    await sleep(700);
  }
  console.log(`=== [${label}] never reached the end-of-run screen ===`);
  return null;
}

const outcomeOf = (text) => (text.includes('Pobjeda!') ? 'win' : text.includes('Poraz') ? 'loss' : text.includes('Neriješeno!') ? 'draw' : null);
const complementary = (a, b) => (a === 'draw' && b === 'draw') || (a === 'win' && b === 'loss') || (a === 'loss' && b === 'win');

// ---- Firestore emulator REST helpers ----

const decodeValue = (v) => {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return undefined;
};
const decodeFields = (fields) => Object.fromEntries(Object.entries(fields || {}).map(([k, v]) => [k, decodeValue(v)]));

async function restGet(path) {
  const res = await fetch(`${FIRESTORE_REST}/${path}`, { headers: { Authorization: 'Bearer owner' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore emulator GET ${path} -> ${res.status}`);
  return res.json();
}
const restDoc = async (path) => {
  const json = await restGet(path);
  return json?.fields ? decodeFields(json.fields) : null;
};

// Mirrors decideWinner() in src/utils/asyncDuel.js (re-implemented on purpose:
// the check should not share code with the thing it verifies).
const expectedWinnerUid = (duel, challenger, opponent) => {
  if (challenger.score !== opponent.score) return challenger.score > opponent.score ? duel.challengerUid : duel.opponentUid;
  if (challenger.totalTimeMs !== opponent.totalTimeMs) return challenger.totalTimeMs < opponent.totalTimeMs ? duel.challengerUid : duel.opponentUid;
  return null;
};

async function pollUntil(fn, timeoutMs = 20000, intervalMs = 500) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await fn();
    if (last) return last;
    await sleep(intervalMs);
  }
  return last;
}

// ---- the run ----

const consoleErrors = [];
let browser;
try {
  try {
    await fetch('http://127.0.0.1:8080');
  } catch {
    throw new Error('Firestore emulator is not reachable on 127.0.0.1:8080 - start it first (see the header comment).');
  }

  browser = await chromium.launch({
    args: ['--no-sandbox'],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const pageA = await (await browser.newContext()).newPage();
  const pageB = await (await browser.newContext()).newPage();
  pageA.on('console', (msg) => { if (msg.type() === 'error' && !isExpectedAuthProbeError(msg.text())) consoleErrors.push(`[A/challenger] ${msg.text()}`); });
  pageB.on('console', (msg) => { if (msg.type() === 'error' && !isExpectedAuthProbeError(msg.text())) consoleErrors.push(`[B/opponent] ${msg.text()}`); });
  pageA.on('pageerror', (err) => consoleErrors.push(`[A/challenger pageerror] ${err.message}`));
  pageB.on('pageerror', (err) => consoleErrors.push(`[B/opponent pageerror] ${err.message}`));

  console.log('=== sign in both contexts (concurrently) ===');
  await Promise.all([signIn(pageA, 'A/challenger', P1), signIn(pageB, 'B/opponent', P2)]);
  step('both contexts signed in', true);
  await sleep(3000); // presence writes + listeners

  console.log('=== [A] open "Izazovi" and challenge B ===');
  const lobbyText = await waitForText(pageA, (t) => t.includes('Izazovi — dvoboj bez čekanja'), 10000);
  step('A sees the async duels lobby entry (flag override active)', !!lobbyText,
    lobbyText ? '' : 'start the dev server with VITE_USE_FIREBASE_EMULATOR=true VITE_FORCE_ASYNC_DUELS=true');
  if (!lobbyText) throw new Error('Async duels UI is not enabled in the dev server.');
  await clickText(pageA, 'Izazovi — dvoboj bez čekanja');

  const challengeRowVisible = await waitForText(pageA, (t) => t.toLowerCase().includes('bongbottest2'), 15000);
  step('A sees B in the challenge candidates (online presence)', !!challengeRowVisible);

  await pageA.evaluate((label) => {
    const select = document.querySelector('select');
    const option = select && [...select.options].find((o) => o.textContent?.trim().toLowerCase() === label.toLowerCase());
    if (option) {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, CATEGORY_LABEL);
  await sleep(300);

  const challenged = await pageA.evaluate(() => {
    const row = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.trim() === 'Izazovi' && b.parentElement?.textContent?.toLowerCase().includes('bongbottest2'));
    if (!row) return 'NOT_FOUND';
    row.click();
    return 'OK';
  });
  step('A clicks "Izazovi" on B', challenged === 'OK', challenged);

  // Creating a direct duel immediately opens the challenger's own run.
  const aPlaying = await waitForText(pageA, (t) => /\b\d+ \/ 10\b/.test(t), 20000);
  step('A starts their run right after challenging', !!aPlaying);
  if (!aPlaying) console.log('  A sees: ' + (await bodyText(pageA)).slice(0, 600).replace(/\n/g, ' | '));

  console.log('=== [B] find the challenge in the inbox and play it ===');
  await clickText(pageB, 'Izazovi — dvoboj bez čekanja');
  let myTurn = null;
  for (let i = 0; i < 10 && !myTurn; i += 1) {
    await clickText(pageB, 'Osvježi'); // forced re-fetch, bypasses the 30 s throttle
    await sleep(1500);
    const t = await bodyText(pageB);
    if (t.includes('Tvoj potez')) myTurn = t;
  }
  step('B sees the challenge as "Tvoj potez"', !!myTurn);
  const played = await clickText(pageB, 'Igraj');
  step('B clicks "Igraj"', played.startsWith('OK'), played);
  const bPlaying = await waitForText(pageB, (t) => /\b1 \/ 10\b/.test(t), 15000);
  step('B reaches question 1 / 10', !!bPlaying);

  const bSummary = await playRunToSummary(pageB, 'B/opponent', 'correct');
  step('B finishes 10 questions and reaches the summary', !!bSummary);
  step('B sees "Čekamo protivnika" while A is unfinished', !!bSummary && bSummary.includes('Čekamo protivnika'));
  await clickText(pageB, 'Natrag u lobi');

  console.log('=== [A] finish the run; the duel should resolve ===');
  const aSummary = await playRunToSummary(pageA, 'A/challenger', 'wrong');
  step('A finishes 10 questions and reaches the summary', !!aSummary);
  const outcomeA = aSummary ? outcomeOf(aSummary) : null;
  step('A\'s summary shows a resolved outcome (win/loss/draw)', !!outcomeA, `outcome=${outcomeA}`);
  if (aSummary) {
    const scores = [...aSummary.matchAll(/(\d+)\s+(\d+)\/10 točnih/g)].map((m) => Number(m[1]));
    step('A\'s summary shows both players\' scores', scores.length === 2, `scores=${JSON.stringify(scores)}`);
    if (scores.length === 2 && scores[0] !== scores[1]) {
      step('A\'s outcome matches the displayed scores', outcomeA === (scores[0] > scores[1] ? 'win' : 'loss'), `scores=${scores.join('-')}`);
    }
  }
  await clickText(pageA, 'Natrag u lobi');

  console.log('=== [B] refresh the inbox; the completed duel is reviewed and the reward claimed ===');
  await clickText(pageB, 'Izazovi — dvoboj bez čekanja');
  let complete = null;
  for (let i = 0; i < 10 && !complete; i += 1) {
    await clickText(pageB, 'Osvježi');
    await sleep(1500);
    const t = await bodyText(pageB);
    if (t.includes('Završeno')) complete = t;
  }
  step('B\'s inbox shows the duel as "Završeno"', !!complete);
  const reviewed = await clickText(pageB, 'Pregled');
  step('B opens the review', reviewed.startsWith('OK'), reviewed);
  const bReview = await waitForText(pageB, (t) => outcomeOf(t) !== null, 10000);
  const outcomeB = bReview ? outcomeOf(bReview) : null;
  step('B sees a resolved outcome', !!outcomeB, `outcome=${outcomeB}`);
  step('A and B outcomes are complementary', !!outcomeA && !!outcomeB && complementary(outcomeA, outcomeB), `A=${outcomeA} B=${outcomeB}`);
  // B answered everything right and A everything wrong, so B must win.
  step('B (all correct) won and A (all wrong) lost', outcomeA === 'loss' && outcomeB === 'win', `A=${outcomeA} B=${outcomeB}`);

  console.log('=== verify stored data (Firestore emulator REST) ===');
  const list = await restGet('asyncDuels');
  const duelDocs = (list?.documents || []).map((d) => ({ id: d.name.split('/').pop(), ...decodeFields(d.fields) }));
  step('exactly one asyncDuels document exists', duelDocs.length === 1, `count=${duelDocs.length}`);
  const duel = duelDocs[0];
  if (duel) {
    step('duel is a complete direct duel', duel.status === 'complete' && duel.mode === 'direct', `status=${duel.status} mode=${duel.mode}`);
    step('duel has 10 question ids and category geografija',
      Array.isArray(duel.questionIds) && duel.questionIds.length === 10 && duel.category === 'geografija', `category=${duel.category}`);

    const rc = await restDoc(`asyncDuels/${duel.id}/results/${duel.challengerUid}`);
    const ro = await restDoc(`asyncDuels/${duel.id}/results/${duel.opponentUid}`);
    step('both result docs are done with 10 answers',
      rc?.state === 'done' && ro?.state === 'done' && rc.answers?.length === 10 && ro.answers?.length === 10);

    const expected = rc && ro ? expectedWinnerUid(duel, rc, ro) : undefined;
    step('B scored points, A scored 0',
      ro?.score > 0 && ro?.correct === 10 && rc?.score === 0 && rc?.correct === 0,
      `challenger ${rc?.score}/${rc?.correct}, opponent ${ro?.score}/${ro?.correct}`);
    step('winnerUid matches the stored results', expected !== undefined && duel.winnerUid === expected,
      `stored=${duel.winnerUid} expected=${expected} (challenger ${rc?.score}/${rc?.totalTimeMs}ms, opponent ${ro?.score}/${ro?.totalTimeMs}ms)`);

    const claimed = await pollUntil(async () => {
      const [c, o] = await Promise.all([
        restDoc(`asyncDuels/${duel.id}/results/${duel.challengerUid}`),
        restDoc(`asyncDuels/${duel.id}/results/${duel.opponentUid}`),
      ]);
      return c?.rewardClaimed === true && o?.rewardClaimed === true;
    });
    step('both players\' rewards are claimed (rewardClaimed=true)', !!claimed);

    const entryFor = async (uid) => restDoc(`matchHistory/${uid}/entries/${duel.id}`);
    const [hc, ho] = await Promise.all([
      pollUntil(() => entryFor(duel.challengerUid)),
      pollUntil(() => entryFor(duel.opponentUid)),
    ]);
    const expectedResult = (uid) => (duel.winnerUid == null ? 'draw' : duel.winnerUid === uid ? 'win' : 'loss');
    step('challenger has an async matchHistory entry with the right result',
      hc?.async === true && hc.result === expectedResult(duel.challengerUid), `entry=${hc?.result} expected=${expectedResult(duel.challengerUid)}`);
    step('opponent has an async matchHistory entry with the right result',
      ho?.async === true && ho.result === expectedResult(duel.opponentUid), `entry=${ho?.result} expected=${expectedResult(duel.opponentUid)}`);
    if (hc && ho) {
      step('matchHistory scores mirror each other', hc.myScore === ho.opponentScore && hc.opponentScore === ho.myScore,
        `challenger ${hc.myScore}-${hc.opponentScore}, opponent ${ho.myScore}-${ho.opponentScore}`);
    }

    // The win reward (applyOneVsOneWin) lands in the winner's synced stats.
    const wins = async (uid) => (await restDoc(`users/${uid}`))?.total1v1Wins || 0;
    if (duel.winnerUid) {
      const loserUid = duel.winnerUid === duel.challengerUid ? duel.opponentUid : duel.challengerUid;
      const winnerWins = await pollUntil(async () => (await wins(duel.winnerUid)) >= 1, 25000);
      step('winner\'s total1v1Wins incremented', !!winnerWins);
      step('loser\'s total1v1Wins not incremented', (await wins(loserUid)) === 0);
    } else {
      step('draw: neither player got a win credited',
        (await wins(duel.challengerUid)) === 0 && (await wins(duel.opponentUid)) === 0);
    }
  }
} catch (e) {
  console.log('SCRIPT ERROR:', e.message);
  failed = true;
} finally {
  console.log(`\n=== console errors (${consoleErrors.length}) ===`);
  for (const l of consoleErrors) console.log(l);
  if (consoleErrors.length > 0) failed = true;

  console.log(`\n${failed ? 'FAILED' : 'ALL PASSED'}`);
  if (browser) await browser.close();
  process.exitCode = failed ? 1 : 0;
}
