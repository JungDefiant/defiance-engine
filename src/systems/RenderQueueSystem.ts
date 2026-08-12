import { inject } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
import { Queue } from "queue-typescript";
import { PAUSE_RENDERQUEUE } from "src/constants/GeneralConstants";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import { SystemRegistry } from "src/registries/SystemRegistry";
import ControlState from "src/states/ControlState";
import {
	RenderQueueEntry,
	RenderQueueState,
} from "src/interfaces/RenderQueueEntry";

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

		const controlState =
			this.gameStateRegistry.getGameStateByStateId<ControlState>(
				ControlState.toString(),
			);

		if (controlState.renderPauseSet.size > 0) {
			return;
		}

		if (
			(this.renderQueueStates.length === 0 ||
				!this.renderQueueStates[this.renderQueueStates.length - 1]
					.renderQueueEntry.isBlocking) &&
			this.currentRenderQueue.length !== 0
		) {
			const nextRqe = this.currentRenderQueue.dequeue();
			this.renderQueueStates.push(new RenderQueueState(nextRqe));
		}

		for (let renderQeueuState of this.renderQueueStates) {
			this.processRenderQueueState(deltaTime, renderQeueuState);
		}

		if (this.renderQueueStates.length === 0) {
			if (controlState.actionPauseSet.has(PAUSE_RENDERQUEUE)) {
				controlState.actionPauseSet.delete(PAUSE_RENDERQUEUE);
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
		renderQueueState: RenderQueueState,
	): void {
		if (renderQueueState.renderQueueEntry.duration) {
			if (!renderQueueState.init) {
				renderQueueState.renderQueueEntry.initRenderQueueEntry(
					renderQueueState,
				);
				renderQueueState.init = true;
			}

			renderQueueState.renderQueueEntry.tickRenderQueueEntry(
				renderQueueState,
				deltaTime,
			);

			renderQueueState.timeAccumulated += deltaTime;

			if (
				renderQueueState.timeAccumulated >=
				renderQueueState.renderQueueEntry.duration
			) {
				renderQueueState.timeAccumulated =
					renderQueueState.renderQueueEntry.duration;
				renderQueueState.renderQueueEntry.clearRenderQueueState(
					renderQueueState,
				);
				this.renderQueueStates = this.renderQueueStates.filter(
					(x) => x !== renderQueueState,
				);
			}
		} else {
			if (!renderQueueState.init) {
				renderQueueState.renderQueueEntry.initRenderQueueEntry(
					renderQueueState,
				);
				renderQueueState.init = true;
			}
		}
	}
}
