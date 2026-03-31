import { EntityId } from "bitecs";
import { ActorAttribute, ActorData } from "../components/ActorData";
import {
	Mesh,
	MeshBuilder,
	PBRMaterial,
	Texture,
	Vector3,
} from "@babylonjs/core";
import GameContext from "../GameContext";
import {
	Container,
	Control,
	Grid,
	Rectangle,
	StackPanel,
} from "@babylonjs/gui";
import { Themes } from "../gui/Themes";

export function CreateActorComponent(rawData: any): ActorData {
	const newActorData = {} as ActorData;
	newActorData.id = rawData.id;
	newActorData.name = rawData.name;
	newActorData.backstory = rawData.backstory;
	newActorData.description = rawData.description;
	newActorData.spriteUrl = rawData.spriteUrl;
	newActorData.attributes = {
		life: {
			baseValue: rawData.attributes.life,
		} as ActorAttribute,
		will: {
			baseValue: rawData.attributes.life,
		} as ActorAttribute,
		speed: {
			baseValue: rawData.attributes.life,
		} as ActorAttribute,
		defense: {
			baseValue: rawData.attributes.life,
		} as ActorAttribute,
		critical: {
			baseValue: rawData.attributes.life,
		} as ActorAttribute,
		regen: {
			baseValue: rawData.attributes.life,
		} as ActorAttribute,
	};
	// newActorData.affinityData = this.affinityData.get(rawData.affinityId);
	// newActorData.abilityData = rawData.abilityIds.map((el: string) => {
	// 	return this.actionData.get(el);
	// });
	// newActorData.itemData = rawData.itemIds.map((el: string) => {
	// 	return this.actionData.get(el);
	// });
	newActorData.tactics = rawData.tactics;
	return newActorData;
}

export function CreateEnemySprite(
	eid: EntityId,
	context: GameContext,
	position: Vector3,
): Mesh {
	const actorData = context.ActorComponent[eid];

	const enActorSprite = MeshBuilder.CreatePlane(
		`enBattlerSprite_${actorData.id}_${eid}`,
		{
			width: 1,
			height: 2,
		},
		context.scene,
	);

	const enActorSpriteMat = new PBRMaterial(
		`mat_enBattlerSprite_${actorData.id}_${eid}`,
		context.scene,
	);
	enActorSprite.billboardMode = 7;
	enActorSprite.position = position;

	enActorSpriteMat.albedoTexture = new Texture(
		`./sprites/enemies/${actorData.spriteUrl}`,
		context.scene,
	);
	enActorSpriteMat.metallic = 0;
	enActorSpriteMat.roughness = 0;
	enActorSpriteMat.alphaCutOff = 0.4;
	enActorSpriteMat.transparencyMode = 1;
	enActorSpriteMat.useAlphaFromAlbedoTexture = true;

	enActorSprite.material = enActorSpriteMat;
	return enActorSprite;
}

export function CreateEnemyGUI(
	eid: EntityId,
	context: GameContext,
	sprite: Mesh,
): Container {
	const enActorData = context.ActorComponent[eid];

	const enBattlerUI = new StackPanel(`ui_enBattlerUI_${enActorData.id}_${eid}`);
	enBattlerUI.widthInPixels = 80;
	enBattlerUI.heightInPixels = 80;
	context.combatGUI.addControl(enBattlerUI);

	const enBattlerStatusIconsUI = new Grid(
		`ui_enBattlerStatusIcons_${enActorData.id}_${eid}`,
	);
	enBattlerStatusIconsUI.widthInPixels = 60;
	enBattlerStatusIconsUI.heightInPixels = 60;
	for (let i = 0; i < 4; i++) {
		enBattlerStatusIconsUI.addRowDefinition(12, true);
		enBattlerStatusIconsUI.addColumnDefinition(12, true);
	}
	enBattlerUI.addControl(enBattlerStatusIconsUI);

	const enBattlerActBarUIBG = new Rectangle(
		`ui_enBattlerActBarUIBG_${enActorData.id}_${eid}`,
	);
	enBattlerActBarUIBG.widthInPixels = 80;
	enBattlerActBarUIBG.heightInPixels = 8;
	enBattlerActBarUIBG.thickness = 1.2;
	enBattlerActBarUIBG.color = Themes.primary1;
	enBattlerActBarUIBG.background = Themes.primary3;
	enBattlerUI.addControl(enBattlerActBarUIBG);

	const enBattlerActBarUIFill = new Rectangle(
		`ui_enBattlerActBarUIFill_${enActorData.id}_${eid}`,
	);
	enBattlerActBarUIFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
	enBattlerActBarUIFill.width = 0.1;
	enBattlerActBarUIFill.height = 1;
	enBattlerActBarUIFill.color = Themes.secondary2;
	enBattlerActBarUIFill.background = Themes.secondary2;
	enBattlerActBarUIBG.addControl(enBattlerActBarUIFill);

	enBattlerUI.linkWithMesh(sprite);
	enBattlerUI.linkOffsetY = 40;

	return enBattlerUI;
}
