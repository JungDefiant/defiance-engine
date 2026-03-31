import { inject, singleton } from "tsyringe";
import ISystem from "./ISystem";
import GameContext from "../GameContext";
import { query } from "bitecs";
import { ActorData } from "../components/ActorData";

export interface IActorStateSystem extends ISystem {}

@singleton()
export default class ActorStateSystem implements IActorStateSystem {
	public constructor(@inject(GameContext) private context: GameContext) {}

	public async start() {}

	public update(): void {
		for (const eid of query(this.context.world, [ActorData])) {
		}
	}
}
