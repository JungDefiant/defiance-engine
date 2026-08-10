import { EntityId } from "bitecs";
import ActorStateComponent, {
	AbilityData,
} from "src/components/ActorStateComponent";
import { SystemRegistry } from "src/registries/SystemRegistry";
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
	sourceEid: EntityId,
	targetEids: EntityId[],
	sourceData: ActorStateComponent,
	actionData: AbilityData,
) {
	const renderQueueSystem = container
		.resolve(SystemRegistry)
		.getGameSystemBySystemId<RenderQueueSystem>(
			RenderQueueSystem.toString(),
		);
	const messageDisplayRenderQueueEntry = new RenderQueueEntry(
		RenderQueueType.MessageDisplay,
		{
			text: `${sourceData.name} : ${actionData.name}`,
		},
		false,
		1.05,
	);

	const castAbilitySpecialFxRenderQueueEntry = new RenderQueueEntry(
		RenderQueueType.SpecialFX,
		{
			targets: [sourceEid],
			vfxUrl: actionData.castVfxURL as string,
			audioUrl: actionData.castSfxURL as string,
		} as RenderQueueVarsSpecialFX,
		true,
		0.5,
	);

	const hitAbilitySpecialFxRenderQueueEntry = new RenderQueueEntry(
		RenderQueueType.SpecialFX,
		{
			targets: targetEids,
			vfxUrl: actionData.hitVfxURL as string,
			audioUrl: actionData.hitSfxURL as string,
		} as RenderQueueVarsSpecialFX,
		false,
		1,
	);

	renderQueueSystem.addRenderQueueEntry(messageDisplayRenderQueueEntry);
	renderQueueSystem.addRenderQueueEntry(castAbilitySpecialFxRenderQueueEntry);
	renderQueueSystem.addRenderQueueEntry(hitAbilitySpecialFxRenderQueueEntry);
}
