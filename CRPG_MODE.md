# Isometric CRPG Mode - Branch Documentation

This document explains the code generated in this branch, which converts the defiance-engine into a Baldur's Gate-style isometric CRPG with a 4-character party, click-to-move navigation, AI behavior, projectile-based combat, and a reworked control scheme and UI.

## Overview

The branch adds four major new runtime systems (navigation, AI behavior, 3D collision, environment) on top of the existing bitecs/ECS + BabylonJS architecture, reworks player controls from real-time action input to a CRPG command scheme, and reworks the HUD/GUI to match. All world simulation still runs through the existing system registry (systems are registered in `InitModule`, updated per frame), with components stored in component arrays keyed by entity id.

## New Architecture

### Navigation - `src/systems/ActorNavigationSystem.ts`, `src/modules/ActorNavigationModule.ts`

- `ActorNavigationComponent` (`src/components/ActorNavigationComponent.ts`) holds each actor's authoritative world `position`, `destination`, `facingDirection`, `speed`, `isNavigating` flag, and optional Recast `agentIndex`.
- Movement sources: (1) player-issued click-to-move destinations, (2) AI attack orders, (3) party formation follow. All funnel through `navigateToPosition`, which feeds either the RecastJS navigation crowd (when the `recast-navigation` package is present) or a direct steering fallback that moves the actor straight toward its destination.
- `facingDirection` is updated from all movement sources (steering travel direction, crowd velocity), which in turn orients the party follow formation.
- Actor spacing: when two actors overlap, only the _moving_ actor is pushed away; stationary actors are never displaced.
- Environment obstacles (registered in `EnvironmentObstacleData`, see below) push actors out of walls, pillars, crates, and cover walls with yaw-aware resolution.
- The camera is an isometric camera offset by `ISO_CAM_OFFSET = (0, 5, 5)` that continuously follows the selected party member. `CameraModule` now contains only `updateIsometricCameraFollow` (driven each frame by `ActorNavigationSystem`, paused during dialogue via `PAUSE_DIALOGUE`); all non-isometric camera machinery was removed (see Camera section below).

### AI Behavior - `src/systems/ActorBehaviorSystem.ts`, `src/modules/ActorBehaviorModule.ts`

- `ActorBehaviorComponent` (`src/components/ActorBehaviorComponent.ts`) assigns each actor a `DefaultBehavior`: `PlayerControlled`, `Aggressive`, `Ranged`, `Defensive`, etc. (see `src/types/BehaviorTypes.ts`).
- NPCs use Gambit/DAO-style tactics lists (`tactics` on `ActorStateComponent`): each entry has a condition (`random`, `lowestLife`, ...) and an action (`actionType`, `actionIndex`). `decideNPCAction` picks the first tactic whose condition yields targets and queues that action.
- `Aggressive` NPCs move within weapon range of the nearest opposing actor, gated by a line-of-sight raycast between actor colliders, then queue their default weapon attack.
- In exploration mode, companions follow the selected leader in a diamond formation whose slots are rotated by the leader's current yaw.
- `updateSelectedPlayerAutoAttack` implements the weapon default: while in active combat, if no action is queued on the selected character and a living enemy is targeted, the weapon action is queued automatically.

### 3D Collision / Targeting - `src/systems/Collision3DSystem.ts`, `src/modules/Collision3DModule.ts`

- `CollisionComponent` (`src/components/CollisionComponent.ts`) gives actors a collision radius and pairwise collision behaviors (see `src/types/CollisionTypes.ts`).
- `getAbilityTargetsByShape` resolves ability targets from a `targetingShape` on the ability JSON: `projectile` (first target in the aim ray), `sphere` (all actors within radius), `beam` (segment distance check), `cone` (range + half-angle from the aim direction), or list-based targeting when no shape is given. Aim direction comes from a scene pick at the pointer, excluding sprites, projectiles, and UI (`pcSprite_`, `enBattlerSprite_`, `abilityProjectile_`, `targetHighlight`).
- All ability effects are delivered only via projectiles: `spawnAbilityProjectile` (weapon-style lock-on: selected target, else first in aim ray) and `spawnActionDeliveryProjectile` (area/shape abilities flying to their locked target set). Projectiles home onto their targets, collide only with their targets, and expire by range only when they have no living target. Range/impact checks run on the horizontal plane at sprite-center height.
- BabylonJS left-handed coordinates are respected: movement axes are taken from `camera.getDirection(Axis.Z/X)` rather than cross products.

### Environment - `src/modules/EnvironmentModule.ts`

- The GLB map model was replaced with a procedural environment built from primitives (all meshes named `env_*`), replacing the previous `mapModelId` flow in `GameScene`.
- The navmesh is baked from the environment meshes with `walkableRadius: 2`.
- `EnvironmentObstacleData` is a registry of box obstacles (walls, pillars, crates, cover walls) used by `ActorNavigationSystem` for actor push-out.

### Camera - `src/modules/CameraModule.ts`, `src/modules/SceneModule.ts`

