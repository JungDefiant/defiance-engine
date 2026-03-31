export class ActorData {
	id: string = "";
	name: string = "";
	backstory: string = "";
	description: string = "";
	spriteUrl: string = "";
	attributes: AttributeSet = {};
	abilityData: ActionData[] = [];
	affinityData?: AffinityData;
	itemData?: ActionData[];
	tactics?: TacticsData[];
}

export interface AttributeSet {
	[index: string]: ActorAttribute;
}

export interface ActorAttribute {
	baseValue: number;
	currentValue?: number;
	maximumValue?: number;
}

export interface AffinityData {
	baseAttributes: ActorAttribute[];
}

export interface ActionData {
	id: string;
	name: string;
	description: string;
	castVfxURL: string;
	hitVfxURL: string;
	castSfxURL: string;
	hitSfxURL: string;
	trigger: ActionTrigger;
	descriptors: ActionDescriptor[];
	target: ActionTarget;
	recovery: number;
	cost: number;
	effectData: EffectData[];
}

export interface EffectData {
	id: string;
	variables: number[];
}

export interface TacticsData {
	condition: TacticsCondition;
	actionId: string;
}

export enum ActionTrigger {
	action,
}

export enum ActionDescriptor {
	melee,
	impact,
	innate,
	attack,
}

export enum ActionTarget {
	singleEnemy,
	groupEnemy,
	singleAlly,
	groupAlly,
	self,
}

export enum TacticsCondition {
	onChance50,
	vsHighestLife,
}
