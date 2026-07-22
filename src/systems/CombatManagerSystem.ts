import { container, delay, inject, singleton } from "tsyringe";
import ISystem from "src/systems/ISystem";
import SceneManagerSystem from "src/systems/SceneManagerSystem";
import {
	ActionManager,
	ExecuteCodeAction,
	RandomRange,
	Vector3,
} from "@babylonjs/core";
import GameState from "src/states/GameState";
import { EntityId, query, removeEntity } from "bitecs";
import {
	AbilityData,
	AbilityDescriptor,
	AbilityTarget,
	AbilityTrigger,
	ActorData,
	EffectData,
	EffectVar,
	TacticsCondition,
	TacticsData,
} from "src/components/ActorData";
import { EnemyFactory } from "src/factories/EnemyFactory";
import { clamp } from "src/helpers/Utils";
import RenderQueueSystem, {
	RenderQueueEntry,
	RenderQueueType,
} from "./RenderQueueSystem";
import { Themes } from "src/gui/Themes";
import {
	PAUSE_GAMEOVER,
	PAUSE_RENDERQUEUE,
	PAUSE_TACTICALPAUSE,
	PAUSE_VICTORYSCREEN,
} from "src/Constants";
import { GameMode } from "src/states/types/GameTypes";
import UserInterfaceSystem from "./UserInterfaceSystem";
import EventHandlerSystem from "./EventHandlerSystem";
import {
	getTargetsBasedOnCondition,
	resetTargeting as resetPlayerTargeting,
	setTacticalPause,
} from "src/helpers/CombatHelpers";
import { processAbilityEffects } from "src/helpers/EffectHelpers";
import { addAbilityRQEs } from "src/helpers/RenderHelpers";

@singleton()
export default class CombatManagerSystem implements ISystem {
	private readonly START_RECOVERY = 3;
	private readonly START_RECOVERY_RANGE = 2;
	private readonly BASE_SPAWN_POSITION = new Vector3(0, 0.28, 0);
	private readonly SPAWN_OFFSET = 0.2;

	public async start() {}

	public update(deltaTime: number, gameState?: GameState): void {
		if (!gameState) {
			return;
		}

		if (gameState.gameMode !== GameMode.Combat) {
			return;
		}

		if (gameState.actionPauseSet.size > 0) {
			return;
		}

		if (gameState.combatState === CombatState.Victory) {
			gameState.actionPauseSet.add(PAUSE_VICTORYSCREEN);
			gameState.victoryScreen.showHide(true);
			return;
		} else if (gameState.combatState === CombatState.Gameover) {
			gameState.actionPauseSet.add(PAUSE_GAMEOVER);
			gameState.gameOverScreen.showHide(true);
			return;
		}

		for (const eid of query(gameState.world, [
			gameState.ActorDataComponent,
		])) {
			const actorData = gameState.ActorDataComponent[eid];
			const rcvyAttr = actorData.attributes.recovery;

			if (
				actorData.queuedAction &&
				rcvyAttr.currentValue === rcvyAttr.maximumValue
			) {
				gameState.actionPauseSet.add(PAUSE_RENDERQUEUE);
				this.executeQueuedAction(gameState, actorData);
				if (gameState.enemyEIDs.includes(eid)) {
					this.decideNPCAction(actorData, gameState);
				}
				break;
			}
		}
	}

	public async startCombat(encId: string): Promise<void> {
		const gameState = container.resolve(GameState);
		const smSystem = container.resolve(SceneManagerSystem);
		const enFactory = container.resolve(EnemyFactory);

		smSystem.setGameMode(GameMode.Combat);

		const encData = gameState.sceneData.encounters[encId];

		for (let i = 0; i < encData.length; i++) {
			const enId = encData[i];
			const offsetVector = new Vector3(
				0,
				0,
				(encData.length - 1) * -this.SPAWN_OFFSET +
					i * this.SPAWN_OFFSET * 2,
			);
			const spawnPosition = this.BASE_SPAWN_POSITION.add(offsetVector);
			const newEnemy = await enFactory.createEntityFromFileAtPosition(
				enId,
				gameState.campaignId,
				spawnPosition,
			);
			gameState.enemyEIDs.push(newEnemy);
			const enActorData = gameState.ActorDataComponent[newEnemy];
			enActorData.name = enActorData.name.concat(
				` ${String.fromCharCode(65 + i)}`,
			);
			this.decideNPCAction(enActorData, gameState);
		}

		await this.resetControls(gameState);

		for (const eid of query(gameState.world, [
			gameState.ActorDataComponent,
		])) {
			const actorData = gameState.ActorDataComponent[eid];
			const rcvyAttr = actorData.attributes.recovery;
			const initRange = Math.random() * this.START_RECOVERY_RANGE;
			rcvyAttr.maximumValue = this.START_RECOVERY + initRange;
			rcvyAttr.currentValue = 0;
		}

		gameState.actionPauseSet.delete(PAUSE_RENDERQUEUE);

		const ehSystem = container.resolve(EventHandlerSystem);
		ehSystem.checkEventByTrigger("OnCombatStart");
	}

