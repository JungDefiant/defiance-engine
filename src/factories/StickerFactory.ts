import { container } from "tsyringe";
import { addComponent, addEntity, EntityId, set } from "bitecs";
import { Image } from "@babylonjs/gui";
import { getPublicRoot } from "src/modules/Utils";
import {
	ImageAnimationComponent,
	SpriteAnimationProps,
} from "src/components/ImageAnimationComponent";
import StickerImageComponent, {
	COMPONENT_ID_STICKERIMAGE,
} from "src/components/StickerImageComponent";
import { EntityFactory } from "./EntityFactory";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import { getGameScene } from "src/modules/GameStateModule";
import {
	getImageAnimationComponentArray,
	getStickerImageComponentArray,
} from "src/modules/ComponentModule";

export const FACTORY_ID_STICKER = "StickerFactory";

export class StickerFactory implements EntityFactory {
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

		const gameScene = getGameScene();
		const newEntity = addEntity(gameScene.world);
		const stickerProps = rawData as StickerProps;

		const newSticker = await this.createStickerImage(stickerProps);
		addComponent(
			gameScene.world,
			newEntity,
			set(getStickerImageComponentArray(), newSticker),
		);

		if (stickerProps.animation) {
			const newAnim = this.createImageAnimation(newSticker, stickerProps);
			addComponent(
				gameScene.world,
				newEntity,
				set(getImageAnimationComponentArray(), newAnim),
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

		const newAnim = new ImageAnimationComponent(spriteSheet, newAnimProps);
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
