# Security & GCP/Firebase Backend Audit Report

**Date:** 2026-08-04  
**Source Tool:** Antigravity IDE  

---

## Security Posture Overview

**Overall Risk Level:** **HIGH**

### Assessment Summary
The Firebase and GCP backend implementation for **TriviaBong** exhibits significant security, data integrity, and billing scalability vulnerabilities. 

While the application employs basic role restriction checks and field whitelisting in `firestore.rules`, the overall security posture is compromised by three major flaws:
1. **Unvalidated Client-Side Mutations:** Authenticated users can modify sensitive player progression stats (coins, level, XP) directly via Firestore client SDKs without schema or range enforcement.
2. **Client-Side Answer Exposure:** Entire question banks—including exact `correct_answer` strings—are statically bundled into client JavaScript and React state, allowing trivial client inspection and cheating.
3. **Severe Query Cost & Performance Bottleneck:** Rekordi board calculations invoke uncapped, unindexed $O(N)$ collection scans over every score document across all category subcollections, creating an extreme Firebase billing and browser performance hazard as the dataset grows.

---

## Critical Vulnerabilities

### 1. Permission Leaks
- **Insecure Email-Based Admin Authorization (`isAdmin()`)**  
  **File:** [`firestore.rules:L19-L21`](file:///c:/Users/bong/Documents/triviabong/firestore.rules#L19-L21) | [`api/questions.js:L51-L54`](file:///c:/Users/bong/Documents/triviabong/api/questions.js#L51-L54)  
  *Details:* Admin permission checks verify `request.auth.token.email == 'ivanm.ploce@gmail.com'` without asserting `request.auth.token.email_verified == true`. If an unverified user registers with this email address through password authentication or an external OAuth provider, they could inherit full administrative rights over user profiles and leaderboards.

- **Unauthenticated Leaderboard Score Submissions Allowed**  
  **File:** [`firestore.rules:L60-L75`](file:///c:/Users/bong/Documents/triviabong/firestore.rules#L60-L75) | [`firebase.js:L127-L139`](file:///c:/Users/bong/Documents/triviabong/src/services/firebase.js#L127-L139)  
  *Details:* The rule condition `(!('uid' in request.resource.data) || request.resource.data.uid == null || isOwner(request.resource.data.uid))` permits unauthenticated/anonymous callers to post scores under arbitrary display names to public leaderboards.

---

### 2. Insecure Write Vectors
- **Unvalidated User Profile & Stat Mutation on `/users/{uid}`**  
  **File:** [`firestore.rules:L38-L41`](file:///c:/Users/bong/Documents/triviabong/firestore.rules#L38-L41) | [`firebase.js:L104-L116`](file:///c:/Users/bong/Documents/triviabong/src/services/firebase.js#L104-L116)  
  *Details:* The update security rule for `users/{uid}` only verifies `!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role'])`. There is no schema validation, type checking, or numerical range capping on `coins`, `level`, `xp`, or `unlockedAchievements`. Any authenticated user can call `updateDoc` directly from the browser console to set `coins: 999999` or `level: 999`, completely bypassing game progression balance.

- **Client-Side Score Calculation & Untrusted Write Ceilings**  
  **File:** [`firestore.rules:L60-L75`](file:///c:/Users/bong/Documents/triviabong/firestore.rules#L60-L75)  
  *Details:* Scores are computed entirely on the client and written directly to Firestore. Although rules bound scores to $\le 10000$, any player or script can submit maxed-out scores (`score: 10000`, `elapsedMs: 1`) without server-side verification of actual gameplay logic.

- **Unrestricted Timestamp Spoofing**  
  **File:** [`firestore.rules:L60-L75`](file:///c:/Users/bong/Documents/triviabong/firestore.rules#L60-L75) | [`firestore.rules:L92-L107`](file:///c:/Users/bong/Documents/triviabong/firestore.rules#L92-L107)  
  *Details:* `createdAt` and `updatedAt` field checks do not enforce `request.resource.data.createdAt == request.time`, allowing clients to inject past or future timestamps.

---

### 3. Client-Side Answer Leaks
- **Full Trivia Question Packs & Answers Bundled in Client JavaScript**  
  **File:** [`questionsLoader.js:L12-L21`](file:///c:/Users/bong/Documents/triviabong/src/data/questionsLoader.js#L12-L21) | [`App.jsx:L100-L101`](file:///c:/Users/bong/Documents/triviabong/src/App.jsx#L100-L101)  
  *Details:* Question JSON files (under `src/data/categories/`) containing `correct_answer` / `correctAnswer` properties are imported into the static client bundle. During quiz rounds, full question objects including the exact answer are held in React component state (`questions`). Users can easily inspect Chrome DevTools Console, React DevTools, or network assets to view 100% of correct answers before timer expiration.

---

## Database & Query Efficiency Issues

### 1. Unindexed Queries
- **Uncapped O(N) Full-Collection Scan in `getFastestPerfectRounds`**  
  **File:** [`firebase.js:L226-L241`](file:///c:/Users/bong/Documents/triviabong/src/services/firebase.js#L226-L241)  
  *Details:* `getFastestPerfectRounds()` calls `getDocs(scoresRef)` without `limit()` or index filtering across all 8 category leaderboards, fetching every score document ever created into browser memory to filter `isPerfect === true` and sort by `elapsedMs` in JS. At scale (e.g. 100,000 recorded scores), opening the Rekordi modal triggers **100,000+ document reads per view**, causing massive Firebase read costs and freezing browser execution.

---

### 2. High Read/Write Cost Patterns
- **N+1 Query Multi-Fetch Pattern in `getBestScoresAcrossCategories`**  
  **File:** [`firebase.js:L202-L216`](file:///c:/Users/bong/Documents/triviabong/src/services/firebase.js#L202-L216)  
  *Details:* Compiling top scores across categories requires 8 separate parallel collection queries. As new categories are added, network fan-out increases linearly.

- **Unpaginated Admin Collection Reads**  
  **File:** [`firebase.js:L274-L288`](file:///c:/Users/bong/Documents/triviabong/src/services/firebase.js#L274-L288) | [`firebase.js:L374-L385`](file:///c:/Users/bong/Documents/triviabong/src/services/firebase.js#L374-L385)  
  *Details:* `getAllRegisteredUsers`, `getAllPublicProfiles`, and `clearLeaderboardForCategory` issue uncapped `getDocs(collection(...))` calls. Mounting `AdminPanel` downloads the entire user database in a single unpaginated batch.

---

## Recommended Fixes

### 1. Hardening Security Rules (`firestore.rules`)
```javascript
// Require email verification and explicit claims/email for Admin operations
function isAdmin() {
  return isSignedIn() && 
         request.auth.token.email_verified == true && 
         (request.auth.token.email == 'ivanm.ploce@gmail.com' || request.auth.token.admin == true);
}

// Strict schema & range validation on user profile updates
match /users/{uid} {
  allow get: if isOwner(uid) || isAdmin();
  allow list: if isAdmin();
  allow update: if isAdmin() || (
    isOwner(uid) &&
    !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']) &&
    request.resource.data.coins is int && request.resource.data.coins >= 0 &&
    request.resource.data.level is int && request.resource.data.level >= 1 &&
    request.resource.data.xp is int && request.resource.data.xp >= 0
  );
}

// Enforce authenticated ownership and server timestamps on score submissions
match /leaderboards/{categoryKey}/scores/{scoreId} {
  allow read: if true;
  allow create: if isOwner(request.resource.data.uid)
    && request.resource.data.createdAt == request.time
    && request.resource.data.score >= 0 && request.resource.data.score <= 10000;
  allow update, delete: if isAdmin();
}
```

### 2. Firestore Query Optimization (`firebase.js`)
- Add composite index for `leaderboards/{category}/scores`: `isPerfect ASC`, `elapsedMs ASC`.
- Replace memory-filtering in `getFastestPerfectRounds` with an indexed query:
  ```javascript
  const q = query(
    scoresRef,
    where("isPerfect", "==", true),
    orderBy("elapsedMs", "asc"),
    limit(limitN)
  );
  ```

### 3. Data Leakage Remediation
- **Short-Term:** Obfuscate/hash correct answers in memory or strip `correct_answer` before putting question packs into client state.
- **Long-Term:** Implement backend answer verification and score generation via a Vercel Serverless / Cloud Function endpoint (e.g. `/api/submit-round`).
