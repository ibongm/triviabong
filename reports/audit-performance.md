# Performance & UX Audit Report

**Date:** 2026-08-04  
**Source Tool:** Antigravity IDE  

---

## Executive Summary

**Overall Performance Score: 65 / 100 (Needs Optimization)**

This audit evaluated the performance, rendering efficiency, bundle composition, and mobile UX/ergonomics of **TriviaBong**. While the application achieves fast initial DOM render speeds due to Vite, critical performance and UX friction points hamper responsiveness and mobile playability:

### Top Friction Points
1. **Monolithic Bundle & Static Data Import:** All 3,542 trivia questions (~1.29 MB JSON) and the 1,033-line `AdminPanel` component are statically imported into a single ~1.71 MB JavaScript bundle shipped to every visitor.
2. **Timer Interval Churn & Main Thread Re-renders:** The countdown timer effect tears down and recreates `setInterval` every second while triggering full single-tree re-renders of `App.jsx` (1,125 lines).
3. **Effect-Driven State Lag (1-Frame Stale Render):** Question option shuffling and input locking use post-paint `useEffect` updates instead of pure `useMemo` derivations, causing a temporary frame flash of stale options on question advance.
4. **Mobile Header Overload & Modal Ergonomics:** 6 interactive badges crowd a single flex row on 500px mobile viewports, and non-sticky modal headers force users to scroll up to find close (`✕`) buttons.

---

## Critical Bottlenecks

