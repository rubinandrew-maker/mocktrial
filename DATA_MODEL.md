# Firestore Data Model — Emily Workout

## Collections overview

| Collection | Purpose |
|---|---|
| `config` | App-wide settings (coach PIN) |
| `teams` | 3 teams, up to 20 players each |
| `players` | Player profiles |
| `movements` | Movement category definitions |
| `movements/{id}/levels` | Level definitions per movement |
| `progress` | Per-player × per-movement progression state |
| `sessions` | Full workout session log |
| `approvals` | Coach advancement queue |
| `stations` | Device-to-movement assignments |

---

## `config/{docId}`

Only one document: `config/app`.

```
coachPin:    string        // default "0000"
createdAt:   Timestamp
updatedAt:   Timestamp
```

---

## `teams/{teamId}`

```
name:        string        // "Team A"
order:       number        // 1 | 2 | 3
createdAt:   Timestamp
```

Seeded: `team-a`, `team-b`, `team-c`.

---

## `players/{playerId}`

Auto-generated ID.

```
name:        string
teamId:      string        // ref → teams/{teamId}
active:      boolean       // false = soft-deleted
createdAt:   Timestamp
updatedAt:   Timestamp
```

---

## `movements/{movementId}`

Document ID is a slug, e.g. `horizontal-push`.

```
name:        string        // "Horizontal Push"
order:       number        // 1–14 display order
levelCount:  number        // denormalised for quick reads
createdAt:   Timestamp
updatedAt:   Timestamp
```

### `movements/{movementId}/levels/{levelId}`

Level ID format: `level-01`, `level-02`, … (zero-padded, sorts lexicographically).

```
levelNumber:     number    // 1-indexed
name:            string    // "Incline Pushup"
description:     string    // placeholder until coach fills in
youtubeUrl:      string    // "" until coach fills in
targetSets:      number    // default 2
targetReps:      number    // default 10
targetSessions:  number    // default 3 (consecutive sessions to trigger flag)
createdAt:       Timestamp
updatedAt:       Timestamp
```

---

## `progress/{docId}`

Document ID: `{playerId}_{movementId}` — composite key for O(1) direct reads.

```
playerId:              string
movementId:            string
currentLevelNumber:    number     // 1-indexed
status:                string     // "active" | "flagged" | "held"
consecutiveSessions:   number     // sessions in current qualifying streak (0–3)
lastSessionAt:         Timestamp | null
updatedAt:             Timestamp
```

**Status transitions:**
- `active` → `flagged`: auto, when consecutiveSessions reaches targetSessions
- `flagged` → `active` (next level): coach approves in dashboard
- `flagged` → `held`: coach holds in dashboard; player stays on current level
- `held` → `active`: streak resets, coach can re-flag later

---

## `sessions/{sessionId}`

Auto-generated ID.

```
playerId:             string
playerName:           string          // denormalised
movementId:           string
movementName:         string          // denormalised
levelNumber:          number          // level logged against (may be regression)
isRegressionSession:  boolean         // true if logged against level below current
sets:                 Array<{
  reps:     number,
  loggedAt: Timestamp
}>
totalSets:            number          // sets.length
totalReps:            number          // sum of set.reps
metTarget:            boolean         // totalSets >= targetSets && min reps >= targetReps
startedAt:            Timestamp
completedAt:          Timestamp
```

**Progression logic** (run on session save when `!isRegressionSession && metTarget`):
1. Increment `progress.consecutiveSessions`
2. If `consecutiveSessions >= targetSessions`, set `status = "flagged"` and create an `approvals` document

If `!metTarget`, reset `consecutiveSessions` to 0 (streak broken).

---

## `approvals/{approvalId}`

Auto-generated ID.

```
playerId:           string
playerName:         string          // denormalised
movementId:         string
movementName:       string          // denormalised
fromLevelNumber:    number
toLevelNumber:      number          // fromLevelNumber + 1
flaggedAt:          Timestamp
status:             string          // "pending" | "approved" | "held"
reviewedAt:         Timestamp | null
```

---

## `stations/{stationId}`

Document ID: device UUID generated on first app launch and stored in `localStorage`.
The station document is created/updated each time the device assigns or re-assigns a movement.

```
movementId:    string | null    // null = unassigned
movementName:  string | null    // denormalised
deviceLabel:   string           // friendly name set by coach, e.g. "iPad 3"
lastSeen:      Timestamp        // updated on app launch
updatedAt:     Timestamp
```

---

## Query patterns

| Screen | Query |
|---|---|
| Station — player list | `players` where `active == true`, ordered by `name` |
| Station — player progress | `progress/{playerId}_{movementId}` (direct read) |
| Station — session history | `sessions` where `playerId == X && movementId == Y`, ordered by `completedAt desc`, limit 10 |
| Dashboard — full grid | `players` (all) + `progress` (all), join client-side |
| Dashboard — approvals | `approvals` where `status == "pending"` |
| Dashboard — level list | `movements/{id}/levels`, ordered by `levelNumber asc` |
| Dashboard — stations | `stations` (all) |
