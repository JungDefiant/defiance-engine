import { EntityId } from "bitecs";
import {
	RenderQueueEntry,
	RenderQueueEntryFloatingText,
	RenderQueueEntryMessageDisplay,
	RenderQueueEntrySpecialFX,
} from "src/types/RenderTypes";
import { getRenderState, getUserInterfaceState } from "./GameStateModule";
import {
	EffectFeedbackStyle,
	EffectFeedbackStyles,
	EffectFeedbackType,
} from "src/types/UserInterfaceTypes";
import UserInterfaceState from "src/states/UserInterfaceState";
import {
	AbilityTargetContext,
	EffectFeedbackContext,
} from "src/types/ContextTypes";
import ActorStateComponent from "src/components/ActorStateComponent";
import { AbilityData } from "src/types/AbilityTypes";

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
		0.75,
	);

	addRenderQueueEntry(floatingTextRqe);
}

export function renderMessageDisplay(
	sourceData: ActorStateComponent,
	actionData: AbilityData,
) {
	const messageDisplayRenderQueueEntry = new RenderQueueEntryMessageDisplay(
		`${sourceData.name} : ${actionData.name}`,
		false,
		1.05,
	);

	addRenderQueueEntry(messageDisplayRenderQueueEntry);
}

export function renderCastHitVFX(
	actionData: AbilityData,
	sourceEntityId: number,
	targetEntityIds: number[],
) {
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

export function renderAbilityEffects(
	abilityName: string,
	sourceState: ActorStateComponent,
	targetState: ActorStateComponent,
	context: AbilityTargetContext,
) {
	const userInterfaceState = getUserInterfaceState();

	const effectFeedbackContext: EffectFeedbackContext = {
		abilityName: abilityName,
		sourceName: sourceState.name,
		targetName: targetState.name,
		targetEntityId: targetState.entityId,
		abilityContext: context,
	};

	if (context.attackContext) {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			"attackRoll",
		) as EffectFeedbackStyle;
		addEffectFeedbackRenderQueueEntries({
			effectFeedbackStyle,
			effectFeedbackContext,
			userInterfaceState,
		});
	}

	if (context.damageContext) {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			"damage",
		) as EffectFeedbackStyle;
		addEffectFeedbackRenderQueueEntries({
			effectFeedbackStyle,
			effectFeedbackContext,
			userInterfaceState,
		});
	}

	if (context.healingContext) {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			"healing",
		) as EffectFeedbackStyle;
		addEffectFeedbackRenderQueueEntries({
			effectFeedbackStyle,
			effectFeedbackContext,
			userInterfaceState,
		});
	}

	if (context.statusEffectContexts) {
		context.statusEffectContexts.forEach((statusEffect) => {
			const statusEffectFeedbackType =
				statusEffect.statusId as EffectFeedbackType;
			if (
				!statusEffectFeedbackType ||
				!EffectFeedbackStyles.has(statusEffectFeedbackType)
			) {
				return;
			}
			const effectFeedbackStyle = EffectFeedbackStyles.get(
				statusEffectFeedbackType,
			) as EffectFeedbackStyle;
			addEffectFeedbackRenderQueueEntries({
				effectFeedbackStyle,
				effectFeedbackContext,
				userInterfaceState,
			});
		});
	}
}

interface EffectFeedbackRenderQueueEntriesProps {
	userInterfaceState: UserInterfaceState;
	effectFeedbackStyle: EffectFeedbackStyle;
	effectFeedbackContext: EffectFeedbackContext;
}

function addEffectFeedbackRenderQueueEntries(
	props: EffectFeedbackRenderQueueEntriesProps,
) {
	addFloatingTextRQE(
		props.effectFeedbackContext.targetEntityId,
		props.effectFeedbackStyle.floatingText(props.effectFeedbackContext),
		props.effectFeedbackStyle.floatingTextColor,
	);
	props.userInterfaceState.combatHud.addCombatLogEntry(
		`${props.effectFeedbackContext.sourceName} (${props.effectFeedbackContext.abilityName})`,
		props.effectFeedbackStyle.combatLogText(props.effectFeedbackContext),
	);
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
