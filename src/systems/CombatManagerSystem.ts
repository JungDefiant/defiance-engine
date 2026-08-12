import { container, inject } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
import { Vector3 } from "@babylonjs/core";
import { EntityId, query, removeEntity } from "bitecs";
import ActorStateComponent, {
	AbilityData,
	AbilityDescriptor,
	AbilityTarget,
	AbilityTrigger,
} from "src/components/ActorStateComponent";
import { EnemyFactory } from "src/factories/EnemyFactory";
import RenderQueueSystem from "./RenderQueueSystem";
import {
	PAUSE_GAMEOVER,
	PAUSE_RENDERQUEUE,
	PAUSE_VICTORYSCREEN,
} from "src/constants/GeneralConstants";
import EventHandlerSystem from "./EventHandlerSystem";
import { getTargetsBasedOnCondition } from "src/helpers/CombatHelpers";
import { processAbilityEffects } from "src/helpers/EffectHelpers";
import { addAbilityRQEs } from "src/helpers/RenderHelpers";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import ControlState from "src/states/ControlState";
import SceneState from "src/states/SceneState";
import { SystemRegistry } from "src/registries/SystemRegistry";
import GameplayState from "src/states/GameplayState";
import UserInterfaceState from "src/states/UserInterfaceState";
import CampaignState from "src/states/CampaignState";
import { getComponentRegistry } from "src/helpers/RegistryHelpers";
import { FactoryRegistry } from "src/registries/FactoryRegistry";
import {
	setCombatGameMode,
	setExploreGameMode,
} from "src/helpers/SceneHelpers";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";
import { resetCombatModeActionManager } from "src/helpers/ControlHelpers";

export const SYSTEM_ID_COMBATMANAGER = "CombatManager";

