import { container, singleton } from "tsyringe";
import ISystem from "src/systems/ISystem";
import { Engine } from "@babylonjs/core";
import GameState, { GameMode } from "src/GameState";
import { query } from "bitecs";
import { PlayerGUI } from "src/components/PlayerGUI";
import { ActorData } from "src/components/ActorData";
import { EnemyGUI } from "src/components/EnemyGUI";

@singleton()
export default class UserInterfaceSystem implements ISystem {
	public async start(engine: Engine) {}

	public update(deltaTime: number) {
		const gameState = container.resolve(GameState);

		for (const eid of query(gameState.world, [
			gameState.ActorDataComponent,
			gameState.PlayerGUIComponent,
		])) {
			const actorData = gameState.ActorDataComponent[eid];
			const playerGUI = gameState.PlayerGUIComponent[eid];
			this.updatePlayerGUI(actorData, playerGUI);
		}

		for (const eid of query(gameState.world, [
			gameState.ActorDataComponent,
			gameState.EnemyGUIComponent,
		])) {
			const actorData = gameState.ActorDataComponent[eid];
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

	public createPlayerInput(inputMode: GameMode) {}

	private updatePlayerGUI(actorData: ActorData, gui: PlayerGUI) {
		gui.setQueuedAction(
			actorData.queuedAction ? (actorData.queuedAction.iconURL as string) : "",
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

	private updateEnemyGUI(actorData: ActorData, gui: EnemyGUI) {
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
