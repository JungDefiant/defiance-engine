import { container, inject, singleton } from "tsyringe";
import ISystem from "./ISystem";
import SceneManagerSystem, {
	GameMode,
	ISceneManagerSystem,
} from "./SceneManagerSystem";
import UserInterfaceSystem, {
	IUserInterfaceSystem,
} from "./UserInterfaceSystem";
import {
	Color3,
	Material,
	Mesh,
	MeshBuilder,
	Nullable,
	PBRMaterial,
	SpriteManager,
	StandardMaterial,
	Texture,
	UniversalCamera,
	Vector3,
	Vector4,
} from "@babylonjs/core";
import { IPartyStateSystem } from "./PartyStateSystem";
import {
	AdvancedDynamicTexture,
	Container,
	Control,
	Grid,
	Rectangle,
	SlateGizmo,
	StackPanel,
} from "@babylonjs/gui";
import { Themes } from "../gui/Themes";
import DialogueManagerSystem from "./DialogueManagerSystem";

export interface ICombatManagerSystem extends ISystem {
	startCombat(encId: string): void;
}

@singleton()
export default class CombatManagerSystem implements ICombatManagerSystem {
	private activeEnemyBattlers: { data: EnemyData; sprite: SpriteManager }[] =
		[];
	private enemyData: Map<string, EnemyData> = new Map<string, EnemyData>();
	private combatGUI: Nullable<AdvancedDynamicTexture> = null;

	private readonly enemyBattlerPositions: Vector3[] = [
		new Vector3(0, 1, -1.25),
		new Vector3(1, 1, -1.5),
		new Vector3(-1, 1, -1.5),
	];

	public async start() {
		const smSystem =
			container.resolve<ISceneManagerSystem>("SceneManagerSystem");

		if (!smSystem) {
			return;
		}

		// Import dialogue files
		const allData = await import.meta.glob("/src/data/*/enemies/*.json");
		for (const path in allData) {
			const campaignId = path.split("/")[3];
			if (campaignId == smSystem.getCampaignId()) {
				const data = (await allData[path]()) as EnemyData;
				this.enemyData.set(data.id, data);
			}
		}
	}

	public update(): void {
		throw new Error("Method not implemented.");
	}

	public startCombat(encId: string): void {
		const smSystem = container.resolve(SceneManagerSystem);
		const locData = smSystem.getActiveLocationData();
		const cbtHud = container.resolve(UserInterfaceSystem).getCombatHud();
		const camera = smSystem.getActiveScene()?.activeCamera as UniversalCamera;

		if (!smSystem || !camera || !cbtHud || !locData) {
			return;
		}

		smSystem.setGameMode(GameMode.Combat);

		const viewCoords = locData.combatViewPosition;
		camera.position = new Vector3(viewCoords[0], viewCoords[1], viewCoords[2]);
		camera.setTarget(new Vector3(0, 0, -40));

		const encData = smSystem.getActiveSceneData()?.encounters[encId];

		// Test
		this.createEnemyBattlerSpriteGUI(
			this.enemyData.get("en_sc_test") as EnemyData,
			0,
		);
	}

	private createEnemyBattlerSpriteGUI(
		enemyData: EnemyData,
		index: number,
	): Nullable<Mesh> {
		const smSystem = container.resolve(SceneManagerSystem);

		if (!smSystem) {
			return null;
		}

		const scene = smSystem.getActiveScene();

		const battlerSprite = MeshBuilder.CreatePlane(
			`battlerSprite_${enemyData.id}_${index}`,
			{
				width: 1,
				height: 2,
			},
			scene,
		);

		const battlerSpriteMat = new PBRMaterial(
			`mat_battlerSprite_${enemyData.id}_${index}`,
			scene,
		);
		battlerSpriteMat.albedoTexture = new Texture(
			`./sprites/enemies/${enemyData.battlerSpriteURL}`,
			scene,
		);
		battlerSpriteMat.roughness = 0;
		battlerSpriteMat.metallic = 0;
		battlerSpriteMat.transparencyMode = 1;
		battlerSpriteMat.alphaCutOff = 0.4;
		battlerSpriteMat.useAlphaFromAlbedoTexture = true;

		battlerSprite.material = battlerSpriteMat;
		battlerSprite.billboardMode = 7;
		battlerSprite.position = this.enemyBattlerPositions[0];

		if (!this.combatGUI) {
			this.combatGUI = AdvancedDynamicTexture.CreateFullscreenUI("ui_combat");
		}

		const enBattlerUI = new StackPanel(
			`ui_enBattlerUI_${enemyData.id}_${index}`,
		);
		enBattlerUI.widthInPixels = 80;
		enBattlerUI.heightInPixels = 80;
		this.combatGUI.addControl(enBattlerUI);

		const enBattlerStatusIconsUI = new Grid(
			`ui_enBattlerStatusIcons_${enemyData.id}_${index}`,
		);
		enBattlerStatusIconsUI.widthInPixels = 60;
		enBattlerStatusIconsUI.heightInPixels = 60;
		enBattlerStatusIconsUI.addColumnDefinition(12, true);
		enBattlerStatusIconsUI.addColumnDefinition(12, true);
		enBattlerStatusIconsUI.addColumnDefinition(12, true);
		enBattlerStatusIconsUI.addColumnDefinition(12, true);
		enBattlerStatusIconsUI.addRowDefinition(12, true);
		enBattlerStatusIconsUI.addRowDefinition(12, true);
		enBattlerStatusIconsUI.addRowDefinition(12, true);
		enBattlerStatusIconsUI.addRowDefinition(12, true);
		enBattlerUI.addControl(enBattlerStatusIconsUI);

		const enBattlerActBarUIBG = new Rectangle(
			`ui_enBattlerActBarUIBG_${enemyData.id}_${index}`,
		);
		enBattlerActBarUIBG.widthInPixels = 80;
		enBattlerActBarUIBG.heightInPixels = 8;
		enBattlerActBarUIBG.background = Themes.primary3;
		enBattlerActBarUIBG.color = Themes.primary1;
		enBattlerUI.addControl(enBattlerActBarUIBG);

		const enBattlerActBarUIFill = new Rectangle(
			`ui_enBattlerActBarUIFill_${enemyData.id}_${index}`,
		);
		enBattlerActBarUIFill.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_LEFT;
		enBattlerActBarUIFill.width = 0.1;
		enBattlerActBarUIFill.height = 1;
		enBattlerActBarUIFill.background = Themes.secondary2;
		enBattlerActBarUIFill.color = Themes.secondary2;
		enBattlerActBarUIFill.thickness = 2;
		enBattlerActBarUIBG.addControl(enBattlerActBarUIFill);

		enBattlerUI.linkWithMesh(battlerSprite);
		enBattlerUI.linkOffsetY = 40;

		console.log(this.combatGUI.getChildren());

		return battlerSprite;
	}
}

export interface EnemyData {
	id: string;
	name: string;
	description: string;
	battlerSpriteURL: string;
	attributes: {
		life: number;
		will: number;
		speed: number;
		defense: number;
		critical: number;
		regen: number;
	};
	abilityIds: string[];
	itemIds: string[];
	tactics: TacticsData[];
}

interface TacticsData {
	trigger: string;
	action: string;
}