export default class CombatManagerSystem implements GameSystem {
	private readonly START_RECOVERY = 3;
	private readonly START_RECOVERY_RANGE = 2;
	private readonly BASE_SPAWN_POSITION = new Vector3(0, 0.28, 0);
	private readonly SPAWN_OFFSET = 0.2;

	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
		@inject(GameStateRegistry) private gameStateRegistry: GameStateRegistry,
	) {}

	public async start() {}

	public update(deltaTime: number): void {
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const componentRegistry = getComponentRegistry();

		const gameplayState =
			gameStateRegistry.getGameStateByStateId<GameplayState>(
				GameplayState.toString(),
			);
		const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
			SceneState.toString(),
		);
		const controlState =
			gameStateRegistry.getGameStateByStateId<ControlState>(
				ControlState.toString(),
			);
		const userInterfaceState =
			gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);

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

		const actorStateComponents =
			componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
				ActorStateComponent.toString(),
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
		const factoryRegistry = container.resolve(FactoryRegistry);

		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				SceneState.toString(),
			);
		const componentRegistry = sceneState.componentRegistry;

		const eventHandlerSystem =
			this.systemRegistry.getGameSystemBySystemId<EventHandlerSystem>(
				EventHandlerSystem.toString(),
			);
		const enemyFactory =
			factoryRegistry.getEntityFactoryByFactoryId<EnemyFactory>(
				EnemyFactory.toString(),
			);
		const campaignState =
			this.gameStateRegistry.getGameStateByStateId<CampaignState>(
				CampaignState.toString(),
			);

		const controlState =
			this.gameStateRegistry.getGameStateByStateId<ControlState>(
				ControlState.toString(),
			);
		const gameplayState =
			this.gameStateRegistry.getGameStateByStateId<GameplayState>(
				GameplayState.toString(),
			);
		const actorStateComponentArray =
			componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
				ActorStateComponent.toString(),
			);

		setCombatGameMode();

		const encounter = sceneState.encounters[encId];

		for (let i = 0; i < encounter.length; i++) {
			const enId = encounter[i];
			const offsetVector = new Vector3(
				0,
				0,
				(encounter.length - 1) * -this.SPAWN_OFFSET +
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

		await resetCombatModeActionManager();

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
		this.disposeActionManager();
		this.clearCombatHudEntries();
		this.disposeEnemyEntities();
		this.resetPlayerActorState();
		this.clearControlActionPause();
		this.resetCombatStateToInactive();
		setExploreGameMode();
		this.checkEventTriggersOnCombatEnd();
	}

	private resetCombatStateToInactive() {
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const gameplayState =
			gameStateRegistry.getGameStateByStateId<GameplayState>(
				GameplayState.toString(),
			);
		gameplayState.combatState = CombatState.Inactive;
	}

	private disposeActionManager() {
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const controlState =
			gameStateRegistry.getGameStateByStateId<ControlState>(
				ControlState.toString(),
			);
		if (controlState.actionManager) {
			controlState.actionManager.dispose();
			controlState.actionManager = null;
		}
	}

	private disposeEnemyEntities() {
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const gameplayState =
			gameStateRegistry.getGameStateByStateId<GameplayState>(
				GameplayState.toString(),
			);
		const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
			SceneState.toString(),
		);
		gameplayState.enemyEIDs.forEach((eid) => {
			removeEntity(sceneState.world, eid);
		});
	}

	private resetPlayerActorState() {
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const componentRegistry = getComponentRegistry();
		const gameplayState =
			gameStateRegistry.getGameStateByStateId<GameplayState>(
				GameplayState.toString(),
			);
		const actorStateComponentArray =
			componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
				ActorStateComponent.toString(),
			);
		gameplayState.playerEIDs.forEach((eid) => {
			const playerData = actorStateComponentArray[eid];
			const rcvyAttr = playerData.attributes.recovery;
			rcvyAttr.maximumValue = 0;
			playerData.queuedAction = null;
		});
	}

	private clearControlActionPause() {
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const controlState =
			gameStateRegistry.getGameStateByStateId<ControlState>(
				ControlState.toString(),
			);
		if (controlState.actionPauseSet.size > 0) {
			controlState.actionPauseSet.clear();
		}
	}

	private clearCombatHudEntries() {
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const userInterfaceState =
			gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);
		userInterfaceState.combatHud.clearCombatEntries();
	}

	private checkEventTriggersOnCombatEnd() {
		const eventHandlerSystem =
			this.systemRegistry.getGameSystemBySystemId<EventHandlerSystem>(
				EventHandlerSystem.toString(),
			);
		eventHandlerSystem.checkEventByTrigger("OnCombatEnd");
	}

	public async startQueueActionPlayer(
		eid: EntityId,
		actionInd: number,
		isItem?: boolean,
	): Promise<void> {
		const componentRegistry = getComponentRegistry();

		const actorData =
			componentRegistry.getComponentByEntityId<ActorStateComponent>(
				ActorStateComponent.toString(),
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

	private setPlayerActionTargeting(
		sourceEid: EntityId,
		actionData: AbilityData,
	): void {
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
			SceneState.toString(),
		);
		const componentRegistry = sceneState.componentRegistry;

		const enemyGuiComponentArray =
			componentRegistry.getComponentArrayByComponentId<EnemyGUIComponent>(
				EnemyGUIComponent.toString(),
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
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const componentRegistry = getComponentRegistry();

		const renderQueueSystem =
			this.systemRegistry.getGameSystemBySystemId<RenderQueueSystem>(
				RenderQueueSystem.toString(),
			);
		const controlState =
			gameStateRegistry.getGameStateByStateId<ControlState>(
				ControlState.toString(),
			);
		const actorStateComponentArray =
			componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
				ActorStateComponent.toString(),
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
		const componentRegistry = getComponentRegistry();
		const sourceActorState =
			componentRegistry.getComponentByEntityId<ActorStateComponent>(
				ActorStateComponent.toString(),
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
	Inactive,
	Active,
	Victory,
	Gameover,
}
