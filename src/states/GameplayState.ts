import { CombatState } from "src/systems/CombatManagerSystem";
import { GameMode } from "src/types/GameTypes";

export default class GameplayState {
	public cameraEID: number = -1;
	public selectedPlayerEID: number = -1;
	public playerEIDs: number[] = [];
	public enemyEIDs: number[] = [];
	public combatState: CombatState = CombatState.Inactive;

	public constructor() {}
}
