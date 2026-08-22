export interface Processor {
	setProcessorFunction(key: string, value: Function): void;
	removeProcessorFunction(key: string): void;
	getProcessorFunction(key: string): Function;
}
