import { container, inject, singleton } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
import { Engine } from "@babylonjs/core";
import { EntityId, query } from "bitecs";
import { PlayerGUIComponent } from "src/components/PlayerGUIComponent";
import { ActorStateComponent } from "src/components/ActorStateComponent";
import { EnemyGUIComponent } from "src/components/EnemyGUIComponent";
import { GameMode } from "src/types/GameTypes";
import CombatManagerSystem from "./CombatManagerSystem";
import { SystemRegistry } from "src/states/registries/SystemRegistry";

export const SYSTEM_ID_USERINTERFACE = "UserInterface";

export default class UserInterfaceSystem implements GameSystem {
	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
	) {}

	public async start(engine: Engine) {}

	public update(deltaTime: number) {
		if (!gameState) {
			return;
		}

		gameState.uiScene.render();

		for (const eid of query(gameState.world, [
			gameState.ActorState,
			gameState.PlayerGUIComponent,
		])) {
			const actorData = gameState.ActorState[eid];
			const playerGUI = gameState.PlayerGUIComponent[eid];
			this.updatePlayerGUI(actorData, playerGUI);
		}

		for (const eid of query(gameState.world, [
			gameState.ActorState,
			gameState.EnemyGUIComponent,
		])) {
			const actorData = gameState.ActorState[eid];
			const enemyGUI = gameState.EnemyGUIComponent[eid];
			this.updateEnemyGUI(actorData, enemyGUI);
		}
	}

	public setGameMode(newMode: GameMode) {
		const gameState = container.resolve(GameState);
		gameState.partyInfoHud.showHideHud(
			newMode == GameMode.Combat || newMode == GameMode.Explore,
		);
		gameState.exploreHud.showHideHud(newMode == GameMode.Explore);
		gameState.dialogueHud.showHideHud(newMode == GameMode.Dialogue);
		gameState.combatHud.showHideHud(newMode == GameMode.Combat);
	}

	public setSelectedCharacter(eid: EntityId) {
		const gameState = container.resolve(GameState);
		if (!gameState.playerEIDs.includes(eid)) {
			return;
		}

		gameState.selectedPlayerEID = eid;
		gameState.PlayerGUIComponent.forEach((gui, eid) => {
			if (eid === gameState.selectedPlayerEID) {
				gui.setSelected(true);
			} else {
				gui.setSelected(false);
			}
		});

		if (gameState.gameMode === GameMode.Combat) {
			const cmSystem = container.resolve(CombatManagerSystem);
			if (!cmSystem) {
				return;
			}
			cmSystem.resetControls(gameState);
		}
	}

	public createPlayerInput(inputMode: GameMode) {}

	private updatePlayerGUI(
		actorData: ActorStateComponent,
		gui: PlayerGUIComponent,
	) {
		gui.setQueuedAction(
			actorData.queuedAction
				? (actorData.queuedAction.iconURL as string)
				: "",
		);

		gui.setActBarFill(
			actorData.attributes.recovery.currentValue,
			actorData.attributes.recovery.maximumValue,
		);

		gui.setLifeBarFill(
			actorData.attributes.life.currentValue,
			actorData.attributes.life.maximumValue,
		);

		gui.setWillBarFill(
			actorData.attributes.will.currentValue,
			actorData.attributes.will.maximumValue,
		);
	}

	private updateEnemyGUI(
		actorData: ActorStateComponent,
		gui: EnemyGUIComponent,
	) {
		gui.setActBarFill(
			actorData.attributes.recovery.currentValue,
			actorData.attributes.recovery.maximumValue,
		);
		gui.setLifeBarFill(
			actorData.attributes.life.currentValue,
			actorData.attributes.life.maximumValue,
		);
	}
}
