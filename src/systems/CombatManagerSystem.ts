import { inject } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
import { query } from "bitecs";
import ActorStateComponent from "src/components/ActorStateComponent";
import {
	PAUSE_GAMEOVER,
	PAUSE_VICTORYSCREEN,
} from "src/constants/GeneralConstants";
import {
	createNewAbilityContext,
	decideNPCAction,
	startActionRecovery,
} from "src/modules/CombatModule";
import { spendAbilityCost, triggerFeatEffects } from "src/modules/EffectModule";
import {
	renderCastHitVFX as renderCastAndHitVFX,
	renderMessageDisplay,
	startRenderQueue,
} from "src/modules/RenderModule";
import { spawnActionDeliveryProjectile } from "src/modules/Collision3DModule";
import { GameScene } from "src/scenes/GameScene";
import {
	getControlState,
	getGameplayState,
	getUserInterfaceState,
} from "src/modules/GameStateModule";
import { getActorStateComponentArray } from "src/modules/ComponentModule";
import { AbilityTrigger } from "src/types/AbilityTypes";

export default class CombatManagerSystem implements GameSystem {
	public constructor(@inject(GameScene) private gameScene: GameScene) {}

	public update(deltaTime: number): void {
		const gameplayState = getGameplayState();
		const controlState = getControlState();
		const userInterfaceState = getUserInterfaceState();

		if (
			gameplayState.combatState === CombatState.Inactive ||
			controlState.actionPauseSet.size > 0
		) {
			return;
		}

		if (gameplayState.combatState === CombatState.Victory) {
			controlState.actionPauseSet.add(PAUSE_VICTORYSCREEN);
			userInterfaceState.victoryScreen.showHide(true);
			return;
		}

		if (gameplayState.combatState === CombatState.Gameover) {
			controlState.actionPauseSet.add(PAUSE_GAMEOVER);
			userInterfaceState.gameOverScreen.showHide(true);
			return;
		}

		this.queueActorAction();
	}

	private queueActorAction() {
		const gameplayState = getGameplayState();
		const controlState = getControlState();
		const actorStateComponents = getActorStateComponentArray();

		for (const eid of query(this.gameScene.world, [actorStateComponents])) {
			const actorData = actorStateComponents[eid];
			const actionTimerAttribute = actorData.attributes.actionTimer;
			const actionQueuedAction = actorData.queuedAction;

			if (
				!actionQueuedAction ||
				!(actorData.currentTargetEIDs.length > 0) ||
				actionTimerAttribute.currentValue !==
					actionTimerAttribute.maximumValue
			) {
				continue;
			}

			actorData.currentTargetEIDs = actorData.currentTargetEIDs.filter(
				(targetEid) => {
					return !actorStateComponents[targetEid].isDefeated;
				},
			);

			if (actorData.currentTargetEIDs.length < 1) {
				if (actorData.queuedAction) {
					actorData.queuedAction = null;
				}
				continue;
			}

			if (actionQueuedAction.cost && actionQueuedAction.costAttribute) {
				const isAbilityCostSpent = spendAbilityCost(
					actorData,
					actionQueuedAction,
				);
				if (!isAbilityCostSpent) {
					continue;
				}
			}

			if (
				actorData.queuedAction &&
				actionTimerAttribute.currentValue ===
					actionTimerAttribute.maximumValue
			) {
				Promise.resolve(
					this.performQueuedAction(actorData).then(() => {
						if (gameplayState.enemyEntityIds.includes(eid)) {
							Promise.resolve(decideNPCAction(actorData));
						}
					}),
				);
				return;
			}
		}
	}

	private async performQueuedAction(
		sourceActorState: ActorStateComponent,
	): Promise<void> {
		const actionToPerform = await sourceActorState.queuedAction;
		if (!actionToPerform) {
			return;
		}

		const actionTargetIds = [
			...new Set(sourceActorState.currentTargetEIDs),
		];

		renderMessageDisplay(sourceActorState, actionToPerform);

		renderCastAndHitVFX(
			actionToPerform,
			sourceActorState.entityId,
			actionTargetIds,
		);

		const abilityContext = createNewAbilityContext(actionToPerform);
		triggerFeatEffects(
			{
				source: sourceActorState,
				target: sourceActorState,
				abilityContext,
				abilityTargetIndex: 0,
			},
			AbilityTrigger.onActionPerform,
		);

		spawnActionDeliveryProjectile(
			sourceActorState.entityId,
			actionToPerform,
			actionTargetIds,
		);

		startRenderQueue();

		startActionRecovery(sourceActorState, actionToPerform);
	}
}

export enum CombatState {
	Inactive,
	Active,
	Victory,
	Gameover,
}
