import { EntityId } from "bitecs";
import ActorStateComponent, {
	AbilityData,
} from "src/components/ActorStateComponent";
import {
	RenderQueueEntry,
	RenderQueueEntryFloatingText,
	RenderQueueEntryMessageDisplay,
	RenderQueueEntrySpecialFX,
} from "src/interfaces/RenderQueueEntry";
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

	console.log("ACTION DATA CAST VFX URL", actionData.castVfxURL);

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

	addRenderQueueEntry(messageDisplayRenderQueueEntry);
	addRenderQueueEntry(castAbilitySpecialFxRenderQueueEntry);
	addRenderQueueEntry(hitAbilitySpecialFxRenderQueueEntry);
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
