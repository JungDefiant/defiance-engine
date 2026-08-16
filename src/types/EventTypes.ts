export interface GameEvent {
	id: string;
	condition: string;
	type: EventType;
	trigger: EventTrigger;
	refId: string;
	isTriggered: boolean;
	triggerFunction: Function;
}

export type EventTrigger =
	| "OnLocationEnter"
	| "OnCombatStart"
	| "OnCombatEnd"
	| "OnDialogueEnd";

export type EventType = "Dialogue" | "Modal" | "Combat";
