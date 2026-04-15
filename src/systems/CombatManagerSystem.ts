import { container, delay, inject, singleton } from "tsyringe";
import ISystem from "./ISystem";
import SceneManagerSystem from "./SceneManagerSystem";
import UserInterfaceSystem from "./UserInterfaceSystem";
import { UniversalCamera, Vector3 } from "@babylonjs/core";
import GameContext, { GameMode } from "../GameContext";
import { EntityId, query } from "bitecs";
import {
	ActionData,
	AbilityDescriptor,
	ActorData,
	EffectData,
	EffectVar,
} from "../components/ActorData";
import { EnemyFactory } from "../factories/EnemyFactory";
import { clamp } from "../Utils";

export interface ICombatManagerSystem extends ISystem {
	getSelectedPlayerEID(): EntityId;
	startCombat(encId: string): Promise<void>;
	queueAction(context: GameContext, eid: EntityId, abilityId: number): void;
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
		@inject(delay(() => UserInterfaceSystem))
		private uiSystem: UserInterfaceSystem,
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
				this.executeQueuedAction(context, actorData);

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

	public queueAction(
		context: GameContext,
		eid: EntityId,
		actionInd: number,
		isItem?: boolean,
	): void {
		const actorData = context.ActorDataComponent[eid];
		actorData.queuedAction = isItem
			? actorData.itemData && (actorData.itemData[actionInd] as ActionData)
			: actorData.abilityData[actionInd];
	}

	private targetPlayerAction(
		context: GameContext,
		actionData: ActionData,
	): void {
		for (const eid of query(context.world, [context.EnemyGUIComponent])) {
			const enemyGUI = context.EnemyGUIComponent[eid];
		}
	}

	private async executeQueuedAction(
		context: GameContext,
		actorData: ActorData,
	): Promise<void> {
		const actionToExecute = await actorData.queuedAction;
		if (!actionToExecute) {
			this.gamePaused = false;
			return;
		}

		const actionEffects = actionToExecute.effectData;
		const actionTargetIds = actorData.currentTargetEIDs;
		actionTargetIds.forEach((eid) => {
			const targetData = context.ActorDataComponent[eid];
			actionEffects.forEach((eff) => {
				switch (eff.id) {
					case "damage":
						this.applyDamageEffect(
							actionToExecute.descriptors,
							eff.variables,
							actorData,
							targetData,
						);
						break;
					case "healing":
						this.applyHealEffect(
							actionToExecute.descriptors,
							eff.variables,
							actorData,
							targetData,
						);
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

	private applyDamageEffect(
		descriptors: AbilityDescriptor[],
		effVars: { [index: string]: EffectVar },
		source: ActorData,
		target: ActorData,
	) {
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
	}

	private applyHealEffect(
		descriptors: AbilityDescriptor[],
		effVars: { [index: string]: EffectVar },
		source: ActorData,
		target: ActorData,
	) {
		const targetLifeAttr = target.attributes["life"];
		const healing = effVars["healing"] as number;
		targetLifeAttr.currentValue = clamp(
			targetLifeAttr.currentValue + healing,
			0,
			targetLifeAttr.maximumValue,
		);
	}
}
