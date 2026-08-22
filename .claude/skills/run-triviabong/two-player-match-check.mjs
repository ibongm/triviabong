// Verifies the full 1v1 live-invite match flow (Plan B) end-to-end with two
// REAL, CONCURRENTLY ACTIVE browser contexts - unlike cross-device-sync-
// check.mjs (which plays sequentially, one context at a time), this drives
// both players' answer loops with Promise.all so it actually exercises the
// simultaneous-write paths firestore.rules' matches/{matchId} depends on
// (both players answering around the same moment, both self-reporting
// score, the questionStartedAt/reveal/advance races).
//
// Drives the app purely through the browser (no Firebase SDK import here),
// so it transparently follows wherever the app's own firebase.js is
// pointed. Run with VITE_USE_FIREBASE_EMULATOR=true set before `npm run
// dev` (see SKILL.md) to target the local Firebase Emulator Suite instead
// of live production - the recommended default, safe to loop/automate.
//
// Without that env var, this writes REAL data to the LIVE production
// Firebase project (triviabong-web) - a real matchInvites doc, a real
// matches doc (which can never be deleted by design - see firestore.rules'
// comment on matches/{matchId} - accepted clutter, same as golden-path.mjs's
// leaderboard rows), and both players' matchHistory entries. Only run that
// way manually/on-demand, never in a loop.
//
// TWO fixed accounts, not one: this is the one script in the skill that
// genuinely needs two distinct uids. Reuses the same "fixed account, not a
// per-run throwaway" reasoning as BongBotTest (see cross-device-sync-
// check.mjs's comment) - "BongBotTest2" is 12 characters, well under the
// 20-char displayName cap.
//
// Usage: node two-player-match-check.mjs [url] [category]
import { chromium } from 'playwright';
import { resolveBothCredentials } from './e2eCredentials.mjs';

const URL = process.argv[2] || 'http://localhost:5173';
const CATEGORY_LABEL = process.argv[3] || 'Geografija';

// Resolved after URL so the guard can see the target: a non-local run without
// E2E_PASSWORD/E2E_PASSWORD_2 throws here, before a browser is opened, rather
// than letting signIn()'s register fallback mint a junk production account.
const { p1: P1, p2: P2 } = resolveBothCredentials(URL);

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

// Same answer-button fingerprint as golden-path.mjs/cross-device-sync-
// check.mjs (rounded-2xl + text-left) - MatchView's answer buttons use the
// identical Tailwind classes as solo mode's, deliberately, for visual
// consistency, so this selector works unchanged here.
function clickFirstEnabledAnswer(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')].filter(b =>
      b.className.includes('rounded-2xl') && b.className.includes('text-left') && !b.disabled);
    if (buttons.length === 0) return 'NO_OPTIONS';
    buttons[0].click();
    return 'clicked: ' + buttons[0].textContent.trim().slice(0, 30);
  });
}

