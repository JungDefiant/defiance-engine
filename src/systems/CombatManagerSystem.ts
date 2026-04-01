import { container, inject, singleton } from "tsyringe";
import ISystem from "./ISystem";
import SceneManagerSystem from "./SceneManagerSystem";
import UserInterfaceSystem from "./UserInterfaceSystem";
import {
	MeshBuilder,
	Nullable,
	PBRMaterial,
	Texture,
	UniversalCamera,
	Vector3,
} from "@babylonjs/core";
import {
	AdvancedDynamicTexture,
	Control,
	Grid,
	Rectangle,
	StackPanel,
} from "@babylonjs/gui";
import { Themes } from "../gui/Themes";
import GameContext, { GameMode } from "../GameContext";
import { addComponent, getComponent, query } from "bitecs";
import { ActorData } from "../components/ActorData";
import { EnemyFactory } from "../factories/EnemyFactory";

export interface ICombatManagerSystem extends ISystem {
	startCombat(encId: string): Promise<void>;
}

@singleton()
export default class CombatManagerSystem implements ICombatManagerSystem {
	public constructor(
		@inject(EnemyFactory) private enFactory: EnemyFactory,
		@inject(SceneManagerSystem) private smSystem: SceneManagerSystem,
		@inject(UserInterfaceSystem) private uiSystem: UserInterfaceSystem,
	) {}

	public async start() {}

	public update(): void {
		const context = container.resolve(GameContext);
		for (const eid of query(context.world, [ActorData])) {
		}
	}

	public async startCombat(encId: string): Promise<void> {
		const context = container.resolve(GameContext);
		const cbtHud = context.combatHud;
		const locData = context.locationData;
		const camera = context.scene.activeCamera as UniversalCamera;

		this.smSystem.setGameMode(GameMode.Combat);

		const viewCoords = locData.combatViewPosition;
		camera.position = new Vector3(viewCoords[0], viewCoords[1], viewCoords[2]);
		camera.setTarget(new Vector3(0, 0, -40));

		const encData = context.sceneData.encounters[encId];

		/*
		To Do:
		- Set up per-frame updates of battler data
		- Queue battler actions based on tactics (overridden by player input)
		- Execute actions - pauses combat to process action
		*/

		await this.enFactory.createEntityFromFile(
			"enemies/enem_test",
			context.campaignId,
		);
		await this.enFactory.createEntityFromFile(
			"enemies/enem_test",
			context.campaignId,
		);
		await this.enFactory.createEntityFromFile(
			"enemies/enem_test",
			context.campaignId,
		);
	}

	private updateBattlerQueueActions() {}

	private updateBattlerExecuteAction() {}
}
