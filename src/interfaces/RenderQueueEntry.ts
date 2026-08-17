import { TextBlock } from "@babylonjs/gui";
import { addComponent, addEntity, removeEntity, set } from "bitecs";
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

		for (const eid of this.targetEntityIds) {
			const ftEntity = addEntity(gameScene.world);
			renderQueueState.entityIds.push(ftEntity);

			const floatingTextUI = new TextBlock(
				`ui_floatingText_${ftEntity}`,
				this.text,
			);
			floatingTextUI.widthInPixels = 128;
			floatingTextUI.heightInPixels = 128;
			floatingTextUI.color = this.color;
			floatingTextUI.alpha = 1;
			floatingTextUI.linkOffsetYInPixels = 0;
			floatingTextUI.style = Themes.typography.header1;
			floatingTextUI._customData = { targetEid: eid };

			if (gameplayState.playerEIDs.includes(eid)) {
				const playerGUI = playerGuiComponentArray[eid];
				playerGUI.getRoot().addControl(floatingTextUI);
			} else {
				const targetSprite = characterSpriteComponentArray[eid];
				userInterfaceState.sceneGUI.addControl(floatingTextUI);
				floatingTextUI.linkWithMesh(targetSprite.getValue());
			}

			addComponent(
				gameScene.world,
				ftEntity,
				set(floatingTextComponentArray, floatingTextUI),
			);
		}
	}

	public tickRenderQueueEntry(
		renderQueueState: RenderQueueState,
		deltaTime: number,
	): void {
		const gameplayState = getGameplayState();
		const floatingTextComponentArray = getFloatingTextComponentArray();

		for (const eid of renderQueueState.entityIds) {
			const floatingText = floatingTextComponentArray[eid];

			floatingText.alpha = Math.max(
				floatingText.alpha - 1 * deltaTime,
				0,
			);

			let targetEid = floatingText._customData["targetEid"] as number;

			if (targetEid && gameplayState.playerEIDs.includes(targetEid)) {
				floatingText.topInPixels =
					floatingText.topInPixels - 20 * deltaTime;
			} else {
				floatingText.linkOffsetYInPixels =
					floatingText.linkOffsetYInPixels - 20 * deltaTime;
			}
		}
	}
	public clearRenderQueueState(renderQueueState: RenderQueueState): void {
		const world = getGameScene().world;
		const userInterfaceState = getUserInterfaceState();
		const floatingTextComponentArray = getFloatingTextComponentArray();

		for (const eid of renderQueueState.entityIds) {
			const ft = floatingTextComponentArray[eid];
			if (!ft) {
				continue;
			}
			userInterfaceState.sceneGUI.removeControl(ft);
			ft.dispose();
			removeEntity(world, eid);
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
		const stickerImageComponentArray = getStickerImageComponentArray();

		for (const eid of this.targetEntityIds) {
			const entityId = await stickerFactory.createEntityFromFile(
				this.vfxUrl,
			);
			const specialFxStickerImage = stickerImageComponentArray[entityId];
			renderQueueState.entityIds.push(entityId);
			if (gameplayState.playerEIDs.includes(eid)) {
				const playerGUI = playerGuiComponentArray[eid];
				playerGUI.getRoot().addControl(specialFxStickerImage);
			} else {
				const targetSprite = characterSpriteComponentArray[eid];
				userInterfaceState.sceneGUI.addControl(specialFxStickerImage);
				specialFxStickerImage.linkWithMesh(targetSprite.getValue());
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

		for (const eid of renderQueueState.entityIds) {
			Promise.resolve(stickerImageComponentArray[eid]).then(
				(specialFxStickerImage) => {
					if (specialFxStickerImage) {
						specialFxStickerImage.dispose();
					}
					removeEntity(world, eid);
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