	public endCombat() {
		const gameState = container.resolve(GameState);
		const smSystem = container.resolve(SceneManagerSystem);

		if (gameState.actionManager) {
			gameState.actionManager.dispose();
			gameState.actionManager = null;
		}

		gameState.combatHud.clearCombatEntries();

		gameState.enemyEIDs.forEach((eid) => {
			removeEntity(gameState.world, eid);
		});

		gameState.playerEIDs.forEach((eid) => {
			const playerData = gameState.ActorDataComponent[eid];
			const rcvyAttr = playerData.attributes.recovery;
			rcvyAttr.maximumValue = 0;
			playerData.queuedAction = null;
		});

		// Clear inscene UI
		// Show rest of inscene UI

		smSystem.setGameMode(GameMode.Explore);
		if (gameState.actionPauseSet.size > 0) {
			gameState.actionPauseSet.clear();
		}
		gameState.combatState = CombatState.Default;

		const ehSystem = container.resolve(EventHandlerSystem);
		ehSystem.checkEventByTrigger("OnCombatEnd");
	}

	public async startQueueActionPlayer(
		gameState: GameState,
		eid: EntityId,
		actionInd: number,
		isItem?: boolean,
	): Promise<void> {
		const actorData = gameState.ActorDataComponent[eid];
		const actionData = (await (isItem
			? actorData.itemData && actorData.itemData[actionInd]
			: actorData.powerData[actionInd])) as AbilityData;

		if (actionData.trigger != AbilityTrigger.onActionExecute) {
			return;
		}

		this.setPlayerActionTargeting(gameState, eid, actionData);
	}

