import { getControlState, getGameplayState } from "src/modules/GameStateModule";
import GameSystem from "./GameSystem";
import { GameScene } from "src/scenes/GameScene";
import { inject } from "tsyringe";
import { COMBAT_TURN_INTERVAL_MS } from "src/constants/CombatConstants";
import { getCombatStateProcessor } from "src/modules/ProcessorModule";

export default class CombatManagementSystem implements GameSystem {
    private accumulatedTime: number = 0;

    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const controlState = getControlState();
        if (controlState.actionPauseSet.size > 0) {
            return;
        }

        this.accumulatedTime += deltaTime;

        if (this.accumulatedTime < COMBAT_TURN_INTERVAL_MS) {
            return;
        }

        this.accumulatedTime = 0;

        const gameplayState = getGameplayState();
        const combatStateProcessor = getCombatStateProcessor();
        const combatStateProcessorFunction =
            combatStateProcessor.getProcessorFunction(
                gameplayState.combatState,
            );
        combatStateProcessorFunction();
    }
}
