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
		const context = container.resolve(GameState);

		for (const eid of query(context.world, [
			context.ActorDataComponent,
			context.PlayerGUIComponent,
		])) {
			const actorData = context.ActorDataComponent[eid];
			const playerGUI = context.PlayerGUIComponent[eid];
			this.updatePlayerGUI(actorData, playerGUI);
		}

		for (const eid of query(context.world, [
			context.ActorDataComponent,
			context.EnemyGUIComponent,
		])) {
			const actorData = context.ActorDataComponent[eid];
			const enemyGUI = context.EnemyGUIComponent[eid];
			this.updateEnemyGUI(actorData, enemyGUI);
		}
	}

	public setGameMode(newMode: GameMode) {
		const context = container.resolve(GameState);
		context.partyInfoHud.showHideHud(
			newMode == GameMode.Combat || newMode == GameMode.Explore,
		);
		context.exploreHud.showHideHud(newMode == GameMode.Explore);
		context.dialogueHud.showHideHud(newMode == GameMode.Dialogue);
		context.combatHud.showHideHud(newMode == GameMode.Combat);
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
