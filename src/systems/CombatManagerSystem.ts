import { container, delay, inject, singleton } from "tsyringe";
import ISystem from "./ISystem";
import SceneManagerSystem from "./SceneManagerSystem";
import UserInterfaceSystem from "./UserInterfaceSystem";
import { UniversalCamera, Vector3 } from "@babylonjs/core";
import GameContext, { GameMode } from "../GameContext";
import { EntityId, query } from "bitecs";
import {
	ActionData,
	ActionDescriptor,
	ActionTarget,
	ActorData,
	EffectData,
	EffectVar,
} from "../components/ActorData";
import { EnemyFactory } from "../factories/EnemyFactory";
import { clamp } from "../Utils";
import RenderQueueSystem, {
	RenderQueueEntry,
	RenderQueueType,
	RenderQueueVarsSpecialFX,
} from "./RenderQueueSystem";
import { Themes } from "../gui/Themes";

export interface ICombatManagerSystem extends ISystem {
	getSelectedPlayerEID(): EntityId;
	startCombat(encId: string): Promise<void>;
	startQueueAction(
		context: GameContext,
		eid: EntityId,
		abilityId: number,
	): void;
}

@singleton()
export default class CombatManagerSystem implements ICombatManagerSystem {
	private gamePaused = true;
	private currentPlayerEID = -1;

	private readonly START_RECOVERY = 3;
	private readonly START_RECOVERY_RANGE = 2;

	public constructor(
		@inject(EnemyFactory) private enFactory: EnemyFactory,
		@inject(delay(() => SceneManagerSystem))
		private smSystem: SceneManagerSystem,
		@inject(delay(() => RenderQueueSystem))
		private rqeSystem: RenderQueueSystem,
	) {}

	public getSelectedPlayerEID(): EntityId {
		return this.currentPlayerEID;
	}

	public async start() {}

