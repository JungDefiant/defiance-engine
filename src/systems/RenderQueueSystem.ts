import { container, inject } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
import { Queue } from "queue-typescript";
import { TextBlock } from "@babylonjs/gui";
import { addComponent, addEntity, removeEntity, set } from "bitecs";
import { PAUSE_RENDERQUEUE } from "src/constants/GeneralConstants";
import { Themes } from "src/gui/Themes";
import { StickerFactory } from "src/factories/StickerFactory";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import { SystemRegistry } from "src/registries/SystemRegistry";

export default class RenderQueueSystem implements GameSystem {
	private currentRenderQueue: Queue<RenderQueueEntry> =
		new Queue<RenderQueueEntry>();
	private renderQueueStates: RenderQueueState[] = [];
	private isStarted: boolean = false;

	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
		@inject(GameStateRegistry) private gameStateRegistry: GameStateRegistry,
	) {}

	public async start(): Promise<void> {}

	public update(deltaTime: number): void {
		if (!this.isStarted) {
			return;
		}

		if (gameState && gameState.renderPauseSet.size > 0) {
			return;
		}

		if (
			(this.renderQueueStates.length === 0 ||
				!this.renderQueueStates[this.renderQueueStates.length - 1].rqe
					.isBlocking) &&
			this.currentRenderQueue.length !== 0
		) {
			const nextRqe = this.currentRenderQueue.dequeue();
			this.renderQueueStates.push(new RenderQueueState(nextRqe));
		}

		for (let rqeState of this.renderQueueStates) {
			this.processRenderQueueState(deltaTime, rqeState);
		}

		if (this.renderQueueStates.length === 0) {
			const gameState = container.resolve(GameState);
			if (gameState && gameState.actionPauseSet.has(PAUSE_RENDERQUEUE)) {
				gameState.actionPauseSet.delete(PAUSE_RENDERQUEUE);
			}
			this.isStarted = false;
		}
	}

	public startRenderQueue(): void {
		if (!this.isStarted) {
			this.isStarted = true;
		}
	}

	public addRenderQueueEntry(rqe: RenderQueueEntry): void {
		if (this.isStarted) {
			console.warn("Cannot add new RQE while render queue is started.");
			return;
		}
		this.currentRenderQueue.enqueue(rqe);
	}

	private processRenderQueueState(
		deltaTime: number,
		rqeState: RenderQueueState,
	): void {
		if (rqeState.rqe.duration) {
			if (!rqeState.init) {
				this.initRenderQueueEntry(rqeState);
			}

			this.tickRenderQueueEntry(rqeState, deltaTime);

			rqeState.timeAccumulated += deltaTime;

			if (rqeState.timeAccumulated >= rqeState.rqe.duration) {
				rqeState.timeAccumulated = rqeState.rqe.duration;
				this.clearRenderQueueState(rqeState);
				this.renderQueueStates = this.renderQueueStates.filter(
					(x) => x !== rqeState,
				);
			}
		} else {
			if (!rqeState.init) {
				this.initRenderQueueEntry(rqeState);
			}
		}
	}

	private async initRenderQueueEntry(
		rqeState: RenderQueueState,
	): Promise<void> {
		const gameState = container.resolve(GameState);
		switch (rqeState.rqe.type) {
			case RenderQueueType.MessageDisplay:
				const msgText = rqeState.rqe.vars["text"] as string;
				if (!msgText) {
					return;
				}

				gameState.combatHud.setMessageDisplay(true, msgText);

				rqeState.init = true;
				return;
			case RenderQueueType.FloatingText:
				const ftText = rqeState.rqe.vars["text"] as string;
				const ftColor = rqeState.rqe.vars["color"] as string;
				const ftTargetEids = rqeState.rqe.vars["targets"] as number[];
				if (!ftTargetEids || !ftText || !ftColor) {
					return;
				}

				for (const eid of ftTargetEids) {
					const ftEntity = addEntity(gameState.world);
					rqeState.entityIds.push(ftEntity);

					const floatingTextUI = new TextBlock(
						`ui_floatingText_${ftEntity}`,
						ftText,
					);
					floatingTextUI.widthInPixels = 128;
					floatingTextUI.heightInPixels = 128;
					floatingTextUI.color = ftColor;
					floatingTextUI.alpha = 1;
					floatingTextUI.linkOffsetYInPixels = 0;
					floatingTextUI.style = Themes.typography.header1;
					floatingTextUI._customData = { targetEid: eid };

					if (gameState.playerEIDs.includes(eid)) {
						const playerGUI = gameState.PlayerGUIComponent[eid];
						playerGUI.getRoot().addControl(floatingTextUI);
					} else {
						const targetSprite = gameState.CharacterSprite[eid];
						gameState.sceneGUI.addControl(floatingTextUI);
						floatingTextUI.linkWithMesh(targetSprite);
					}

					addComponent(
						gameState.world,
						ftEntity,
						set(gameState.FloatingText, floatingTextUI),
					);
				}

				rqeState.init = true;
				return;
			case RenderQueueType.SpecialFX:
				const sxAudioUrl = rqeState.rqe.vars["audioUrl"] as string;
				const sxVfxUrl = rqeState.rqe.vars["vfxUrl"] as string;
				const sxTargetEids = rqeState.rqe.vars["targets"] as number[];
				if (!sxTargetEids || !sxVfxUrl) {
					return;
				}

				const stickerFactory = container.resolve(StickerFactory);

				for (const eid of sxTargetEids) {
					stickerFactory
						.createEntityFromFile(sxVfxUrl, gameState.campaignId)
						.then((entityId) => {
							rqeState.entityIds.push(entityId);

							Promise.resolve(
								gameState.StickerImage[entityId],
							).then((sxImage) => {
								if (gameState.playerEIDs.includes(eid)) {
									const playerGUI =
										gameState.PlayerGUIComponent[eid];
									playerGUI.getRoot().addControl(sxImage);
								} else {
									const targetSprite =
										gameState.CharacterSprite[eid];
									gameState.sceneGUI.addControl(sxImage);
									sxImage.linkWithMesh(targetSprite);
								}
							});
						});
				}

				rqeState.init = true;
				return;
			case RenderQueueType.WaitUntilDone:
				return;
		}
	}

	private tickRenderQueueEntry(
		rqeState: RenderQueueState,
		deltaTime: number,
	): void {
		const gameState = container.resolve(GameState);
		switch (rqeState.rqe.type) {
			case RenderQueueType.FloatingText:
				for (const eid of rqeState.entityIds) {
					const ft = gameState.FloatingText[eid];

					ft.alpha = Math.max(ft.alpha - 1 * deltaTime, 0);

					let targetEid = ft._customData["targetEid"] as number;

					if (targetEid && gameState.playerEIDs.includes(targetEid)) {
						ft.topInPixels = ft.topInPixels - 20 * deltaTime;
					} else {
						ft.linkOffsetYInPixels =
							ft.linkOffsetYInPixels - 20 * deltaTime;
					}
				}
				return;
			case RenderQueueType.SpecialFX:
			default:
				return;
		}
	}

	private clearRenderQueueState(rqeState: RenderQueueState): void {
		const gameState = container.resolve(GameState);
		switch (rqeState.rqe.type) {
			case RenderQueueType.MessageDisplay:
				gameState.combatHud.setMessageDisplay(false);
				return;
			case RenderQueueType.FloatingText:
				for (const eid of rqeState.entityIds) {
					const ft = gameState.FloatingText[eid];
					if (!ft) {
						continue;
					}
					gameState.sceneGUI.removeControl(ft);
					ft.dispose();
					removeEntity(gameState.world, eid);
				}
				return;
			case RenderQueueType.SpecialFX:
				for (const eid of rqeState.entityIds) {
					Promise.resolve(gameState.StickerImage[eid]).then((sx) => {
						if (sx) {
							sx.dispose();
						}
						removeEntity(gameState.world, eid);
					});
				}
				return;
			case RenderQueueType.WaitUntilDone:
				return;
		}
	}
}

