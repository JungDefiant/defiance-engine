import { EntityId } from "bitecs";
import { AbilityData, ActorState } from "src/components/ActorState";
import RenderQueueSystem, {
	RenderQueueEntry,
	RenderQueueType,
	RenderQueueVarsSpecialFX,
} from "src/systems/RenderQueueSystem";
import { container } from "tsyringe";

export function addFloatingTextRQE(
	targetEid: number,
	text: string,
	color: string,
) {
	const rqeSystem = container.resolve(RenderQueueSystem);
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

	rqeSystem.addRenderQueueEntry(ftRQE);
}

export function addAbilityRQEs(
	rqeSystem: RenderQueueSystem,
	sourceEid: EntityId,
	targetEids: EntityId[],
	sourceData: ActorState,
	actionData: AbilityData,
) {
	const msgRQE = new RenderQueueEntry(
		RenderQueueType.MessageDisplay,
		{
			text: `${sourceData.name} : ${actionData.name}`,
		},
		false,
		1.05,
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

	const hitRQE = new RenderQueueEntry(
		RenderQueueType.SpecialFX,
		{
			targets: targetEids,
			vfxUrl: actionData.hitVfxURL as string,
			audioUrl: actionData.hitSfxURL as string,
		} as RenderQueueVarsSpecialFX,
		false,
		1,
	);

	rqeSystem.addRenderQueueEntry(msgRQE);
	// rqeSystem.addRenderQueueEntry(castRQE);
	rqeSystem.addRenderQueueEntry(hitRQE);
}
