import { EntityId } from "bitecs";
import ActorStateComponent, {
	AbilityData,
} from "src/components/ActorStateComponent";
import {
	RenderQueueEntry,
	RenderQueueEntryFloatingText,
	RenderQueueEntryMessageDisplay,
	RenderQueueEntrySpecialFX,
} from "src/types/RenderTypes";
import { getRenderState } from "./GameStateModule";

export function addFloatingTextRQE(
	targetEntityId: number,
	text: string,
	color: string,
) {
	const floatingTextRqe = new RenderQueueEntryFloatingText(
		[targetEntityId],
		text,
		color,
		true,
		1,
	);

	addRenderQueueEntry(floatingTextRqe);
}

export function addAbilityRQEs(
	sourceEntityId: EntityId,
	targetEntityIds: EntityId[],
	sourceData: ActorStateComponent,
	actionData: AbilityData,
) {
	const messageDisplayRenderQueueEntry = new RenderQueueEntryMessageDisplay(
		`${sourceData.name} : ${actionData.name}`,
		false,
		1.05,
	);

	addRenderQueueEntry(messageDisplayRenderQueueEntry);

	if (actionData.castVfxURL && actionData.castSfxURL) {
		const castAbilitySpecialFxRenderQueueEntry =
			new RenderQueueEntrySpecialFX(
				[sourceEntityId],
				actionData.castVfxURL,
				actionData.castSfxURL,
				true,
				0.5,
			);

		addRenderQueueEntry(castAbilitySpecialFxRenderQueueEntry);
	}

	if (actionData.hitVfxURL) {
		const hitAbilitySpecialFxRenderQueueEntry =
			new RenderQueueEntrySpecialFX(
				targetEntityIds,
				actionData.hitVfxURL,
				actionData.hitSfxURL || "",
				false,
				1,
			);

		addRenderQueueEntry(hitAbilitySpecialFxRenderQueueEntry);
	}
}

export function startRenderQueue(): void {
	const renderState = getRenderState();
	if (!renderState.isStarted) {
		renderState.isStarted = true;
	}
}

export function addRenderQueueEntry(renderQueueEntry: RenderQueueEntry): void {
	const renderState = getRenderState();
	if (renderState.isStarted) {
		console.warn("Cannot add new RQE while render queue is started.");
		return;
	}
	renderState.currentRenderQueue.enqueue(renderQueueEntry);
}
