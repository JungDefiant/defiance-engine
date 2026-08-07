import { Nullable } from "@babylonjs/core";
import { DialogueSemantics } from "src/parser/DialogueParser.ohm-bundle";
import { DialogueNode } from "src/types/GameTypes";
import { singleton } from "tsyringe";

export const STATE_ID_DIALOGUESTATE = "DialogueState";

export default class DialogueState {
	public semantics: Nullable<DialogueSemantics> = null;
	public activeDialogue: Nullable<DialogueNode> = null;
	public readonly dialogueMap: Map<string, DialogueNode> = new Map();
}
