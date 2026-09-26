import { Image } from "@babylonjs/gui";
import { Component } from "./Component";

export class ImageAnimationComponent implements Component {
	spriteSheet: Image;
	maximumCells: number = 0;
	timePerCell: number = 0;
	animationSpeed: number = 0;
	accumulatedTime: number = 0;
	isActive: boolean = false;

	constructor(_spriteSheet: Image, _animProps: SpriteAnimationProps) {
		this.spriteSheet = _spriteSheet;
		this.spriteSheet.cellId = 1;
		this.spriteSheet.cellWidth = _animProps.cellWidth;
		this.spriteSheet.cellHeight = _animProps.cellHeight;
		this.spriteSheet.topInPixels = _animProps.imageTop;
		this.spriteSheet.leftInPixels = _animProps.imageLeft;

		this.accumulatedTime = 0;
		this.animationSpeed = _animProps.animationSpeed;
		this.isActive = _animProps.isActive;

		this.resetCellProperties();
	}

	public resetCellProperties() {
		const sourceWidth = this.spriteSheet.domImage.naturalWidth;
		const sourceHeight = this.spriteSheet.domImage.naturalHeight;
		const cellWidth = this.spriteSheet.cellWidth;
		const cellHeight = this.spriteSheet.cellHeight;
		this.maximumCells =
			Math.floor(sourceWidth / cellWidth) *
			Math.floor(sourceHeight / cellHeight);
		this.timePerCell = this.maximumCells / this.animationSpeed;
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
	isActive: boolean;
}
