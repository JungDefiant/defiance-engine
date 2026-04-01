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

	public constructor(initData: any) {
		this.id = initData.id;
		this.name = initData.name;
		this.backstory = initData.backstory;
		this.description = initData.description;
		this.spriteUrl = initData.spriteUrl;
		this.attributes = {
			life: {
				baseValue: initData.attributes.life,
			} as ActorAttribute,
			will: {
				baseValue: initData.attributes.life,
			} as ActorAttribute,
			speed: {
				baseValue: initData.attributes.life,
			} as ActorAttribute,
			defense: {
				baseValue: initData.attributes.life,
			} as ActorAttribute,
			critical: {
				baseValue: initData.attributes.life,
			} as ActorAttribute,
			regen: {
				baseValue: initData.attributes.life,
			} as ActorAttribute,
		};
		// newActorData.affinityData = this.affinityData.get(initData.affinityId);
		// newActorData.abilityData = initData.abilityIds.map((el: string) => {
		// 	return this.actionData.get(el);
		// });
		// newActorData.itemData = initData.itemIds.map((el: string) => {
		// 	return this.actionData.get(el);
		// });
		this.tactics = initData.tactics;
	}
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
