import { TextBlock } from "@babylonjs/gui";
import { Component } from "src/states/registries/ComponentRegistry";

export const COMPONENT_ID_FLOATINGTEXT = "FloatingText";

export class FloatingTextComponent extends TextBlock implements Component {
	constructor(name: string, text: string) {
		super(name, text);
	}

	public getValue(): TextBlock {
		return this;
	}
}
