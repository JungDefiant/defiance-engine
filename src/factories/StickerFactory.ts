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
			`${getPublicRoot()}/data/${campaignId}/${fileName}`,
		);
		const rawData = await response.json();
		if (!rawData) {
			return -1;
		}

		const gameState = container.resolve(GameState);
		const newEntity = addEntity(gameState.world);

		const stickerProps = rawData as StickerProps;

		const newSticker = await this.createStickerImage(stickerProps);
		addComponent(
			gameState.world,
			newEntity,
			set(gameState.StickerImage, newSticker),
		);

		if (stickerProps.animation) {
			const newAnim = this.createImageAnimation(newSticker, stickerProps);
			addComponent(
				gameState.world,
				newEntity,
				set(gameState.ImageAnimation, newAnim),
			);
		}

		return newEntity;
	}

	private async createStickerImage(props: StickerProps) {
		const newSticker = new Image(
			"stk_image",
			`${getPublicRoot()}/${props.source}`,
		);
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
		const stickerAnimProps = props.animation;
		if (!stickerAnimProps) {
			return;
		}
		const newAnimProps = {
			cellWidth: stickerAnimProps.cellWidth,
			cellHeight: stickerAnimProps.cellHeight,
			imageTop: props.top,
			imageLeft: props.left,
			animationSpeed: stickerAnimProps.speed || 0,
			loop: stickerAnimProps.loop || false,
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
	sizeRange: number;
	rotationRange: number;
	animation?: {
		cellWidth: number;
		cellHeight: number;
		loop: boolean;
		speed: number;
	};
}
