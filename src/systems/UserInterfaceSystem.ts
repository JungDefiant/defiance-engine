import { inject } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
import { Engine } from "@babylonjs/core";
import { query } from "bitecs";
import PlayerGUIComponent from "src/components/PlayerGUIComponent";
import ActorStateComponent from "src/components/ActorStateComponent";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";
import { GameScene } from "src/scenes/GameScene";
import {
	getActorStateComponentArray,
	getEnemyGuiComponentArray,
	getPlayerGuiComponentArray,
} from "src/modules/ComponentModule";

export default class UserInterfaceSystem implements GameSystem {
	public constructor(@inject(GameScene) private gameScene: GameScene) {}

	public update(deltaTime: number) {
		const actorStateComponentArray = getActorStateComponentArray();
		const playerGuiComponentArray = getPlayerGuiComponentArray();
		const enemyGuiComponentArray = getEnemyGuiComponentArray();

		for (const eid of query(this.gameScene.world, [
			actorStateComponentArray,
			playerGuiComponentArray,
		])) {
			const actorData = actorStateComponentArray[eid];
			const playerGUI = playerGuiComponentArray[eid];
			this.updatePlayerGUI(actorData, playerGUI);
		}

		for (const eid of query(this.gameScene.world, [
			actorStateComponentArray,
			enemyGuiComponentArray,
		])) {
			const actorData = actorStateComponentArray[eid];
			const enemyGUI = enemyGuiComponentArray[eid];
			this.updateEnemyGUI(actorData, enemyGUI);
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
