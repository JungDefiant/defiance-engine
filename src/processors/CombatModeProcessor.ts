import { CombatState } from "src/types/CombatTypes";
import { Processor } from "./Processor";
import {
    endCombat,
    setTacticalPause,
    startCombat,
} from "src/modules/CombatModule";
import {
    getControlState,
    getGameplayState,
    getUserInterfaceState,
} from "src/modules/GameStateModule";
import { PAUSE_GAMEOVER } from "src/constants/GeneralConstants";
import { isActorVisibleToParty } from "src/modules/ActionTargetingModule";

export type CombatModeFunction = () => void;

export class CombatStateProcessor implements Processor {
    private processorFunctions: Record<CombatState, CombatModeFunction>;

    public constructor() {
        this.processorFunctions = {
            Inactive: () => {
                // Check if enemy has entered line of sight
                const gameplayState = getGameplayState();
                for (let entityId of gameplayState.enemyEntityIds) {
                    if (isActorVisibleToParty(entityId)) {
                        gameplayState.combatState = "Active";
                        setTacticalPause(true);
                        startCombat();
                        return;
                    }
                }
            },
            Active: () => {
                // Check if there are anymore enemies in line of sight
                const gameplayState = getGameplayState();
                for (let entityId of gameplayState.enemyEntityIds) {
                    if (isActorVisibleToParty(entityId)) {
                        return;
                    }
                }
                endCombat();
            },
            Gameover: () => {
                const controlState = getControlState();
                const userInterfaceState = getUserInterfaceState();
                controlState.actionPauseSet.add(PAUSE_GAMEOVER);
                userInterfaceState.gameOverScreen.showHide(true);
            },
        };
    }

    setProcessorFunction(key: string, value: CombatModeFunction): void {
        const parsedKey = key as CombatState;
        this.processorFunctions[parsedKey] = value;
    }

    removeProcessorFunction(key: string): void {
        const parsedKey = key as CombatState;
        this.processorFunctions[parsedKey] = () => {};
    }

    getProcessorFunction(key: string): CombatModeFunction {
        const parsedKey = key as CombatState;
        return this.processorFunctions[parsedKey];
    }
}
