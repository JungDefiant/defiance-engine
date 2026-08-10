import { container, inject, singleton } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
import { Engine } from "@babylonjs/core";
import { EntityId, query } from "bitecs";
import PlayerGUIComponent from "src/components/PlayerGUIComponent";
import ActorStateComponent from "src/components/ActorStateComponent";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";
import { GameMode } from "src/types/GameTypes";
import { SystemRegistry } from "src/registries/SystemRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import UserInterfaceState from "src/states/UserInterfaceState";
import SceneState from "src/states/SceneState";
import GameplayState from "src/states/GameplayState";
import CombatManagerSystem from "./CombatManagerSystem";
import { ComponentRegistry } from "src/registries/ComponentRegistry";

export const SYSTEM_ID_USERINTERFACE = "UserInterface";

export default class UserInterfaceSystem implements GameSystem {
	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
		@inject(GameStateRegistry) private gameStateRegistry: GameStateRegistry,
	) {}

	public async start(engine: Engine) {}

	public update(deltaTime: number) {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				SceneState.toString(),
			);
		const actorStateComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
				ActorStateComponent.toString(),
			);
		const playerGuiComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<PlayerGUIComponent>(
				PlayerGUIComponent.toString(),
			);
		const enemyGuiComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<EnemyGUIComponent>(
				EnemyGUIComponent.toString(),
			);

		for (const eid of query(sceneState.world, [
			actorStateComponentArray,
			playerGuiComponentArray,
		])) {
			const actorData = actorStateComponentArray[eid];
			const playerGUI = playerGuiComponentArray[eid];
			this.updatePlayerGUI(actorData, playerGUI);
		}

		for (const eid of query(sceneState.world, [
			actorStateComponentArray,
			enemyGuiComponentArray,
		])) {
			const actorData = actorStateComponentArray[eid];
			const enemyGUI = enemyGuiComponentArray[eid];
			this.updateEnemyGUI(actorData, enemyGUI);
		}
	}

	public setGameMode(newMode: GameMode) {
		const userInterfaceState =
			this.gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);
		userInterfaceState.partyInfoHud.showHideHud(
			newMode == GameMode.Combat || newMode == GameMode.Explore,
		);
		userInterfaceState.exploreHud.showHideHud(newMode == GameMode.Explore);
		userInterfaceState.dialogueHud.showHideHud(
			newMode == GameMode.Dialogue,
		);
		userInterfaceState.combatHud.showHideHud(newMode == GameMode.Combat);
	}

	public setSelectedCharacter(eid: EntityId, isCombatMode?: boolean) {
		const componentRegistry = container.resolve(ComponentRegistry);
		const gameplayState =
			this.gameStateRegistry.getGameStateByStateId<GameplayState>(
				GameplayState.toString(),
			);

		if (!gameplayState.playerEIDs.includes(eid)) {
			return;
		}

		const playerGuiComponentArray =
			componentRegistry.getComponentArrayByComponentId<PlayerGUIComponent>(
				PlayerGUIComponent.toString(),
			);

		gameplayState.selectedPlayerEID = eid;
		playerGuiComponentArray.forEach((gui, eid) => {
			if (eid === gameplayState.selectedPlayerEID) {
				gui.setSelected(true);
			} else {
				gui.setSelected(false);
			}
		});

		if (isCombatMode) {
			const combatManagerSystem =
				this.systemRegistry.getGameSystemBySystemId<CombatManagerSystem>(
					CombatManagerSystem.toString(),
				);
			combatManagerSystem.resetControls();
		}
	}

	private updatePlayerGUI(
		playerActorState: ActorStateComponent,
		playerGui: PlayerGUIComponent,
	) {
		playerGui.setQueuedAction(
			playerActorState.queuedAction
				? (playerActorState.queuedAction.iconURL as string)
				: "",
		);

		playerGui.setActBarFill(
			playerActorState.attributes.recovery.currentValue,
			playerActorState.attributes.recovery.maximumValue,
		);

		playerGui.setLifeBarFill(
			playerActorState.attributes.life.currentValue,
			playerActorState.attributes.life.maximumValue,
		);

		playerGui.setWillBarFill(
			playerActorState.attributes.will.currentValue,
			playerActorState.attributes.will.maximumValue,
		);
	}

	private updateEnemyGUI(
		enemyActorState: ActorStateComponent,
		enemyGui: EnemyGUIComponent,
	) {
		enemyGui.setActBarFill(
			enemyActorState.attributes.recovery.currentValue,
			enemyActorState.attributes.recovery.maximumValue,
		);
		enemyGui.setLifeBarFill(
			enemyActorState.attributes.life.currentValue,
			enemyActorState.attributes.life.maximumValue,
		);
	}
}
