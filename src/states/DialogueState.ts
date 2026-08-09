import { Nullable } from "@babylonjs/core";
import { DialogueSemantics } from "src/parser/DialogueParser.ohm-bundle";
import { DialogueNode } from "src/types/GameTypes";

export default class DialogueState {
	public semantics: Nullable<DialogueSemantics> = null;
	public activeDialogue: Nullable<DialogueNode> = null;
	public readonly dialogueMap: Map<string, DialogueNode> = new Map();
}
