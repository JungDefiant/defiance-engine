import { EntityId } from "bitecs";
import ActorStateComponent, {
	AbilityData,
} from "src/components/ActorStateComponent";
import {
	RenderQueueEntryFloatingText,
	RenderQueueEntryMessageDisplay,
	RenderQueueEntrySpecialFX,
} from "src/interfaces/RenderQueueEntry";
import { SystemRegistry } from "src/registries/SystemRegistry";
import RenderQueueSystem from "src/systems/RenderQueueSystem";
import { container } from "tsyringe";

export function addFloatingTextRQE(
	targetEntityId: number,
	text: string,
	color: string,
) {
	const renderQueueSystem = container
		.resolve(SystemRegistry)
		.getGameSystemBySystemId<RenderQueueSystem>(
			RenderQueueSystem.toString(),
		);
	const floatingTextRqe = new RenderQueueEntryFloatingText(
		[targetEntityId],
		text,
		color,
		true,
		1,
	);

	renderQueueSystem.addRenderQueueEntry(floatingTextRqe);
}

export function addAbilityRQEs(
	sourceEntityId: EntityId,
	targetEntityIds: EntityId[],
	sourceData: ActorStateComponent,
	actionData: AbilityData,
) {
	const renderQueueSystem = container
		.resolve(SystemRegistry)
		.getGameSystemBySystemId<RenderQueueSystem>(
			RenderQueueSystem.toString(),
		);
	const messageDisplayRenderQueueEntry = new RenderQueueEntryMessageDisplay(
		`${sourceData.name} : ${actionData.name}`,
		false,
		1.05,
	);

	const castAbilitySpecialFxRenderQueueEntry = new RenderQueueEntrySpecialFX(
		[sourceEntityId],
		actionData.castVfxURL as string,
		actionData.castSfxURL as string,
		true,
		0.5,
	);

	const hitAbilitySpecialFxRenderQueueEntry = new RenderQueueEntrySpecialFX(
		targetEntityIds,
		actionData.hitVfxURL as string,
		actionData.hitSfxURL as string,
		false,
		1,
	);

	renderQueueSystem.addRenderQueueEntry(messageDisplayRenderQueueEntry);
	renderQueueSystem.addRenderQueueEntry(castAbilitySpecialFxRenderQueueEntry);
	renderQueueSystem.addRenderQueueEntry(hitAbilitySpecialFxRenderQueueEntry);
}
