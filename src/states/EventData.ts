
export interface EventData {
    id: string,
    type: "Dialogue" | "Modal" | "Combat",
    trigger: "OnLocationEnter" | "OnCombatStart" | "OnCombatEnd" | "OnDialogueEnd",
    refId: string,
    isTriggered: boolean
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
