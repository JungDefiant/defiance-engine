import { Queue } from "queue-typescript";
import { Component } from "./Component";
import type {
	RenderQueueEntry,
	RenderQueueState,
} from "src/types/RenderTypes";

export default class RenderQueueComponent implements Component {
	public readonly queue: Queue<RenderQueueEntry> =
		new Queue<RenderQueueEntry>();
	public renderQueueStates: RenderQueueState[] = [];
	public isStarted: boolean = false;

	public getValue(): RenderQueueComponent {
		return this;
	}

	public dispose(): void {
		while (this.queue.length > 0) {
			this.queue.dequeue();
		}

		for (const renderQueueState of this.renderQueueStates) {
			renderQueueState.renderQueueEntry.clearRenderQueueState(
				renderQueueState,
			);
		}
		this.renderQueueStates.length = 0;
		this.isStarted = false;
	}
}
