import {
	Control,
	Rectangle,
	Image,
	StackPanel,
	Container,
	AdvancedDynamicTexture,
} from "@babylonjs/gui";
import { EntityId } from "bitecs";
import { Themes } from "../gui/Themes";
import { Component } from "./Component";
import ActorStateComponent from "./ActorStateComponent";
import { getComponentRegistry } from "src/modules/ComponentModule";
import CharacterSpriteComponent from "./CharacterSpriteComponent";

export default class EnemyGUIComponent implements Component {
	private rootContainer: StackPanel;
	private targetingUI: Image;
	private lifeBarBGUI: Rectangle;
	private lifeBarFillUI: Rectangle;

	public constructor(eid: EntityId, sceneGUI: AdvancedDynamicTexture) {
		const enemyActorState =
			getComponentRegistry().getComponentByEntityId<ActorStateComponent>(
				ActorStateComponent.name,
				eid,
			);
		const enemySprite =
			getComponentRegistry().getComponentByEntityId<CharacterSpriteComponent>(
				CharacterSpriteComponent.name,
				eid,
			);

		this.rootContainer = new StackPanel(
			`ui_enBattlerUI_${enemyActorState.id}_${eid}`,
		);
		this.rootContainer.widthInPixels = 24;
		this.rootContainer.heightInPixels = 24;
		sceneGUI.addControl(this.rootContainer);

		this.targetingUI = new Image(
			`ui_enBattlerTargetings_${eid}`,
			"sprites/particles/magic_03.png",
		);
		this.targetingUI.widthInPixels = 20;
		this.targetingUI.heightInPixels = 20;
		this.targetingUI.shadowOffsetX = 4;
		this.targetingUI.shadowOffsetY = 4;
		this.targetingUI.onPointerEnterObservable.add(() => {
			this.targetingUI.shadowColor = "red";
		});
		this.targetingUI.onPointerOutObservable.add(() => {
			this.targetingUI.shadowColor = "#00000000";
		});
		this.targetingUI.onPointerClickObservable.add(() => {});
		this.targetingUI.isVisible = false;
		this.rootContainer.addControl(this.targetingUI);

		this.lifeBarBGUI = this.createBarBgUI(
			eid,
			"enBattlerLifeBarUIBG",
			Themes.primary1,
			Themes.primary3,
		);
		this.rootContainer.addControl(this.lifeBarBGUI);

		this.lifeBarFillUI = this.createBarFillUI(
			eid,
			"enBattlerLifeBarUIFill_",
			Themes.secondary3,
		);
		this.lifeBarBGUI.addControl(this.lifeBarFillUI);

		this.lifeBarBGUI.isVisible = false;

		this.rootContainer.linkWithMesh(enemySprite);
		this.rootContainer.linkOffsetY = 8;
	}

	public getValue(): EnemyGUIComponent {
		return this;
	}

	public dispose(): void {
		this.rootContainer.dispose();
	}

	public getRoot(): Container {
		return this.rootContainer;
	}

	public setLifeBarFill(currValue: number, maxValue: number): void {
		this.lifeBarFillUI.width = Math.max(
			0,
			Math.min(1, currValue / maxValue || 0),
		);
	}

	public setLifeBarVisible(isVisible: boolean): void {
		this.lifeBarBGUI.isVisible = isVisible;
	}

	public setTargetingCallback(newCallback: Function): void {
		this.targetingUI.onPointerClickObservable.addOnce(() => newCallback());
	}

	public removeTargetingCallback(): void {
		this.targetingUI.onPointerClickObservable.clear();
	}

	public setVisibleTargetingUI(isVisible: boolean): void {
		this.targetingUI.isVisible = isVisible;
	}

	private createBarBgUI(
		eid: EntityId,
		name: string,
		color: string,
		background: string,
	): Rectangle {
		const barBGUI = new Rectangle(`ui_${name}_${eid}`);
		barBGUI.widthInPixels = 20;
		barBGUI.heightInPixels = 4;
		barBGUI.thickness = 1;
		barBGUI.color = color;
		barBGUI.background = background;
		return barBGUI;
	}

	private createBarFillUI(
		eid: EntityId,
		name: string,
		color: string,
	): Rectangle {
		const barFillUI = new Rectangle(`ui_${name}_${eid}`);
		barFillUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		barFillUI.width = 0.1;
		barFillUI.height = 1;
		barFillUI.color = color;
		barFillUI.background = color;
		return barFillUI;
	}
}
