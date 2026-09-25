import { TextBlock } from "@babylonjs/gui";
import { addComponent, addEntity, query, removeEntity, set } from "bitecs";
import FloatingTextComponent from "src/components/FloatingTextComponent";
import { easeInExpo, easeOutExpo } from "src/constants/Utilities";
import { Themes } from "src/gui/Themes";
import {
	getCharacterSpriteComponentArray,
	getFloatingTextComponentArray,
	getImageAnimationComponentArray,
	getPlayerGuiComponentArray,
	getStickerImageComponentArray,
} from "src/modules/ComponentModule";
import { getStickerFactory } from "src/modules/FactoryModule";
import {
	getGameplayState,
	getGameScene,
	getUserInterfaceState,
} from "src/modules/GameStateModule";

export class RenderQueueState {
	public readonly renderQueueEntry: RenderQueueEntry;
	public timeAccumulated: number;
	public entityIds: number[] = [];
	public init: boolean = false;

	public constructor(renderQueueEntry: RenderQueueEntry) {
		this.renderQueueEntry = renderQueueEntry;
		this.timeAccumulated = 0;
	}
}

export interface RenderQueueEntry {
	readonly isBlocking: boolean;
	readonly duration?: number;
	readonly delay?: number;
	initRenderQueueState(renderQueueState: RenderQueueState): Promise<void>;
	tickRenderQueueState(
		renderQueueState: RenderQueueState,
		deltaTime: number,
	): void;
	clearRenderQueueState(renderQueueState: RenderQueueState): void;
}

export class RenderQueueEntryMessageDisplay implements RenderQueueEntry {
	public readonly text: string;
	public readonly isBlocking: boolean;
	public readonly duration?: number | undefined;
	public readonly delay?: number | undefined;

	public constructor(
		text: string,
		isBlocking: boolean,
		duration?: number,
		delay?: number,
	) {
		this.text = text;
		this.isBlocking = isBlocking;
		if (duration) {
			this.duration = duration;
		}
		if (delay) {
			this.delay = delay;
		}
	}
	public async initRenderQueueState(
		renderQueueState: RenderQueueState,
	): Promise<void> {
		const userInterfaceState = getUserInterfaceState();
		userInterfaceState.combatHud.setMessageDisplay(true, this.text);
	}

	public tickRenderQueueState(renderQueueState: RenderQueueState): void {}

	public clearRenderQueueState(renderQueueState: RenderQueueState): void {
		const userInterfaceState = getUserInterfaceState();
		userInterfaceState.combatHud.setMessageDisplay(false);
	}
}

export class RenderQueueEntryFloatingText implements RenderQueueEntry {
	public readonly targetEntityIds: number[];
	public readonly text: string;
	public readonly color: string;
	public readonly isBlocking: boolean;
	public readonly duration?: number | undefined;
	public readonly delay?: number | undefined;

	public constructor(
		targetEntityIds: number[],
		text: string,
		color: string,
		isBlocking: boolean,
		duration?: number,
		delay?: number,
	) {
		this.targetEntityIds = targetEntityIds;
		this.text = text;
		this.color = color;
		this.isBlocking = isBlocking;
		if (duration) {
			this.duration = duration;
		}
		if (delay) {
			this.delay = delay;
		}
	}

	public async initRenderQueueState(
		renderQueueState: RenderQueueState,
	): Promise<void> {
		const gameScene = getGameScene();
		const gameplayState = getGameplayState();
		const userInterfaceState = getUserInterfaceState();
		const playerGuiComponentArray = getPlayerGuiComponentArray();
		const characterSpriteComponentArray =
			getCharacterSpriteComponentArray();
		const floatingTextComponentArray = getFloatingTextComponentArray();

		for (const entityId of this.targetEntityIds) {
			const floatingTextEntityId = addEntity(gameScene.world);
			renderQueueState.entityIds.push(floatingTextEntityId);

			const floatingTextUI = new FloatingTextComponent(
				`ui_floatingText_${floatingTextEntityId}`,
				this.text,
				{
					fadeRate: 1,
					fadeCurve: 0,
					targetEntityId: entityId,
				},
			);
			floatingTextUI.widthInPixels = 400;
			floatingTextUI.heightInPixels = 128;
			floatingTextUI.color = this.color;
			floatingTextUI.alpha = 1;
			floatingTextUI.topInPixels = 0;
			floatingTextUI.linkOffsetYInPixels = 0;
			floatingTextUI.style = Themes.typography.header1;
			floatingTextUI.shadowOffsetY = 2;
			floatingTextUI.shadowBlur = 4;
			floatingTextUI.shadowColor = Themes.primary3;
			floatingTextUI.isVisible = false;

			if (gameplayState.playerEntityIds.includes(entityId)) {
				const playerGUI = playerGuiComponentArray[entityId];
				playerGUI.getRoot().addControl(floatingTextUI);
			} else {
				const targetSprite = characterSpriteComponentArray[entityId];
				userInterfaceState.sceneGUI.addControl(floatingTextUI);
				floatingTextUI.linkWithMesh(targetSprite.getValue());
			}

			addComponent(
				gameScene.world,
				floatingTextEntityId,
				set(floatingTextComponentArray, floatingTextUI),
			);
		}
	}

