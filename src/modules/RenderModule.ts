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
	EffectFeedbackContext,
	StatusEffectContext,
} from "src/types/ContextTypes";
import ActorStateComponent from "src/components/ActorStateComponent";
import { AbilityData, EffectFunctionProps } from "src/types/AbilityTypes";

export function addFloatingTextRenderQueueEntry(
	targetEntityId: number,
	text: string,
	color: string,
) {
	const floatingTextRenderQueueEntry = new RenderQueueEntryFloatingText(
		[targetEntityId],
		text,
		color,
		false,
		1,
		0.5 * (getRenderState().currentRenderQueue.length - 1 || 0),
	);

	addRenderQueueEntry(floatingTextRenderQueueEntry);
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
				true,
				0.5,
			);

		addRenderQueueEntry(hitAbilitySpecialFxRenderQueueEntry);
	}
}

export function renderAbilityEffects(props: EffectFunctionProps) {
	const userInterfaceState = getUserInterfaceState();

	const effectFeedbackContext: EffectFeedbackContext = {
		abilityName: props.abilityContext.abilityName,
		sourceName: props.source.name,
		targetName: props.target.name,
		targetEntityId: props.target.entityId,
		abilityContext: props.abilityContext,
	};

	const attackContext =
		props.abilityContext.abilityTargetContexts[props.abilityTargetIndex]
			.attackContext;
	if (attackContext && attackContext.attackRollResult !== "hit") {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			"attackRoll",
		) as EffectFeedbackStyle;
		addEffectFeedbackRenderQueueEntries({
			effectFeedbackStyle,
			effectFeedbackContext,
			userInterfaceState,
		});
	}

	const damageContext =
		props.abilityContext.abilityTargetContexts[props.abilityTargetIndex]
			.damageContext;

	if (damageContext) {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			"damage",
		) as EffectFeedbackStyle;
		addEffectFeedbackRenderQueueEntries({
			effectFeedbackStyle,
			effectFeedbackContext,
			userInterfaceState,
		});
	}

	const healingContext =
		props.abilityContext.abilityTargetContexts[props.abilityTargetIndex]
			.healingContext;
	if (healingContext) {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			"healing",
		) as EffectFeedbackStyle;
		addEffectFeedbackRenderQueueEntries({
			effectFeedbackStyle,
			effectFeedbackContext,
			userInterfaceState,
		});
	}

	const statusEffectContexts =
		props.abilityContext.abilityTargetContexts[props.abilityTargetIndex]
			.statusEffectContexts;
	if (statusEffectContexts) {
		statusEffectContexts.forEach((statusEffect: StatusEffectContext) => {
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
	addFloatingTextRenderQueueEntry(
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
