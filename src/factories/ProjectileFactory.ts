import { addComponent, addEntity, EntityId, set } from "bitecs";
import { EntityFactory } from "./EntityFactory";
import { AbilityData } from "src/types/AbilityTypes";
import { TargetingShapeData } from "src/types/CollisionTypes";
import {
	getActorCollisionRadius,
	getActorPosition,
} from "src/modules/Collision3DModule";
import {
	Color3,
	MeshBuilder,
	Nullable,
	StandardMaterial,
} from "@babylonjs/core";
import {
	getProjectileComponentArray,
} from "src/modules/ComponentModule";
import {
	DEFAULT_PROJECTILE_RADIUS,
	DEFAULT_PROJECTILE_RANGE,
	PROJECTILE_LENGTH,
	PROJECTILE_SPEED,
	PROJECTILE_WIDTH,
} from "src/constants/CombatConstants";
import { getAimDirectionFromPointer } from "src/modules/ControlModule";
import { getGameScene } from "src/modules/GameStateModule";
import {
	ACTOR_GROUND_Y,
	ACTOR_SPRITE_VERTICAL_OFFSET,
} from "src/constants/GeneralConstants";
import ProjectileComponent, {
	ProjectileComponentConstructorProperties,
} from "src/components/ProjectileComponent";
import { TargetingShapeFunctionProps } from "src/processors/TargetingShapeProcessor";

export class ProjectileFactory implements EntityFactory {
	public start(campaignId: string): void {}

	public async createEntityFromFile(fileName: string): Promise<EntityId> {
		return -1;
	}

	public createEntityFromTargetingShapeProperties(
		props: TargetingShapeFunctionProps,
	): EntityId {
		if(!props.targetEntityId) {
			return -1;
		}

		const sourcePosition = getActorPosition(props.sourceEntityId);
		if (!sourcePosition) {
			return -1;
		}

		const gameScene = getGameScene();
		const newProjectileEntity = addEntity(gameScene.world);

		const newProjectileComponent = this.createProjectileComponent(props);
		addComponent(
			gameScene.world,
			newProjectileEntity,
			set(getProjectileComponentArray(), newProjectileComponent),
		);

		return newProjectileEntity;
	}

	private createProjectileComponent(
		props: TargetingShapeFunctionProps
	): Nullable<ProjectileComponent> {
		const shape: TargetingShapeData | undefined = props.action.targetingShape;
		const gameScene = getGameScene();
		const sourcePosition = getActorPosition(props.sourceEntityId);
		const projectileComponentArray = getProjectileComponentArray();

		if (!sourcePosition || !shape) {
			return null;
		}

		const maxRange = shape.range ?? DEFAULT_PROJECTILE_RANGE;
		const radius = shape.radius ?? DEFAULT_PROJECTILE_RADIUS;

		let aimDirection = getAimDirectionFromPointer(sourcePosition);
		const projectileMesh = MeshBuilder.CreateBox(
			`abilityProjectile_${props.sourceEntityId}_${projectileComponentArray.length}`,
			{
				width: PROJECTILE_WIDTH,
				height: PROJECTILE_WIDTH,
				depth: PROJECTILE_LENGTH,
			},
			gameScene,
		);
		projectileMesh.rotation.y = Math.atan2(aimDirection.x, aimDirection.z);

		const projectileMaterial = new StandardMaterial(
			`mat_abilityProjectile_${props.sourceEntityId}_${projectileComponentArray.length}`,
			gameScene,
		);
		projectileMaterial.diffuseColor = Color3.FromHexString("#EFC041");
		projectileMaterial.emissiveColor = Color3.FromHexString("#EFC041");
		projectileMaterial.disableLighting = true;
		projectileMesh.material = projectileMaterial;

		const spawnOffset = getActorCollisionRadius(props.sourceEntityId) + 0.3;
		projectileMesh.position.copyFrom(
			sourcePosition.add(aimDirection.scale(spawnOffset)),
		);
		projectileMesh.position.y =
			ACTOR_GROUND_Y + ACTOR_SPRITE_VERTICAL_OFFSET;

		const newProjectileProps = {
			mesh: projectileMesh,
			direction: aimDirection.clone(),
			speed: PROJECTILE_SPEED,
			distanceTraveled: 0,
			maxRange,
			radius,
			sourceEid: props.sourceEntityId,
			actionData: props.action,
			targetEntityId: props.targetEntityId,
			targetPosition: props.targetPosition

		} as ProjectileComponentConstructorProperties;

		const newProjectileComponent = new ProjectileComponent(
			newProjectileProps,
		);

		return newProjectileComponent;
	}
}
