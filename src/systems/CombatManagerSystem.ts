import { inject } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
import { query } from "bitecs";
import ActorStateComponent from "src/components/ActorStateComponent";
import {
	PAUSE_GAMEOVER,
	PAUSE_RENDERQUEUE,
	PAUSE_VICTORYSCREEN,
} from "src/constants/GeneralConstants";
import { decideNPCAction } from "src/modules/CombatModule";
import {
	applyAbilityEffects,
	calculateAbilityEffects,
	calculateTotalAttributeValue,
	performAttackRoll,
	spendAbilityCost,
	triggerFeatEffects,
} from "src/modules/EffectModule";
import {
	renderAbilityEffects,
	renderCastHitVFX as renderCastAndHitVFX,
	renderMessageDisplay,
	startRenderQueue,
} from "src/modules/RenderModule";
import { GameScene } from "src/scenes/GameScene";
import {
	getControlState,
	getGameplayState,
	getUserInterfaceState,
} from "src/modules/GameStateModule";
import { getActorStateComponentArray } from "src/modules/ComponentModule";
import {
	AbilityContext,
	AbilityTargetContext,
	ActionContext,
} from "src/types/ContextTypes";
import {
	AbilityData,
	AbilityDescriptor,
	AbilityTrigger,
	EffectFunctionProps,
} from "src/types/AbilityTypes";

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
				controlState.actionPauseSet.add(PAUSE_RENDERQUEUE);
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
		const controlState = getControlState();
		const actorStateComponentArray = getActorStateComponentArray();

		const actionToPerform = await sourceActorState.queuedAction;
		if (!actionToPerform) {
			controlState.actionPauseSet.delete(PAUSE_RENDERQUEUE);
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

		console.log("ACTION TARGET IDS", actionTargetIds);

		let abilityContext = this.createNewAbilityContext(actionToPerform);
		triggerFeatEffects(
			{
				source: sourceActorState,
				target: sourceActorState,
				abilityContext,
				abilityTargetIndex: 0,
			},
			AbilityTrigger.onActionPerform,
		);

		actionTargetIds.forEach((eid) => {
			const targetActorState = actorStateComponentArray[eid];
			abilityContext.abilityTargetContexts[eid] = {};
			this.executeAbilityEffects({
				source: sourceActorState,
				target: targetActorState,
				abilityContext,
				abilityTargetIndex: eid,
			});
		});

		startRenderQueue();

		this.resetActionTimer(sourceActorState, actionToPerform);
	}

	private createNewAbilityContext(
		actionToPerform: AbilityData,
	): AbilityContext {
		let abilityContext = {
			abilityName: actionToPerform.name,
			target: `${actionToPerform.target}`,
			descriptors: actionToPerform.descriptors,
			effects: actionToPerform.effectData,
			abilityTargetContexts: [],
			actionContext: {
				cost: actionToPerform.cost || 0,
				costAttribute: actionToPerform.costAttribute || "",
				recoveryTime: actionToPerform.recoveryTime || 0,
			},
		};

		return abilityContext;
	}

	private executeAbilityEffects(props: EffectFunctionProps) {
		if (this.hasAttackRoll(props.abilityContext.descriptors)) {
			performAttackRoll(props);
		}
		calculateAbilityEffects(props);
		applyAbilityEffects(props);
		renderAbilityEffects(props);
	}

	private resetActionTimer(
		sourceActorState: ActorStateComponent,
		actionToPerform: AbilityData,
	) {
		let recoveryTimeMultiplier = 1;
		const totalSpeedValue = calculateTotalAttributeValue(
			sourceActorState.attributes.speed,
			actionToPerform.descriptors,
		);
		if (totalSpeedValue < 0) {
			recoveryTimeMultiplier = 1 + Math.abs(totalSpeedValue);
		} else {
			recoveryTimeMultiplier = 1 / (1 + totalSpeedValue);
		}
		const totalRecoveryTime =
			(actionToPerform.recoveryTime || 0.5) * recoveryTimeMultiplier;
		const actionTimerAttribute = sourceActorState.attributes.actionTimer;
		actionTimerAttribute.maximumValue = Math.max(totalRecoveryTime, 0.5);
		actionTimerAttribute.currentValue = 0;
	}

	private hasAttackRoll(actionDescriptors: AbilityDescriptor[]): boolean {
		return (
			(actionDescriptors.includes(AbilityDescriptor.attack) &&
				actionDescriptors.includes(AbilityDescriptor.ranged)) ||
			(actionDescriptors.includes(AbilityDescriptor.attack) &&
				actionDescriptors.includes(AbilityDescriptor.melee))
		);
	}
}

export enum CombatState {
	Inactive,
	Active,
	Victory,
	Gameover,
}