- All camera logic unrelated to the isometric camera was removed: view-node resets (`resetExploreViewPosition` / `resetCombatViewPosition` / `resetCameraPositionToViewNode`), explore view targets (`lastExploreViewTarget`), the `movecam` dialogue command (a `movecam` line in a dialogue script is now a no-op that just advances), `DEFAULT_CAM_FOCALLENGTH`, and the view/spawn node ids from scene data.
- The camera ECS entity is gone: `EntityMovementComponent` + `EntityMovementSystem` were deleted, and the `cameraEntityId` chain (`GameScene` / `GameplayState` / `initGameplayState`) was removed. `createSceneCamera` (`SceneModule`) creates the `cam_iso` `UniversalCamera` (`DEFAULT_CAM_TARGET` initial focus + `ISO_CAM_OFFSET`, viewport, cleared inputs) without registering a bitecs entity.
- Mode switches (explore/combat/dialogue) no longer move the camera; only `ActorNavigationSystem`'s follow does. Interactable dialogues no longer reposition the camera (`startDialogue` takes no camera props).
- `createSceneCamera` throws only when no canvas is found (`if (!gameCanvas)`); the success path creates the camera and registers pointer bindings. (Fixed an unconditional `throw` introduced when the camera entity return was removed - the function used to throw "No game canvas found!" right after successfully creating the camera.)

### Scene Data & Interactables - `src/modules/SceneModule.ts`, `src/modules/EventModule.ts`

