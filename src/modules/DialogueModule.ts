import {
	ConditionFunction,
	DialogueLine,
	DialogueNode,
	DialogueOptionLine,
} from "src/types/GameTypes";
import { startCombat } from "./CombatModule";
import {
	getCampaignState,
	getControlState,
	getDialogueState,
	getGameScene,
	getUserInterfaceState,
} from "./GameStateModule";
import DialogueHUD from "src/gui/DialogueHUD";
import { TransformNode, UniversalCamera, Vector3 } from "@babylonjs/core";
import grammar from "src/parser/DialogueParser.ohm-bundle";
import { getPublicRoot } from "./Utils";
import { PAUSE_DIALOGUE } from "src/constants/GeneralConstants";
import { setDialogueGameMode, setExploreGameMode } from "./SceneModule";
import { checkEventByTrigger } from "./EventModule";
import { getTransformNodeComponentArray } from "./ComponentModule";

export async function loadDialogueMap(dialogueId: string): Promise<void> {
	const dialogueState = getDialogueState();
	const campaignState = getCampaignState();

	if (!dialogueState.semantics) {
		return;
	}

	const response = await fetch(
		`${getPublicRoot()}/data/${campaignState.campaignId}/dialogues/${dialogueId}.txt`,
	);
	const rawData = await response.text();
	if (!rawData) {
		return;
	}

	const matchResult = grammar.match(String.raw`${rawData}`);
	if (matchResult.failed()) {
		console.error("Match Result failed", matchResult.message);
	} else if (matchResult.succeeded()) {
		const dialogueNodes = dialogueState
			.semantics(matchResult)
			.eval() as DialogueNode[];
		dialogueNodes.forEach((node) => {
			dialogueState.dialogueMap.set(node.name, node);
		});
	}
}

export async function startDialogue(
	dialogueNodeId: string,
	startDialogueProps?: {
		interactablePositionNode: TransformNode;
		viewPositionNode: TransformNode;
	},
): Promise<void> {
	const gameScene = getGameScene();
	const userInterfaceState = getUserInterfaceState();
	const dialogueState = getDialogueState();
	const controlState = getControlState();
	const dialogueHud = userInterfaceState.dialogueHud;
	const camera = gameScene.activeCamera as UniversalCamera;

	if (!dialogueHud || !camera) {
		return;
	}

	if (!dialogueState.dialogueMap.has(dialogueNodeId)) {
		return;
	}

	controlState.actionPauseSet.add(PAUSE_DIALOGUE);

	if (startDialogueProps) {
		camera.position =
			startDialogueProps.viewPositionNode.getPositionExpressedInLocalSpace();
		camera.setTarget(
			startDialogueProps.interactablePositionNode.getAbsolutePosition(),
		);
	}

	setDialogueGameMode();
	dialogueHud.clearEntryStacks();

	startDialogueNode(dialogueNodeId);
}

export function startDialogueNode(node: string) {
	const dialogueState = getDialogueState();

	if (!dialogueState.dialogueMap.has(node)) {
		return;
	}

	const dialogueNode = dialogueState.dialogueMap.get(node) as DialogueNode;
	dialogueState.activeDialogue = dialogueNode;
	runLine(0);
}

export function runLine(id: number) {
	const dialogueState = getDialogueState();
	const userInterfaceState = getUserInterfaceState();

	// Get dialogue HUD
	if (!dialogueState.activeDialogue) {
		endDialogue(true);
		return;
	}

	const dialogueHud = userInterfaceState.dialogueHud;
	const line = dialogueState.activeDialogue.lines[id];

	if (!dialogueHud) {
		endDialogue(true);
		return;
	}

	if (!line) {
		dialogueHud.addExitEntry();
		return;
	}

	switch (line.type) {
		case "Line":
			if (line.condition()) {
				displayTextLine(id, line, dialogueHud);
			} else {
				const nextLineId = id + 1;
				runLine(nextLineId);
			}
			break;
		case "Options":
			displayOptionsLine(line, dialogueHud);
			break;
		case "Cmd":
			if (line.condition()) {
				runCommand(id, line);
			} else {
				const nextLineId = id + 1;
				runLine(nextLineId);
			}
			break;
	}
}

export function endDialogue(switchToExploreMode: boolean) {
	const controlState = getControlState();

	controlState.actionPauseSet.delete(PAUSE_DIALOGUE);
	if (switchToExploreMode) {
		setExploreGameMode();
	}

	checkEventByTrigger("OnDialogueEnd");
}

