import { container, delay, inject, singleton } from "tsyringe";
import ISystem from "src/systems/ISystem";
import SceneManagerSystem from "src/systems/SceneManagerSystem";
import {
	ActionManager,
	ExecuteCodeAction,
	RandomRange,
	Vector3,
} from "@babylonjs/core";
import GameState from "src/states/GameState";
import { EntityId, query, removeEntity } from "bitecs";
import {
	AbilityData,
	AbilityDescriptor,
	AbilityTarget,
	AbilityTrigger,
	ActorData,
	EffectData,
	EffectVar,
} from "src/components/ActorData";
import { EnemyFactory } from "src/factories/EnemyFactory";
import { clamp } from "src/Utils";
import RenderQueueSystem, {
	RenderQueueEntry,
	RenderQueueType,
} from "./RenderQueueSystem";
import { Themes } from "src/gui/Themes";
import {
	PAUSE_GAMEOVER,
	PAUSE_RENDERQUEUE,
	PAUSE_TACTICALPAUSE,
	PAUSE_VICTORYSCREEN,
} from "src/Constants";
import { GameMode } from "src/states/types/GameTypes";
import UserInterfaceSystem from "./UserInterfaceSystem";
import EventHandlerSystem from "./EventHandlerSystem";

@singleton()
export default class CombatManagerSystem implements ISystem {
	private readonly START_RECOVERY = 3;
	private readonly START_RECOVERY_RANGE = 2;
	private readonly BASE_DEFENSE = 10;
	private readonly BASE_SPAWN_POSITION = new Vector3(0, 0.28, 0);
	private readonly SPAWN_OFFSET = 0.2;

	private combatState: CombatState = CombatState.Default;

	public async start() {}

	public update(deltaTime: number, gameState?: GameState): void {
		if (!gameState) {
			return;
		}

		if (gameState.gameMode !== GameMode.Combat) {
			return;
		}

		if (gameState.actionPauseSet.size > 0) {
			return;
		}

		if (this.combatState === CombatState.Victory) {
			gameState.actionPauseSet.add(PAUSE_VICTORYSCREEN);
			gameState.victoryScreen.showHide(true);
			return;
		} else if (this.combatState === CombatState.Gameover) {
			gameState.actionPauseSet.add(PAUSE_GAMEOVER);
			gameState.gameOverScreen.showHide(true);
			return;
		}

		for (const eid of query(gameState.world, [
			gameState.ActorDataComponent,
		])) {
			const actorData = gameState.ActorDataComponent[eid];
			const rcvyAttr = actorData.attributes.recovery;

			if (
				!actorData.queuedAction &&
				eid !== gameState.selectedPlayerEID
			) {
				/* TEST */
				const randomActionInd =
					Math.random() * actorData.powerData.length;
				this.startQueueAction(gameState, eid, 0);
				/* TEST */
			}

			if (
				actorData.queuedAction &&
				rcvyAttr.currentValue === rcvyAttr.maximumValue
			) {
				gameState.actionPauseSet.add(PAUSE_RENDERQUEUE);
				this.executeQueuedAction(gameState, actorData);
			}
		}
	}

	public async startCombat(encId: string): Promise<void> {
		const gameState = container.resolve(GameState);
		const smSystem = container.resolve(SceneManagerSystem);
		const enFactory = container.resolve(EnemyFactory);

		smSystem.setGameMode(GameMode.Combat);

		const encData = gameState.sceneData.encounters[encId];

		for (let i = 0; i < encData.length; i++) {
			const enId = encData[i];
			const offsetVector = new Vector3(
				0,
				0,
				(encData.length - 1) * -this.SPAWN_OFFSET +
					i * this.SPAWN_OFFSET * 2
			);
			const spawnPosition = this.BASE_SPAWN_POSITION.add(offsetVector);
			const newEnemy = await enFactory.createEntityFromFileAtPosition(
				enId,
				gameState.campaignId,
				spawnPosition
			);
			gameState.enemyEIDs.push(newEnemy);
			const enActorData = gameState.ActorDataComponent[newEnemy];
			enActorData.name = enActorData.name.concat(
				` ${String.fromCharCode(65 + i)}`
			);
		}

		await this.resetControls(gameState);

		for (const eid of query(gameState.world, [
			gameState.ActorDataComponent,
		])) {
			const actorData = gameState.ActorDataComponent[eid];
			const rcvyAttr = actorData.attributes.recovery;
			const initRange = Math.random() * this.START_RECOVERY_RANGE;
			rcvyAttr.maximumValue = this.START_RECOVERY + initRange;
			rcvyAttr.currentValue = 0;
		}

		gameState.actionPauseSet.delete(PAUSE_RENDERQUEUE);

		const ehSystem = container.resolve(EventHandlerSystem);
		ehSystem.checkEventByTrigger("OnCombatStart");
	}

