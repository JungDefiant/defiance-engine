### To Do

- Review GLM code
- Try to learn how the navigation code actually works, using the sources provided by chat

---

### Fix for formations to try if needed

#### anchor the formation in world space (the "walk straight to slot, then stop" guarantee)

**Files:** `src/systems/PartyFollowSystem.ts` + new constant `FOLLOW_SLOT_UPDATE_DISTANCE = 0.5` in `src/constants/BehaviorConstants.ts`.

- Replace the per-frame live slot computation with an **anchor**: store `formationLeaderEntityId`, `formationLeaderPosition` (Vector3), and `formationLeaderYaw` captured at the last formation update.
- Re-anchor (recompute slots) only when: the selected leader entity changes, or the leader has moved more than `FOLLOW_SLOT_UPDATE_DISTANCE` (0.5 m) from the anchored position. Followers' `followDestination` is always derived from the anchor, never the live transform.
- Behavior: while the leader walks, the formation re-anchors every 0.5 m and trails normally (including turns); the moment the leader stops, slots **freeze in world space**, each follower walks one straight line to its slot, stops inside it (`FOLLOW_STOP_DISTANCE = 0.15`), and the existing hysteresis dead-band holds it there even if nudged.
- Also reset the anchor and prune the following set when the selected leader changes, so switching characters snaps the formation cleanly.
- Source applied: same hysteresis/thresholding principle as the previous dead-band change — discrete re-anchor decisions with a distance threshold so sub-threshold leader motion (arrival creep, separation nudges — exactly the noise Fix A identifies) can't move the followers' targets.