	public update(deltaTime: number): void {
		if (this.gamePaused) {
			return;
		}

		const context = container.resolve(GameContext);
		for (const eid of query(context.world, [context.ActorDataComponent])) {
			const actorData = context.ActorDataComponent[eid];
			const rcvyAttr = actorData.attributes["recovery"];
			if (
				actorData.queuedAction &&
				rcvyAttr.currentValue === rcvyAttr.maximumValue
			) {
				this.gamePaused = true;
				this.executeQueuedAction(context, eid, actorData);

				// TEMP
				this.gamePaused = false;
			}
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
		- Queue battler actions based on tactics (overridden by player input)
		- Execute actions - pauses combat to process action
		*/

		await this.enFactory.createEntityFromFile("enem_test", context.campaignId);
		await this.enFactory.createEntityFromFile("enem_test", context.campaignId);
		await this.enFactory.createEntityFromFile("enem_test", context.campaignId);

		await context.combatHud.setActionBar(context.selectedPlayerEID);

		for (const eid of query(context.world, [context.ActorDataComponent])) {
			const actorData = context.ActorDataComponent[eid];
			const rcvyAttr = actorData.attributes["recovery"];
			rcvyAttr.maximumValue =
				this.START_RECOVERY + Math.random() * this.START_RECOVERY_RANGE;
			rcvyAttr.currentValue = 0;
		}

		this.gamePaused = false;
	}

	public async startQueueAction(
		context: GameContext,
		eid: EntityId,
		actionInd: number,
		isItem?: boolean,
	): Promise<void> {
		console.log("Q ACTION");
		const actorData = context.ActorDataComponent[eid];
		const actionData = (await (isItem
			? actorData.itemData && actorData.itemData[actionInd]
			: actorData.abilityData[actionInd])) as ActionData;

		if (actorData.isPlayer) {
			this.setPlayerActionTargeting(context, eid, actionData);
		} else {
		}
	}

	private async setPlayerActionTargeting(
		context: GameContext,
		sourceEid: EntityId,
		actionData: ActionData,
	): Promise<void> {
		console.log(actionData);
		switch (actionData.target) {
			case ActionTarget.singleEnemy:
				for (const eid of query(context.world, [context.EnemyGUIComponent])) {
					const enemyGUI = context.EnemyGUIComponent[eid];
					enemyGUI.setVisibleTargetingUI(true);
					enemyGUI.setTargetingCallback(() => {
						this.finishQueueAction(context, actionData, sourceEid, [eid]);
						context.EnemyGUIComponent.forEach((gui) =>
							gui.setVisibleTargetingUI(false),
						);
					});
				}
				return;
			default:
				return;
		}
	}

	private finishQueueAction(
		context: GameContext,
		actionData: ActionData,
		sourceEid: EntityId,
		targetEids: EntityId[],
	): void {
		const actorData = context.ActorDataComponent[sourceEid];
		actorData.queuedAction = actionData;
		actorData.currentTargetEIDs = targetEids;
	}

	private async executeQueuedAction(
		context: GameContext,
		sourceEid: EntityId,
		actorData: ActorData,
	): Promise<void> {
		const actionToExecute = await actorData.queuedAction;
		if (!actionToExecute) {
			this.gamePaused = false;
			return;
		}

		const actionEffects = actionToExecute.effectData;
		const actionTargetIds = actorData.currentTargetEIDs;

		this.addActionRQEs(sourceEid, actionTargetIds, actionToExecute);

		actionTargetIds.forEach((eid) => {
			const targetData = context.ActorDataComponent[eid];
			let ftText;
			actionEffects.forEach((eff) => {
				switch (eff.id) {
					case "damage":
						ftText = this.applyDamageEffect(
							actionToExecute.descriptors,
							eff.variables,
							actorData,
							targetData,
						);
						this.addFloatingTextRQE(eid, ftText, Themes.secondary1);
						break;
					case "healing":
						ftText = this.applyHealEffect(
							actionToExecute.descriptors,
							eff.variables,
							actorData,
							targetData,
						);
						this.addFloatingTextRQE(eid, ftText, Themes.secondary3);
						break;
					default:
						return;
				}
			});
		});

		const rcvyAttr = actorData.attributes["recovery"];
		rcvyAttr.maximumValue = actionToExecute.recovery || 0.5;
		rcvyAttr.currentValue = 0;

		/*
			Note: This could potentially be set up as a chain of functions called on
			each target, but for now this works.
		*/
	}

	private addActionRQEs(
		sourceEid: EntityId,
		targetEids: EntityId[],
		actionData: ActionData,
	) {
		const castRQE = new RenderQueueEntry(
			RenderQueueType.SpecialFX,
			{
				targets: [sourceEid],
				vfxUrl: actionData.castVfxURL as string,
				audioUrl: actionData.castSfxURL as string,
			} as RenderQueueVarsSpecialFX,
			true,
			0.5,
		);

		const hitRQE = new RenderQueueEntry(
			RenderQueueType.SpecialFX,
			{
				targets: targetEids,
				vfxUrl: actionData.hitVfxURL as string,
				audioUrl: actionData.hitSfxURL as string,
			} as RenderQueueVarsSpecialFX,
			true,
			0.5,
		);

		this.rqeSystem.addRenderQueueEntry(castRQE);
		this.rqeSystem.addRenderQueueEntry(hitRQE);
	}

	private addFloatingTextRQE(targetEid: number, text: string, color: string) {
		const ftRQE = new RenderQueueEntry(
			RenderQueueType.FloatingText,
			{
				targets: [targetEid],
				text,
				color,
			},
			false,
			0.5,
		);

		this.rqeSystem.addRenderQueueEntry(ftRQE);
	}

	private applyDamageEffect(
		descriptors: ActionDescriptor[],
		effVars: { [index: string]: EffectVar },
		source: ActorData,
		target: ActorData,
	): string {
		const targetLifeAttr = target.attributes["life"];
		const targetDefenseAttr = target.attributes["defense"];
		const damage = effVars["damage"] as number;

		const damageMult = 10 / targetDefenseAttr.currentValue;

		const totalDamage = damage * damageMult;
		targetLifeAttr.currentValue = clamp(
			targetLifeAttr.currentValue - totalDamage,
			0,
			targetLifeAttr.maximumValue,
		);

		return totalDamage.toString();
	}

	private applyHealEffect(
		descriptors: ActionDescriptor[],
		effVars: { [index: string]: EffectVar },
		source: ActorData,
		target: ActorData,
	): string {
		const targetLifeAttr = target.attributes["life"];
		const healing = effVars["healing"] as number;
		targetLifeAttr.currentValue = clamp(
			targetLifeAttr.currentValue + healing,
			0,
			targetLifeAttr.maximumValue,
		);

		return healing.toString();
	}
}
