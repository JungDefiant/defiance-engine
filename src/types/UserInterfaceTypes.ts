export interface ActorGUI {
	setActBarFill(currValue: number, maxValue: number): void;
	addStatusIcon(id: string, iconSrc: string): void;
	removeStatusIcon(id: string): void;
}
