import {
	addComponent,
	addEntity,
	EntityId,
	observe,
	onSet,
	set,
	World,
} from "bitecs";
import { container, inject, singleton } from "tsyringe";
import GameContext from "../GameContext";
import {
	ActionData,
	ActorAttribute,
	ActorData,
	AffinityData,
	AttributeSet,
	TacticsData,
} from "../components/ActorData";

export interface IFactory {
	start(): void;
	createActorEntityFromFile(
		fileName: string,
		campaignId: string,
	): Promise<EntityId>;
}

@singleton()
export class ActorFactory implements IFactory {
	public constructor() {}

	public start() {
		const context = container.resolve(GameContext);
		console.log(context);
		observe(
			context.world,
			onSet(context.ActorComponent),
			(eid: EntityId, params: ActorData) => {
				console.log("PARAMS", params);
				context.ActorComponent[eid] = params;
			},
		);
	}

	public async createActorEntityFromFile(
		fileName: string,
		campaignId: string,
	): Promise<EntityId> {
		const response = await fetch(
			`/data/${campaignId}/characters/${fileName}.json`,
		);
		const rawData = await response.json();
		if (!rawData) {
			return -1;
		}

		const context = container.resolve(GameContext);
		const newEntity = addEntity(context.world);
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
		addComponent(
			context.world,
			newEntity,
			set(context.ActorComponent, newActorData),
		);

		return newEntity;
	}
}
