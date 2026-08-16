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

export class StickerFactory implements EntityFactory {
	private cachedProps: Map<string, StickerProps> = new Map<
		string,
		StickerProps
	>();

	public start(): void {}

	public async createEntityFromFile(
		fileName: string,
		campaignId: string,
	): Promise<EntityId> {
		console.log("CACHED PROPS", this.cachedProps);
		let stickerProps = this.cachedProps.get(fileName);
		console.log("CACHED STICKER PROP", stickerProps);

		if (!stickerProps) {
			console.log("GET STICKER PROPS");
			const response = await fetch(
				`${getPublicRoot()}/data/${campaignId}/${fileName}`,
			);
			const rawData = await response.json();
			if (!rawData) {
				return -1;
			}

			stickerProps = rawData as StickerProps;
			this.cachedProps.set(fileName, rawData);
		}

		const gameScene = getGameScene();
		const newEntity = addEntity(gameScene.world);

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
