import { container, delay, inject, singleton } from "tsyringe";
import ISystem from "src/systems/ISystem";
import SceneManagerSystem from "src/systems/SceneManagerSystem";
import { UniversalCamera, Vector3 } from "@babylonjs/core";
import GameState, { GameMode } from "src/GameState";
import { EntityId, query, removeEntity } from "bitecs";
import {
	AbilityData,
	ActionDescriptor,
	ActionTarget,
	ActionTrigger,
	ActorData,
	EffectData,
	EffectVar,
} from "src/components/ActorData";
import { EnemyFactory } from "src/factories/EnemyFactory";
import { clamp } from "src/Utils";
import RenderQueueSystem, {
	RenderQueueEntry,
	RenderQueueType,
	RenderQueueVarsSpecialFX,
} from "./RenderQueueSystem";
import { Themes } from "src/gui/Themes";
import { DEFAULT_CAM_TARGET as DEFAULT_CAM_TARGET } from "src/Constants";

/*
TO DO
- Remove dependencies to other systems by processing through components or events
*/
@singleton()
export default class CombatManagerSystem implements ISystem {
	private readonly START_RECOVERY = 3;
	private readonly START_RECOVERY_RANGE = 2;
	private readonly BASE_DEFENSE = 10;

	public constructor(
		@inject(EnemyFactory) private enFactory: EnemyFactory,
		@inject(delay(() => SceneManagerSystem))
		private smSystem: SceneManagerSystem,
		@inject(delay(() => RenderQueueSystem))
		private rqeSystem: RenderQueueSystem,
	) {}

	public async start() {}

	public update(deltaTime: number): void {
		const gameState = container.resolve(GameState);

		if (gameState.gameMode !== GameMode.Combat) {
			return;
		}

		if (gameState.actionPaused) {
			if (this.rqeSystem.getIsStarted()) {
				return;
			} else {
				gameState.actionPaused = false;
			}
		}

		for (const eid of query(gameState.world, [gameState.ActorDataComponent])) {
			const actorData = gameState.ActorDataComponent[eid];
			const rcvyAttr = actorData.attributes.recovery;

			if (!actorData.queuedAction && eid !== gameState.selectedPlayerEID) {
				/* TEST */
				const randomActionInd = Math.random() * actorData.powerData.length;
				this.startQueueAction(gameState, eid, 0);
				/* TEST */
			}

			if (
				actorData.queuedAction &&
				rcvyAttr.currentValue === rcvyAttr.maximumValue
			) {
				gameState.actionPaused = true;
				this.executeQueuedAction(gameState, actorData);
			}
		}
	}

	public async startCombat(encId: string): Promise<void> {
		const gameState = container.resolve(GameState);
		const locData = gameState.locationData;
		const camera = gameState.scene.activeCamera as UniversalCamera;

		this.smSystem.setGameMode(GameMode.Combat);

		const viewCoords = locData.combatViewPosition;
		camera.position = new Vector3(viewCoords[0], viewCoords[1], viewCoords[2]);
		camera.setTarget(DEFAULT_CAM_TARGET);

		const encData = gameState.sceneData.encounters[encId];

		/*
		To Do:
		- Queue battler actions based on tactics (overridden by player input)
		*/

		/* TEST */
		gameState.enemyEIDs.push(
			await this.enFactory.createEntityFromFile(
				"enem_test",
				gameState.campaignId,
			),
		);
		// gameState.enemyEIDs.push(
		// 	await this.enFactory.createEntityFromFile(
		// 		"enem_test",
		// 		gameState.campaignId,
		// 	),
		// );
		// gameState.enemyEIDs.push(
		// 	await this.enFactory.createEntityFromFile(
		// 		"enem_test",
		// 		gameState.campaignId,
		// 	),
		// );
		/* TEST */

		console.log("START COMBAT");

		await gameState.combatHud.setActionBar(gameState.selectedPlayerEID);

		for (const eid of query(gameState.world, [gameState.ActorDataComponent])) {
			const actorData = gameState.ActorDataComponent[eid];
			const rcvyAttr = actorData.attributes.recovery;
			const initRange = Math.random() * this.START_RECOVERY_RANGE;
			rcvyAttr.maximumValue = this.START_RECOVERY + initRange;
			console.log("INIT RANGE", initRange);
			console.log("INIT RECOV VALUE", rcvyAttr.maximumValue);
			rcvyAttr.currentValue = 0;
		}

		gameState.actionPaused = false;
	}

