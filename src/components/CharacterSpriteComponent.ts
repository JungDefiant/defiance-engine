import { Mesh } from "@babylonjs/core";
import { Component } from "./Component";

export default class CharacterSpriteComponent implements Component {
	private _characterId: string;
	private _sprite: Mesh;

	constructor(sprite: Mesh, characterId: string) {
		this._characterId = characterId;
		this._sprite = sprite;
	}

	public getCharacterId(): string {
		return this._characterId;
	}

	public getValue(): Mesh {
		return this._sprite;
	}

	public dispose(): void {
		this._sprite.dispose();
	}
}
