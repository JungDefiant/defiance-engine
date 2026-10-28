import { CombatState } from "src/systems/CombatManagerSystem";

export default class GameplayState {
	public selectedPlayerEID: number = -1;
	public playerEntityIds: number[] = [];
	public enemyEntityIds: number[] = [];
	public combatState: CombatState = CombatState.Inactive;

	public constructor() {}
}
