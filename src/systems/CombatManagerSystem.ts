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
import { processAbilityEffects } from "src/modules/EffectModule";
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
		} else if (gameplayState.combatState === CombatState.Gameover) {
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
			const rcvyAttr = actorData.attributes.recovery;

			if (
				actorData.queuedAction &&
				rcvyAttr.currentValue === rcvyAttr.maximumValue
			) {
				controlState.actionPauseSet.add(PAUSE_RENDERQUEUE);
				this.executeQueuedAction(actorData);
				if (gameplayState.enemyEIDs.includes(eid)) {
					decideNPCAction(actorData);
				}
				break;
			}
		}
	}

	private executeQueuedAction(sourceActorState: ActorStateComponent): void {
		const controlState = getControlState();
		const actorStateComponentArray = getActorStateComponentArray();

		const actionToExecute = sourceActorState.queuedAction;
		if (!actionToExecute) {
			controlState.actionPauseSet.delete(PAUSE_RENDERQUEUE);
			return;
		}

		const actionTargetIds = sourceActorState.currentTargetEIDs;

		addAbilityRQEs(
			sourceActorState.entityId,
			actionTargetIds,
			sourceActorState,
			actionToExecute,
		);

		actionTargetIds.forEach((eid) => {
			const targetActorState = actorStateComponentArray[eid];
			processAbilityEffects(
				sourceActorState,
				targetActorState,
				actionToExecute,
			);
		});

		startRenderQueue();

		const rcvyAttr = sourceActorState.attributes.recovery;
		rcvyAttr.maximumValue = actionToExecute.recovery || 0.5;
		rcvyAttr.currentValue = 0;
	}
}

export enum CombatState {
	Inactive,
	Active,
	Victory,
	Gameover,
}
