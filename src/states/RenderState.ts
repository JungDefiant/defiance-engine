import { Queue } from "queue-typescript";
import {
	RenderQueueEntry,
	RenderQueueState,
} from "src/interfaces/RenderQueueEntry";

export default class RenderState {
	public _renderQueueStates: RenderQueueState[] = [];

	private _isStarted: boolean = false;

	private readonly _currentRenderQueue: Queue<RenderQueueEntry> =
		new Queue<RenderQueueEntry>();

	public get currentRenderQueue(): Queue<RenderQueueEntry> {
		return this._currentRenderQueue;
	}

	public get renderQueueStates(): RenderQueueState[] {
		return this._renderQueueStates;
	}

	public get isStarted(): boolean {
		return this._isStarted;
	}

	public set renderQueueStates(value: RenderQueueState[]) {
		this._renderQueueStates = value;
	}

	public set isStarted(value: boolean) {
		this._isStarted = value;
	}
}
