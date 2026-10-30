import ActorStateComponent from "src/components/ActorStateComponent";
import { AbilityContext } from "./ContextTypes";
import { TargetingShapeData } from "./CollisionTypes";

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

export interface EffectFunctionProps {
	source: ActorStateComponent;
	target: ActorStateComponent;
	abilityContext: AbilityContext;
	abilityTargetIndex: number;
}

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
	targetingShape?: TargetingShapeData;
}

export interface EffectData {
	id: string;
	variables: {
		[index: string]: EffectVariable;
	};
}

export enum ActionSlotKey {
	weapon = "weapon",
	power = "power",
	accessory = "accessory",
	item = "item",
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
	power = "power",
	feat = "feat",
	basic = "basic",
	single = "single",
	group = "group",
	direct = "direct",
	ranged = "ranged",
	melee = "melee",
	impact = "impact",
	lethal = "lethal",
	burn = "burn",
	toxic = "toxic",
	psychic = "psychic",
	innate = "innate",
	weapon = "weapon",
	device = "device",
	mutant = "mutant",
	soldier = "soldier",
	mystic = "mystic",
	cyborg = "cyborg",
	attack = "attack",
	action = "action",
	toggle = "toggle",
}

export enum AbilityTarget {
	self = "self",
	enemy = "enemy",
	ally = "ally",
}
