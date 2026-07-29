import { Engine } from "@babylonjs/core";
import ISystem from "./ISystem";
import { singleton } from "tsyringe";
import GameState from "src/states/GameState";
import { query } from "bitecs";
import { ImageAnimation } from "src/components/ImageAnimation";

@singleton()
export default class ImageAnimationSystem implements ISystem {
	public async start(): Promise<void> {}

	public update(deltaTime: number, gameState?: GameState): void {
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
		imageAnimation: ImageAnimation,
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
