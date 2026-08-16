# Plan A — Online Presence (showing online players)

**Status:** Plan only — no code written. Waiting for explicit go-ahead per project instructions.

---

## 1. Decision summary (from the filled-in template)

| Question | Decision |
|---|---|
| Who counts as online | Every signed-in user with an open tab |
| Where it's shown | Lobby for now (a global bar is a future follow-up) |
| Public vs. friends | All online players (public list) — no friend system |
| Liveness | True real-time (Firestore listener) |
| Offline detection | Heartbeat timeout (a few minutes), no RTDB `onDisconnect` |
| Privacy | Everyone sees status, no "hide me" option for now |
| Shown next to name | Status (Available/In Game/Busy), level/trophy badge, "Invite to 1v1" button |

This list exists primarily to enable 1v1 invites (Plan B), but it's architecturally independent — it works without matches too.

---

## 2. Why this isn't a trivial copy of `useSessionTracking`

The existing `sessions/{sessionId}` heartbeat system (`useSessionTracking.js` + `firestore.rules`) solves a **very similar** problem — periodic heartbeat, Page Visibility pausing, cleanup — but for a meaningfully different purpose:

- `sessions/{sessionId}` is **private** (only owner/admin can read) — it's for analytics, not for showing to others
- `sessions/{sessionId}` tracks time per `gameState` bucket, not current status
- The doc ID is arbitrary (`sessionId`), not tied to `uid` — a user can have several

Presence needs a **publicly readable, one-doc-per-uid** record that everyone can listen to in real time. That's a new collection (`presence/{uid}`), but the **same heartbeat/visibility pattern** (hook, interval, background pausing) can be lifted almost directly from `useSessionTracking.js`.

---

## 3. Data model

### New collection: `presence/{uid}`

```
{
  uid: string,
  displayName: string,       // denormalized so the online list doesn't have to join publicProfiles
  level: number,              // same - denormalized to avoid a second read
  status: 'lobby' | 'playing' | 'busy',  // busy = e.g. mid-1v1-invite awaiting a response
  lastHeartbeat: timestamp,   // == request.time, same pattern as sessions/{sessionId}
}
```

**Why denormalize `displayName`/`level` instead of joining `publicProfiles/{uid}`:**
The online list re-renders in real time on every heartbeat from any online player. If every listener had to additionally fetch `publicProfiles` for each new uid that appears, that's extra reads per list change. Instead, `displayName`/`level` are written into the `presence` doc at the point they're already known (on login, from the already-available `currentUser`/stats state) — the cost is they can go slightly stale if a user changes their name while online, which is negligible at beta scale.

**Status values — mapped from the existing `gameState`:**
- `lobby` → gameState `LOBBY` or `LEADERBOARD`
- `playing` → gameState `PLAYING`, `GAMEOVER`, `VICTORY`
- `busy` → reserved for Plan B (e.g. mid-1v1-invite or in a match) — doesn't do anything in Plan A alone, but the field is designed now so Plan B doesn't need to change the shape

### `firestore.rules` — new match block

Follows the style of existing rules (`hasOnly`, typing, diff-based protection where relevant):

```
match /presence/{uid} {
  // Publicly readable - that's the whole point of the list.
  allow read: if true;

  // Only the owner writes their own presence doc, heartbeat must be a
  // server timestamp (same pattern as sessions/{sessionId}).
  allow create: if isOwner(uid)
    && request.resource.data.keys().hasOnly(['uid', 'displayName', 'level', 'status', 'lastHeartbeat'])
    && request.resource.data.uid == uid
    && request.resource.data.displayName is string
    && request.resource.data.displayName.size() > 0
    && request.resource.data.displayName.size() <= 20
    && request.resource.data.level is int
    && request.resource.data.level >= 1
    && request.resource.data.status in ['lobby', 'playing', 'busy']
    && request.resource.data.lastHeartbeat == request.time;

  allow update: if isOwner(uid)
    && request.resource.data.uid == uid
    && request.resource.data.keys().hasOnly(['uid', 'displayName', 'level', 'status', 'lastHeartbeat'])
    && request.resource.data.displayName is string
    && request.resource.data.displayName.size() > 0
    && request.resource.data.displayName.size() <= 20
    && request.resource.data.level is int
    && request.resource.data.level >= 1
    && request.resource.data.status in ['lobby', 'playing', 'busy']
    && request.resource.data.lastHeartbeat == request.time;

  allow delete: if isOwner(uid) || isAdmin();
}
```

