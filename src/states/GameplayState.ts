import { CombatState } from "src/types/CombatTypes";

export default class GameplayState {
    public selectedPlayerEID: number = -1;
    public playerEntityIds: number[] = [];
    public enemyEntityIds: number[] = [];
    public combatState: CombatState = CombatState.Inactive;

    public constructor() {}
}