	private endCombat() {
		const gameState = container.resolve(GameState);
		const locData = gameState.locationData;
		const camera = gameState.scene.activeCamera as UniversalCamera;

		gameState.enemyEIDs.forEach((eid) => {
			removeEntity(gameState.world, eid);
		});

		gameState.playerEIDs.forEach((eid) => {
			const playerData = gameState.ActorDataComponent[eid];
			const rcvyAttr = playerData.attributes.recovery;
			rcvyAttr.maximumValue = 0;
			playerData.queuedAction = null;
			console.log("RECOV CURR VALUE", rcvyAttr.currentValue);
			console.log("RECOV MAX VALUE", rcvyAttr.maximumValue);
		});

		const viewCoords = locData.exploreViewPosition;
		camera.position = new Vector3(viewCoords[0], viewCoords[1], viewCoords[2]);
		camera.setTarget(DEFAULT_CAM_TARGET);

		gameState.actionPaused = false;

		this.smSystem.setGameMode(GameMode.Explore);
	}

	public async startQueueAction(
		gameState: GameState,
		eid: EntityId,
		actionInd: number,
		isItem?: boolean,
	): Promise<void> {
		const actorData = gameState.ActorDataComponent[eid];
		const actionData = (await (isItem
			? actorData.itemData && actorData.itemData[actionInd]
			: actorData.powerData[actionInd])) as AbilityData;

		if (actionData.trigger != ActionTrigger.onActionExecute) {
			return;
		}

		if (eid === gameState.selectedPlayerEID) {
			this.setPlayerActionTargeting(gameState, eid, actionData);
		} else {
			this.setNPCActionTargeting(gameState, eid, actionData);
		}
	}

	private setPlayerActionTargeting(
		gameState: GameState,
		sourceEid: EntityId,
		actionData: AbilityData,
	): void {
		switch (actionData.target) {
			case ActionTarget.singleEnemy:
				for (const eid of query(gameState.world, [
					gameState.EnemyGUIComponent,
				])) {
					const enemyGUI = gameState.EnemyGUIComponent[eid];
					enemyGUI.setVisibleTargetingUI(true);
					enemyGUI.setTargetingCallback(() => {
						this.finishQueueAction(gameState, actionData, sourceEid, [eid]);
						gameState.EnemyGUIComponent.forEach((gui) =>
							gui.setVisibleTargetingUI(false),
						);
					});
				}
				return;
			default:
				return;
		}
	}

	private async setNPCActionTargeting(
		gameState: GameState,
		sourceEid: EntityId,
		actionData: AbilityData,
	) {
		switch (actionData.target) {
			case ActionTarget.singleEnemy:
				/* TEST */
				this.finishQueueAction(gameState, actionData, sourceEid, [
					gameState.selectedPlayerEID,
				]);
				/* TEST */
				return;
			default:
				return;
		}
	}

	private finishQueueAction(
		gameState: GameState,
		actionData: AbilityData,
		sourceEid: EntityId,
		targetEids: EntityId[],
	): void {
		const actorData = gameState.ActorDataComponent[sourceEid];
		actorData.queuedAction = actionData;
		actorData.currentTargetEIDs = targetEids;
	}

	private async executeQueuedAction(
		gameState: GameState,
		actorData: ActorData,
	): Promise<void> {
		const actionToExecute = await actorData.queuedAction;
		if (!actionToExecute) {
			gameState.actionPaused = false;
			return;
		}

		const actionEffects = actionToExecute.effectData;
		const actionTargetIds = actorData.currentTargetEIDs;

		// this.addActionRQEs(sourceEid, actionTargetIds, actionToExecute);

		actionTargetIds.forEach((eid) => {
			const targetData = gameState.ActorDataComponent[eid];
			this.processAbilityEffects(
				actorData,
				targetData,
				actionEffects,
				actionToExecute.descriptors,
			);
		});

		this.rqeSystem.startRenderQueue();

		const rcvyAttr = actorData.attributes.recovery;
		rcvyAttr.maximumValue = actionToExecute.recovery || 0.5;
		rcvyAttr.currentValue = 0;

		/*
			Note: This could potentially be set up as a chain of functions called on
			each target, but for now this works.
		*/
	}