**Note on the "N online players" list as a query:** `allow read: if true` permits both `get` and `list` queries on the whole collection. That means anyone (including signed-out visitors) can list all online players — deliberately, per your decision (public list, visible to everyone). If that turns out to be too broad later, it should change to `allow list: if isSignedIn()`.

---

## 4. Heartbeat and offline detection

- **Heartbeat interval:** same pattern as `useSessionTracking` — every 30s while the tab is active, paused while backgrounded (Page Visibility API)
- **"Online" definition for the list:** the client reading the list filters locally (or queries `where('lastHeartbeat', '>', now - N minutes)`) — I'd suggest a **90-second threshold** (3x the heartbeat interval) as "online," which tolerates one missed heartbeat before marking someone offline
- **Cleaning up stale docs:** heartbeat timeout means the doc stays in the collection after a user leaves — it isn't auto-deleted. Fine for v1 since reads filter by `lastHeartbeat`, but the collection will grow unbounded. **Open question for later** (not a v1 blocker): periodic cleanup (scheduled Cloud Function or an admin action) or a Firestore-native TTL field — Firestore supports native TTL, which would be the ideal fix here whenever it's added.
- **Sign-out:** on explicit logout, the presence doc is deleted immediately (in addition to the heartbeat timeout) — a clean signal instead of waiting out the timeout.

---

## 5. Components and integration

### New hook: `src/hooks/usePresence.js`
Mirrors the structure of `useSessionTracking.js` (same Page Visibility pattern, same heartbeat interval mechanism), but writes to `presence/{uid}` instead of `sessions/{sessionId}`, and derives status from `gameState` per the mapping above instead of accumulating time per bucket.

```js
usePresence(currentUser?.uid, currentUser?.displayName, stats.level, gameState)
```

Called in `App.jsx` alongside the existing `useSessionTracking` call.

### New service layer: add to `src/services/firebase.js`
- `upsertPresence(uid, displayName, level, status)` — create/update with merge, analogous to `heartbeatSession`
- `subscribeToOnlinePlayers(callback)` — `onSnapshot` on the `presence` collection, filters locally by the `lastHeartbeat` threshold, returns an unsubscribe function
- `deletePresence(uid)` — called on logout

### New component: `src/components/OnlinePlayersList.jsx`
- Shown in the LOBBY screen (`gameState === 'LOBBY'` render block in `App.jsx`)
- Subscribes via `subscribeToOnlinePlayers`, shows the list: avatar/name, status badge, level, "Invite" button (button is a no-op/disabled until Plan B exists — or Plans A and B get built together, see note at the end)
- Empty state ("No one else is online right now") — important for beta with few players

---

## 6. Implementation steps (order)

1. **`firestore.rules`** — add the `presence/{uid}` match block, test against the emulator (`firebase emulators:exec --only firestore "node <test>.mjs"`, as `CLAUDE.md` requires for every rules change) before deploying
2. **`src/services/firebase.js`** — `upsertPresence`, `subscribeToOnlinePlayers`, `deletePresence`
3. **`src/hooks/usePresence.js`** — new hook modeled on `useSessionTracking.js`
4. **`App.jsx`** — call `usePresence(...)` alongside `useSessionTracking`; call `deletePresence` in the logout handler
5. **`src/components/OnlinePlayersList.jsx`** — new component
6. **Wire it into the LOBBY render block** in `App.jsx`
7. **Manual testing:** two browser contexts (same pattern as `cross-device-sync-check.mjs`) — sign in as two different users, verify both see each other, that status correctly transitions lobby→playing, that the heartbeat timeout correctly removes a "ghost" after a tab closes
8. **Firestore index check** — if a `where('lastHeartbeat', '>', ...)` query is added instead of local filtering, Firestore will prompt for a composite index; check the Firebase console on first run

## 7. Open questions / assumptions I made

- I'm assuming "Busy" status **doesn't need logic in Plan A** — the field exists in the shape, but nothing sets it until Plan B exists. If that's wrong and it needs meaning even without matches (e.g. a "do not disturb" toggle), let me know.
- The 90s "online" threshold is my estimate (3x heartbeat) — there was no explicit decision on this in the template.
- I'm assuming signed-out/anonymous players **don't** get a presence doc (no stable uid) — consistent with how `sessions/{sessionId}` already excludes anonymous play.
