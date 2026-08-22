export interface GameEvent {
	id: string;
	condition: string;
	type: GameEventType;
	trigger: GameEventTrigger;
	assetId: string;
	isTriggered: boolean;
}

export type GameEventTrigger =
	| "OnLocationEnter"
	| "OnCombatStart"
	| "OnCombatEnd"
	| "OnDialogueEnd";

export type GameEventType = "Dialogue" | "Modal" | "Combat";
