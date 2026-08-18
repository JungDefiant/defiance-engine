import { addComponent, addEntity, EntityId, set } from "bitecs";
import { Image } from "@babylonjs/gui";
import { getPublicRoot } from "src/modules/Utils";
import {
	ImageAnimationComponent,
	SpriteAnimationProps,
} from "src/components/ImageAnimationComponent";
import { EntityFactory } from "./EntityFactory";
import { getGameScene } from "src/modules/GameStateModule";
import {
	getImageAnimationComponentArray,
	getStickerImageComponentArray,
} from "src/modules/ComponentModule";
import { Nullable } from "@babylonjs/core";

const PRELOAD_STICKERS = ["vfx/vfx_test"];

export class StickerFactory implements EntityFactory {
	private cache: Map<string, any> = new Map();
	private loadPromises: Nullable<Promise<void>> = null;

	public start(campaignId: string) {
		this.loadPromises = this.loadAllStickers(campaignId);
	}

	private async loadAllStickers(campaignId: string): Promise<void> {
		await Promise.all(
			PRELOAD_STICKERS.map(async (fileName) => {
				try {
					const response = await fetch(
						`${getPublicRoot()}/data/${campaignId}/stickers/${fileName}.json`,
					);
					const stickerEntityData = await response.json();
					this.cache.set(fileName, stickerEntityData);
				} catch (error) {
					console.error("Failed to load entity data", fileName);
				}
			}),
		);
	}

	public async createEntityFromFile(fileName: string): Promise<EntityId> {
		if (this.loadPromises) {
			await this.loadPromises;
		}

		if (!this.cache.has(fileName)) {
			return -1;
		}

		const gameScene = getGameScene();
		const newEntity = addEntity(gameScene.world);

		const stickerProps = this.cache.get(fileName);

		const newSticker = this.createStickerImage(stickerProps);
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

	private createStickerImage(props: StickerProps) {
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
	id: string;
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
