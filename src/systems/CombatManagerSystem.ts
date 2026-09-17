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
				Promise.resolve(this.performQueuedAction(actorData)).then(
					() => {
						if (gameplayState.enemyEntityIds.includes(eid)) {
							decideNPCAction(actorData);
						}
					},
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

		const actionTargetIds = sourceActorState.currentTargetEIDs;

		addAbilityRQEs(
			sourceActorState.entityId,
			actionTargetIds,
			sourceActorState,
			actionToPerform,
		);

		const actionContext = {
			target: `${actionToPerform.target}`,
			cost: actionToPerform.cost || 0,
			costAttribute: actionToPerform.costAttribute || "",
			recoveryTime: actionToPerform.recoveryTime || 0,
			descriptors: actionToPerform.descriptors,
			effects: actionToPerform.effectData,
		};

		const isAbilityCostSpent = spendAbilityCost(
			sourceActorState,
			actionContext,
		);
		if (!isAbilityCostSpent) {
			//
			return;
		}

		triggerFeatEffects(
			sourceActorState,
			sourceActorState,
			AbilityTrigger.onActionPerform,
			actionContext,
		);

		actionTargetIds.forEach((eid) => {
			const targetActorState = actorStateComponentArray[eid];
			processAbilityEffects(
				sourceActorState,
				targetActorState,
				actionToPerform,
				actionContext,
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
