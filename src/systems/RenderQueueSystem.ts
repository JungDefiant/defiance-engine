import { container, singleton } from "tsyringe";
import ISystem from "src/systems/ISystem";
import { SolidParticleSystem } from "@babylonjs/core";
import { Queue } from "queue-typescript";
import GameState from "src/GameState";
import { TextBlock } from "@babylonjs/gui";
import { addComponent, addEntity, removeEntity, set } from "bitecs";

@singleton()
export default class RenderQueueSystem implements ISystem {
	private currentRenderQueue: Queue<RenderQueueEntry> =
		new Queue<RenderQueueEntry>();
	private renderQueueStates: RenderQueueState[] = [];
	private isStarted: boolean = false;

	public constructor() {}

	public async start(): Promise<void> {}

	public update(deltaTime: number): void {
		if (!this.isStarted) {
			return;
		}

		if (
			this.renderQueueStates.length === 0 ||
			!this.renderQueueStates[this.renderQueueStates.length - 1].rqe.isBlocking
		) {
			if (this.currentRenderQueue.length === 0) {
				this.isStarted = false;
				return;
			}

			const nextRqe = this.currentRenderQueue.dequeue();

			this.renderQueueStates.push(new RenderQueueState(nextRqe));
		}

		this.processRenderQueueStates(deltaTime);
	}

	public getIsStarted(): boolean {
		return this.isStarted;
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

	private processRenderQueueStates(deltaTime: number): void {
		this.renderQueueStates = this.renderQueueStates.filter((state) => {
			if (state.rqe.duration) {
				let isActive = true;

				if (!state.init) {
					this.initRenderQueueEntry(state);
				}

				this.tickRenderQueueEntry(state, deltaTime);

				state.timeAccumulated += deltaTime;
				if (state.timeAccumulated >= state.rqe.duration) {
					state.timeAccumulated = state.rqe.duration;
					isActive = false;
					this.clearRenderQueueState(state);
				}

				return isActive;
			} else {
				if (!state.init) {
					this.initRenderQueueEntry(state);
				}
				return false;
			}
		});
	}

	private initRenderQueueEntry(rqeState: RenderQueueState): void {
		const context = container.resolve(GameState);
		switch (rqeState.rqe.type) {
			case RenderQueueType.MessageDisplay:
				// text

				return;
			case RenderQueueType.FloatingText:
				const ftText = rqeState.rqe.vars["text"] as string;
				const ftColor = rqeState.rqe.vars["color"] as string;
				const ftTargetEids = rqeState.rqe.vars["targets"] as number[];
				if (!ftTargetEids || !ftText || !ftColor) {
					return;
				}

				for (const eid of ftTargetEids) {
					const ftEntity = addEntity(context.world);
					rqeState.entityIds.push(ftEntity);

					const floatingTextUI = new TextBlock(
						`ui_floatingText_${ftEntity}`,
						ftText,
					);
					floatingTextUI.widthInPixels = 96;
					floatingTextUI.heightInPixels = 96;
					floatingTextUI.color = ftColor;
					floatingTextUI.alpha = 1;
					floatingTextUI.linkOffsetYInPixels = 0;
					floatingTextUI._customData = { targetEid: eid };

					if (context.playerEIDs.includes(eid)) {
						const playerGUI = context.PlayerGUIComponent[eid];
						playerGUI.getRootContainer().addControl(floatingTextUI);
					} else {
						const targetSprite = context.EnemySprite[eid];
						context.insceneCombatGUI.addControl(floatingTextUI);
						floatingTextUI.linkWithMesh(targetSprite);
					}

					addComponent(
						context.world,
						ftEntity,
						set(context.FloatingText, floatingTextUI),
					);
				}

				rqeState.init = true;
				return;
			case RenderQueueType.SpecialFX:
				const sxAudioUrl = rqeState.rqe.vars["audioUrl"] as string;
				const sxVfxUrl = rqeState.rqe.vars["vfxUrl"] as string;
				const sxTargetEids = rqeState.rqe.vars["targets"] as number[];
				if (!sxTargetEids || !sxVfxUrl || !sxAudioUrl) {
					return;
				}

				for (const eid of sxTargetEids) {
					const targetSprite = context.EnemySprite[eid];
					const sps = new SolidParticleSystem(``, context.scene);

					const sxEntity = addEntity(context.world);
					addComponent(context.world, sxEntity, set(context.SpecialFX, sps));
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
		const context = container.resolve(GameState);
		switch (rqeState.rqe.type) {
			case RenderQueueType.MessageDisplay:
				// text

				return;
			case RenderQueueType.FloatingText:
				for (const eid of rqeState.entityIds) {
					const ft = context.FloatingText[eid];

					ft.alpha = Math.max(ft.alpha - 1 * deltaTime, 0);

					let targetEid = ft._customData["targetEid"] as number;

					if (targetEid && context.playerEIDs.includes(targetEid)) {
						ft.topInPixels = ft.topInPixels - 20 * deltaTime;
					} else {
						ft.linkOffsetYInPixels = ft.linkOffsetYInPixels - 20 * deltaTime;
					}
				}
				return;
			case RenderQueueType.SpecialFX:
				for (const eid of rqeState.entityIds) {
					const sx = context.SpecialFX[eid];
					sx.setParticles();
				}
				return;
			case RenderQueueType.WaitUntilDone:
				return;
		}
	}

	private clearRenderQueueState(rqeState: RenderQueueState): void {
		const context = container.resolve(GameState);
		switch (rqeState.rqe.type) {
			case RenderQueueType.MessageDisplay:
				// text

				return;
			case RenderQueueType.FloatingText:
				for (const eid of rqeState.entityIds) {
					const ft = context.FloatingText[eid];
					context.insceneCombatGUI.removeControl(ft);
					ft.dispose();
					removeEntity(context.world, eid);
				}
				return;
			case RenderQueueType.SpecialFX:
				for (const eid of rqeState.entityIds) {
					const sx = context.SpecialFX[eid];
					sx.dispose();
					removeEntity(context.world, eid);
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
