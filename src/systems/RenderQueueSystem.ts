import { singleton } from "tsyringe";
import ISystem from "./ISystem";
import { Engine } from "@babylonjs/core";

export interface IRenderQueueSystem extends ISystem {
	addRenderQueueEntry(encId: string): void;
	playRenderQueue(encId: string): void;
}

@singleton()
export default class RenderQueueSystem implements IRenderQueueSystem {
	start(engine: Engine): Promise<void> {
		throw new Error("Method not implemented.");
	}
	update(deltaTime: number): void {
		throw new Error("Method not implemented.");
	}
	addRenderQueueEntry(encId: string): void {
		throw new Error("Method not implemented.");
	}
	playRenderQueue(encId: string): void {
		throw new Error("Method not implemented.");
	}
}
