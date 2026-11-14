import { AbilityEffectApplicationProcessor } from "src/processors/AbilityEffectApplicationProcessor";
import { AbilityEffectCalculationProcessor } from "src/processors/AbilityEffectCalculationProcessor";
import { CollisionBehaviorProcessor } from "src/processors/CollisionBehaviorProcessor";
import { GameEventProcessor } from "src/processors/GameEventProcessor";
import { TargetingShapeProcessor } from "src/processors/TargetingShapeProcessor";
import { TargetingInputProcessor } from "src/processors/TargetingInputProcessor";
import { TargetingPreviewProcessor } from "src/processors/TargetingPreviewProcessor";
import { ProcessorRegistry } from "src/registries/ProcessorRegistry";
import { container } from "tsyringe";
import { ActorBehaviorProcessor } from "src/processors/ActorBehaviorProcessor";

export function getGameEventProcessor(): GameEventProcessor {
    const processorRegistry = container.resolve(ProcessorRegistry);
    return processorRegistry.getProcessorByProcessorId(GameEventProcessor.name);
}

export function getAbilityEffectCalculationProcessor(): AbilityEffectCalculationProcessor {
    const processorRegistry = container.resolve(ProcessorRegistry);
    return processorRegistry.getProcessorByProcessorId(
        AbilityEffectCalculationProcessor.name,
    );
}

export function getAbilityEffectApplicationProcessor(): AbilityEffectApplicationProcessor {
    const processorRegistry = container.resolve(ProcessorRegistry);
    return processorRegistry.getProcessorByProcessorId(
        AbilityEffectApplicationProcessor.name,
    );
}

export function getTargetingShapeProcessor(): TargetingShapeProcessor {
    const processorRegistry = container.resolve(ProcessorRegistry);
    return processorRegistry.getProcessorByProcessorId(
        TargetingShapeProcessor.name,
    );
}

export function getTargetingInputProcessor(): TargetingInputProcessor {
    const processorRegistry = container.resolve(ProcessorRegistry);
    return processorRegistry.getProcessorByProcessorId(
        TargetingInputProcessor.name,
    );
}

export function getTargetingPreviewProcessor(): TargetingPreviewProcessor {
    const processorRegistry = container.resolve(ProcessorRegistry);
    return processorRegistry.getProcessorByProcessorId(
        TargetingPreviewProcessor.name,
    );
}

export function getCollisionBehaviorProcessor(): CollisionBehaviorProcessor {
    const processorRegistry = container.resolve(ProcessorRegistry);
    return processorRegistry.getProcessorByProcessorId(
        CollisionBehaviorProcessor.name,
    );
}

export function getActorBehaviorProcessor(): ActorBehaviorProcessor {
    const processorRegistry = container.resolve(ProcessorRegistry);
    return processorRegistry.getProcessorByProcessorId(
        ActorBehaviorProcessor.name,
    );
}
