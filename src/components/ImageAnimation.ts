import { Image } from "@babylonjs/gui";

export class ImageAnimation {
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

		const sourceWidth = this.spriteSheet.sourceWidth;
		const cellWidth = this.spriteSheet.cellWidth;
		this.maximumCells = Math.floor(sourceWidth / cellWidth);
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
}
