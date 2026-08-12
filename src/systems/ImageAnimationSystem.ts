import GameSystem from "./GameSystem";
import { inject } from "tsyringe";
import { query } from "bitecs";
import { ImageAnimationComponent } from "src/components/ImageAnimationComponent";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import { SystemRegistry } from "src/registries/SystemRegistry";
import SceneState from "src/states/SceneState";

export const SYSTEM_ID_IMAGEANIMATION = "ImageAnimation";

export default class ImageAnimationSystem implements GameSystem {
	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
		@inject(GameStateRegistry) private gameStateRegistry: GameStateRegistry,
	) {}

	public async start(): Promise<void> {}

	public update(deltaTime: number): void {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				SceneState.toString(),
			);
		const imageAnimationComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<ImageAnimationComponent>(
				ImageAnimationComponent.toString(),
			);

		for (const eid of query(sceneState.world, [
			imageAnimationComponentArray,
		])) {
			const imageAnimationComponent = imageAnimationComponentArray[eid];
			(async () => {
				Promise.resolve(imageAnimationComponent).then((component) => {
					this.incrementAnimationCell(deltaTime, component);
				});
			})();
		}
	}

	private incrementAnimationCell(
		deltaTime: number,
		imageAnimation: ImageAnimationComponent,
	) {
		const spriteSheet = imageAnimation.spriteSheet;
		imageAnimation.accumulatedTime += deltaTime;
		if (imageAnimation.accumulatedTime >= imageAnimation.timePerCell) {
			imageAnimation.accumulatedTime = 0;
			spriteSheet.cellId += 1;
		}

		if (spriteSheet.cellId > imageAnimation.maximumCells) {
			spriteSheet.cellId = 1;
		}
	}
}
