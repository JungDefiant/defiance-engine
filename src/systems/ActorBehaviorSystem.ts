import { inject } from "tsyringe";
import { query } from "bitecs";
import { GameScene } from "src/scenes/GameScene";
import { getActorBehaviorComponentArray } from "src/modules/ComponentModule";
import { getControlState, getGameplayState } from "src/modules/GameStateModule";
import { decideActionByBehavior } from "src/modules/ActorBehaviorModule";
import GameSystem from "./GameSystem";

export default class ActorBehaviorSystem implements GameSystem {
    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const controlState = getControlState();
        if (controlState.actionPauseSet.size > 0) {
            return;
        }

        const gameplayState = getGameplayState();
        const behaviorComponentArray = getActorBehaviorComponentArray();

        for (const entityId of query(this.gameScene.world, [
            behaviorComponentArray,
        ])) {
            if (entityId !== gameplayState.selectedPlayerEID) {
                decideActionByBehavior(entityId);
            }
        }
    }
}
