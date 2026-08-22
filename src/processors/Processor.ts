export interface Processor<T extends string, U> {
	setRecord(key: T, value: U): void;
	removeRecord(key: T): void;
	getRecord(key: T): U;
}
