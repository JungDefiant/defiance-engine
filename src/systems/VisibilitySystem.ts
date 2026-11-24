import { GameScene } from "src/scenes/GameScene";
import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import {
    getActorStateComponentArray,
    getCharacterSpriteComponentArray,
    getEnemyGuiComponentArray,
} from "src/modules/ComponentModule";
import { EntityId, query } from "bitecs";
import { getGameplayState } from "src/modules/GameStateModule";
import {
    isActorVisibleToParty,
    isObstacleMesh,
    isObstacleVisibleToParty,
} from "src/modules/ActionTargetingModule";
import {
    VISIBILITY_FADE_IN_SECONDS,
    VISIBILITY_FADE_OUT_SECONDS,
    VISIBILITY_MIN_VISIBLE_ALPHA,
    VISIBILITY_UPDATE_INTERVAL_SECONDS,
} from "src/constants/RenderConstants";

export default class VisibilitySystem implements GameSystem {
    private accumulatedTime: number = 0;
    private actorVisibilityTargets: Map<EntityId, number> = new Map();
    private obstacleVisibilityTargets: Map<number, number> = new Map();

    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        this.accumulatedTime += deltaTime;

        if (this.accumulatedTime >= VISIBILITY_UPDATE_INTERVAL_SECONDS) {
            this.updateVisibilityTargets();
            this.accumulatedTime = 0;
        }

        this.updateVisibilityFades(deltaTime);
    }

    private updateVisibilityTargets(): void {
        this.updateActorVisibilityTargets();
        this.updateObstacleVisibilityTargets();
    }

    private updateActorVisibilityTargets(): void {
        const gameplayState = getGameplayState();
        const actorStateComponentArray = getActorStateComponentArray();
        const characterSpriteComponentArray =
            getCharacterSpriteComponentArray();

        for (const entityId of query(this.gameScene.world, [
            actorStateComponentArray,
            characterSpriteComponentArray,
        ])) {
            if (gameplayState.playerEntityIds.includes(entityId)) {
                continue;
            }

            let targetVisibility = 0;
            if (isActorVisibleToParty(entityId)) {
                targetVisibility = 1;
            }

            this.actorVisibilityTargets.set(entityId, targetVisibility);

            const characterSprite = characterSpriteComponentArray[entityId];
            if (characterSprite) {
                characterSprite.getValue().isPickable = targetVisibility === 1;
            }
        }
    }

    private updateObstacleVisibilityTargets(): void {
        for (const mesh of this.gameScene.meshes) {
            if (!isObstacleMesh(mesh)) {
                continue;
            }

            let targetVisibility = 0;
            if (isObstacleVisibleToParty(mesh)) {
                targetVisibility = 1;
            }

            this.obstacleVisibilityTargets.set(mesh.uniqueId, targetVisibility);
            mesh.isPickable = targetVisibility === 1;
        }
    }

    private updateVisibilityFades(deltaTime: number): void {
        this.updateActorVisibilityFades(deltaTime);
        this.updateObstacleVisibilityFades(deltaTime);
    }

    private updateActorVisibilityFades(deltaTime: number): void {
        const gameplayState = getGameplayState();
        const actorStateComponentArray = getActorStateComponentArray();
        const characterSpriteComponentArray =
            getCharacterSpriteComponentArray();
        const enemyGuiComponentArray = getEnemyGuiComponentArray();

        for (const entityId of query(this.gameScene.world, [
            actorStateComponentArray,
            characterSpriteComponentArray,
        ])) {
            if (gameplayState.playerEntityIds.includes(entityId)) {
                continue;
            }

            const characterSprite = characterSpriteComponentArray[entityId];
            if (!characterSprite) {
                continue;
            }

            const spriteMesh = characterSprite.getValue();
            const targetVisibility =
                this.actorVisibilityTargets.get(entityId) ?? 1;

            spriteMesh.visibility = this.fadeVisibility(
                spriteMesh.visibility,
                targetVisibility,
                deltaTime,
            );
            spriteMesh.isVisible =
                spriteMesh.visibility > VISIBILITY_MIN_VISIBLE_ALPHA;

            const enemyGui = enemyGuiComponentArray[entityId];
            if (enemyGui) {
                const root = enemyGui.getRoot();
                root.isVisible = spriteMesh.isVisible;
            }
        }
    }

    private updateObstacleVisibilityFades(deltaTime: number): void {
        for (const mesh of this.gameScene.meshes) {
            if (!isObstacleMesh(mesh)) {
                continue;
            }

            const targetVisibility =
                this.obstacleVisibilityTargets.get(mesh.uniqueId) ?? 1;

            mesh.visibility = this.fadeVisibility(
                mesh.visibility,
                targetVisibility,
                deltaTime,
            );
            mesh.isVisible = mesh.visibility > VISIBILITY_MIN_VISIBLE_ALPHA;
        }
    }

    private fadeVisibility(
        current: number,
        target: number,
        deltaTime: number,
    ): number {
        if (current === target) {
            return target;
        }

        let duration = VISIBILITY_FADE_OUT_SECONDS;
        if (target > current) {
            duration = VISIBILITY_FADE_IN_SECONDS;
        }

        if (duration <= 0) {
            return target;
        }

        const step = deltaTime / duration;

        if (current < target) {
            return Math.min(target, current + step);
        }

        return Math.max(target, current - step);
    }
}
