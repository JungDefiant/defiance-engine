import { Nullable, Vector3 } from "@babylonjs/core";
import { DEFAULT_CAM_TARGET } from "src/Constants";
import { CombatState } from "src/systems/CombatManagerSystem";
import { GameMode, LocationData } from "src/types/GameTypes";
import { singleton } from "tsyringe";

export const STATE_ID_GAMEPLAYSTATE = "GameplayState";

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
