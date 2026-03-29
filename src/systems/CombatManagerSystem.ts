import { container, singleton } from "tsyringe";
import ISystem from "./ISystem";
import SceneManagerSystem, { GameMode } from "./SceneManagerSystem";
import UserInterfaceSystem from "./UserInterfaceSystem";
import {
	Mesh,
	MeshBuilder,
	Nullable,
	PBRMaterial,
	SpriteManager,
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
import ActorStateSystem, { ActorData } from "./ActorStateSystem";

export interface ICombatManagerSystem extends ISystem {
	startCombat(encId: string): void;
}

@singleton()
export default class CombatManagerSystem implements ICombatManagerSystem {
	private combatGUI: Nullable<AdvancedDynamicTexture> = null;
	private playerBattlers: ActorData[] = [];
	private enemyBattlers: ActorData[] = [];

	private readonly enemyBattlerPositions: Vector3[] = [
		new Vector3(0, 1, -1.25),
		new Vector3(1, 1, -1.5),
		new Vector3(-1, 1, -1.5),
	];

	public async start() {
		const smSystem = container.resolve(SceneManagerSystem);

		if (!smSystem) {
			return;
		}
	}

	public update(): void {}

	public startCombat(encId: string): void {
		const smSystem = container.resolve(SceneManagerSystem);
		const asSystem = container.resolve(ActorStateSystem);
		const cbtHud = container.resolve(UserInterfaceSystem).getCombatHud();
		const locData = smSystem.getActiveLocationData();
		const camera = smSystem.getActiveScene()?.activeCamera as UniversalCamera;

		if (!smSystem || !asSystem || !camera || !cbtHud || !locData) {
			return;
		}

		smSystem.setGameMode(GameMode.Combat);

		const viewCoords = locData.combatViewPosition;
		camera.position = new Vector3(viewCoords[0], viewCoords[1], viewCoords[2]);
		camera.setTarget(new Vector3(0, 0, -40));

		const encData = smSystem.getActiveSceneData()?.encounters[encId];

		/*
		To Do:
		1. Figure out how to store battler data
		2. Hook up sprite/GUI to battler data
		3. Set up per-frame updates of battler data
		4. Queue battler actions based on tactics (overridden by player input)
		5. Execute actions - pauses combat to process action
		*/

		// Test
		this.createEnemyBattler(
			asSystem.getActorDataById("en_sc_test") as ActorData,
			0,
		);
		this.createEnemyBattler(
			asSystem.getActorDataById("en_sc_test") as ActorData,
			1,
		);
		this.createEnemyBattler(
			asSystem.getActorDataById("en_sc_test") as ActorData,
			2,
		);
	}

	private createEnemyBattler(enBattlerData: ActorData, index: number): void {
		const smSystem = container.resolve(SceneManagerSystem);

		if (!smSystem) {
			return;
		}

		const scene = smSystem.getActiveScene();

		const enBattlerSprite = MeshBuilder.CreatePlane(
			`enBattlerSprite_${enBattlerData.id}_${index}`,
			{
				width: 1,
				height: 2,
			},
			scene,
		);

		const enBattlerSpriteMat = new PBRMaterial(
			`mat_enBattlerSprite_${enBattlerData.id}_${index}`,
			scene,
		);
		enBattlerSprite.billboardMode = 7;
		enBattlerSprite.position = this.enemyBattlerPositions[index];

		enBattlerSpriteMat.albedoTexture = new Texture(
			`./sprites/enemies/${enBattlerData.spriteUrl}`,
			scene,
		);
		enBattlerSpriteMat.metallic = 0;
		enBattlerSpriteMat.roughness = 0;
		enBattlerSpriteMat.alphaCutOff = 0.4;
		enBattlerSpriteMat.transparencyMode = 1;
		enBattlerSpriteMat.useAlphaFromAlbedoTexture = true;

		enBattlerSprite.material = enBattlerSpriteMat;

		if (!this.combatGUI) {
			this.combatGUI = AdvancedDynamicTexture.CreateFullscreenUI("ui_combat");
		}

		const enBattlerUI = new StackPanel(
			`ui_enBattlerUI_${enBattlerData.id}_${index}`,
		);
		enBattlerUI.widthInPixels = 80;
		enBattlerUI.heightInPixels = 80;
		this.combatGUI.addControl(enBattlerUI);

		const enBattlerStatusIconsUI = new Grid(
			`ui_enBattlerStatusIcons_${enBattlerData.id}_${index}`,
		);
		enBattlerStatusIconsUI.widthInPixels = 60;
		enBattlerStatusIconsUI.heightInPixels = 60;
		for (let i = 0; i < 4; i++) {
			enBattlerStatusIconsUI.addRowDefinition(12, true);
			enBattlerStatusIconsUI.addColumnDefinition(12, true);
		}
		enBattlerUI.addControl(enBattlerStatusIconsUI);

		const enBattlerActBarUIBG = new Rectangle(
			`ui_enBattlerActBarUIBG_${enBattlerData.id}_${index}`,
		);
		enBattlerActBarUIBG.widthInPixels = 80;
		enBattlerActBarUIBG.heightInPixels = 8;
		enBattlerActBarUIBG.thickness = 1.2;
		enBattlerActBarUIBG.color = Themes.primary1;
		enBattlerActBarUIBG.background = Themes.primary3;
		enBattlerUI.addControl(enBattlerActBarUIBG);

		const enBattlerActBarUIFill = new Rectangle(
			`ui_enBattlerActBarUIFill_${enBattlerData.id}_${index}`,
		);
		enBattlerActBarUIFill.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_LEFT;
		enBattlerActBarUIFill.width = 0.1;
		enBattlerActBarUIFill.height = 1;
		enBattlerActBarUIFill.color = Themes.secondary2;
		enBattlerActBarUIFill.background = Themes.secondary2;
		enBattlerActBarUIBG.addControl(enBattlerActBarUIFill);

		enBattlerUI.linkWithMesh(enBattlerSprite);
		enBattlerUI.linkOffsetY = 40;

		this.enemyBattlers.push(enBattlerData);
	}

	private updateBattlerRecovery() {}

	private updateBattlerQueueActions() {}

	private updateBattlerExecuteAction() {}
}