	private processAbilityEffects(
		sourceData: ActorData,
		targetData: ActorData,
		actionEffects: EffectData[],
		descriptors: ActionDescriptor[],
		context?: { [index: string]: EffectVar },
	) {
		let ftText;
		actionEffects.forEach((eff) => {
			switch (eff.id) {
				case "damage":
					ftText = this.applyDamageEffect(sourceData, targetData, descriptors, {
						...eff.variables,
						...context,
					});
					this.addFloatingTextRQE(
						targetData.entityId,
						ftText,
						Themes.secondary3,
					);
					break;
				case "healing":
					ftText = this.applyHealEffect(sourceData, targetData, descriptors, {
						...eff.variables,
						...context,
					});
					this.addFloatingTextRQE(
						targetData.entityId,
						ftText,
						Themes.secondary1,
					);
					break;
				default:
					return;
			}
		});
	}

	private addActionRQEs(
		sourceEid: EntityId,
		targetEids: EntityId[],
		actionData: AbilityData,
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
			true,
			1,
		);

		this.rqeSystem.addRenderQueueEntry(ftRQE);
	}

	private triggerSkillEffects(
		sourceData: ActorData,
		targetData: ActorData,
		trigger: ActionTrigger,
		context?: { [index: string]: EffectVar },
	) {
		const triggeredSkills = sourceData.skillData.filter(
			(x) => x.trigger === trigger,
		);
		triggeredSkills.forEach((skill) => {
			this.processAbilityEffects(
				sourceData,
				targetData,
				skill.effectData,
				skill.descriptors,
				context,
			);
		});
	}

	private applyDamageEffect(
		source: ActorData,
		target: ActorData,
		descriptors: ActionDescriptor[],
		effVars: { [index: string]: EffectVar },
	): string {
		const targetLifeAttr = target.attributes.life;
		const targetDefenseAttr = target.attributes.defense;
		const baseDamage = effVars["damage"] as number;
		const damageContext = {
			effect: "damage",
			damage: baseDamage,
			damageMultiplier: 1,
			targetDefense: targetDefenseAttr.currentValue,
		};

		this.triggerSkillEffects(
			source,
			target,
			ActionTrigger.onActorEffectInflicted,
			damageContext,
		);

		const totalDamageMultiplier =
			(this.BASE_DEFENSE / damageContext.targetDefense) *
			damageContext.damageMultiplier;

		const totalDamage = Math.floor(
			damageContext.damage * totalDamageMultiplier,
		);
		targetLifeAttr.currentValue = clamp(
			targetLifeAttr.currentValue - totalDamage,
			0,
			targetLifeAttr.maximumValue,
		);

		const damageTakenContext = {
			effect: "damage",
			totalDamage,
		};

		this.triggerSkillEffects(
			source,
			target,
			ActionTrigger.onActorEffectTaken,
			damageTakenContext,
		);

		if (targetLifeAttr.currentValue === 0) {
			console.log(target);
			this.defeatActor(target);
		}

		return totalDamage.toString();
	}

	private applyHealEffect(
		source: ActorData,
		target: ActorData,
		descriptors: ActionDescriptor[],
		effVars: { [index: string]: EffectVar },
	): string {
		const targetLifeAttr = target.attributes.life;
		const healing = effVars["healing"] as number;

		const healingContext = {
			effect: "healing",
			healing,
		};

		this.triggerSkillEffects(
			source,
			target,
			ActionTrigger.onActorEffectTaken,
			healingContext,
		);

		targetLifeAttr.currentValue = clamp(
			targetLifeAttr.currentValue + healingContext.healing,
			0,
			targetLifeAttr.maximumValue,
		);

		return healing.toString();
	}

	private defeatActor(actor: ActorData) {
		const gameState = container.resolve(GameState);
		actor.isDefeated = true;

		// TO DO: Add code for defeating actor

		if (gameState.playerEIDs.includes(actor.entityId)) {
			for (let i = 0; i < gameState.playerEIDs.length; i++) {
				let eid = gameState.playerEIDs[i];
				let playerData = gameState.ActorDataComponent[eid];
				if (!playerData.isDefeated) {
					return;
				}
			}

			// Game over
			alert("GAME OVER");
			window.location.reload();
		} else {
			for (let i = 0; i < gameState.enemyEIDs.length; i++) {
				let eid = gameState.enemyEIDs[i];
				let enemyData = gameState.ActorDataComponent[eid];
				if (!enemyData.isDefeated) {
					return;
				}
			}

			// End combat
			this.endCombat();

			// NOTE: The action is finishing execution AFTER combat is ending; need an early cancel during the action execution
		}
	}
}
