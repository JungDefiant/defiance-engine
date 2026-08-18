export interface GameEvent {
	id: string;
	condition: string;
	type: EventType;
	trigger: EventTrigger;
	assetId: string;
	isTriggered: boolean;
}

export type EventTrigger =
	| "OnLocationEnter"
	| "OnCombatStart"
	| "OnCombatEnd"
	| "OnDialogueEnd";

export type EventType = "Dialogue" | "Modal" | "Combat";