- The Location system is gone: `LocationModule.ts` (with the `SceneLocation` / `NewLocationSceneParams` types) was deleted; there are no location transitions and no `PAUSE_LOCATIONTRANSITION`.
- Scene JSON is flat: `interactables`, `doors`, and `events` lists live directly on the scene object (no `locations` array, no `startLocationId`), and the scene references no model transform nodes at all (explore/combat view node ids, the interactable's `viewPositionNodeId`, and `combatSpawnNodeId` were all removed).
- `createSceneInteractiveElements` (`SceneModule`) runs during scene init: it dedupes events (`filterSceneEvents` in `EventModule`), then creates interactable icon buttons (clicking one starts its `dialogueNodeId` dialogue) and door icon buttons, both linked to their scene nodes via `linkWithMesh` and pushed into `ControlState.exploreGUIControls`.
- Doors are inert: clicking one logs a console warning since locations no longer exist. `DoorData` still carries `destination` for a future scene-transition system.
- Events: the `OnLocationEnter` trigger was renamed to `OnSceneEnter` and fires at the end of scene init (`checkEventByTrigger("OnSceneEnter")` in `SceneModule`); `checkEventByTrigger` reads the scene-level event list.
- Enemy spawns no longer use a scene spawn node: `EnemyFactory` uses the passed-in position (from `CombatModule`: `BASE_SPAWN_POSITION` + formation offsets) or falls back to `BASE_SPAWN_POSITION`.
- Save data (`SessionDataModule` / `sav_test.json`) no longer carries `locationId`.
- Scene initialization never blocks on audio: `playMusic` (`AudioModule.ts`) stops/sets the current music synchronously and plays it once the audio context unlocks (`unlockAsync` is awaited in the background with a `.catch`, not on the init path). Previously an awaited unlock could stall the whole `startGame()` flow under restrictive autoplay policies.

## Control Scheme

Defined in `ControlSettings` (`src/types/GameTypes.ts`) and wired in `ControlModule` / `SceneModule`:

| Input                    | Action                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| RMB on enemy             | Select target (sets `selectedTargetEID`, red torus ground highlight)                                                                                 |
| LMB click/hold on ground | Move selected actor to the picked ground position; while held, the destination continuously follows the cursor (`isMoveInputHeld` in `ControlState`) |
| Q / W / E / R            | Queue power slots 1-4                                                                                                                                |
| D / F                    | Cycle selected actor left / right through the party (wraps around)                                                                                   |
| Space                    | Tactical pause (combat only)                                                                                                                         |
| C                        | Debug: start combat (first encounter)                                                                                                                |

- Ground movement raycasts pick only `env_floor`; target selection raycasts pick enemy sprites (`enBattlerSprite_`) and resolve the entity id from sprite `metadata.entityId`.
- WASD movement and hotkey weapon fire were removed entirely (`MovementInputState` and `movementInput` are gone from `ControlState`). The weapon fires automatically whenever an enemy is targeted and recovery is complete - there is no weapon input.
- `contextmenu` is suppressed on the canvas and pointer-down requests fullscreen.
- Power hotkeys, D/F cycling, and tactical pause are registered on both the explore and combat action managers (mode resets rebuild the `ActionManager`).

## Combat & Action Queueing

- `startQueueActionPlayer` (`CombatModule`) queues a player action at any time during active combat: it validates the ability (`onActionPerform` trigger), pre-checks ability cost, resolves lock-on targets at queue time (selected target for projectile actions, otherwise shape-based), and stores `queuedAction` + `currentTargetEIDs` on the actor.
- `CombatManagerSystem.queueActorAction` performs queued actions (any actor) once the actor's action timer is full: it spends cost, triggers feats, renders cast/hit VFX, delivers the action via `spawnActionDeliveryProjectile`, and starts recovery. Player queues are cleared after performing; NPCs re-decide via their tactics.
- Pressing a different power hotkey mid-recovery simply replaces the queued action.
- Defeated enemies are disposed (removed from the world and entity list) at 0 LP; the selected target auto-clears on defeat. Victory ends combat automatically (see below).

## GUI / HUD

- `CombatHUD` (`src/gui/CombatHUD.ts`): the weapon slot is no longer displayed. The four ability slots are power slots labeled Q/W/E/R by index; clicking a slot queues that power. The enemy action/act bar and status icons were removed from `EnemyGUIComponent`, which now shows only a targeting indicator and a life bar that is visible only while the mouse hovers over the enemy sprite (`UserInterfaceSystem.getHoveredEnemyEid` performs a per-frame pick).
- The victory screen was removed: when all enemies are defeated, `CombatManagerSystem` waits for the render queue to drain (so final VFX/floating text finish), then calls `endCombat()` directly to return to exploration.
- Render queue visual effects and floating text are rendered at 50% size (`RenderTypes.ts`: floating text 200x64 px at fontSize 20; SpecialFX sticker images scaled by 0.5).
- UI scaling: in-game ideal GUI size 1000x752, main menu 1280x960 (approx. -20% UI scale), theme fonts reduced ~20%, canvas centered via flexbox, fullscreen fills the viewport.
- All styling values (font sizes, pixel widths/heights, paddings, spacings, shadow offsets, grid cell sizes) are rounded up to multiples of 4; UI borders (`thickness`) are uniformly 1 px. Ratio/percentage-based properties (e.g. `width = 1`, icon scale factors) are unaffected.
- `PlayerGUIComponent` is laid out as a single framed 152x152 card that matches the party-card mock-up: a full-card dark panel with a 1 px `primary1` frame, the portrait art on top, four 16 px empty status slots (top-left, filled by `addStatusIcon`), a 36 px queued-action slot (top-right), a full-width gold action-timer bar, a 3-segment point row (heart = life points, blue diamond = will points, green half-circle = item points, all rendered from in-code pixel-art maps) and a bottom name bar. `setLifeBarFill`/`setWillBarFill` were replaced by `setLifePoints`/`setWillPoints`/`setItemPoints` (values only, no bars); `UserInterfaceSystem` now feeds all three from `ActorStateComponent`. Character selection click is unchanged.

## Data Changes (`public/data/campaign_test`)

- `campaign.json`: party of 4 (`pc_test` members).
- `playableChars/pc_test.json`: four equipped powers.
- Powers: `power_fraggrenade` (sphere), `power_furiousstrike` (cone melee, converted from an unsupported `onHit` effect format to standard `damage`), `power_flashbang` (sphere), `power_combatstim` (self heal).
- Weapon (`weapon_pulserifle`) and ability JSONs carry `targetingShape` blocks for the projectile/shape targeting above.
- `scenes/scene_test.json`: flattened - `interactables`, `doors`, and `events` live directly on the scene; `startLocationId`, the `locations` array, all view/spawn node ids, and the interactable's `viewPositionNodeId` were removed.

## Known Limitations / Notes

- `recast-navigation` is not installed: navmesh pathfinding falls back to direct steering (a warning is logged). Install the package or provide `window.Recast` to enable true pathfinding.
- Two pre-existing `tsc` errors remain (`EffectFunctionProps` re-exports in `AbilityEffectApplicationProcessor` / `AbilityEffectCalculationProcessor`), untouched by this branch.
- Doors are inert (see Scene Data & Interactables); their `destination` data is kept for a future scene-transition system.
- Unused (write-only) symbols remain, flagged by `npx tsc --noUnusedLocals`: `CombatHUD.accessorySlot` / `itemSlots`, the empty dialogue command stubs (`setFlagDialogueCommand`, `setSpeakerDialogueCommand`, `playSoundDialogueCommand`), `GameScene._mapModelId` / `_difficultyLevel`, `MainMenuScene.mainMenuScreen`, and a local `controlState` in `CombatManagerSystem`. All unused imports have been cleaned up.
- Pre-existing minor issues not addressed here: `StickerImageComponent.dispose()` / `TransformNodeComponent.dispose()` infinite recursion.
- The `movecam` line still present in `dialogues/Prologue Script.txt` is a no-op (the command was removed together with the non-isometric camera logic).

## Validation

- `npx tsc --noEmit`: clean except the two pre-existing errors noted above.
- `npx vite build --base=/`: succeeds.
- The full New Game flow was verified end-to-end in a headless browser: `startGame()` completes (campaign load, scene init, `createSceneCamera`, interactable/door GUI, music, navigation fallback, environment, explore mode, `OnSceneEnter` event).
- Runtime smoke test path: `npm run dev` -> New Game -> press **C** for debug combat -> RMB an enemy to target (weapon auto-fires), LMB the ground to move, Q/W/E/R for powers, D/F to cycle the party, Space to tactical pause.
