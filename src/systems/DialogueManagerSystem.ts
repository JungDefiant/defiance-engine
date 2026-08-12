import { container, inject, singleton } from "tsyringe";
import { UniversalCamera, Vector3 } from "@babylonjs/core";
import grammar from "src/parser/DialogueParser.ohm-bundle";
import SceneManagerSystem from "src/systems/SceneManagerSystem";
import DialogueHUD from "src/gui/DialogueHUD";
import type GameSystem from "src/systems/GameSystem";
import {
	ConditionFunction,
	DialogueLine,
	DialogueNode,
	DialogueOptionLine,
	GameMode,
} from "src/types/GameTypes";
import type { TransformNode } from "@babylonjs/core";
import { PAUSE_DIALOGUE } from "src/constants/GeneralConstants";
import CombatManagerSystem from "./CombatManagerSystem";
import { getPublicRoot } from "src/helpers/Utils";
import EventHandlerSystem from "./EventHandlerSystem";
import { SystemRegistry } from "src/registries/SystemRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import DialogueState from "src/states/DialogueState";
import CampaignState from "src/states/CampaignState";
import SceneState from "src/states/SceneState";
import UserInterfaceState from "src/states/UserInterfaceState";
import ControlState from "src/states/ControlState";
import {
	setDialogueGameMode,
	setExploreGameMode,
} from "src/helpers/SceneHelpers";
import { Control } from "@babylonjs/gui";

export const SYSTEM_ID_DIALOGUEMANAGER = "DialogueManager";

