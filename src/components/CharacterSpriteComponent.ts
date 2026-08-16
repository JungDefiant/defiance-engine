import { Mesh } from "@babylonjs/core";
import { Component } from "./Component";

export default class CharacterSpriteComponent implements Component {
	private _sprite: Mesh;

	constructor(sprite: Mesh) {
		this._sprite = sprite;
	}

	public getValue(): Mesh {
		return this._sprite;
	}

	public dispose(): void {
		this._sprite.dispose();
	}
}
