import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import { query } from "bitecs";
import {
	ActorStateComponent,
	COMPONENT_ID_ACTORSTATE,
} from "../components/ActorStateComponent";
import ControlState, { STATE_ID_CONTROLSTATE } from "src/states/ControlState";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import SceneState, { STATE_ID_SCENESTATE } from "src/states/SceneState";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import { SystemRegistry } from "src/registries/SystemRegistry";

export const SYSTEM_ID_ACTORSTATE = "ActorState";

export default class ActorStateSystem implements GameSystem {
	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
		@inject(GameStateRegistry) private gameStateRegistry: GameStateRegistry,
	) {}

	public async start() {}

	public update(deltaTime: number): void {
		const controlState =
			this.gameStateRegistry.getGameStateByStateId<ControlState>(
				STATE_ID_CONTROLSTATE,
			);

		if (controlState.actionPauseSet.size > 0) {
			return;
		}

		this.tickRecoveryRegenOnAllActors(deltaTime);
	}

	private tickRecoveryRegenOnAllActors(deltaTime: number) {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				STATE_ID_SCENESTATE,
			);
		const actorStateComponentArray =
			this.componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
				COMPONENT_ID_ACTORSTATE,
			);
		for (const eid of query(sceneState.world, [actorStateComponentArray])) {
			const actorState = actorStateComponentArray[eid];
			if (actorState.isDefeated) {
				return;
			}
			this.tickRecovery(deltaTime, actorState);
			this.tickRegen(deltaTime, actorState);
		}
	}

	private tickRecovery(deltaTime: number, actorData: ActorStateComponent) {
		const spdAttr = actorData.attributes.speed;
		const rcvyAttr = actorData.attributes.recovery;

		if (rcvyAttr.currentValue < rcvyAttr.maximumValue) {
			const amount = deltaTime * (10 / spdAttr.currentValue);
			const newRcvyAttrVal = rcvyAttr.currentValue + amount;
			rcvyAttr.currentValue = Math.min(
				newRcvyAttrVal,
				rcvyAttr.maximumValue,
			);
		}
	}

	private tickRegen(deltaTime: number, actorData: ActorStateComponent) {
		const regnTimerAttr = actorData.attributes.regenTimer;
		const lifeAttr = actorData.attributes.life;

		regnTimerAttr.currentValue += deltaTime;

		if (
			regnTimerAttr.currentValue >= regnTimerAttr.maximumValue &&
			lifeAttr.currentValue < lifeAttr.maximumValue
		) {
			lifeAttr.currentValue = Math.min(
				lifeAttr.currentValue + 1,
				lifeAttr.maximumValue,
			);
			regnTimerAttr.currentValue = 0;
		}
	}
}
