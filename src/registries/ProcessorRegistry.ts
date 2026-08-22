import { Processor } from "src/processors/Processor";
import { singleton } from "tsyringe";

@singleton()
export class ProcessorRegistry {
	private processors: Map<string, Processor> = new Map();

	public registerNewProcessor(processorId: string, newProcessor: Processor) {
		this.processors.set(processorId, newProcessor);
	}

	public getProcessorByProcessorId<T>(processorId: string): T {
		return this.processors.get(processorId) as T;
	}
}
