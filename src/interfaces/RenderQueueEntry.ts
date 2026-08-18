import { TextBlock } from "@babylonjs/gui";
import { addComponent, addEntity, query, removeEntity, set } from "bitecs";
import FloatingTextComponent from "src/components/FloatingTextComponent";
import { Themes } from "src/gui/Themes";
import {
	getCharacterSpriteComponentArray,
	getFloatingTextComponentArray,
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
	initRenderQueueEntry(renderQueueState: RenderQueueState): Promise<void>;
	tickRenderQueueEntry(
		renderQueueState: RenderQueueState,
		deltaTime: number,
	): void;
	clearRenderQueueState(renderQueueState: RenderQueueState): void;
}

export class RenderQueueEntryMessageDisplay implements RenderQueueEntry {
	public readonly text: string;
	public readonly isBlocking: boolean;
	public readonly duration?: number | undefined;

	public constructor(text: string, isBlocking: boolean, duration?: number) {
		this.text = text;
		this.isBlocking = isBlocking;
		if (duration) {
			this.duration = duration;
		}
	}
	public async initRenderQueueEntry(
		renderQueueState: RenderQueueState,
	): Promise<void> {
		const userInterfaceState = getUserInterfaceState();
		userInterfaceState.combatHud.setMessageDisplay(true, this.text);
	}

	public tickRenderQueueEntry(renderQueueState: RenderQueueState): void {}

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

	public constructor(
		targetEntityIds: number[],
		text: string,
		color: string,
		isBlocking: boolean,
		duration?: number,
	) {
		this.targetEntityIds = targetEntityIds;
		this.text = text;
		this.color = color;
		this.isBlocking = isBlocking;
		if (duration) {
			this.duration = duration;
		}
	}

	public async initRenderQueueEntry(
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
					textSpeed: 0,
					targetEntityId: entityId,
				},
			);
			floatingTextUI.topInPixels = 0;
			floatingTextUI.widthInPixels = 128;
			floatingTextUI.heightInPixels = 128;
			floatingTextUI.color = this.color;
			floatingTextUI.alpha = 1;
			floatingTextUI.linkOffsetYInPixels = 0;
			floatingTextUI.style = Themes.typography.header1;

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

	public tickRenderQueueEntry(
		renderQueueState: RenderQueueState,
		deltaTime: number,
	): void {
		const floatingTextComponentArray = getFloatingTextComponentArray();

		for (const entityId of query(getGameScene().world, [
			floatingTextComponentArray,
		])) {
			const floatingText = floatingTextComponentArray[entityId];

			floatingText.alpha = Math.max(
				floatingText.alpha - floatingText.fadeRate * deltaTime,
				0,
			);

			// floatingText.topInPixels -= floatingText.textSpeed * deltaTime;
		}
	}
	public clearRenderQueueState(renderQueueState: RenderQueueState): void {
		const world = getGameScene().world;
		const userInterfaceState = getUserInterfaceState();
		const floatingTextComponentArray = getFloatingTextComponentArray();

		for (const entityId of renderQueueState.entityIds) {
			const floatingText = floatingTextComponentArray[entityId];
			if (!floatingText) {
				continue;
			}
			userInterfaceState.sceneGUI.removeControl(floatingText);
			floatingText.dispose();
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

	public constructor(
		targetEntityIds: number[],
		vfxUrl: string,
		audioUrl: string,
		isBlocking: boolean,
		duration?: number,
	) {
		this.targetEntityIds = targetEntityIds;
		this.vfxUrl = vfxUrl;
		this.audioUrl = audioUrl;
		this.isBlocking = isBlocking;
		if (duration) {
			this.duration = duration;
		}
	}

	public async initRenderQueueEntry(
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

	public tickRenderQueueEntry(
		renderQueueState: RenderQueueState,
		deltaTime: number,
	): void {}

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
	public async initRenderQueueEntry(
		renderQueueState: RenderQueueState,
	): Promise<void> {}

	public tickRenderQueueEntry(
		renderQueueState: RenderQueueState,
		deltaTime: number,
	): void {}

	public clearRenderQueueState(renderQueueState: RenderQueueState): void {}
}
