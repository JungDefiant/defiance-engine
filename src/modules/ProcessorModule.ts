import { AbilityEffectApplicationProcessor } from "src/processors/AbilityEffectApplicationProcessor";
import { AbilityEffectCalculationProcessor } from "src/processors/AbilityEffectCalculationProcessor";
import { BehaviorProcessor } from "src/processors/BehaviorProcessor";
import { CollisionBehaviorProcessor } from "src/processors/CollisionBehaviorProcessor";
import { GameEventProcessor } from "src/processors/GameEventProcessor";
import { TargetingShapeProcessor } from "src/processors/TargetingShapeProcessor";
import { ProcessorRegistry } from "src/registries/ProcessorRegistry";
import { container } from "tsyringe";

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

export function getCollisionBehaviorProcessor(): CollisionBehaviorProcessor {
    const processorRegistry = container.resolve(ProcessorRegistry);
    return processorRegistry.getProcessorByProcessorId(
        CollisionBehaviorProcessor.name,
    );
}

export function getActorBehaviorProcessor(): BehaviorProcessor {
    const processorRegistry = container.resolve(ProcessorRegistry);
    return processorRegistry.getProcessorByProcessorId(BehaviorProcessor.name);
}
