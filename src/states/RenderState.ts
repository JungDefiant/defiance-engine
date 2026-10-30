import { EntityId } from "bitecs";

export default class RenderState {
	private _currentRenderQueueEntityId: EntityId = -1;

	public get currentRenderQueueEntityId(): EntityId {
		return this._currentRenderQueueEntityId;
	}

	public set currentRenderQueueEntityId(value: EntityId) {
		this._currentRenderQueueEntityId = value;
	}
}

