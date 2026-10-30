import { entityExists, query } from "bitecs";
import {
    RenderQueueEntry,
    RenderQueueEntryFloatingText,
    RenderQueueEntrySpecialFX,
} from "src/types/RenderTypes";
import RenderQueueComponent from "src/components/RenderQueueComponent";
import { getRenderQueueComponentArray } from "./ComponentModule";
import {
    getGameScene,
    getRenderState,
    getUserInterfaceState,
} from "./GameStateModule";
import { getRenderQueueFactory } from "./FactoryModule";
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
import { AbilityData, EffectFunctionProps } from "src/types/AbilityTypes";

export function addFloatingTextRenderQueueEntry(
    targetEntityId: number,
    text: string,
    color: string,
) {
    const renderQueueComponent = getRenderQueueForNewEntry();
    const floatingTextRenderQueueEntry = new RenderQueueEntryFloatingText(
        [targetEntityId],
        text,
        color,
        false,
        2,
        0.15 * (renderQueueComponent.queue.length || 0),
    );

    renderQueueComponent.queue.enqueue(floatingTextRenderQueueEntry);
}

export function renderCastVFX(actionData: AbilityData, sourceEntityId: number) {
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
}

export function renderHitVFX(
    actionData: AbilityData,
    targetEntityIds: number[],
) {
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
    const currentRenderQueueComponent = getCurrentRenderQueueComponent();
    if (!currentRenderQueueComponent) {
        createRenderQueueEntity().isStarted = true;
        return;
    }

    if (!currentRenderQueueComponent.isStarted) {
        currentRenderQueueComponent.isStarted = true;
    }
}

export function addRenderQueueEntry(renderQueueEntry: RenderQueueEntry): void {
    getRenderQueueForNewEntry().queue.enqueue(renderQueueEntry);
}

function getRenderQueueForNewEntry(): RenderQueueComponent {
    const currentRenderQueueComponent = getCurrentRenderQueueComponent();
    if (currentRenderQueueComponent && !currentRenderQueueComponent.isStarted) {
        return currentRenderQueueComponent;
    }

    return createRenderQueueEntity();
}

function getCurrentRenderQueueComponent(): RenderQueueComponent | null {
    const renderState = getRenderState();
    const currentRenderQueueEntityId = renderState.currentRenderQueueEntityId;
    if (currentRenderQueueEntityId < 0) {
        return null;
    }
    if (!entityExists(getGameScene().world, currentRenderQueueEntityId)) {
        return null;
    }

    const renderQueueComponent =
        getRenderQueueComponentArray()[currentRenderQueueEntityId];
    return renderQueueComponent ?? null;
}

function createRenderQueueEntity(): RenderQueueComponent {
    const newRenderQueueEntityId = getRenderQueueFactory().createEntity();
    getRenderState().currentRenderQueueEntityId = newRenderQueueEntityId;

    return getRenderQueueComponentArray()[newRenderQueueEntityId];
}
