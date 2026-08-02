import GameState from "src/states/GameState";
import { container } from "tsyringe";

export async function clearSceneGUI() {
	const gameState = container.resolve(GameState);
	gameState.sceneGUI.getChildren().forEach((control) => {
		control.dispose();
	});
}
