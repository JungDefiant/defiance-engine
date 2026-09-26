export type AbilityEffectType =
	| "damage"
	| "healing"
	| "status"
	| "attributeModifier"
	| "modifyContextVariable";

export type EffectVariable =
	| string
	| number
	| boolean
	| string[]
	| number[]
	| EffectData[];

export interface AbilityData {
	id: string;
	name: string;
	description: string;
	trigger: AbilityTrigger;
	descriptors: AbilityDescriptor[];
	target: AbilityTarget;
	effectData: EffectData[];
	recoveryTime?: number;
	cost?: number;
	costAttribute?: string;
	itemId?: string;
	iconURL?: string;
	castVfxURL?: string;
	hitVfxURL?: string;
	castSfxURL?: string;
	hitSfxURL?: string;
}

export interface EffectData {
	id: string;
	variables: {
		[index: string]: EffectVariable;
	};
}

export enum AbilityTrigger {
	alwaysActive = "alwaysActive",
	onActionPerform = "onActionPerform",
	onActorResistEffect = "onActorResistEffect",
	onActorInflictDamage = "onActorInflictDamage",
	onActorGrantHealing = "onActorGrantHealing",
	onActorLifeModify = "onActorLifeModify",
	onActorDefeat = "onActorDefeated",
	onActorAttackGraze = "onActorAttackGraze",
	onActorAttackHit = "onActorAttackHit",
	onActorAttackCrit = "onActorAttackCrit",
}

export enum AbilityDescriptor {
	// Type
	power = "power",
	feat = "feat",
	basic = "basic",
	// Target
	single = "single",
	group = "group",
	// Range
	direct = "direct",
	ranged = "ranged",
	melee = "melee",
	// Type
	impact = "impact",
	lethal = "lethal",
	burn = "burn",
	toxic = "toxic",
	psychic = "psychic",
	// Type
	innate = "innate",
	weapon = "weapon",
	device = "device",
	mutation = "mutation",
	technique = "technique",
	invocation = "invocation",
	cybernetic = "cybernetic",
	// Form
	attack = "attack",
	action = "action",
	toggle = "toggle",
}

export enum AbilityTarget {
	self = "self",
	singleEnemy = "single_en",
	groupEnemy = "group_en",
	singleAlly = "single_al",
	groupAlly = "group_en",
}