	public endCombat() {
		const gameState = container.resolve(GameState);
		const smSystem = container.resolve(SceneManagerSystem);

		if (gameState.actionManager) {
			gameState.actionManager.dispose();
			gameState.actionManager = null;
		}

		gameState.enemyEIDs.forEach((eid) => {
			removeEntity(gameState.world, eid);
		});

		gameState.playerEIDs.forEach((eid) => {
			const playerData = gameState.ActorDataComponent[eid];
			const rcvyAttr = playerData.attributes.recovery;
			rcvyAttr.maximumValue = 0;
			playerData.queuedAction = null;
		});

		// Clear inscene UI
		// Show rest of inscene UI

		smSystem.setGameMode(GameMode.Explore);
		if (gameState.actionPauseSet.size > 0) {
			gameState.actionPauseSet.clear();
		}
		this.combatState = CombatState.Default;

		const ehSystem = container.resolve(EventHandlerSystem);
		ehSystem.checkEventByTrigger("OnCombatEnd");
	}

	public async startQueueAction(
		gameState: GameState,
		eid: EntityId,
		actionInd: number,
		isItem?: boolean
	): Promise<void> {
		const actorData = gameState.ActorDataComponent[eid];
		const actionData = (await (isItem
			? actorData.itemData && actorData.itemData[actionInd]
			: actorData.powerData[actionInd])) as AbilityData;

		if (actionData.trigger != AbilityTrigger.onActionExecute) {
			return;
		}

		if (eid === gameState.selectedPlayerEID) {
			this.setPlayerActionTargeting(gameState, eid, actionData);
		} else {
			this.setNPCActionTargeting(gameState, eid, actionData);
		}
	}

