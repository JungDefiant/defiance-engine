import { Engine } from "@babylonjs/core";
import GameSystem from "./GameSystem";
import { inject, singleton } from "tsyringe";
import GameState from "src/states/GameState";
import { query } from "bitecs";
import { ImageAnimationComponent } from "src/components/ImageAnimationComponent";
import { SystemRegistry } from "src/states/registries/SystemRegistry";

export const SYSTEM_ID_IMAGEANIMATION = "ImageAnimation";

export default class ImageAnimationSystem implements GameSystem {
	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
	) {}

	public async start(): Promise<void> {}

	public update(deltaTime: number): void {
		if (!gameState) {
			return;
		}

		for (const eid of query(gameState.world, [gameState.ImageAnimation])) {
			const imageAnimationComponent = gameState.ImageAnimation[eid];
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
