import { Nullable, Vector3 } from "@babylonjs/core";
import GameSystem from "./GameSystem";
import { applyActionEffects } from "src/modules/CombatModule";
import {
	ACTOR_GROUND_Y,
	ACTOR_SPRITE_VERTICAL_OFFSET,
} from "src/constants/GeneralConstants";
import {
	findProjectileHitActor,
	getActorHomingDirection,
} from "src/modules/ProjectileModule";
import { getProjectileComponentArray } from "src/modules/ComponentModule";
import { query, removeEntity } from "bitecs";
import { GameScene } from "src/scenes/GameScene";
import { inject } from "tsyringe";

export default class ProjectileSystem implements GameSystem {
	public constructor(@inject(GameScene) private gameScene: GameScene) {}

	update(deltaTime: number): void {
		const projectileComponentArray = getProjectileComponentArray();
		for (const entityId of query(this.gameScene.world, [
			projectileComponentArray,
		])) {
			const projectile = projectileComponentArray[entityId];

			let isFollowingLivingTarget = false;
			if (projectile.targetEids.length > 0) {
				let homingDirection: Nullable<Vector3> = null;
				for (const targetEid of projectile.targetEids) {
					homingDirection = getActorHomingDirection(
						targetEid,
						projectile.mesh.position,
					);
					if (homingDirection) {
						break;
					}
				}
				if (homingDirection) {
					isFollowingLivingTarget = true;
					projectile.direction.copyFrom(homingDirection);
					projectile.mesh.rotation.y = Math.atan2(
						homingDirection.x,
						homingDirection.z,
					);
				}
			}

			const distanceStep = projectile.speed * deltaTime;
			projectile.mesh.position.addInPlace(
				projectile.direction.scale(distanceStep),
			);
			projectile.mesh.position.y =
				ACTOR_GROUND_Y + ACTOR_SPRITE_VERTICAL_OFFSET;
			projectile.distanceTraveled += distanceStep;

			const hitEid = findProjectileHitActor(projectile);
			if (hitEid >= 0) {
				applyActionEffects(
					projectile.actionData,
					projectile.sourceEid,
					projectile.targetEids,
				);
				removeEntity(this.gameScene.world, entityId);
				continue;
			}

			if (
				!isFollowingLivingTarget &&
				projectile.distanceTraveled >= projectile.maxRange
			) {
				removeEntity(this.gameScene.world, entityId);
			}
		}
	}
}
