import { CombatState } from "src/systems/CombatManagerSystem";
import { GameMode } from "src/types/GameTypes";

export default class GameplayState {
	public gameMode: GameMode;
	public cameraEID: number;
	public selectedPlayerEID: number;
	public playerEIDs: number[] = [];
	public enemyEIDs: number[] = [];
	public combatState: CombatState = CombatState.Default;

	public constructor(props: GameplayStateProps) {
		this.gameMode = props.gameMode;
		this.cameraEID = props.cameraEID;
		this.selectedPlayerEID = props.selectedPlayerEID;
	}
}

export interface GameplayStateProps {
	gameMode: GameMode;
	cameraEID: number;
	selectedPlayerEID: number;
}
