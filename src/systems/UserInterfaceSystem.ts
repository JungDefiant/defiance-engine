import { container, singleton } from "tsyringe";
import ISystem from "./ISystem";
import { Engine, Nullable, Scene } from "@babylonjs/core";
import GameContext, { GameMode } from "../GameContext";
import { query } from "bitecs";
import { PlayerGUI } from "../components/PlayerGUI";
import { ActorData } from "../components/ActorData";
import { EnemyGUI } from "../components/EnemyGUI";

export interface IUserInterfaceSystem extends ISystem {
	setGameMode(newMode: GameMode): void;
	createPlayerInput(inputMode: GameMode): void;
}

@singleton()
export default class UserInterfaceSystem implements IUserInterfaceSystem {
	public async start(engine: Engine) {}

	public update(deltaTime: number) {
		const context = container.resolve(GameContext);

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
		const context = container.resolve(GameContext);
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
			actorData.attributes["recovery"].currentValue,
			actorData.attributes["recovery"].maximumValue,
		);

		gui.setLifeBarFill(
			actorData.attributes["life"].currentValue,
			actorData.attributes["life"].maximumValue,
		);

		gui.setWillBarFill(
			actorData.attributes["will"].currentValue,
			actorData.attributes["will"].maximumValue,
		);
	}

	private updateEnemyGUI(actorData: ActorData, gui: EnemyGUI) {
		gui.setActBarFill(
			actorData.attributes["recovery"].currentValue,
			actorData.attributes["recovery"].maximumValue,
		);
	}
}
