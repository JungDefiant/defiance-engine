import { Control, TextBlock } from "@babylonjs/gui";
import { Component } from "./Component";
import { EntityId } from "bitecs";

export default class FloatingTextComponent
	extends TextBlock
	implements Component
{
	public fadeRate: number;
	public fadeCurve: number;
	public targetEntityId: EntityId;

	constructor(
		name: string,
		text: string,
		props?: FloatingTextComponentProps,
	) {
		super(name, text);
		this.fadeRate = props?.fadeRate || 1;
		this.fadeCurve = props?.textSpeed || 1;
		this.targetEntityId = props?.targetEntityId || -1;
		this.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
	}

	public getValue(): TextBlock {
		return this;
	}
}

export interface FloatingTextComponentProps {
	fadeRate: number;
	textSpeed: number;
	targetEntityId: EntityId;
}
