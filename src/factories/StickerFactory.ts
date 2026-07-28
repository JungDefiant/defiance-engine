import { container, singleton } from "tsyringe";
import { addComponent, addEntity, EntityId, set } from "bitecs";
import { Image } from "@babylonjs/gui";
import { getPublicRoot } from "src/helpers/Utils";
import GameState from "src/states/GameState";
import { IFactory } from "./IFactory";
import {
	ImageAnimation,
	SpriteAnimationProps,
} from "src/components/ImageAnimation";

@singleton()
export class StickerFactory implements IFactory {
	public start(): void {}

	public async createEntityFromFile(
		fileName: string,
		campaignId: string,
	): Promise<EntityId> {
		const response = await fetch(
			`${getPublicRoot()}/data/${campaignId}/stickers/${fileName}.json`,
		);
		const rawData = await response.json();
		if (!rawData) {
			return -1;
		}

		const gameState = container.resolve(GameState);
		const newEntity = addEntity(gameState.world);

		const stickerProps = rawData as StickerProps;

		const imageProperties = rawData as StickerProps;
		const newSticker = await this.createStickerImage(imageProperties);
		addComponent(gameState.world, newEntity, set(gameState, newSticker));

		if (imageProperties.isAnimated) {
			const newAnim = this.createImageAnimation(newSticker, stickerProps);
			addComponent(gameState.world, newEntity, set(gameState, newAnim));
		}

		return newEntity;
	}

	private async createStickerImage(props: StickerProps) {
		const newSticker = new Image();
		newSticker.source = props.source;
		newSticker.widthInPixels = props.width;
		newSticker.heightInPixels = props.height;
		newSticker.topInPixels = props.top;
		newSticker.leftInPixels = props.left;

		return newSticker;
	}

	private async createImageAnimation(
		spriteSheet: Image,
		props: StickerProps,
	) {
		const newAnimProps = {
			cellWidth: props.width,
			cellHeight: props.height,
			imageTop: props.top,
			imageLeft: props.left,
		} as SpriteAnimationProps;
		const newAnim = new ImageAnimation(spriteSheet, newAnimProps);
		return newAnim;
	}
}

interface StickerProps {
	source: string;
	width: number;
	height: number;
	top: number;
	left: number;
	sizeRange: 0;
	rotationRange: 0;
	isAnimated: false;
}
