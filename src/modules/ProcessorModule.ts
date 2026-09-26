import { AbilityEffectApplicationProcessor } from "src/processors/AbilityEffectApplicationProcessor";
import { AbilityEffectCalculationProcessor } from "src/processors/AbilityEffectCalculationProcessor";
import { GameEventProcessor } from "src/processors/GameEventProcessor";
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

// export function getTacticEntryProcessor() {
// 	const processorRegistry = container.resolve(ProcessorRegistry);
// 	return processorRegistry.getProcessorByProcessorId(
// 		TacticENt.name,
// 	);
// }
