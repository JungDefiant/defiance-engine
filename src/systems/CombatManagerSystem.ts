import { inject } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
import { query } from "bitecs";
import ActorStateComponent, {
	AbilityTrigger,
} from "src/components/ActorStateComponent";
import {
	PAUSE_GAMEOVER,
	PAUSE_RENDERQUEUE,
	PAUSE_VICTORYSCREEN,
} from "src/constants/GeneralConstants";
import { decideNPCAction } from "src/modules/CombatModule";
import {
	processAbilityEffects,
	spendAbilityCost,
	triggerFeatEffects,
} from "src/modules/EffectModule";
import { addAbilityRQEs, startRenderQueue } from "src/modules/RenderModule";
import { GameScene } from "src/scenes/GameScene";
import {
	getControlState,
	getGameplayState,
	getUserInterfaceState,
} from "src/modules/GameStateModule";
import { getActorStateComponentArray } from "src/modules/ComponentModule";
import { AbilityContext, ActionContext } from "src/types/ContextTypes";

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

			if (
				actorData.queuedAction &&
				actionTimerAttribute.currentValue ===
					actionTimerAttribute.maximumValue
			) {
				controlState.actionPauseSet.add(PAUSE_RENDERQUEUE);
				this.performQueuedAction(actorData).then(() => {
					if (gameplayState.enemyEntityIds.includes(eid)) {
						decideNPCAction(actorData);
					}
				});
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

		const actionTargetIds = sourceActorState.currentTargetEIDs;

		addAbilityRQEs(
			sourceActorState.entityId,
			actionTargetIds,
			sourceActorState,
			actionToPerform,
		);

		const abilityContext = {
			target: `${actionToPerform.target}`,
			descriptors: actionToPerform.descriptors,
			effects: actionToPerform.effectData,
		} as AbilityContext;

		abilityContext.actionContext = {
			cost: actionToPerform.cost || 0,
			costAttribute: actionToPerform.costAttribute || "",
			recoveryTime: actionToPerform.recoveryTime || 0,
		} as ActionContext;

		if (
			abilityContext.actionContext.cost &&
			abilityContext.actionContext.costAttribute
		) {
			const isAbilityCostSpent = spendAbilityCost(
				sourceActorState,
				abilityContext,
			);
			if (!isAbilityCostSpent) {
				//
				return;
			}
		}

		triggerFeatEffects(
			sourceActorState,
			sourceActorState,
			AbilityTrigger.onActionPerform,
			abilityContext,
		);

		actionTargetIds.forEach((eid) => {
			const targetActorState = actorStateComponentArray[eid];
			processAbilityEffects(
				sourceActorState,
				targetActorState,
				actionToPerform,
				abilityContext,
			);
		});

		startRenderQueue();

		const actionTimerAttribute = sourceActorState.attributes.actionTimer;
		actionTimerAttribute.maximumValue = actionToPerform.recoveryTime || 0.5;
		actionTimerAttribute.currentValue = 0;
	}
}

export enum CombatState {
	Inactive,
	Active,
	Victory,
	Gameover,
}
