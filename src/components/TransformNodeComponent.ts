import { Nullable, Scene, TransformNode } from "@babylonjs/core";
import { Component } from "./Component";

export const COMPONENT_ID_TRANSFORMNODE = "TransformNode";

export default class TransformNodeComponent
	extends TransformNode
	implements Component
{
	constructor(name: string, scene?: Nullable<Scene>, isPure?: boolean) {
		super(name, scene, isPure);
	}

	getValue(): TransformNode {
		return this;
	}

	dispose() {
		this.dispose();
	}
}
