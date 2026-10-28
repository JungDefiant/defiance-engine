import { inject } from "tsyringe";
import { Vector3 } from "@babylonjs/core";
import { GameScene } from "src/scenes/GameScene";
import { getControlState, getGameplayState } from "src/modules/GameStateModule";
import {
	getActorNavigation,
	navigateToPosition,
	stopNavigation,
} from "src/modules/ActorNavigationModule";
import { getActorPosition } from "src/modules/Collision3DModule";
import {
	FOLLOW_STOP_DISTANCE,
	PARTY_FORMATION_OFFSETS,
} from "src/constants/BehaviorConstants";
import { CombatState } from "./CombatManagerSystem";
import GameSystem from "./GameSystem";

export default class PartyFollowSystem implements GameSystem {
	public constructor(@inject(GameScene) private gameScene: GameScene) {}

	public update(deltaTime: number): void {
		const controlState = getControlState();
		const gameplayState = getGameplayState();
		const leaderEntityId = gameplayState.selectedPlayerEID;
		const leaderNavigation = getActorNavigation(leaderEntityId);

		if (!leaderNavigation) {
			return;
		}

		const leaderPosition = leaderNavigation.position;

		if (
			gameplayState.combatState === CombatState.Inactive ||
			controlState.controlPauseSet.size > 0
		) {
			return;
		}

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
			if (
				followerPosition &&
				Vector3.Distance(followerPosition, followDestination) <=
					FOLLOW_STOP_DISTANCE
			) {
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