export function displayTextLine(
	id: number,
	line: DialogueLine,
	dialogueHud: DialogueHUD,
) {
	const dialogueState = getDialogueState();

	if (!dialogueState.activeDialogue || !line.text) {
		return;
	}

	const character = line.character;
	if (character) {
		// Gets sprite in the scene matching the character name
		// Moves camera to target the sprite
	}

	if (line.text) {
		// Display text entry for dialogue
		dialogueHud.addTextDialogueEntry(line);
	}

	const nextLineId = id + 1;
	const nextLine = dialogueState.activeDialogue?.lines[nextLineId];
	if (!nextLine) {
		dialogueHud.addExitEntry();
	} else if (nextLine.type === "Options") {
		runLine(nextLineId);
	} else {
		dialogueHud.addContinueEntry(id, nextLineId);
	}
}

export function displayOptionsLine(line: DialogueLine, dlgHud: DialogueHUD) {
	if (!line.options) {
		return;
	}

	const options = line.options;
	if (!options || options.length < 1) {
		// Set end dialogue button
		console.warn("No options found, exiting dialogue");
		dlgHud.addExitEntry();
	} else {
		// Set choices GUI
		dlgHud.addChoiceEntries(options);
	}
}

export function runCommand(id: number, line: DialogueLine) {
	const dialogueState = getDialogueState();

	if (!dialogueState.activeDialogue || !line.cmd || !line.vars) {
		endDialogue(true);
		return;
	}

	switch (line.cmd) {
		case "setnumbervar":
			setNumberVariableDialogueCommand(
				line.vars[0] as string,
				line.vars[1] as number,
			);
			break;
		case "setstringvar":
			setStringVariableDialogueCommand(
				line.vars[0] as string,
				line.vars[1] as string,
			);
			break;
		case "movecam":
			moveCameraDialogueCommand(
				line.vars[0] as Vector3,
				line.vars[1] as Vector3,
			);
			break;
		case "startcombat":
			startCombatDialogueCommand(line.vars[0] as string);
			return;
	}

	const nextLineId = id + 1;
	const nextLine = dialogueState.activeDialogue.lines[nextLineId];
	if (!nextLine) {
		endDialogue(true);
		return;
	}

	runLine(nextLineId);
}

function setFlagDialogueCommand(flag: string) {}

function setStringVariableDialogueCommand(name: string, value: string) {
	const campaignState = getCampaignState();
	campaignState.storyVariableMap.set(name, value);
}

function setNumberVariableDialogueCommand(name: string, value: number) {
	const campaignState = getCampaignState();
	campaignState.storyVariableMap.set(name, value);
}

function moveCameraDialogueCommand(position: Vector3, target: Vector3) {}

function setSpeakerDialogueCommand(charId: string) {}

function playSoundDialogueCommand(soundUrl: string) {}

function startCombatDialogueCommand(encounterId: string) {
	endDialogue(false);
	startCombat(encounterId);
}

