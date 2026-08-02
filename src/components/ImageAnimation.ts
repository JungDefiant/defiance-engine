import { Image } from "@babylonjs/gui";
import { Component } from "src/states/registries/ComponentRegistry";

export class ImageAnimation implements Component {
	spriteSheet: Image;
	maximumCells: number;
	timePerCell: number;
	accumulatedTime: number;

	constructor(_spriteSheet: Image, _animProps: SpriteAnimationProps) {
		this.spriteSheet = _spriteSheet;
		this.spriteSheet.cellId = 1;
		this.spriteSheet.cellWidth = _animProps.cellWidth;
		this.spriteSheet.cellHeight = _animProps.cellHeight;
		this.spriteSheet.topInPixels = _animProps.imageTop;
		this.spriteSheet.leftInPixels = _animProps.imageLeft;

		const sourceWidth = this.spriteSheet.domImage.width;
		const sourceHeight = this.spriteSheet.domImage.height;
		const cellWidth = this.spriteSheet.cellWidth;
		const cellHeight = this.spriteSheet.cellHeight;
		this.maximumCells =
			Math.floor(sourceWidth / cellWidth) *
			Math.floor(sourceHeight / cellHeight);
		this.timePerCell = this.maximumCells / _animProps.animationSpeed;
		this.accumulatedTime = 0;
	}
}

export interface SpriteAnimationProps {
	cellWidth: number;
	cellHeight: number;
	imageTop: number;
	imageLeft: number;
	animationSpeed: number;
	loop: boolean;
}
