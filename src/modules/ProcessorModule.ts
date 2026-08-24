import { AbilityEffectProcessor } from "src/processors/AbilityEffectProcessor";
import { GameEventProcessor } from "src/processors/GameEventProcessor";
import { ProcessorRegistry } from "src/registries/ProcessorRegistry";
import { container } from "tsyringe";

export function getGameEventProcessor(): GameEventProcessor {
	const processorRegistry = container.resolve(ProcessorRegistry);
	return processorRegistry.getProcessorByProcessorId(GameEventProcessor.name);
}

export function getAbilityEffectProcessor(): AbilityEffectProcessor {
	const processorRegistry = container.resolve(ProcessorRegistry);
	return processorRegistry.getProcessorByProcessorId(
		AbilityEffectProcessor.name,
	);
}

// export function getTacticEntryProcessor() {
// 	const processorRegistry = container.resolve(ProcessorRegistry);
// 	return processorRegistry.getProcessorByProcessorId(
// 		TacticENt.name,
// 	);
// }