### 1. Monolithic 1.71 MB JavaScript Chunk & Monolithic Question Pack Loading
- **File:** [`src/data/questionsLoader.js:L1-L21`](file:///c:/Users/bong/Documents/triviabong/src/data/questionsLoader.js#L1-L21) | [`src/App.jsx:L31`](file:///c:/Users/bong/Documents/triviabong/src/App.jsx#L31) | [`vite.config.js`](file:///c:/Users/bong/Documents/triviabong/vite.config.js)
- **Bottleneck:** `questionsLoader.js` statically imports all 8 category JSON files at startup. Additionally, `AdminPanel.jsx` (accessible only to administrators) is statically imported into the top-level `App.jsx`. `vite.config.js` lacks `manualChunks` splitting.
- **Impact:** High First Contentful Paint (FCP) and Largest Contentful Paint (LCP) delays, alongside high JavaScript parse/compile CPU overhead on mobile browsers.

### 2. Timer Interval Churn & Impure State Updater Audio Side-Effects
- **File:** [`src/App.jsx:L260-L276`](file:///c:/Users/bong/Documents/triviabong/src/App.jsx#L260-L276)
- **Bottleneck:** The countdown effect includes `timeLeft` in its dependency array `[timeLeft, gameState, selectedOption]`. This tears down and re-arms `setInterval` every 1,000ms. Furthermore, `sound.playTick()` is called inside `setTimeLeft((prev) => ...)` (an impure updater function).
- **Impact:** In React `StrictMode`, `playTick()` fires twice per second. Re-arming the interval every tick accumulates render latency, slowing the timer relative to wall-clock time and skewing speedrun rankings (`elapsedMs`).

### 3. Post-Commit State Synchronization Lag (Stale Frame Bug B6)
- **File:** [`src/App.jsx:L177-L187`](file:///c:/Users/bong/Documents/triviabong/src/App.jsx#L177-L187)
- **Bottleneck:** `currentShuffledOptions` and `answerLocked` are written inside a `useEffect` hooked to `currentIndex`.
- **Impact:** When `currentIndex` increments, React commits one frame where the new question text is rendered alongside the *previous* question's options enabled for 16-32ms, allowing accidental clicks on stale answer buttons.

### 4. Excessive Unbatched Firestore Write Operations (Bug B9)
- **File:** [`src/App.jsx:L233-L239`](file:///c:/Users/bong/Documents/triviabong/src/App.jsx#L233-L239)
- **Bottleneck:** Every `globalStats` mutation triggers immediate, unbatched remote calls to `syncUserStatsToFirestore` and `syncPublicProfile`.
- **Impact:** A 10-question round triggers 24–30 remote write operations, causing network micro-stutters on weak mobile connections.

---

## UX & Mobile Ergonomic Findings

### 1. Header Bar Overload on Mobile Viewports (< 520px)
- **File:** [`src/App.jsx:L690-L770`](file:///c:/Users/bong/Documents/triviabong/src/App.jsx#L690-L770)
- **Finding:** The header packs 6 separate interactive items (`Logo`, `Razina`, `Zlatnici`, `Trofeji`, `Vodič`, `Prijava`) into one row. On mobile viewports (e.g. 502x751), labels wrap or squeeze tight against edge boundaries.

### 2. Non-Sticky Modal Headers & Hidden Dismiss Buttons
- **File:** [`src/components/GuideModal.jsx:L20-L25`](file:///c:/Users/bong/Documents/triviabong/src/components/GuideModal.jsx#L20-L25) | [`src/components/StatsModal.jsx:L20-L25`](file:///c:/Users/bong/Documents/triviabong/src/components/StatsModal.jsx#L20-L25)
- **Finding:** Modal header containers lack `sticky top-0`. When scrolling down extensive content (such as achievement lists or guide rules), the close button (`✕`) scrolls out of sight.

### 3. Lack of Tactile Active/Touch Feedback
- **File:** [`src/App.jsx:L930-L960`](file:///c:/Users/bong/Documents/triviabong/src/App.jsx#L930-L960) | [`tailwind.config.js`](file:///c:/Users/bong/Documents/triviabong/tailwind.config.js)
- **Finding:** Quiz option buttons and category cards define `hover:` utility classes, but omit explicit `active:scale-[0.97]` touch states. On touch devices, taps feel unresponsive.

### 4. Sub-Optimal Timer Visual Anchor
- **File:** [`src/components/TimerRing.jsx:L5-L15`](file:///c:/Users/bong/Documents/triviabong/src/components/TimerRing.jsx#L5-L15)
- **Finding:** `TimerRing` defaults to `SIZE = 32` with `text-[10px]`. As the main temporal feedback mechanism during play, it is visually eclipsed by non-interactive badges.

---

## Actionable Recommendations

### 1. React & Code-Splitting Optimizations

#### Lazy Load `AdminPanel` & Code-Split Question Packs
Replace static import with `React.lazy`:
```jsx
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
```
Wrap usage in `App.jsx` in `<Suspense fallback={null}>`. Configure `vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          questions: ['./src/data/questionsLoader.js'],
        }
      }
    }
  }
});
```

#### Synchronous Option Derivation via `useMemo`
Eliminate the stale frame delay by deriving shuffled options synchronously:
```jsx
const currentShuffledOptions = useMemo(() => {
  if (!questions[currentIndex]) return [];
  return shuffleArray(getQuestionOptions(questions[currentIndex]));
}, [questions, currentIndex]);
```

#### Stable Timer Effect & Audio Extraction
Remove `timeLeft` from effect dependencies and extract audio side-effects:
```jsx
// Separate audio trigger
useEffect(() => {
  if (gameState === 'PLAYING' && timeLeft <= 4 && timeLeft > 0) {
    sound.playTick();
  }
}, [timeLeft, gameState]);

// Stable interval keyed on currentIndex
useEffect(() => {
  if (gameState !== 'PLAYING' || selectedOption !== null || isPaused) return;
  const timer = setInterval(() => {
    setTimeLeft((prev) => prev - 1);
  }, 1000);
  return () => clearInterval(timer);
}, [gameState, currentIndex, selectedOption, isPaused]);
```

#### Debounce Remote Firestore Progression Sync
Debounce persistence writes by 2,000ms:
```jsx
useEffect(() => {
  if (!currentUser?.uid || statsReadyForUid !== currentUser.uid) return;
  const timeoutId = setTimeout(() => {
    syncUserStatsToFirestore(currentUser.uid, globalStats);
    syncPublicProfile(currentUser.uid, globalStats, currentUser);
  }, 2000);
  return () => clearTimeout(timeoutId);
}, [globalStats, currentUser, statsReadyForUid]);
```

---

### 2. Tailwind Class & Ergonomic UI Fixes

#### Sticky Modal Header Bar
Update modal headers in `GuideModal.jsx`, `StatsModal.jsx`, and `AuthModal.jsx`:
```jsx
<div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
  <h3 className="text-lg font-bold text-slate-100">Vodič za igru</h3>
  <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-transform">
    <X className="w-5 h-5" />
  </button>
</div>
```

#### Tactile Button Touch States
Add active transform and brightness classes to option buttons:
```jsx
className="w-full p-4 rounded-xl border border-slate-800 bg-slate-900/80 text-left font-medium text-slate-200 hover:border-amber-500/50 active:scale-[0.98] active:bg-slate-800 transition-all duration-150"
```

#### Combined Profile Header Badge
Consolidate Level and Coins into a single profile pill to save mobile header space:
```jsx
<div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800/90 px-3 py-1.5 rounded-full shadow-inner">
  <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
    <Star className="w-3.5 h-3.5 fill-amber-400" />
    <span>{globalStats.level}</span>
  </div>
  <div className="w-px h-3.5 bg-slate-800" />
  <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
    <Coins className="w-3.5 h-3.5 text-amber-400" />
    <span>{globalStats.coins}</span>
  </div>
</div>
```

#### Prominent Timer Ring Scale
Increase `TimerRing` dimensions in `QuizScreen` layout:
```jsx
<TimerRing seconds={timeLeft} maxSeconds={QUESTION_TIME_SECONDS} size={48} strokeWidth={4} />
```
