import { AbilityDescriptor } from "./AbilityTypes";

export interface AttributeSet {
	[index: string]: ActorAttribute;
}

export interface ActorAttribute {
	baseValue: number;
	currentValue: number;
	maximumValue: number;
	modifiers: ActorAttributeModifier[];
}

export interface ActorAttributeModifier {
	descriptors: AbilityDescriptor[];
	amount: number;
}

export interface AffinityData {
	baseAttributes: ActorAttribute[];
}
