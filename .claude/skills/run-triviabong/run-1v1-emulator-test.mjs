import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const URL = 'http://localhost:5173';
const VIDEO_DIR = 'C:\\Users\\bong\\.gemini\\antigravity\\brain\\1dfa0537-2586-43d9-97e9-9fd367daa051\\recordings';

if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

const id = Date.now().toString().slice(-6);
const P1 = { email: `p1_${id}@test.com`, password: 'Password123!' };
const P2 = { email: `p2_${id}@test.com`, password: 'Password123!' };

const testLogs = [];
function log(msg) {
  const timestamp = new Date().toISOString().substring(11, 23);
  const entry = `[${timestamp}] ${msg}`;
  console.log(entry);
  testLogs.push(entry);
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

function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

async function registerAndLogin(page, label, user) {
  log(`[${label}] Navigating to app...`);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Izaberi Kategoriju Kvizova', { timeout: 15000 });
  
  log(`[${label}] Opening login modal...`);
  await clickText(page, 'Prijava');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await clickText(page, 'Prijavi se');

  try {
    await page.waitForSelector('input[type="email"]', { state: 'detached', timeout: 6000 });
    log(`[${label}] Logged in as existing ${user.email}`);
  } catch {
    log(`[${label}] Registering account ${user.email}...`);
    await clickText(page, 'Nemate račun? Registrirajte se');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await clickText(page, 'Registriraj se');
    await page.waitForSelector('input[type="email"]', { state: 'detached', timeout: 15000 });
    log(`[${label}] Successfully registered and logged in as ${user.email}`);
  }
}

async function runTest() {
  log('Starting 1v1 Emulator Test...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const contextA = await browser.newContext({
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } }
  });
  const contextB = await browser.newContext({
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } }
  });

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  pageA.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Error')) log(`[PageA Console] ${msg.text()}`);
  });
  pageB.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Error')) log(`[PageB Console] ${msg.text()}`);
  });

  try {
    // 1. Auth Setup
    await Promise.all([
      registerAndLogin(pageA, 'Player 1 (Host)', P1),
      registerAndLogin(pageB, 'Player 2 (Invitee)', P2)
    ]);

    log('Waiting 3s for presence sync between players...');
    await pageA.waitForTimeout(3000);

    // 2. Invite flow
    const p2Prefix = P2.email.split('@')[0];
    log(`[Player 1] Looking for Player 2 (${p2Prefix}) in online list...`);
    await pageA.waitForSelector(`text=${p2Prefix}`, { timeout: 15000 });
    log('[Player 1] Found Player 2 in online list!');

    await pageA.evaluate((name) => {
      const rows = [...document.querySelectorAll('div')].filter(d => d.textContent?.includes(name));
      for (const row of rows) {
        const btn = row.querySelector('button');
        if (btn && btn.textContent.includes('Pozovi')) {
          btn.click();
          return;
        }
      }
    }, p2Prefix);

    await pageA.waitForSelector('select', { timeout: 10000 });
    await pageA.evaluate(() => {
      const select = document.querySelector('select');
      if (select && select.options.length > 0) {
        select.value = select.options[0].value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await pageA.waitForTimeout(300);
    log('[Player 1] Sending invite...');
    await clickText(pageA, 'Pošalji');

    log('[Player 2] Waiting for incoming invite modal...');
    await pageB.waitForSelector('text=Poziv na 1v1', { timeout: 15000 });
    log('[Player 2] Accept invite clicked!');
    await clickText(pageB, 'Prihvati');

    // 3. Waiting Ready screen check
    log('Waiting for both players to reach "Spreman!" screen...');
    await pageA.waitForSelector('text=Spreman!', { timeout: 10000 });
    await pageB.waitForSelector('text=Spreman!', { timeout: 10000 });
    log('Both players reached "Spreman!" screen.');

    // Check countdown behavior
    const readyTimeA = Date.now();
    log('[Player 1] Clicking "Spreman!"...');
    await clickText(pageA, 'Spreman!');

    // Monitor when question appears for Player 1 and Player 2
    let matchStartedA = false;
    let matchStartedB = false;
    let timeStartedA = 0;
    let timeStartedB = 0;

    for (let i = 0; i < 20; i++) {
      const textA = await bodyText(pageA);
      const textB = await bodyText(pageB);
      if (!matchStartedA && textA.includes('1 / 10')) {
        matchStartedA = true;
        timeStartedA = Date.now();
        log(`[Player 1] Question 1 appeared! Delay after clicking Spreman: ${timeStartedA - readyTimeA}ms`);
      }
      if (!matchStartedB && textB.includes('1 / 10')) {
        matchStartedB = true;
        timeStartedB = Date.now();
        log(`[Player 2] Question 1 appeared! Delay after P1 clicked Spreman: ${timeStartedB - readyTimeA}ms`);
      }
      if (matchStartedA && matchStartedB) break;
      await pageA.waitForTimeout(200);
    }

    log(`FINDING 1 (Match Start Countdown): P1 clicked Spreman, match started in ${timeStartedA - readyTimeA}ms without 5s countdown!`);

    // 4. Gameplay Loop & Observation
    log('--- STARTING 1v1 GAMEPLAY OBSERVATION ---');

    const questionHistory = [];

    for (let q = 0; q < 15; q++) {
      await pageA.waitForTimeout(500);
      const textA = await bodyText(pageA);
      const textB = await bodyText(pageB);

      if (textA.includes('Revanš') || textB.includes('Revanš')) {
        log(`Match finished at iteration ${q}!`);
        break;
      }

      // Extract current question number
      const qMatchA = textA.match(/(\d+)\s*\/\s*10/);
      const currentQIndexA = qMatchA ? qMatchA[1] : 'Unknown';
      log(`[State Check] P1 see question ${currentQIndexA} / 10`);

      questionHistory.push(currentQIndexA);

      // Player 1 answers
      const answerResA = await pageA.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')].filter(b =>
          b.className.includes('rounded-2xl') && b.className.includes('text-left') && !b.disabled);
        if (buttons.length === 0) return 'NO_BUTTONS';
        const choiceText = buttons[0].textContent.trim();
        buttons[0].click();
        return `P1 clicked option 0: "${choiceText.slice(0, 20)}"`;
      });
      log(`[Player 1 Action] ${answerResA}`);

      // Check if Player 2 still has time/ability to answer before reveal/jump
      await pageA.waitForTimeout(200);

      const p2CanStillAnswer = await pageB.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')].filter(b =>
          b.className.includes('rounded-2xl') && b.className.includes('text-left') && !b.disabled);
        return buttons.length;
      });

      log(`[P1 Answered] P2 enabled buttons left: ${p2CanStillAnswer}`);

      // Player 2 answers
      const answerResB = await pageB.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')].filter(b =>
          b.className.includes('rounded-2xl') && b.className.includes('text-left') && !b.disabled);
        if (buttons.length === 0) return 'NO_BUTTONS';
        const choiceText = buttons[buttons.length > 1 ? 1 : 0].textContent.trim();
        buttons[buttons.length > 1 ? 1 : 0].click();
        return `P2 clicked option: "${choiceText.slice(0, 20)}"`;
      });
      log(`[Player 2 Action] ${answerResB}`);

      // Measure how long reveal screen stays before jumping to next question
      log('Measuring reveal screen duration...');
      let revealDuration = 0;
      for (let r = 0; r < 30; r++) {
        await pageA.waitForTimeout(100);
        const tA = await bodyText(pageA);
        const newQMatch = tA.match(/(\d+)\s*\/\s*10/);
        const newQIndex = newQMatch ? newQMatch[1] : null;

        if (newQIndex && newQIndex !== currentQIndexA) {
          revealDuration = (r + 1) * 100;
          log(`[Advance Triggered] Advanced from Q${currentQIndexA} to Q${newQIndex} in ~${revealDuration}ms!`);
          break;
        }
        if (tA.includes('Revanš')) {
          log(`[Match Finished] Reached game over in ~${(r+1)*100}ms`);
          break;
        }
      }

      if (revealDuration < 1000) {
        log(`FINDING 2 (Instant Advance): Reveal duration was only ~${revealDuration}ms, jumping instantly to next question!`);
      }
    }

    log(`Question index sequence observed during game: ${JSON.stringify(questionHistory)}`);

    // Wait for match over screen
    await pageA.waitForTimeout(2000);
    const finalA = await bodyText(pageA);
    const finalB = await bodyText(pageB);

    log(`[Player 1 Final Screen Summary]: ${finalA.slice(0, 200).replace(/\n/g, ' ')}`);
    log(`[Player 2 Final Screen Summary]: ${finalB.slice(0, 200).replace(/\n/g, ' ')}`);

    log('Closing pages to save recorded videos...');
    await pageA.close();
    await pageB.close();
    await contextA.close();
    await contextB.close();

    const videoFiles = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.webm'));
    log(`Saved video files: ${JSON.stringify(videoFiles)}`);

  } catch (err) {
    log(`TEST EXCEPTION: ${err.stack}`);
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(VIDEO_DIR, 'test_execution_log.txt'),
      testLogs.join('\n'),
      'utf8'
    );
    log('Test script finished.');
  }
}

runTest();
