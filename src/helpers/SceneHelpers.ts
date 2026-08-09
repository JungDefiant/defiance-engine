import { GameStateRegistry } from "src/registries/GameStateRegistry";
import SceneState from "src/states/SceneState";
import { container } from "tsyringe";

export function getViewPositionNode(viewPositionNodeId: string) {
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
		SceneState.toString(),
	);
	const viewNode = sceneState.sceneNodes.find(
		(x) => x.id === viewPositionNodeId,
	);

	return viewNode;
}
