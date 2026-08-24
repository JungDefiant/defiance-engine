import { ActionManager, Nullable } from "@babylonjs/core";
import { Control } from "@babylonjs/gui";
import { ControlSettings } from "src/types/GameTypes";

export default class ControlState {
	public actionManager: Nullable<ActionManager> = null;
	public exploreGUIControls: Control[] = [];
	public readonly controlSettings: ControlSettings = new ControlSettings();
	public readonly actionPauseSet: Set<string> = new Set();
	public readonly renderPauseSet: Set<string> = new Set();
	public readonly controlPauseSet: Set<string> = new Set();

	public constructor() {}
}
