import { GameStateRegistry } from "src/registries/GameStateRegistry";
import UserInterfaceState from "src/states/UserInterfaceState";
import { container } from "tsyringe";

export async function clearSceneGUI() {
	const userInterfaceState = container
		.resolve(GameStateRegistry)
		.getGameStateByStateId<UserInterfaceState>(
			UserInterfaceState.toString(),
		);
	userInterfaceState.sceneGUI.getChildren().forEach((control) => {
		control.dispose();
	});
}