export default class DialogueManagerSystem implements GameSystem {
	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
		@inject(GameStateRegistry) private gameStateRegistry: GameStateRegistry,
	) {}

	public async start() {}

	public update(deltaTime: number) {}

	public initSemantics() {
		const dialogueState =
			this.gameStateRegistry.getGameStateByStateId<DialogueState>(
				DialogueState.toString(),
			);
		const campaignState =
			this.gameStateRegistry.getGameStateByStateId<CampaignState>(
				CampaignState.toString(),
			);

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
							const condition = choice
								.child(0)
								.parseConditional();
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
					vars: [
						var1.child(1).getString(),
						var2.child(1).getString(),
					],
					condition: () => true,
				};
			},
			SetNumberVar(cmd, var1, var2) {
				return {
					type: "Cmd",
					cmd: cmd.sourceString,
					vars: [
						var1.child(1).getString(),
						var2.child(1).getNumber(),
					],
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
						const storyVarValue =
							campaignState.storyVariableMap.get(
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
						const storyVarValue =
							campaignState.storyVariableMap.get(
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
						const storyVarValue =
							campaignState.storyVariableMap.get(
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
						const storyVarValue =
							campaignState.storyVariableMap.get(
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
						const storyVarValue =
							campaignState.storyVariableMap.get(
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
						const storyVarValue =
							campaignState.storyVariableMap.get(
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
						const storyVarValue =
							campaignState.storyVariableMap.get(
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
						const storyVarValue =
							campaignState.storyVariableMap.get(
								storyVarKey,
							) as number;

						return storyVarValue >= numberTerm;
					};
				},
			},
		);
	}

	public async loadDialogueMap(dialogueId: string): Promise<void> {
		const dialogueState =
			this.gameStateRegistry.getGameStateByStateId<DialogueState>(
				DialogueState.toString(),
			);
		const campaignState =
			this.gameStateRegistry.getGameStateByStateId<CampaignState>(
				CampaignState.toString(),
			);

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

	public async startDialogue(
		dialogueNodeId: string,
		startDialogueProps?: {
			interactablePositionNode: TransformNode;
			viewPositionNode: TransformNode;
		},
	): Promise<void> {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				SceneState.toString(),
			);
		const userInterfaceState =
			this.gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);
		const dialogueState =
			this.gameStateRegistry.getGameStateByStateId<DialogueState>(
				DialogueState.toString(),
			);
		const controlState =
			this.gameStateRegistry.getGameStateByStateId<ControlState>(
				DialogueState.toString(),
			);
		const dialogueHud = userInterfaceState.dialogueHud;
		const camera = sceneState.currentScene.activeCamera as UniversalCamera;

		if (!dialogueHud || !camera) {
			return;
		}

		if (!dialogueState.dialogueMap.has(dialogueNodeId)) {
			return;
		}

		controlState.actionPauseSet.add(PAUSE_DIALOGUE);

		if (startDialogueProps) {
			camera.position =
				startDialogueProps.viewPositionNode.absolutePosition;
			// TO DO: Implement moving camera to target over time
			camera.setTarget(
				startDialogueProps.interactablePositionNode.absolutePosition,
			);
		}

		setDialogueGameMode();
		dialogueHud.clearEntryStacks();

		this.startDialogueNode(dialogueNodeId);
	}

	public startDialogueNode(node: string) {
		const dialogueState =
			this.gameStateRegistry.getGameStateByStateId<DialogueState>(
				DialogueState.toString(),
			);

		if (!dialogueState.dialogueMap.has(node)) {
			return;
		}

		const dialogueData = dialogueState.dialogueMap.get(
			node,
		) as DialogueNode;
		dialogueState.activeDialogue = dialogueData;
		this.runLine(0);
	}

	public runLine(id: number) {
		const dialogueState =
			this.gameStateRegistry.getGameStateByStateId<DialogueState>(
				DialogueState.toString(),
			);
		const userInterfaceState =
			this.gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);

		// Get dialogue HUD
		if (!dialogueState.activeDialogue) {
			this.endDialogue(true);
			return;
		}

		const dialogueHud = userInterfaceState.dialogueHud;
		const line = dialogueState.activeDialogue.lines[id];

		if (!dialogueHud) {
			this.endDialogue(true);
			return;
		}

		if (!line) {
			dialogueHud.addExitEntry();
			return;
		}

		switch (line.type) {
			case "Line":
				if (line.condition()) {
					this.displayTextLine(id, line, dialogueHud);
				} else {
					const nextLineId = id + 1;
					this.runLine(nextLineId);
				}
				break;
			case "Options":
				this.displayOptionsLine(line, dialogueHud);
				break;
			case "Cmd":
				if (line.condition()) {
					this.runCommand(id, line);
				} else {
					const nextLineId = id + 1;
					this.runLine(nextLineId);
				}
				break;
		}
	}

	public endDialogue(switchToExploreMode: boolean) {
		const controlState =
			this.gameStateRegistry.getGameStateByStateId<ControlState>(
				ControlState.toString(),
			);

		controlState.actionPauseSet.delete(PAUSE_DIALOGUE);
		if (switchToExploreMode) {
			setExploreGameMode();
		}

		const eventHandlerSystem =
			this.systemRegistry.getGameSystemBySystemId<EventHandlerSystem>(
				EventHandlerSystem.toString(),
			);
		eventHandlerSystem.checkEventByTrigger("OnDialogueEnd");
	}

	private displayTextLine(
		id: number,
		line: DialogueLine,
		dialogueHud: DialogueHUD,
	) {
		const dialogueState =
			this.gameStateRegistry.getGameStateByStateId<DialogueState>(
				DialogueState.toString(),
			);

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
			this.runLine(nextLineId);
		} else {
			dialogueHud.addContinueEntry(id, nextLineId);
		}
	}

	private displayOptionsLine(line: DialogueLine, dlgHud: DialogueHUD) {
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

	private runCommand(id: number, line: DialogueLine) {
		const dialogueState =
			this.gameStateRegistry.getGameStateByStateId<DialogueState>(
				DialogueState.toString(),
			);

		if (!dialogueState.activeDialogue || !line.cmd || !line.vars) {
			this.endDialogue(true);
			return;
		}

		switch (line.cmd) {
			case "setnumbervar":
				this.setNumberVariable(
					line.vars[0] as string,
					line.vars[1] as number,
				);
				break;
			case "setstringvar":
				this.setStringVariable(
					line.vars[0] as string,
					line.vars[1] as string,
				);
				break;
			case "movecam":
				this.moveCamera(
					line.vars[0] as Vector3,
					line.vars[1] as Vector3,
				);
				break;
			case "startcombat":
				this.startCombat(line.vars[0] as string);
				return;
		}

		const nextLineId = id + 1;
		const nextLine = dialogueState.activeDialogue.lines[nextLineId];
		if (!nextLine) {
			this.endDialogue(true);
			return;
		}

		this.runLine(nextLineId);
	}

	// COMMANDS
	private setFlag(flag: string) {}

	private setStringVariable(name: string, value: string) {
		const campaignState =
			this.gameStateRegistry.getGameStateByStateId<CampaignState>(
				CampaignState.toString(),
			);
		campaignState.storyVariableMap.set(name, value);
	}

	private setNumberVariable(name: string, value: number) {
		const campaignState =
			this.gameStateRegistry.getGameStateByStateId<CampaignState>(
				CampaignState.toString(),
			);
		campaignState.storyVariableMap.set(name, value);
	}

	private moveCamera(position: Vector3, target: Vector3) {}

	private setSpeaker(charId: string) {}

	private playSound(soundUrl: string) {}

	private startCombat(encounterId: string) {
		this.endDialogue(false);
		const combatManagerSystem =
			this.systemRegistry.getGameSystemBySystemId<CombatManagerSystem>(
				CombatManagerSystem.toString(),
			);
		combatManagerSystem.startCombat(encounterId);
	}
}