	public tickRenderQueueState(
		renderQueueState: RenderQueueState,
		deltaTime: number,
	): void {
		const floatingTextComponentArray = getFloatingTextComponentArray();

		for (const entityId of renderQueueState.entityIds) {
			const floatingText = floatingTextComponentArray[entityId];
			if (!floatingText) {
				continue;
			}
			const timeAccumulated = renderQueueState.timeAccumulated;
			const duration = this.duration || 0;
			const delay = this.delay || 0;
			if (timeAccumulated > delay) {
				floatingText.isVisible = true;
			} else if (timeAccumulated >= duration + delay) {
				continue;
			} else {
				floatingText.isVisible = false;
			}
			const adjustedTimeAccumulated = timeAccumulated - delay;
			const normalizedLifetime =
				Math.max(adjustedTimeAccumulated, 0) /
				(duration > 0 ? duration : adjustedTimeAccumulated);

			const easingFactor = easeInExpo(normalizedLifetime);
			const newAlpha = Math.max(
				floatingText.alpha - floatingText.fadeRate * easingFactor,
				0,
			);
			floatingText.alpha = newAlpha;
		}
	}

	public clearRenderQueueState(renderQueueState: RenderQueueState): void {
		const world = getGameScene().world;
		const floatingTextComponentArray = getFloatingTextComponentArray();
		const entitiesToRemove = [];

		for (const entityId of renderQueueState.entityIds) {
			const floatingText = floatingTextComponentArray[entityId];
			if (!floatingText) {
				continue;
			}
			entitiesToRemove.push(entityId);
		}

		for (const entityId of entitiesToRemove) {
			removeEntity(world, entityId);
		}
	}
}

export class RenderQueueEntrySpecialFX implements RenderQueueEntry {
	public readonly targetEntityIds: number[];
	public readonly vfxUrl: string;
	public readonly audioUrl: string;
	public readonly isBlocking: boolean;
	public readonly duration?: number | undefined;
	public readonly delay?: number | undefined;

	public currentLifetime: number = 0;

	public constructor(
		targetEntityIds: number[],
		vfxUrl: string,
		audioUrl: string,
		isBlocking: boolean,
		duration?: number,
		delay?: number,
	) {
		this.targetEntityIds = targetEntityIds;
		this.vfxUrl = vfxUrl;
		this.audioUrl = audioUrl;
		this.isBlocking = isBlocking;
		if (duration) {
			this.duration = duration;
		}
		if (delay) {
			this.delay = delay;
		}
	}

	public async initRenderQueueState(
		renderQueueState: RenderQueueState,
	): Promise<void> {
		const stickerFactory = getStickerFactory();
		const gameplayState = getGameplayState();
		const userInterfaceState = getUserInterfaceState();
		const playerGuiComponentArray = getPlayerGuiComponentArray();
		const characterSpriteComponentArray =
			getCharacterSpriteComponentArray();

		for (const targetEntityId of this.targetEntityIds) {
			const stickerImageEntityId =
				await stickerFactory.createEntityFromFile(this.vfxUrl);
			renderQueueState.entityIds.push(stickerImageEntityId);

			const stickerImage =
				getStickerImageComponentArray()[stickerImageEntityId];

			const imageAnimation =
				getImageAnimationComponentArray()[stickerImageEntityId];
			if (imageAnimation) {
				imageAnimation.isActive = false;
			}

			if (gameplayState.playerEntityIds.includes(targetEntityId)) {
				const playerGUI = playerGuiComponentArray[targetEntityId];
				playerGUI.getRoot().addControl(stickerImage);
			} else {
				const targetSprite =
					characterSpriteComponentArray[targetEntityId];
				userInterfaceState.sceneGUI.addControl(stickerImage);
				stickerImage.linkWithMesh(targetSprite.getValue());
			}
		}
	}

	public tickRenderQueueState(
		renderQueueState: RenderQueueState,
		deltaTime: number,
	): void {
		for (const entityId of renderQueueState.entityIds) {
			const stickerImage = getStickerImageComponentArray()[entityId];
			this.currentLifetime += deltaTime;
			const delay = this.delay || 0;
			if (this.currentLifetime > delay) {
				stickerImage.isVisible = false;

				const imageAnimation =
					getImageAnimationComponentArray()[entityId];
				if (imageAnimation) {
					imageAnimation.isActive = false;
				}
			} else {
				stickerImage.isVisible = true;

				const imageAnimation =
					getImageAnimationComponentArray()[entityId];
				if (imageAnimation) {
					imageAnimation.isActive = true;
				}

				continue;
			}
		}
	}

	public clearRenderQueueState(renderQueueState: RenderQueueState): void {
		const world = getGameScene().world;
		const stickerImageComponentArray = getStickerImageComponentArray();

		for (const entityId of renderQueueState.entityIds) {
			Promise.resolve(stickerImageComponentArray[entityId]).then(
				(specialFxStickerImage) => {
					if (specialFxStickerImage) {
						specialFxStickerImage.dispose();
					}
					removeEntity(world, entityId);
				},
			);
		}
	}
}

export class RenderQueueEntryWaitUntilDone implements RenderQueueEntry {
	public readonly isBlocking: boolean;
	public readonly duration?: number | undefined;

	public constructor(isBlocking: boolean, duration?: number) {
		this.isBlocking = isBlocking;
		if (duration) {
			this.duration = duration;
		}
	}
	public async initRenderQueueState(
		renderQueueState: RenderQueueState,
	): Promise<void> {}

	public tickRenderQueueState(
		renderQueueState: RenderQueueState,
		deltaTime: number,
	): void {}

	public clearRenderQueueState(renderQueueState: RenderQueueState): void {}
}