	public async resetControls(gameState: GameState) {
		const actorData =
			gameState.ActorDataComponent[gameState.selectedPlayerEID];
		await gameState.combatHud.setActionBar(actorData, this, gameState);

		if (gameState.actionManager) {
			gameState.actionManager.dispose();
			gameState.actionManager = null;
		}

		const actionManager = new ActionManager(gameState.scene);

		for (let i = 0; i < actorData.powerData.length; i++) {
			actionManager.registerAction(
				new ExecuteCodeAction(
					{
						trigger: ActionManager.OnKeyDownTrigger,
						parameter: gameState.controlSettings.powerActions[i],
					},
					() => {
						const cmSystem = container.resolve(CombatManagerSystem);
						cmSystem.startQueueAction(
							gameState,
							actorData.entityId,
							i
						);
					}
				)
			);
		}

		if (actorData.itemData) {
			for (let i = 0; i < actorData.itemData.length; i++) {
				actionManager.registerAction(
					new ExecuteCodeAction(
						{
							trigger: ActionManager.OnKeyDownTrigger,
							parameter:
								gameState.controlSettings.deviceActions[i],
						},
						() => {
							const cmSystem =
								container.resolve(CombatManagerSystem);
							cmSystem.startQueueAction(
								gameState,
								actorData.entityId,
								i
							);
						}
					)
				);
			}
		}

		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: gameState.controlSettings.tacticalPause,
				},
				() => {
					const cmSystem = container.resolve(CombatManagerSystem);
					cmSystem.setTacticalPause(
						!gameState.actionPauseSet.has(PAUSE_TACTICALPAUSE),
						gameState
					);
				}
			)
		);

		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: gameState.controlSettings.switchPlayerLeft,
				},
				() => {
					const uiSystem = container.resolve(UserInterfaceSystem);
					if (!uiSystem) {
						return;
					}

					let selPlyEidIndex = gameState.playerEIDs.findIndex(
						(x) => x === gameState.selectedPlayerEID
					);
					let newSelPlyEIDIndex = selPlyEidIndex - 1;
					if (newSelPlyEIDIndex < 0) {
						newSelPlyEIDIndex = gameState.playerEIDs.length - 1;
					}
					uiSystem.setSelectedCharacter(
						gameState.playerEIDs[newSelPlyEIDIndex]
					);
				}
			)
		);

		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: gameState.controlSettings.switchPlayerRight,
				},
				() => {
					const uiSystem = container.resolve(UserInterfaceSystem);
					if (!uiSystem) {
						return;
					}

					let selPlyEidIndex = gameState.playerEIDs.findIndex(
						(x) => x === gameState.selectedPlayerEID
					);
					let newSelPlyEIDIndex = selPlyEidIndex + 1;
					if (newSelPlyEIDIndex > gameState.playerEIDs.length - 1) {
						newSelPlyEIDIndex = 0;
					}
					uiSystem.setSelectedCharacter(
						gameState.playerEIDs[newSelPlyEIDIndex]
					);
				}
			)
		);

		gameState.actionManager = actionManager;
		gameState.scene.actionManager = actionManager;
	}

	public setTacticalPause(isActive: boolean, gameState: GameState) {
		if (isActive) {
			gameState.actionPauseSet.add(PAUSE_TACTICALPAUSE);
			gameState.renderPauseSet.add(PAUSE_TACTICALPAUSE);
		} else {
			gameState.actionPauseSet.delete(PAUSE_TACTICALPAUSE);
			gameState.renderPauseSet.delete(PAUSE_TACTICALPAUSE);
		}

		gameState.tacticalPauseScreen.showHide(isActive);
	}

	private setPlayerActionTargeting(
		gameState: GameState,
		sourceEid: EntityId,
		actionData: AbilityData
	): void {
		switch (actionData.target) {
			case AbilityTarget.singleEnemy:
				for (const eid of query(gameState.world, [
					gameState.EnemyGUIComponent,
				])) {
					const enemyGUI = gameState.EnemyGUIComponent[eid];
					enemyGUI.setVisibleTargetingUI(true);
					enemyGUI.setTargetingCallback(() => {
						this.finishQueueAction(
							gameState,
							actionData,
							sourceEid,
							[eid]
						);
						gameState.EnemyGUIComponent.forEach((gui) =>
							gui.setVisibleTargetingUI(false)
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
		actionData: AbilityData
	) {
		switch (actionData.target) {
			case AbilityTarget.singleEnemy:
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
		targetEids: EntityId[]
	): void {
		const actorData = gameState.ActorDataComponent[sourceEid];
		actorData.queuedAction = actionData;
		actorData.currentTargetEIDs = targetEids;
	}

	private async executeQueuedAction(
		gameState: GameState,
		actorData: ActorData
	): Promise<void> {
		const rqeSystem = container.resolve(RenderQueueSystem);
		const actionToExecute = await actorData.queuedAction;
		if (!actionToExecute) {
			gameState.actionPauseSet.delete(PAUSE_RENDERQUEUE);
			return;
		}

		const actionEffects = actionToExecute.effectData;
		const actionTargetIds = actorData.currentTargetEIDs;

		this.addActionRQEs(
			rqeSystem,
			actorData.entityId,
			actionTargetIds,
			actorData,
			actionToExecute
		);

		actionTargetIds.forEach((eid) => {
			const targetData = gameState.ActorDataComponent[eid];
			this.processAbilityEffects(
				actorData,
				targetData,
				actionEffects,
				actionToExecute.descriptors
			);
		});

		rqeSystem.startRenderQueue();

		const rcvyAttr = actorData.attributes.recovery;
		rcvyAttr.maximumValue = actionToExecute.recovery || 0.5;
		rcvyAttr.currentValue = 0;
	}

	private processAbilityEffects(
		sourceData: ActorData,
		targetData: ActorData,
		actionEffects: EffectData[],
		descriptors: AbilityDescriptor[],
		context?: { [index: string]: EffectVar }
	) {
		let ftText;
		actionEffects.forEach((eff) => {
			switch (eff.id) {
				case "damage":
					ftText = this.applyDamageEffect(
						sourceData,
						targetData,
						descriptors,
						{
							...eff.variables,
							...context,
						}
					);

					this.addFloatingTextRQE(
						targetData.entityId,
						ftText,
						Themes.neutral2
					);
					break;
				case "healing":
					ftText = this.applyHealEffect(
						sourceData,
						targetData,
						descriptors,
						{
							...eff.variables,
							...context,
						}
					);
					this.addFloatingTextRQE(
						targetData.entityId,
						ftText,
						Themes.success
					);
					break;
				default:
					return;
			}
		});
	}

	private addActionRQEs(
		rqeSystem: RenderQueueSystem,
		sourceEid: EntityId,
		targetEids: EntityId[],
		sourceData: ActorData,
		actionData: AbilityData
	) {
		const msgRQE = new RenderQueueEntry(
			RenderQueueType.MessageDisplay,
			{
				text: `${sourceData.name} : ${actionData.name}`,
			},
			false,
			1.05
		);

		// const castRQE = new RenderQueueEntry(
		// 	RenderQueueType.SpecialFX,
		// 	{
		// 		targets: [sourceEid],
		// 		vfxUrl: actionData.castVfxURL as string,
		// 		audioUrl: actionData.castSfxURL as string,
		// 	} as RenderQueueVarsSpecialFX,
		// 	true,
		// 	0.5,
		// );

		// const hitRQE = new RenderQueueEntry(
		// 	RenderQueueType.SpecialFX,
		// 	{
		// 		targets: targetEids,
		// 		vfxUrl: actionData.hitVfxURL as string,
		// 		audioUrl: actionData.hitSfxURL as string,
		// 	} as RenderQueueVarsSpecialFX,
		// 	true,
		// 	0.5,
		// );

		rqeSystem.addRenderQueueEntry(msgRQE);
		// this.rqeSystem.addRenderQueueEntry(castRQE);
		// this.rqeSystem.addRenderQueueEntry(hitRQE);
	}

	private addFloatingTextRQE(targetEid: number, text: string, color: string) {
		const rqeSystem = container.resolve(RenderQueueSystem);
		const ftRQE = new RenderQueueEntry(
			RenderQueueType.FloatingText,
			{
				targets: [targetEid],
				text,
				color,
			},
			true,
			1
		);

		rqeSystem.addRenderQueueEntry(ftRQE);
	}

	private triggerFeatEffects(
		sourceData: ActorData,
		targetData: ActorData,
		trigger: AbilityTrigger,
		context?: { [index: string]: EffectVar }
	) {
		const triggeredFeats = sourceData.featData.filter(
			(x) => x.trigger === trigger
		);
		triggeredFeats.forEach((feat) => {
			this.processAbilityEffects(
				sourceData,
				targetData,
				feat.effectData,
				feat.descriptors,
				context
			);
		});
	}

	private applyDamageEffect(
		source: ActorData,
		target: ActorData,
		descriptors: AbilityDescriptor[],
		effVars: { [index: string]: EffectVar }
	): string {
		const targetLifeAttr = target.attributes.life;
		const targetDefenseAttr = target.attributes.defense;

		const minDamage = effVars["min"] as number;
		const maxDamage = effVars["max"] as number;
		const damageRoll = Math.round(RandomRange(minDamage, maxDamage));

		const damageContext = {
			effect: "damage",
			damage: damageRoll,
			damageMultiplier: 1,
			targetDefense: targetDefenseAttr.currentValue,
		};

		this.triggerFeatEffects(
			source,
			target,
			AbilityTrigger.onActorEffectInflicted,
			damageContext
		);

		const totalDamageMultiplier =
			(this.BASE_DEFENSE / damageContext.targetDefense) *
			damageContext.damageMultiplier;

		const totalDamage = Math.floor(
			damageContext.damage * totalDamageMultiplier
		);
		targetLifeAttr.currentValue = clamp(
			targetLifeAttr.currentValue - totalDamage,
			0,
			targetLifeAttr.maximumValue
		);

		const damageTakenContext = {
			effect: "damage",
			totalDamage,
		};

		this.triggerFeatEffects(
			source,
			target,
			AbilityTrigger.onActorEffectTaken,
			damageTakenContext
		);

		if (targetLifeAttr.currentValue === 0) {
			this.defeatActor(target);
		}

		return totalDamage.toString();
	}

	private applyHealEffect(
		source: ActorData,
		target: ActorData,
		descriptors: AbilityDescriptor[],
		effVars: { [index: string]: EffectVar }
	): string {
		const targetLifeAttr = target.attributes.life;
		const healing = effVars["healing"] as number;

		const healingContext = {
			effect: "healing",
			healing,
		};

		this.triggerFeatEffects(
			source,
			target,
			AbilityTrigger.onActorEffectTaken,
			healingContext
		);

		targetLifeAttr.currentValue = clamp(
			targetLifeAttr.currentValue + healingContext.healing,
			0,
			targetLifeAttr.maximumValue
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

			this.combatState = CombatState.Gameover;
		} else {
			for (let i = 0; i < gameState.enemyEIDs.length; i++) {
				let eid = gameState.enemyEIDs[i];
				let enemyData = gameState.ActorDataComponent[eid];
				if (!enemyData.isDefeated) {
					return;
				}
			}

			this.combatState = CombatState.Victory;
		}
	}
}

export enum CombatState {
	Default,
	Victory,
	Gameover,
}
