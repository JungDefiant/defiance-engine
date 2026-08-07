import { Nullable, Scene, TransformNode } from "@babylonjs/core";
import { Component } from "src/registries/ComponentRegistry";

export const COMPONENT_ID_TRANSFORMNODE = "TransformNode";

export class TransformNodeComponent extends TransformNode implements Component {
	constructor(name: string, scene?: Nullable<Scene>, isPure?: boolean) {
		super(name, scene, isPure);
	}

	getValue(): TransformNode {
		return this;
	}
}