	public async resetControls(gameState: GameState) {
		const actorData =
			gameState.ActorDataComponent[gameState.selectedPlayerEID];
		await gameState.combatHud.setActionBar(actorData, this, gameState);

		resetPlayerTargeting(gameState);

		if (gameState.actionManager) {
			gameState.actionManager.dispose();
			gameState.actionManager = null;
		}

		const actionManager = new ActionManager(gameState.scene);

		for (let i = 0; i < actorData.powerData.length; i++) {
			actionManager.registerAction(
				new ExecuteCodeAction(
					{
						trigger: ActionManager.OnKeyDownTrigger,
						parameter: gameState.controlSettings.powerActions[i],
					},
					() => {
						const cmSystem = container.resolve(CombatManagerSystem);
						cmSystem.startQueueActionPlayer(
							gameState,
							actorData.entityId,
							i,
						);
					},
				),
			);
		}

		if (actorData.itemData) {
			for (let i = 0; i < actorData.itemData.length; i++) {
				actionManager.registerAction(
					new ExecuteCodeAction(
						{
							trigger: ActionManager.OnKeyDownTrigger,
							parameter:
								gameState.controlSettings.deviceActions[i],
						},
						() => {
							const cmSystem =
								container.resolve(CombatManagerSystem);
							cmSystem.startQueueActionPlayer(
								gameState,
								actorData.entityId,
								i,
							);
						},
					),
				);
			}
		}

		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: gameState.controlSettings.tacticalPause,
				},
				() => {
					setTacticalPause(
						!gameState.actionPauseSet.has(PAUSE_TACTICALPAUSE),
						gameState,
					);
				},
			),
		);

		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: gameState.controlSettings.switchPlayerLeft,
				},
				() => {
					const uiSystem = container.resolve(UserInterfaceSystem);
					if (!uiSystem) {
						return;
					}

					let selPlyEidIndex = gameState.playerEIDs.findIndex(
						(x) => x === gameState.selectedPlayerEID,
					);
					let newSelPlyEIDIndex = selPlyEidIndex - 1;
					if (newSelPlyEIDIndex < 0) {
						newSelPlyEIDIndex = gameState.playerEIDs.length - 1;
					}
					uiSystem.setSelectedCharacter(
						gameState.playerEIDs[newSelPlyEIDIndex],
					);
				},
			),
		);

		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: gameState.controlSettings.switchPlayerRight,
				},
				() => {
					const uiSystem = container.resolve(UserInterfaceSystem);
					if (!uiSystem) {
						return;
					}

					let selPlyEidIndex = gameState.playerEIDs.findIndex(
						(x) => x === gameState.selectedPlayerEID,
					);
					let newSelPlyEIDIndex = selPlyEidIndex + 1;
					if (newSelPlyEIDIndex > gameState.playerEIDs.length - 1) {
						newSelPlyEIDIndex = 0;
					}
					uiSystem.setSelectedCharacter(
						gameState.playerEIDs[newSelPlyEIDIndex],
					);
				},
			),
		);

		gameState.actionManager = actionManager;
		gameState.scene.actionManager = actionManager;
	}

	private setPlayerActionTargeting(
		gameState: GameState,
		sourceEid: EntityId,
		actionData: AbilityData,
	): void {
		switch (actionData.target) {
			case AbilityTarget.singleEnemy:
				for (const eid of query(gameState.world, [
					gameState.EnemyGUIComponent,
				])) {
					const enemyGUI = gameState.EnemyGUIComponent[eid];
					enemyGUI.setVisibleTargetingUI(true);
					enemyGUI.setTargetingCallback(() => {
						this.finishQueueAction(
							actionData,
							sourceEid,
							[eid],
							gameState.ActorDataComponent,
						);
						gameState.EnemyGUIComponent.forEach((gui) =>
							gui.setVisibleTargetingUI(false),
						);
					});
				}
				return;
			default:
				return;
		}
	}

	private async executeQueuedAction(
		gameState: GameState,
		actorData: ActorData,
	): Promise<void> {
		const rqeSystem = container.resolve(RenderQueueSystem);
		const actionToExecute = await actorData.queuedAction;
		if (!actionToExecute) {
			gameState.actionPauseSet.delete(PAUSE_RENDERQUEUE);
			return;
		}

		const actionTargetIds = actorData.currentTargetEIDs;

		addAbilityRQEs(
			rqeSystem,
			actorData.entityId,
			actionTargetIds,
			actorData,
			actionToExecute,
		);

		actionTargetIds.forEach((eid) => {
			const targetData = gameState.ActorDataComponent[eid];
			processAbilityEffects(actorData, targetData, actionToExecute);
		});

		rqeSystem.startRenderQueue();

		const rcvyAttr = actorData.attributes.recovery;
		rcvyAttr.maximumValue = actionToExecute.recovery || 0.5;
		rcvyAttr.currentValue = 0;
	}

	private finishQueueAction(
		actionData: AbilityData,
		sourceEid: EntityId,
		targetEids: EntityId[],
		actorDataComponent: ActorData[],
	): void {
		const actorData = actorDataComponent[sourceEid];
		actorData.queuedAction = actionData;
		actorData.currentTargetEIDs = targetEids;
	}

	private async decideNPCAction(actorData: ActorData, gameState?: GameState) {
		if (!gameState) {
			gameState = container.resolve(GameState);
		}
		const tactics = actorData.tactics;

		if (!tactics) {
			return;
		}

		let actionData;
		let targetEids: EntityId[] = [];

		for (const entry of tactics) {
			const newActionData =
				(entry.actionType === AbilityDescriptor.device &&
					actorData.itemData &&
					(await actorData.itemData[entry.actionIndex])) ||
				(AbilityDescriptor.power &&
					(await actorData.powerData[entry.actionIndex]));

			if (!newActionData) {
				continue;
			}

			const isActionValid = newActionData.descriptors.includes(
				entry.actionType,
			);
			if (!isActionValid) {
				continue;
			}

			const targets = getTargetsBasedOnCondition(
				newActionData,
				entry,
				actorData.entityId,
			);

			if (targets.length > 0) {
				targetEids = [...targets];
				actionData = newActionData;
				break;
			}
		}

		if (actionData) {
			this.finishQueueAction(
				actionData,
				actorData.entityId,
				targetEids,
				gameState.ActorDataComponent,
			);
		}
	}
}

export enum CombatState {
	Default,
	Victory,
	Gameover,
}