class RenderQueueState {
	public readonly rqe: RenderQueueEntry;
	public timeAccumulated: number;
	public entityIds: number[] = [];
	public init: boolean = false;

	public constructor(rqe: RenderQueueEntry) {
		this.rqe = rqe;
		this.timeAccumulated = 0;
	}
}

// Rework into different interfaces that extend the same base interface
export class RenderQueueEntry {
	public readonly type: RenderQueueType;
	public readonly vars: RenderQueueVars;
	public readonly isBlocking: boolean;
	public readonly duration?: number;

	public constructor(
		type: RenderQueueType,
		vars: {},
		isBlocking: boolean,
		duration?: number,
	) {
		this.type = type;
		this.vars = vars;
		this.isBlocking = isBlocking;
		if (duration) {
			this.duration = duration;
		}
	}
}

export enum RenderQueueType {
	MessageDisplay,
	FloatingText,
	SpecialFX,
	WaitUntilDone,
}

export interface RenderQueueVars {
	[index: string]: string | number | string[] | number[];
}

export interface RenderQueueVarsMessageDisplay {
	text: string;
	color: string;
}

export interface RenderQueueVarsFloatingText {
	targets: number[];
	text: string;
	color: string;
}

export interface RenderQueueVarsSpecialFX {
	targets: number[];
	vfxUrl: string;
	audioUrl: string;
}
