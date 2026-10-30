import { addComponent, addEntity, EntityId, set } from "bitecs";
import { EntityFactory } from "./EntityFactory";
import RenderQueueComponent from "src/components/RenderQueueComponent";
import TransformNodeComponent from "src/components/TransformNodeComponent";
import {
	getRenderQueueComponentArray,
	getTransformNodeComponentArray,
} from "src/modules/ComponentModule";
import { getGameScene } from "src/modules/GameStateModule";

// Creates render queue object entities: a new entity with a TransformNodeComponent (position) and a RenderQueueComponent
export class RenderQueueFactory implements EntityFactory {
	public start(campaignId: string): void {}

	public async createEntityFromFile(fileName: string): Promise<EntityId> {
		return -1;
	}

	public createEntity(): EntityId {
		const gameScene = getGameScene();
		const newRenderQueueEntity = addEntity(gameScene.world);

		const newTransformNode = new TransformNodeComponent(
			`renderQueueObject_${newRenderQueueEntity}`,
			gameScene,
			true,
		);
		addComponent(
			gameScene.world,
			newRenderQueueEntity,
			set(getTransformNodeComponentArray(), newTransformNode),
		);

		const newRenderQueueComponent = new RenderQueueComponent();
		addComponent(
			gameScene.world,
			newRenderQueueEntity,
			set(getRenderQueueComponentArray(), newRenderQueueComponent),
		);

		return newRenderQueueEntity;
	}
}
