import { container, delay, inject, singleton } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
import SceneManagerSystem, {
	SYSTEM_ID_SCENEMANAGER,
} from "src/systems/SceneManagerSystem";
import {
	ActionManager,
	ExecuteCodeAction,
	RandomRange,
	Vector3,
} from "@babylonjs/core";
import { EntityId, IsA, query, removeEntity } from "bitecs";
import {
	AbilityData,
	AbilityDescriptor,
	AbilityTarget,
	AbilityTrigger,
	ActorStateComponent,
	COMPONENT_ID_ACTORSTATE,
	EffectData,
	EffectVar,
	TacticsCondition,
	TacticsData,
} from "src/components/ActorStateComponent";
import { EnemyFactory, FACTORY_ID_ENEMY } from "src/factories/EnemyFactory";
import { clamp } from "src/helpers/Utils";
import RenderQueueSystem, {
	RenderQueueEntry,
	RenderQueueType,
	SYSTEM_ID_RENDERQUEUE,
} from "./RenderQueueSystem";
import { Themes } from "src/gui/Themes";
import {
	PAUSE_GAMEOVER,
	PAUSE_RENDERQUEUE,
	PAUSE_TACTICALPAUSE,
	PAUSE_VICTORYSCREEN,
} from "src/Constants";
import { GameMode } from "src/types/GameTypes";
import UserInterfaceSystem from "./UserInterfaceSystem";
import EventHandlerSystem, {
	SYSTEM_ID_EVENTHANDLER,
} from "./EventHandlerSystem";
import {
	getTargetsBasedOnCondition,
	resetTargeting as resetPlayerTargeting,
	setTacticalPause,
} from "src/helpers/CombatHelpers";
import { processAbilityEffects } from "src/helpers/EffectHelpers";
import { addAbilityRQEs } from "src/helpers/RenderHelpers";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import GameplayState, {
	STATE_ID_GAMEPLAYSTATE,
} from "src/states/GameplayState";
import ControlState, { STATE_ID_CONTROLSTATE } from "src/states/ControlState";
import UserInterfaceState, {
	STATE_ID_USERINTERFACE,
} from "src/states/UserInterfaceState";
import SceneState, { STATE_ID_SCENESTATE } from "src/states/SceneState";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import { SystemRegistry } from "src/registries/SystemRegistry";
import CampaignState, {
	STATE_ID_CAMPAIGNSTATE,
} from "src/states/CampaignState";
import { Control } from "@babylonjs/gui";
import { FactoryRegistry } from "src/registries/FactoryRegistry";
import {
	COMPONENT_ID_ENEMYGUI,
	EnemyGUIComponent,
} from "src/components/EnemyGUIComponent";

export const SYSTEM_ID_COMBATMANAGER = "CombatManager";

