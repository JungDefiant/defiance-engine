import { TextBlock } from "@babylonjs/gui";
import { addComponent, addEntity, removeEntity, set } from "bitecs";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";
import FloatingTextComponent from "src/components/FloatingTextComponent";
import PlayerGUIComponent from "src/components/PlayerGUIComponent";
import StickerImageComponent from "src/components/StickerImageComponent";
import { StickerFactory } from "src/factories/StickerFactory";
import { Themes } from "src/gui/Themes";
import { FactoryRegistry } from "src/registries/FactoryRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import CampaignState from "src/states/CampaignState";
import GameplayState from "src/states/GameplayState";
import SceneState from "src/states/SceneState";
import UserInterfaceState from "src/states/UserInterfaceState";
import { container } from "tsyringe";

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
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const userInterfaceState =
			gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);
		userInterfaceState.combatHud.setMessageDisplay(true, this.text);
	}

	public tickRenderQueueEntry(renderQueueState: RenderQueueState): void {}

	public clearRenderQueueState(renderQueueState: RenderQueueState): void {
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const userInterfaceState =
			gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);
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
		const gameStateRegistry = container.resolve(GameStateRegistry);

		const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
			SceneState.toString(),
		);
		const gameplayState =
			gameStateRegistry.getGameStateByStateId<GameplayState>(
				GameplayState.toString(),
			);
		const userInterfaceState =
			gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);
		const playerGuiComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<PlayerGUIComponent>(
				PlayerGUIComponent.toString(),
			);
		const characterSpriteComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<CharacterSpriteComponent>(
				CharacterSpriteComponent.toString(),
			);
		const floatingTextComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<FloatingTextComponent>(
				FloatingTextComponent.toString(),
			);

		for (const eid of this.targetEntityIds) {
			const ftEntity = addEntity(sceneState.world);
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
				floatingTextUI.linkWithMesh(targetSprite);
			}

			addComponent(
				sceneState.world,
				ftEntity,
				set(floatingTextComponentArray, floatingTextUI),
			);
		}
	}

	public tickRenderQueueEntry(
		renderQueueState: RenderQueueState,
		deltaTime: number,
	): void {
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
			SceneState.toString(),
		);
		const gameplayState =
			gameStateRegistry.getGameStateByStateId<GameplayState>(
				GameplayState.toString(),
			);
		const floatingTextComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<FloatingTextComponent>(
				FloatingTextComponent.toString(),
			);

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
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
			SceneState.toString(),
		);
		const userInterfaceState =
			gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);
		const floatingTextComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<FloatingTextComponent>(
				FloatingTextComponent.toString(),
			);

		for (const eid of renderQueueState.entityIds) {
			const ft = floatingTextComponentArray[eid];
			if (!ft) {
				continue;
			}
			userInterfaceState.sceneGUI.removeControl(ft);
			ft.dispose();
			removeEntity(sceneState.world, eid);
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
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const factoryRegistry = container.resolve(FactoryRegistry);

		const stickerFactory =
			factoryRegistry.getEntityFactoryByFactoryId<StickerFactory>(
				StickerFactory.toString(),
			);
		const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
			SceneState.toString(),
		);
		const gameplayState =
			gameStateRegistry.getGameStateByStateId<GameplayState>(
				GameplayState.toString(),
			);
		const campaignState =
			gameStateRegistry.getGameStateByStateId<CampaignState>(
				CampaignState.toString(),
			);
		const userInterfaceState =
			gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);
		const playerGuiComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<PlayerGUIComponent>(
				PlayerGUIComponent.toString(),
			);
		const characterSpriteComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<CharacterSpriteComponent>(
				CharacterSpriteComponent.toString(),
			);
		const stickerImageComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<StickerImageComponent>(
				StickerImageComponent.toString(),
			);

		for (const eid of this.targetEntityIds) {
			stickerFactory
				.createEntityFromFile(this.vfxUrl, campaignState.campaignId)
				.then((entityId) => {
					renderQueueState.entityIds.push(entityId);

					Promise.resolve(stickerImageComponentArray[entityId]).then(
						(specialFxStickerImage) => {
							if (gameplayState.playerEIDs.includes(eid)) {
								const playerGUI = playerGuiComponentArray[eid];
								playerGUI
									.getRoot()
									.addControl(specialFxStickerImage);
							} else {
								const targetSprite =
									characterSpriteComponentArray[eid];
								userInterfaceState.sceneGUI.addControl(
									specialFxStickerImage,
								);
								specialFxStickerImage.linkWithMesh(
									targetSprite,
								);
							}
						},
					);
				});
		}
	}

	public tickRenderQueueEntry(
		renderQueueState: RenderQueueState,
		deltaTime: number,
	): void {}

	public clearRenderQueueState(renderQueueState: RenderQueueState): void {
		const gameStateRegistry = container.resolve(GameStateRegistry);

		const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
			SceneState.toString(),
		);
		const stickerImageComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<StickerImageComponent>(
				StickerImageComponent.toString(),
			);

		for (const eid of renderQueueState.entityIds) {
			Promise.resolve(stickerImageComponentArray[eid]).then(
				(specialFxStickerImage) => {
					if (specialFxStickerImage) {
						specialFxStickerImage.dispose();
					}
					removeEntity(sceneState.world, eid);
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
