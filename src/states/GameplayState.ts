import { CombatState } from "src/systems/CombatManagerSystem";

export default class GameplayState {
	public cameraEntityId: number = -1;
	public selectedPlayerEID: number = -1;
	public playerEIDs: number[] = [];
	public enemyEIDs: number[] = [];
	public combatState: CombatState = CombatState.Inactive;

	public constructor() {}
}
