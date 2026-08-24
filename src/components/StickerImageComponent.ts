import { Nullable } from "@babylonjs/core";
import { Image } from "@babylonjs/gui";
import { Component } from "./Component";

export const COMPONENT_ID_STICKERIMAGE = "StickerImage";

export default class StickerImageComponent extends Image implements Component {
	constructor(name: string, url?: Nullable<string>) {
		super(name, url);
	}

	public getValue(): Image {
		return this;
	}

	public dispose(): void {
		this.dispose();
	}
}
