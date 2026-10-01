import { Vector3 } from "@babylonjs/core";

export type DialogueCommand =
	| "setnumbervar"
	| "setstringvar"
	| "movecam"
	| "startcombat";

export type DialogueCommandVariable = string | number | Vector3;

export type DialogueCommandFunction = (
	props: DialogueCommandFunctionProps,
) => void;

export interface DialogueCommandFunctionProps {
	commandVariables: DialogueCommandVariable[];
}
