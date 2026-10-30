import { inject } from "tsyringe";
import { EntityId, query, removeEntity } from "bitecs";
import GameSystem from "src/systems/GameSystem";
import { RenderQueueState } from "src/types/RenderTypes";
import RenderQueueComponent from "src/components/RenderQueueComponent";
import { getControlState, getRenderState } from "src/modules/GameStateModule";
import { getRenderQueueComponentArray } from "src/modules/ComponentModule";
import { GameScene } from "src/scenes/GameScene";

export default class RenderQueueSystem implements GameSystem {
    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const controlState = getControlState();
        if (controlState.renderPauseSet.size > 0) {
            return;
        }

        const renderQueueComponentArray = getRenderQueueComponentArray();
        const renderQueueEntityIds = query(this.gameScene.world, [
            renderQueueComponentArray,
        ]);

        for (const entityId of renderQueueEntityIds) {
            const renderQueueComponent = renderQueueComponentArray[entityId];
            if (!renderQueueComponent || !renderQueueComponent.isStarted) {
                continue;
            }

            this.processRenderQueueComponent(
                deltaTime,
                entityId,
                renderQueueComponent,
            );
        }
    }

    private processRenderQueueComponent(
        deltaTime: number,
        entityId: EntityId,
        renderQueueComponent: RenderQueueComponent,
    ): void {
        const currentRenderQueue = renderQueueComponent.queue;

        if (
            (renderQueueComponent.renderQueueStates.length === 0 ||
                !renderQueueComponent.renderQueueStates[
                    renderQueueComponent.renderQueueStates.length - 1
                ].renderQueueEntry.isBlocking) &&
            currentRenderQueue.length !== 0
        ) {
            renderQueueComponent.renderQueueStates.push(
                new RenderQueueState(currentRenderQueue.dequeue()),
            );
        }

        for (const renderQueueState of [
            ...renderQueueComponent.renderQueueStates,
        ]) {
            this.processRenderQueueState(
                deltaTime,
                renderQueueState,
                renderQueueComponent,
            );
        }

        if (
            renderQueueComponent.renderQueueStates.length === 0 &&
            currentRenderQueue.length === 0
        ) {
            this.removeRenderQueueEntity(entityId);
        } else if (renderQueueComponent.renderQueueStates.length === 0) {
            renderQueueComponent.isStarted = false;
        }
    }

    private processRenderQueueState(
        deltaTime: number,
        renderQueueState: RenderQueueState,
        renderQueueComponent: RenderQueueComponent,
    ): void {
        if (renderQueueState.renderQueueEntry.duration) {
            if (!renderQueueState.init) {
                Promise.resolve(
                    renderQueueState.renderQueueEntry.initRenderQueueState(
                        renderQueueState,
                    ),
                ).then(() => {
                    renderQueueState.init = true;
                });
            }

            renderQueueState.timeAccumulated += deltaTime;
            renderQueueState.renderQueueEntry.tickRenderQueueState(
                renderQueueState,
                deltaTime,
            );

            const renderQueueEntryTotalLifetime =
                renderQueueState.renderQueueEntry.duration +
                (renderQueueState.renderQueueEntry.delay || 0);

            if (
                renderQueueState.timeAccumulated >=
                renderQueueEntryTotalLifetime
            ) {
                renderQueueState.timeAccumulated =
                    renderQueueEntryTotalLifetime;
                renderQueueState.renderQueueEntry.clearRenderQueueState(
                    renderQueueState,
                );
                renderQueueComponent.renderQueueStates =
                    renderQueueComponent.renderQueueStates.filter(
                        (x) => x !== renderQueueState,
                    );
            }
        } else {
            if (!renderQueueState.init) {
                Promise.resolve(
                    renderQueueState.renderQueueEntry.initRenderQueueState(
                        renderQueueState,
                    ),
                );
                renderQueueState.init = true;
            }
        }
    }

    private removeRenderQueueEntity(entityId: EntityId): void {
        const renderState = getRenderState();
        if (renderState.currentRenderQueueEntityId === entityId) {
            renderState.currentRenderQueueEntityId = -1;
        }

        removeEntity(this.gameScene.world, entityId);
    }
}