let failed = false;
function step(label, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${label}${extra ? ' - ' + extra : ''}`);
  if (!ok) failed = true;
}

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

// Login-or-register, same pattern as cross-device-sync-check.mjs's signIn.
async function signIn(page, label, { email, password }) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Izaberi Kategoriju Kvizova', { timeout: 15000 });
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

// Runs one player's side of the match: click "Spreman!" if present, then
// repeatedly click the first enabled answer button until the match reaches
// its final screen ("Revanš" is unique to MatchView's match_over/forfeited
// screen). Both players' loops run concurrently via Promise.all below, not
// sequentially - that's the whole point of this script over the existing
// sequential cross-device-sync-check.mjs.
// 90 iterations * 700ms = ~63s budget: covers the 5s synced pre-match
// countdown, up to 11 questions each with a 3s reveal pause, plus normal
// network/render slack - both the countdown and reveal delay are real app
// behavior (see MatchView.jsx), not script overhead, so this budget has to
// track them rather than assume near-instant transitions.
async function playMatchToEnd(page, label, maxIterations = 90) {
  for (let i = 0; i < maxIterations; i += 1) {
    const text = await bodyText(page);
    if (text.includes('Revanš')) {
      // Settle before capturing: this client's own last write is applied
      // optimistically via the local Firestore cache the instant match_over
      // renders, but the score fields reflect whatever this client's
      // onSnapshot listener had received from the OPPONENT as of that
      // instant - a moment's wait lets any still-in-flight opponent write
      // actually arrive before reading the "final" text, distinguishing a
      // real stored-data bug from a rendering-lag artifact.
      await page.waitForTimeout(1500);
      const settledText = await bodyText(page);
      console.log(`=== [${label}] reached match_over/forfeited screen after ${i} iterations ===`);
      return settledText;
    }
    if (text.includes('Spreman!')) {
      await clickText(page, 'Spreman!');
    } else {
      await clickFirstEnabledAnswer(page);
    }
    await page.waitForTimeout(700);
  }
  return null;
}

const browser = await chromium.launch({
  args: ['--no-sandbox'],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const contextA = await browser.newContext();
const contextB = await browser.newContext();
const pageA = await contextA.newPage();
const pageB = await contextB.newPage();
const consoleErrors = [];
pageA.on('console', (msg) => { if (msg.type() === 'error' && !isExpectedAuthProbeError(msg.text())) consoleErrors.push(`[A/host] ${msg.text()}`); });
pageB.on('console', (msg) => { if (msg.type() === 'error' && !isExpectedAuthProbeError(msg.text())) consoleErrors.push(`[B/invitee] ${msg.text()}`); });

try {
  console.log('=== sign in both contexts (concurrently) ===');
  await Promise.all([signIn(pageA, 'A/host', P1), signIn(pageB, 'B/invitee', P2)]);
  step('both contexts signed in', true);

  // Let usePresence's initial write land and both onSnapshot listeners pick
  // each other up before A tries to find B in the online list.
  await pageA.waitForTimeout(3000);

  console.log('=== [A] open the "1v1 Dvoboj" card to reach the online players list ===');
  // The online players list moved behind a compact lobby CTA card (opens
  // OnlinePlayersModal) rather than rendering inline - see App.jsx's
  // "1v1 Dvoboj" button next to "Dnevni izazov".
  const opened1v1Card = await pageA.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')].filter(b => b.textContent?.includes('1v1 Dvoboj'));
    if (buttons.length === 0) return 'NOT_FOUND';
    buttons[0].click();
    return 'OK';
  });
  step('A opens the 1v1 Dvoboj card', opened1v1Card === 'OK');
  await pageA.waitForTimeout(500);

  console.log('=== [A] find P2 in the online list and send an invite ===');
  const foundRow = await pageA.evaluate(() => {
    const rows = [...document.querySelectorAll('div')].filter(d =>
      d.textContent?.includes('bongbottest2') || d.textContent?.includes('BongBotTest2'));
    return rows.length > 0;
  });
  step('A sees B in the online players list', foundRow);

  const inviteClicked = await pageA.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')].filter(b => b.textContent?.includes('Pozovi'));
    if (buttons.length === 0) return 'NOT_FOUND';
    buttons[0].click();
    return 'OK';
  });
  step('A clicks Pozovi', inviteClicked === 'OK');

  await pageA.waitForTimeout(300);
  const categorySet = await pageA.evaluate((label) => {
    const select = document.querySelector('select');
    if (!select) return 'NO_SELECT';
    const option = [...select.options].find(o => o.textContent?.trim().toLowerCase() === label.toLowerCase());
    if (!option) return 'NO_MATCHING_OPTION';
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return 'OK';
  }, CATEGORY_LABEL);
  step(`A picks category ${CATEGORY_LABEL}`, categorySet === 'OK', categorySet);

  const sent = await clickText(pageA, 'Pošalji');
  step('A sends the invite', sent.startsWith('OK'));

  console.log('=== [B] accept the incoming invite ===');
  await pageB.waitForSelector('text=Poziv na 1v1', { timeout: 15000 });
  step('B sees the invite modal', true);
  const accepted = await clickText(pageB, 'Prihvati');
  step('B accepts', accepted.startsWith('OK'));

  console.log('=== both contexts should now be in the match (waiting_ready) ===');
  await pageA.waitForSelector('text=Spreman!', { timeout: 15000 });
  await pageB.waitForSelector('text=Spreman!', { timeout: 15000 });
  step('both contexts reached the waiting_ready screen', true);

  console.log('=== both players play the match SIMULTANEOUSLY to completion ===');
  const [finalTextA, finalTextB] = await Promise.all([
    playMatchToEnd(pageA, 'A/host'),
    playMatchToEnd(pageB, 'B/invitee'),
  ]);
  step('A reached a final screen', !!finalTextA);
  step('B reached a final screen', !!finalTextB);

  if (finalTextA && finalTextB) {
    const scoreA = finalTextA.match(/(\d+)\s*—\s*(\d+)/);
    const scoreB = finalTextB.match(/(\d+)\s*—\s*(\d+)/);
    step('both final screens show a score line', !!scoreA && !!scoreB);
    if (scoreA && scoreB) {
      // A's screen shows "A_score — B_score" from A's own perspective; B's
      // screen shows "B_score — A_score" from B's. The two numbers must be
      // each other's mirror image if both clients agree on the outcome.
      const symmetric = scoreA[1] === scoreB[2] && scoreA[2] === scoreB[1];
      step('both contexts agree on the final score (symmetric)', symmetric, `A saw ${scoreA[1]}—${scoreA[2]}, B saw ${scoreB[1]}—${scoreB[2]}`);
    }
    const aWin = finalTextA.includes('Pobjeda!');
    const aLoss = finalTextA.includes('Poraz');
    const aDraw = finalTextA.includes('Neriješeno!');
    const bWin = finalTextB.includes('Pobjeda!');
    const bLoss = finalTextB.includes('Poraz');
    const bDraw = finalTextB.includes('Neriješeno!');
    const complementary = (aDraw && bDraw) || (aWin && bLoss) || (aLoss && bWin);
    step('win/loss/draw outcome is complementary between both contexts', complementary,
      `A: win=${aWin} loss=${aLoss} draw=${aDraw} · B: win=${bWin} loss=${bLoss} draw=${bDraw}`);
  }
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
