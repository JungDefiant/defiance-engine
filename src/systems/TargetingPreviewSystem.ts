import { inject } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
import { GameScene } from "src/scenes/GameScene";
import { getControlState } from "src/modules/GameStateModule";
import {
    getTargetingInputType,
} from "src/modules/ActionTargetingModule";
import { getTargetingPreviewProcessor } from "src/modules/ProcessorModule";
import {
    hideTargetingPreviews,
} from "src/modules/TargetingPreviewModule";

export default class TargetingPreviewSystem implements GameSystem {
    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const controlState = getControlState();
        if (!controlState.isTargetingAction || !controlState.targetingAction) {
            hideTargetingPreviews();
            return;
        }

        const actionData = controlState.targetingAction;
        const targetingPreviewProcessor = getTargetingPreviewProcessor();
        const previewFunction = targetingPreviewProcessor.getProcessorFunction(
            getTargetingInputType(actionData),
        );
        previewFunction({
            sourceEntityId: controlState.targetingSourceEid,
            actionData,
            shape: actionData.targetingShape,
        });
    }
}