import { inject } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
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
import { updateTargetHighlight } from "src/modules/UserInterfaceModule";

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
			this.updateEnemyGUI(actorData, enemyGUI, eid);
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
			playerActorState.attributes.actionTimer.currentValue,
			playerActorState.attributes.actionTimer.maximumValue,
		);

		playerGui.setLifePoints(
			playerActorState.attributes.lifePoints.currentValue,
		);

		playerGui.setWillPoints(
			playerActorState.attributes.willPoints.currentValue,
		);

		playerGui.setItemPoints(
			playerActorState.attributes.itemPoints.currentValue,
		);
	}

	private updateEnemyGUI(
		enemyActorState: ActorStateComponent,
		enemyGui: EnemyGUIComponent,
		entityId: number,
	) {
		enemyGui.setLifeBarFill(
			enemyActorState.attributes.lifePoints.currentValue,
			enemyActorState.attributes.lifePoints.maximumValue,
		);

		const hoveredEnemyEid = this.getHoveredEnemyEid();
		enemyGui.setLifeBarVisible(entityId === hoveredEnemyEid);

		updateTargetHighlight();
	}

	private getHoveredEnemyEid(): number {
		const hoverPick = this.gameScene.pick(
			this.gameScene.pointerX,
			this.gameScene.pointerY,
			(mesh) => mesh.name.startsWith("enBattlerSprite_"),
		);

		if (hoverPick && hoverPick.hit && hoverPick.pickedMesh) {
			const pickedEntityMeshMetadata = hoverPick.pickedMesh
				.metadata as Record<string, number>;
			const pickedEntityId = pickedEntityMeshMetadata.entityId;

			if (pickedEntityId && pickedEntityId >= 0) {
				return pickedEntityId;
			}
		}

		return -1;
	}
}
