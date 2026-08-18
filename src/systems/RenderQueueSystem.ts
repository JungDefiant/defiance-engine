import GameSystem from "src/systems/GameSystem";
import { PAUSE_RENDERQUEUE } from "src/constants/GeneralConstants";
import { RenderQueueState } from "src/interfaces/RenderQueueEntry";
import { getControlState, getRenderState } from "src/modules/GameStateModule";
import { GameScene } from "src/scenes/GameScene";
import { inject } from "tsyringe";

export default class RenderQueueSystem implements GameSystem {
	public constructor(@inject(GameScene) private gameScene: GameScene) {}

	public update(deltaTime: number): void {
		const renderState = getRenderState();
		if (!renderState.isStarted) {
			return;
		}

		const controlState = getControlState();
		const renderQueueStates = renderState.renderQueueStates;
		const currentRenderQueue = renderState.currentRenderQueue;

		if (controlState.renderPauseSet.size > 0) {
			return;
		}

		if (
			(renderState.renderQueueStates.length === 0 ||
				!renderState.renderQueueStates[
					renderState.renderQueueStates.length - 1
				].renderQueueEntry.isBlocking) &&
			currentRenderQueue.length !== 0
		) {
			const nextRenderQueueEntry = currentRenderQueue.dequeue();
			renderQueueStates.push(new RenderQueueState(nextRenderQueueEntry));
		}

		for (let renderQueueState of renderQueueStates) {
			Promise.resolve(
				this.processRenderQueueState(deltaTime, renderQueueState),
			);
		}

		if (renderQueueStates.length === 0) {
			if (controlState.actionPauseSet.has(PAUSE_RENDERQUEUE)) {
				controlState.actionPauseSet.delete(PAUSE_RENDERQUEUE);
			}
			renderState.isStarted = false;
		}
	}

	private async processRenderQueueState(
		deltaTime: number,
		renderQueueState: RenderQueueState,
	): Promise<void> {
		const renderState = getRenderState();
		if (renderQueueState.renderQueueEntry.duration) {
			if (!renderQueueState.init) {
				await renderQueueState.renderQueueEntry.initRenderQueueEntry(
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
				renderState.renderQueueStates =
					renderState.renderQueueStates.filter(
						(x) => x !== renderQueueState,
					);
			}
		} else {
			if (!renderQueueState.init) {
				await renderQueueState.renderQueueEntry.initRenderQueueEntry(
					renderQueueState,
				);
				renderQueueState.init = true;
			}
		}
	}
}
