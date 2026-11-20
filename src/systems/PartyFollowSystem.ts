import { inject } from "tsyringe";
import { Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import { GameScene } from "src/scenes/GameScene";
import { getControlState, getGameplayState } from "src/modules/GameStateModule";
import {
    getActorNavigation,
    navigateToPosition,
    stopNavigation,
} from "src/modules/ActorNavigationModule";
import { getActorPosition } from "src/modules/Collision3DModule";
import {
    FOLLOW_START_DISTANCE,
    FOLLOW_STOP_DISTANCE,
    PARTY_FORMATION_OFFSETS,
} from "src/constants/BehaviorConstants";
import GameSystem from "./GameSystem";
import { CombatState } from "src/types/CombatTypes";

export default class PartyFollowSystem implements GameSystem {
    private followingMemberIds: Set<EntityId> = new Set();

    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        if (getControlState().actionPauseSet.size > 0) {
            return;
        }

        const controlState = getControlState();
        const gameplayState = getGameplayState();

        if (
            gameplayState.combatState === CombatState.Active ||
            controlState.controlPauseSet.size > 0
        ) {
            return;
        }

        const leaderEntityId = gameplayState.selectedPlayerEID;
        const leaderNavigation = getActorNavigation(leaderEntityId);

        if (!leaderNavigation) {
            return;
        }

        const leaderPosition = leaderNavigation.position;

        const leaderFacing = leaderNavigation.facingDirection;
        const leaderYaw = Math.atan2(leaderFacing.x, leaderFacing.z);

        let formationSlot = 1;
        for (const entityId of gameplayState.playerEntityIds) {
            if (entityId === leaderEntityId) {
                continue;
            }

            const baseFormationOffset =
                formationSlot < PARTY_FORMATION_OFFSETS.length
                    ? PARTY_FORMATION_OFFSETS[formationSlot]
                    : PARTY_FORMATION_OFFSETS[
                          PARTY_FORMATION_OFFSETS.length - 1
                      ];
            const formationOffset = this.rotateFormationOffsetAroundY(
                baseFormationOffset,
                leaderYaw,
            );
            const followDestination = leaderPosition.add(formationOffset);

            const followerPosition = getActorPosition(entityId);
            if (!followerPosition) {
                formationSlot++;
                continue;
            }

            const slotDistance = Vector3.Distance(
                followerPosition,
                followDestination,
            );
            const isFollowing = this.followingMemberIds.has(entityId);
            // if (isFollowing) {
            //     if (slotDistance <= FOLLOW_STOP_DISTANCE) {
            //         this.followingMemberIds.delete(entityId);
            //         stopNavigation(entityId);
            //     } else {
            //         navigateToPosition(entityId, followDestination);
            //     }
            // } else if (slotDistance > FOLLOW_START_DISTANCE) {

            // }

            // this.followingMemberIds.add(entityId);
            // navigateToPosition(entityId, followDestination);
            if (slotDistance <= FOLLOW_STOP_DISTANCE) {
                this.followingMemberIds.delete(entityId);
                stopNavigation(entityId);
            } else {
                navigateToPosition(entityId, followDestination);
            }
            formationSlot++;
        }
    }

    private rotateFormationOffsetAroundY(
        offset: Vector3,
        yaw: number,
    ): Vector3 {
        const cosYaw = Math.cos(yaw);
        const sinYaw = Math.sin(yaw);
        return new Vector3(
            offset.x * cosYaw + offset.z * sinYaw,
            offset.y,
            -offset.x * sinYaw + offset.z * cosYaw,
        );
    }
}
