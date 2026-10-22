import { ActionManager, Nullable } from "@babylonjs/core";
import { Control } from "@babylonjs/gui";
import { ControlSettings } from "src/types/GameTypes";

export interface MovementInputState {
	forward: boolean;
	back: boolean;
	left: boolean;
	right: boolean;
}

export default class ControlState {
	public actionManager: Nullable<ActionManager> = null;
	public exploreGUIControls: Control[] = [];
	public isTargetingAction: boolean = false;
	public readonly controlSettings: ControlSettings = new ControlSettings();
	public readonly movementInput: MovementInputState = {
		forward: false,
		back: false,
		left: false,
		right: false,
	};
	public readonly actionPauseSet: Set<string> = new Set();
	public readonly renderPauseSet: Set<string> = new Set();
	public readonly controlPauseSet: Set<string> = new Set();

	public constructor() {}
}
