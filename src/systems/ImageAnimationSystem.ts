import GameSystem from "./GameSystem";
import { inject } from "tsyringe";
import { query } from "bitecs";
import { ImageAnimationComponent } from "src/components/ImageAnimationComponent";
import { GameScene } from "src/scenes/GameScene";
import { getImageAnimationComponentArray } from "src/modules/ComponentModule";

export default class ImageAnimationSystem implements GameSystem {
	public constructor(@inject(GameScene) private gameScene: GameScene) {}

	public update(deltaTime: number): void {
		const imageAnimationComponentArray = getImageAnimationComponentArray();

		for (const eid of query(this.gameScene.world, [
			imageAnimationComponentArray,
		])) {
			(async () => {
				const imageAnimationComponent =
					await imageAnimationComponentArray[eid];
				this.incrementAnimationCell(deltaTime, imageAnimationComponent);
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
