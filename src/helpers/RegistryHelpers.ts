import { ComponentRegistry } from "src/registries/ComponentRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import SceneState from "src/states/SceneState";
import { container } from "tsyringe";

export function getComponentRegistry(): ComponentRegistry {
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
		SceneState.toString(),
	);
	return sceneState.componentRegistry;
}