export function initSemantics() {
	const dialogueState = getDialogueState();
	const campaignState = getCampaignState();

	dialogueState.semantics = grammar.createSemantics();

	dialogueState.semantics.addOperation<DialogueNode[]>("eval()", {
		DialogueData(nodes) {
			return nodes.children.map((node) => {
				return node.getNode();
			});
		},
	});

	dialogueState.semantics.addOperation<DialogueNode>("getNode()", {
		Node(node, _, lines, __) {
			return {
				name: node.sourceString,
				lines: lines.children.flatMap((line) => {
					switch (line.ctorName) {
						case "Line":
						case "Options":
						case "Cmd":
						case "Line_condition":
						case "Cmd_condition":
							return [line.getLine()];
						default:
							return [];
					}
				}) as DialogueLine[],
			} as DialogueNode;
		},
	});

	dialogueState.semantics.addOperation<DialogueLine>("getLine()", {
		Line(_, char, __, txt) {
			return {
				type: "Line",
				character: char.getString(),
				text: txt.getString(),
				condition: () => true,
			} as DialogueLine;
		},
		Line_condition(cond, _, char, __, txt) {
			const condition = cond.parseConditional();
			const line = {
				type: "Line",
				character: char.getString(),
				text: txt.getString(),
				condition,
			} as DialogueLine;
			return line;
		},
		Options(options) {
			return {
				type: "Options",
				options: options.children.map((choice) => {
					if (choice.ctorName === "OptionLine_condition") {
						const condition = choice.child(0).parseConditional();
						const text = choice.child(2).getString();
						const moveto = choice.child(3).getString();

						return {
							text,
							destinationNode: moveto,
							condition,
						} as DialogueOptionLine;
					} else {
						return {
							text: choice.child(1).getString(),
							destinationNode: choice.child(2).getString(),
							condition: () => true,
						} as DialogueOptionLine;
					}
				}),
			} as DialogueLine;
		},
		Cmd(_, cmd) {
			return cmd.getLine();
		},
		Cmd_condition(cond, _, cmd) {
			const condition = cond.parseConditional();
			const cmdLine = cmd.getLine();
			cmdLine.condition = condition;
			return cmdLine;
		},
		Command(cmd) {
			return cmd.getLine();
		},
		SetStringVar(cmd, var1, var2) {
			return {
				type: "Cmd",
				cmd: cmd.sourceString,
				vars: [var1.child(1).getString(), var2.child(1).getString()],
				condition: () => true,
			};
		},
		SetNumberVar(cmd, var1, var2) {
			return {
				type: "Cmd",
				cmd: cmd.sourceString,
				vars: [var1.child(1).getString(), var2.child(1).getNumber()],
				condition: () => true,
			};
		},
		MoveCam(cmd, var1, var2) {
			return {
				type: "Cmd",
				cmd: cmd.sourceString,
				vars: [var1.getVector(), var2.getVector()],
				condition: () => true,
			};
		},
		StartCombat(cmd, var1) {
			return {
				type: "Cmd",
				cmd: cmd.sourceString,
				vars: [var1.child(1).sourceString],
				condition: () => true,
			};
		},
	});

	dialogueState.semantics.addOperation<string>("getString()", {
		String(_) {
			return this.sourceString;
		},
		StringVar(_, str, __) {
			return str.sourceString;
		},
		MoveToNode(_, dest, __) {
			return dest.sourceString;
		},
	});

	dialogueState.semantics.addOperation<number>("getNumber()", {
		Number(_) {
			return parseFloat(this.sourceString);
		},
		NumberVar(_, num, __) {
			return parseFloat(num.sourceString);
		},
	});

	dialogueState.semantics.addOperation<Vector3>("getVector3()", {
		Vector(_, x, __, y, ___, z, _____) {
			return new Vector3(x.getNumber(), y.getNumber(), z.getNumber());
		},
	});

	dialogueState.semantics.addOperation<ConditionFunction>(
		"parseConditional()",
		{
			Conditional(_, cond, __) {
				return cond.parseConditional();
			},
			StringVarEq(varKey, _, term) {
				return () => {
					const storyVarKey = varKey.sourceString;
					if (!campaignState.storyVariableMap.has(storyVarKey)) {
						return false;
					}

					const stringTerm = term.sourceString;
					const storyVarValue = campaignState.storyVariableMap.get(
						storyVarKey,
					) as string;

					return storyVarValue === stringTerm;
				};
			},
			NumberVarEq(varKey, _, __, term) {
				return () => {
					const storyVarKey = varKey.sourceString;

					if (!campaignState.storyVariableMap.has(storyVarKey)) {
						return false;
					}

					const numberTerm = term.getNumber();
					const storyVarValue = campaignState.storyVariableMap.get(
						storyVarKey,
					) as number;

					return storyVarValue === numberTerm;
				};
			},
			StringVarNeq(varKey, _, term) {
				return () => {
					const storyVarKey = varKey.sourceString;
					if (!campaignState.storyVariableMap.has(storyVarKey)) {
						return false;
					}

					const stringTerm = term.sourceString;
					const storyVarValue = campaignState.storyVariableMap.get(
						storyVarKey,
					) as string;

					return storyVarValue !== stringTerm;
				};
			},
			NumberVarNeq(varKey, _, __, term) {
				return () => {
					const storyVarKey = varKey.sourceString;

					if (!campaignState.storyVariableMap.has(storyVarKey)) {
						return false;
					}

					const numberTerm = term.getNumber();
					const storyVarValue = campaignState.storyVariableMap.get(
						storyVarKey,
					) as number;

					return storyVarValue !== numberTerm;
				};
			},
			VarLt(varKey, _, term) {
				return () => {
					const storyVarKey = varKey.sourceString;

					if (!campaignState.storyVariableMap.has(storyVarKey)) {
						return false;
					}

					const numberTerm = term.getNumber();
					const storyVarValue = campaignState.storyVariableMap.get(
						storyVarKey,
					) as number;

					return storyVarValue < numberTerm;
				};
			},
			VarLte(varKey, _, term) {
				return () => {
					const storyVarKey = varKey.sourceString;

					if (!campaignState.storyVariableMap.has(storyVarKey)) {
						return false;
					}

					const numberTerm = term.getNumber();
					const storyVarValue = campaignState.storyVariableMap.get(
						storyVarKey,
					) as number;

					return storyVarValue <= numberTerm;
				};
			},
			VarGt(varKey, _, term) {
				return () => {
					const storyVarKey = varKey.sourceString;

					if (!campaignState.storyVariableMap.has(storyVarKey)) {
						return false;
					}

					const numberTerm = term.getNumber();
					const storyVarValue = campaignState.storyVariableMap.get(
						storyVarKey,
					) as number;

					return storyVarValue > numberTerm;
				};
			},
			VarGte(varKey, _, term) {
				return () => {
					const storyVarKey = varKey.sourceString;

					if (!campaignState.storyVariableMap.has(storyVarKey)) {
						return false;
					}

					const numberTerm = term.getNumber();
					const storyVarValue = campaignState.storyVariableMap.get(
						storyVarKey,
					) as number;

					return storyVarValue >= numberTerm;
				};
			},
		},
	);
}