export default class CombatManagerSystem implements GameSystem {
	private readonly START_RECOVERY = 3;
	private readonly START_RECOVERY_RANGE = 2;
	private readonly BASE_SPAWN_POSITION = new Vector3(0, 0.28, 0);
	private readonly SPAWN_OFFSET = 0.2;

	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
		@inject(FactoryRegistry) private factoryRegistry: FactoryRegistry,
		@inject(GameStateRegistry) private gameStateRegistry: GameStateRegistry,
		@inject(ComponentRegistry) private componentRegistry: ComponentRegistry,
	) {}

	public async start() {}

	public update(deltaTime: number): void {
		const gameplayState =
			this.gameStateRegistry.getGameStateByStateId<GameplayState>(
				STATE_ID_GAMEPLAYSTATE,
			);
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				STATE_ID_SCENESTATE,
			);
		const controlState =
			this.gameStateRegistry.getGameStateByStateId<ControlState>(
				STATE_ID_CONTROLSTATE,
			);
		const userInterfaceState =
			this.gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				STATE_ID_USERINTERFACE,
			);

		if (gameplayState.gameMode !== GameMode.Combat) {
			return;
		}

		if (controlState.actionPauseSet.size > 0) {
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

		const actorStateComponents =
			this.componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
				COMPONENT_ID_ACTORSTATE,
			);

		for (const eid of query(sceneState.world, [actorStateComponents])) {
			const actorData = actorStateComponents[eid];
			const rcvyAttr = actorData.attributes.recovery;

			if (
				actorData.queuedAction &&
				rcvyAttr.currentValue === rcvyAttr.maximumValue
			) {
				controlState.actionPauseSet.add(PAUSE_RENDERQUEUE);
				this.executeQueuedAction(actorData);
				if (gameplayState.enemyEIDs.includes(eid)) {
					this.decideNPCAction(actorData);
				}
				break;
			}
		}
	}

	public async startCombat(encId: string): Promise<void> {
		const sceneManagerSystem =
			this.systemRegistry.getGameSystemBySystemId<SceneManagerSystem>(
				SYSTEM_ID_SCENEMANAGER,
			);
		const eventHandlerSystem =
			this.systemRegistry.getGameSystemBySystemId<EventHandlerSystem>(
				SYSTEM_ID_EVENTHANDLER,
			);
		const enemyFactory =
			this.factoryRegistry.getEntityFactoryByFactoryId<EnemyFactory>(
				FACTORY_ID_ENEMY,
			);
		const campaignState =
			this.gameStateRegistry.getGameStateByStateId<CampaignState>(
				STATE_ID_CAMPAIGNSTATE,
			);
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				STATE_ID_SCENESTATE,
			);
		const controlState =
			this.gameStateRegistry.getGameStateByStateId<ControlState>(
				STATE_ID_CONTROLSTATE,
			);
		const gameplayState =
			this.gameStateRegistry.getGameStateByStateId<GameplayState>(
				STATE_ID_GAMEPLAYSTATE,
			);
		const actorStateComponentArray =
			this.componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
				COMPONENT_ID_ACTORSTATE,
			);

		sceneManagerSystem.setGameMode(GameMode.Combat);

		const encData = sceneState.sceneData.encounters[encId];

		for (let i = 0; i < encData.length; i++) {
			const enId = encData[i];
			const offsetVector = new Vector3(
				0,
				0,
				(encData.length - 1) * -this.SPAWN_OFFSET +
					i * this.SPAWN_OFFSET * 2,
			);
			const spawnPosition = this.BASE_SPAWN_POSITION.add(offsetVector);
			const newEnemy = await enemyFactory.createEntityFromFileAtPosition(
				enId,
				campaignState.campaignId,
				spawnPosition,
			);
			gameplayState.enemyEIDs.push(newEnemy);
			const enActorData = actorStateComponentArray[newEnemy];
			enActorData.name = enActorData.name.concat(
				` ${String.fromCharCode(65 + i)}`,
			);
			this.decideNPCAction(enActorData);
		}

		await this.resetControls();

		for (const eid of query(sceneState.world, [actorStateComponentArray])) {
			const actorData = actorStateComponentArray[eid];
			const rcvyAttr = actorData.attributes.recovery;
			const initRange = Math.random() * this.START_RECOVERY_RANGE;
			rcvyAttr.maximumValue = this.START_RECOVERY + initRange;
			rcvyAttr.currentValue = 0;
		}

		controlState.actionPauseSet.delete(PAUSE_RENDERQUEUE);

		eventHandlerSystem.checkEventByTrigger("OnCombatStart");
	}

	public endCombat() {
		const sceneManagerSystem =
			this.systemRegistry.getGameSystemBySystemId<SceneManagerSystem>(
				SYSTEM_ID_SCENEMANAGER,
			);
		const eventHandlerSystem =
			this.systemRegistry.getGameSystemBySystemId<EventHandlerSystem>(
				SYSTEM_ID_EVENTHANDLER,
			);
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				STATE_ID_SCENESTATE,
			);
		const controlState =
			this.gameStateRegistry.getGameStateByStateId<ControlState>(
				STATE_ID_CONTROLSTATE,
			);
		const gameplayState =
			this.gameStateRegistry.getGameStateByStateId<GameplayState>(
				STATE_ID_GAMEPLAYSTATE,
			);
		const userInterfaceState =
			this.gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				STATE_ID_USERINTERFACE,
			);
		const actorStateComponentArray =
			this.componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
				COMPONENT_ID_ACTORSTATE,
			);

		if (controlState.actionManager) {
			controlState.actionManager.dispose();
			controlState.actionManager = null;
		}

		userInterfaceState.combatHud.clearCombatEntries();

		gameplayState.enemyEIDs.forEach((eid) => {
			removeEntity(sceneState.world, eid);
		});

		gameplayState.playerEIDs.forEach((eid) => {
			const playerData = actorStateComponentArray[eid];
			const rcvyAttr = playerData.attributes.recovery;
			rcvyAttr.maximumValue = 0;
			playerData.queuedAction = null;
		});

		// Clear inscene UI
		// Show rest of inscene UI

		sceneManagerSystem.setGameMode(GameMode.Explore);
		if (controlState.actionPauseSet.size > 0) {
			controlState.actionPauseSet.clear();
		}
		gameplayState.combatState = CombatState.Default;

		eventHandlerSystem.checkEventByTrigger("OnCombatEnd");
	}

	public async startQueueActionPlayer(
		eid: EntityId,
		actionInd: number,
		isItem?: boolean,
	): Promise<void> {
		const actorData =
			this.componentRegistry.getComponentByEntityId<ActorStateComponent>(
				COMPONENT_ID_ACTORSTATE,
				eid,
			);
		const actionData = (await (isItem
			? actorData.itemData && actorData.itemData[actionInd]
			: actorData.powerData[actionInd])) as AbilityData;

		if (actionData.trigger != AbilityTrigger.onActionExecute) {
			return;
		}

		this.setPlayerActionTargeting(eid, actionData);
	}

	public async resetControls() {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				STATE_ID_SCENESTATE,
			);
		const gameplayState =
			this.gameStateRegistry.getGameStateByStateId<GameplayState>(
				STATE_ID_GAMEPLAYSTATE,
			);
		const controlState =
			this.gameStateRegistry.getGameStateByStateId<ControlState>(
				STATE_ID_CONTROLSTATE,
			);
		const userInterfaceState =
			this.gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				STATE_ID_USERINTERFACE,
			);
		const actorData =
			this.componentRegistry.getComponentByEntityId<ActorStateComponent>(
				COMPONENT_ID_ACTORSTATE,
				gameplayState.selectedPlayerEID,
			);
		await userInterfaceState.combatHud.setActionBar(actorData, this);

		resetPlayerTargeting();

		if (controlState.actionManager) {
			controlState.actionManager.dispose();
			controlState.actionManager = null;
		}

		const actionManager = new ActionManager(sceneState.currentScene);

		for (let i = 0; i < actorData.powerData.length; i++) {
			actionManager.registerAction(
				new ExecuteCodeAction(
					{
						trigger: ActionManager.OnKeyDownTrigger,
						parameter: controlState.controlSettings.powerActions[i],
					},
					() => {
						const cmSystem = container.resolve(CombatManagerSystem);
						cmSystem.startQueueActionPlayer(actorData.entityId, i);
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
								controlState.controlSettings.deviceActions[i],
						},
						() => {
							const cmSystem =
								container.resolve(CombatManagerSystem);
							cmSystem.startQueueActionPlayer(
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
					parameter: controlState.controlSettings.tacticalPause,
				},
				() => {
					setTacticalPause(
						!controlState.actionPauseSet.has(PAUSE_TACTICALPAUSE),
					);
				},
			),
		);

		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: controlState.controlSettings.switchPlayerLeft,
				},
				() => {
					const uiSystem = container.resolve(UserInterfaceSystem);
					if (!uiSystem) {
						return;
					}

					let selPlyEidIndex = gameplayState.playerEIDs.findIndex(
						(x) => x === gameplayState.selectedPlayerEID,
					);
					let newSelPlyEIDIndex = selPlyEidIndex - 1;
					if (newSelPlyEIDIndex < 0) {
						newSelPlyEIDIndex = gameplayState.playerEIDs.length - 1;
					}
					uiSystem.setSelectedCharacter(
						gameplayState.playerEIDs[newSelPlyEIDIndex],
					);
				},
			),
		);

		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: controlState.controlSettings.switchPlayerRight,
				},
				() => {
					const uiSystem = container.resolve(UserInterfaceSystem);
					if (!uiSystem) {
						return;
					}

					let selPlyEidIndex = gameplayState.playerEIDs.findIndex(
						(x) => x === gameplayState.selectedPlayerEID,
					);
					let newSelPlyEIDIndex = selPlyEidIndex + 1;
					if (
						newSelPlyEIDIndex >
						gameplayState.playerEIDs.length - 1
					) {
						newSelPlyEIDIndex = 0;
					}
					uiSystem.setSelectedCharacter(
						gameplayState.playerEIDs[newSelPlyEIDIndex],
					);
				},
			),
		);

		controlState.actionManager = actionManager;
		sceneState.currentScene.actionManager = actionManager;
	}

	private setPlayerActionTargeting(
		sourceEid: EntityId,
		actionData: AbilityData,
	): void {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				STATE_ID_SCENESTATE,
			);
		const enemyGuiComponentArray =
			this.componentRegistry.getComponentArrayByComponentId<EnemyGUIComponent>(
				COMPONENT_ID_ENEMYGUI,
			);
		switch (actionData.target) {
			case AbilityTarget.singleEnemy:
				for (const eid of query(sceneState.world, [
					enemyGuiComponentArray,
				])) {
					const enemyGUI = enemyGuiComponentArray[eid];
					enemyGUI.setVisibleTargetingUI(true);
					enemyGUI.setTargetingCallback(() => {
						this.finishQueueAction(actionData, sourceEid, [eid]);
						enemyGuiComponentArray.forEach((gui) =>
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
		sourceActorState: ActorStateComponent,
	): Promise<void> {
		const controlState =
			this.gameStateRegistry.getGameStateByStateId<ControlState>(
				STATE_ID_CONTROLSTATE,
			);
		const renderQueueSystem =
			this.systemRegistry.getGameSystemBySystemId<RenderQueueSystem>(
				SYSTEM_ID_RENDERQUEUE,
			);
		const actorStateComponentArray =
			this.componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
				COMPONENT_ID_ACTORSTATE,
			);
		const actionToExecute = await sourceActorState.queuedAction;
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

		renderQueueSystem.startRenderQueue();

		const rcvyAttr = sourceActorState.attributes.recovery;
		rcvyAttr.maximumValue = actionToExecute.recovery || 0.5;
		rcvyAttr.currentValue = 0;
	}

	private finishQueueAction(
		actionData: AbilityData,
		sourceEid: EntityId,
		targetEids: EntityId[],
	): void {
		const sourceActorState =
			this.componentRegistry.getComponentByEntityId<ActorStateComponent>(
				COMPONENT_ID_ACTORSTATE,
				sourceEid,
			);
		sourceActorState.queuedAction = actionData;
		sourceActorState.currentTargetEIDs = targetEids;
	}

	private async decideNPCAction(actorData: ActorStateComponent) {
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
			this.finishQueueAction(actionData, actorData.entityId, targetEids);
		}
	}
}

export enum CombatState {
	Default,
	Victory,
	Gameover,
}
