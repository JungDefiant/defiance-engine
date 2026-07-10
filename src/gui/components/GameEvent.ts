

export interface GameEvent {
    type: EventType,
    trigger: EventTrigger,
    source: string,
}

export enum EventType {
    Dialogue,
    Modal,
    Combat
}

export enum EventTrigger {
    OnLocationEnter,
    OnCombatStart,
    OnCombatEnd,
    OnDialogueEnd
}
