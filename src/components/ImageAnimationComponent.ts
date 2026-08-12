import { Image } from "@babylonjs/gui";
import { Component } from "./Component";

export class ImageAnimationComponent implements Component {
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

	public getValue(): ImageAnimationComponent {
		return this;
	}

	public dispose(): void {
		this.spriteSheet.dispose();
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
