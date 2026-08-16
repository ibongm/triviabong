# Design/UX Audit Report
**Date:** 2026-08-04
**Source Tool:** Claude Design (Design Components)

## Findings

- **[CRITICAL]** No primary CTA hierarchy on the Lobby screen — all 8 category buttons render with identical styling, no featured/recommended entry. File: `src/App.jsx` (LOBBY block, category `.map`).
- **[CRITICAL]** Core game mechanic (countdown timer) is visually the smallest element on the play screen — 32×32px ring, 10px text. File: `src/components/TimerRing.jsx` (SIZE=32, `text-[10px]`).
- **[HIGH]** Header is overloaded — 5 same-weight interactive elements (Razina, Zlatnici, Trofeji, Vodič, Auth) crowd one row on mobile widths. File: `src/App.jsx` (`<header>` block).
- **[HIGH]** All 8 trivia categories share one identical amber icon-chip style, giving zero visual differentiation for scanning. File: `src/data/categoryMeta.js` (no `color` field); rendered in `src/App.jsx` category button.
- **[HIGH]** No pressed/active tap feedback anywhere — only `hover:` classes defined, which don't fire reliably on touch (`hoverOnlyWhenSupported: true` in `tailwind.config.js`). Files: all buttons in `src/App.jsx`, `src/components/*.jsx`.
- **[MEDIUM]** Silent game-over transition — `setTimeout(() => setGameState('GAMEOVER'), 1000)` with no shake/flash feedback beyond the existing red option highlight. File: `src/App.jsx` (`handleAnswer`, `handleAnswerTimeout`).
- **[MEDIUM]** Stacked gradient treatment on header logotype (badge gradient + text gradient in the same lockup) reads as a generic AI-gradient trope. File: `src/App.jsx` (`<header>`, logo `div`/`span`).
- **[LOW]** One-off hex color `bg-[#121824]` breaks from the `slate-900`/`slate-950` token set used everywhere else. File: `src/components/AuthModal.jsx` (modal container `className`).
- **[LOW]** Type scale bottoms out at `text-[9px]`/`text-[10px]` for state-bearing labels (stat labels, timer digits), below comfortable mobile legibility. Files: `src/App.jsx` (stat pill labels), `src/components/TimerRing.jsx`.

## Recommended Fixes

- **Lobby hierarchy:** surface a "Continue" or featured category card above the grid, or dedicate the primary CTA a distinct fill/size vs. the rest of the list.
- **Timer:** bump `SIZE` to 56, `STROKE_WIDTH` to 5, digit class to `text-lg font-black`; make it the visual anchor of the top play bar.
- **Header:** collapse Razina + Zlatnici into a single profile pill; move Trofeji count into the Stats modal entry point.
  ```jsx
  <button className="flex items-center gap-3 bg-slate-900/80 border border-slate-800/80 pl-2 pr-3 py-1.5 rounded-2xl">
    <span className="flex items-center gap-1 text-xs font-bold text-amber-400"><Star className="w-4 h-4 fill-amber-400" />{globalStats.level}</span>
    <span className="w-px h-4 bg-slate-700" />
    <span className="flex items-center gap-1 text-xs font-bold text-amber-400"><Coins className="w-4 h-4" />{globalStats.coins}</span>
  </button>
  ```
- **Category color variety:** add a `color` token per entry in `categoryMeta.js` (e.g. `sky`, `emerald`, `fuchsia`, `amber`...) and safelist the resulting Tailwind classes in `tailwind.config.js`.
- **Tactile feedback:** add `active:scale-[0.97] active:brightness-95 transition-transform` to every interactive button.
- **Game-over feedback:** add a brief shake/flash before the 1s cut to GAMEOVER.
  ```css
  @keyframes shake { 10%,90% { transform: translateX(-2px); } 20%,80% { transform: translateX(3px); } 30%,50%,70% { transform: translateX(-5px); } 40%,60% { transform: translateX(5px); } }
  ```
- **Color token cleanup:** replace `bg-[#121824]` with `bg-slate-900` in `AuthModal.jsx`.
- **Type scale:** raise incidental-but-state-bearing text (stat labels, timer digits) to a minimum ~11–14px step; reserve sub-11px for truly decorative marks only.
