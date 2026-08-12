import { Mesh, MeshCreationOptions, Nullable, Scene } from "@babylonjs/core";
import { Component } from "./Component";

export default class CharacterSpriteComponent
	extends Mesh
	implements Component
{
	constructor(
		name: string,
		scene?: Nullable<Scene>,
		options?: MeshCreationOptions,
	) {
		super(name, scene, options);
	}

	public getValue(): Mesh {
		return this;
	}
}
