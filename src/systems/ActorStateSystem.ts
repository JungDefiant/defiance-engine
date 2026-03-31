import { container, inject, singleton } from "tsyringe";
import ISystem from "./ISystem";
import GameContext from "../GameContext";
import { query } from "bitecs";
import { ActorData } from "../components/ActorData";

export interface IActorStateSystem extends ISystem {}

@singleton()
export default class ActorStateSystem implements IActorStateSystem {
	public constructor() {}

	public async start() {}

	public update(): void {
		const context = container.resolve(GameContext);
		for (const eid of query(context.world, [ActorData])) {
		}
	}
}
