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
import { ActorFactory } from "../factories/ActorFactory";
import { ActorData } from "../components/ActorData";

export interface ICombatManagerSystem extends ISystem {
	startCombat(encId: string): Promise<void>;
}

@singleton()
export default class CombatManagerSystem implements ICombatManagerSystem {
	private combatGUI: Nullable<AdvancedDynamicTexture> = null;

	private readonly enemyBattlerPositions: Vector3[] = [
		new Vector3(0, 1, -1.25),
		new Vector3(1, 1, -1.5),
		new Vector3(-1, 1, -1.5),
	];

	public constructor(
		@inject(ActorFactory) private actFactory: ActorFactory,
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
		const cbtHud = this.uiSystem.getCombatHud();
		const locData = context.locationData;
		const camera = context.scene.activeCamera as UniversalCamera;

		if (!this.smSystem || !camera || !cbtHud || !locData) {
			return;
		}

		this.smSystem.setGameMode(GameMode.Combat);

		const viewCoords = locData.combatViewPosition;
		camera.position = new Vector3(viewCoords[0], viewCoords[1], viewCoords[2]);
		camera.setTarget(new Vector3(0, 0, -40));

		const encData = context.sceneData.encounters[encId];

		/*
		To Do:
		1. Figure out how to store battler data
		2. Hook up sprite/GUI to battler data
		3. Set up per-frame updates of battler data
		4. Queue battler actions based on tactics (overridden by player input)
		5. Execute actions - pauses combat to process action
		*/

		// Test
		this.createEnemyBattler("enem_test", 0);
		this.createEnemyBattler("enem_test", 1);
		this.createEnemyBattler("enem_test", 2);
	}

	private async createEnemyBattler(
		fileName: string,
		index: number,
	): Promise<void> {
		const context = container.resolve(GameContext);
		const scene = context.scene;
		const enEntity = await this.actFactory.createActorEntityFromFile(
			`enemies/${fileName}`,
			context.campaignId,
		);

		const enActorData = context.ActorComponent[enEntity];

		const enActorSprite = MeshBuilder.CreatePlane(
			`enBattlerSprite_${enActorData.id}_${index}`,
			{
				width: 1,
				height: 2,
			},
			scene,
		);

		const enActorSpriteMat = new PBRMaterial(
			`mat_enBattlerSprite_${enActorData.id}_${index}`,
			scene,
		);
		enActorSprite.billboardMode = 7;
		enActorSprite.position = this.enemyBattlerPositions[index];

		enActorSpriteMat.albedoTexture = new Texture(
			`./sprites/enemies/${enActorData.spriteUrl}`,
			scene,
		);
		enActorSpriteMat.metallic = 0;
		enActorSpriteMat.roughness = 0;
		enActorSpriteMat.alphaCutOff = 0.4;
		enActorSpriteMat.transparencyMode = 1;
		enActorSpriteMat.useAlphaFromAlbedoTexture = true;

		enActorSprite.material = enActorSpriteMat;
		addComponent(context.world, enEntity, enActorSprite);

		if (!this.combatGUI) {
			this.combatGUI = AdvancedDynamicTexture.CreateFullscreenUI("ui_combat");
		}

		const enBattlerUI = new StackPanel(
			`ui_enBattlerUI_${enActorData.id}_${index}`,
		);
		enBattlerUI.widthInPixels = 80;
		enBattlerUI.heightInPixels = 80;
		this.combatGUI.addControl(enBattlerUI);

		const enBattlerStatusIconsUI = new Grid(
			`ui_enBattlerStatusIcons_${enActorData.id}_${index}`,
		);
		enBattlerStatusIconsUI.widthInPixels = 60;
		enBattlerStatusIconsUI.heightInPixels = 60;
		for (let i = 0; i < 4; i++) {
			enBattlerStatusIconsUI.addRowDefinition(12, true);
			enBattlerStatusIconsUI.addColumnDefinition(12, true);
		}
		enBattlerUI.addControl(enBattlerStatusIconsUI);

		const enBattlerActBarUIBG = new Rectangle(
			`ui_enBattlerActBarUIBG_${enActorData.id}_${index}`,
		);
		enBattlerActBarUIBG.widthInPixels = 80;
		enBattlerActBarUIBG.heightInPixels = 8;
		enBattlerActBarUIBG.thickness = 1.2;
		enBattlerActBarUIBG.color = Themes.primary1;
		enBattlerActBarUIBG.background = Themes.primary3;
		enBattlerUI.addControl(enBattlerActBarUIBG);

		const enBattlerActBarUIFill = new Rectangle(
			`ui_enBattlerActBarUIFill_${enActorData.id}_${index}`,
		);
		enBattlerActBarUIFill.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_LEFT;
		enBattlerActBarUIFill.width = 0.1;
		enBattlerActBarUIFill.height = 1;
		enBattlerActBarUIFill.color = Themes.secondary2;
		enBattlerActBarUIFill.background = Themes.secondary2;
		enBattlerActBarUIBG.addControl(enBattlerActBarUIFill);

		enBattlerUI.linkWithMesh(enActorSprite);
		enBattlerUI.linkOffsetY = 40;
		addComponent(context.world, enEntity, enBattlerUI);
	}

	private updateBattlerQueueActions() {}

	private updateBattlerExecuteAction() {}
}
