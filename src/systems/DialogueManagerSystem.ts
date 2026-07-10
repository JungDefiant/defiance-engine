import { container, singleton } from "tsyringe";
import { UniversalCamera, Vector3 } from "@babylonjs/core";
import type { DialogueSemantics } from "src/parser/DialogueParser.ohm-bundle";
import grammar from "src/parser/DialogueParser.ohm-bundle";
import SceneManagerSystem from "src/systems/SceneManagerSystem";
import GameState from "src/states/GameState";
import DialogueHUD from "src/gui/DialogueHUD";
import type ISystem from "src/systems/ISystem";
import { DialogueLine, DialogueNode, DialogueOptionLine, GameMode, type InteractableData } from "src/states/GameData";
import type { Nullable, TransformNode } from "@babylonjs/core";
import { PAUSE_DIALOGUE } from "src/Constants";
import CombatManagerSystem from "./CombatManagerSystem";
import { getPublicRoot } from "src/Utils";

@singleton()
export default class DialogueManagerSystem implements ISystem {
	public async start() { }

	public update(deltaTime: number) {}

	public initSemantics() {
		const gs = container.resolve(GameState);
		gs.semantics = grammar.createSemantics();

		gs.semantics.addOperation<DialogueNode[]>("eval()", {
			DialogueData(nodes) {
				return nodes.children.map((node) => {
					return node.getNode();
				});
			},
		});

		gs.semantics.addOperation<DialogueNode>("getNode()", {
			Node(node, _, lines, __) {
				return {
					name: node.sourceString,
					lines: lines.children.flatMap((line) => {
						switch (line.ctorName) {
							case "Line":
							case "Options":
							case "Cmd":
								return [line.getLine()];
							default:
								return [];
						}
					}) as DialogueLine[],
				} as DialogueNode;
			},
		});

		gs.semantics.addOperation<DialogueLine>("getLine()", {
			Line(_, char, __, txt) {
				return {
					type: "Line",
					character: char.getString(),
					text: txt.getString(),
				} as DialogueLine;
			},
			Options(options) {
				return {
					type: "Options",
					options: options.children.map((choice) => {
						const text = choice.child(1).getString();
						const moveto = choice.child(2).getString();
						return { text, destinationNode: moveto } as DialogueOptionLine;
					}),
				} as DialogueLine;
			},
			Cmd(_, cmd) {
				return cmd.getLine();
			},
			SetVar(cmd, var1, var2) {
				return {
					type: "Cmd",
					cmd: cmd.sourceString,
					vars: [var1.child(1).sourceString, var2.child(1).sourceString],
				};
			},
			MoveCam(cmd, var1, var2) {
				return {
					type: "Cmd",
					cmd: cmd.sourceString,
					vars: [var1.getVector(), var2.getVector()],
				};
			},
			StartCombat(cmd, var1) {
				return {
					type: "Cmd",
					cmd: cmd.sourceString,
					vars: [var1.child(1).sourceString],
				};
			},
		});

		gs.semantics.addOperation<string>("getString()", {
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

		gs.semantics.addOperation<number>("getNumber()", {
			Number(_) {
				return parseFloat(this.sourceString);
			},
			NumberVar(_, num, __) {
				return parseFloat(num.sourceString);
			},
		});

		gs.semantics.addOperation<Vector3>("getVector3()", {
			Vector(_, x, __, y, ___, z, _____) {
				return new Vector3(x.getNumber(), y.getNumber(), z.getNumber());
			},
		});
	}

	public async loadDialogueMap(dlgId: string): Promise<void> {
		const gs = container.resolve(GameState);

		if (!gs.semantics) {
			return;
		}

		const response = await fetch(
			`${getPublicRoot()}/data/${gs.campaignId}/dialogues/${dlgId}.txt`,
		);
		const rawData = await response.text();
		if (!rawData) {
			return;
		}

		const matchResult = grammar.match(String.raw`${rawData}`);
		if (matchResult.failed()) {
			console.error("Match Result failed", matchResult.message);
		} else if (matchResult.succeeded()) {
			const dialogueNodes = gs.semantics(
				matchResult,
			).eval() as DialogueNode[];
			dialogueNodes.forEach((node) => {
				gs.dialogueMap.set(node.name, node);
			});
		}
	}

	public async startDialogue(
		node: string,
		itr?: {
			itrNode: TransformNode;
			viewNode: TransformNode;
		},
	): Promise<void> {
		const gs = container.resolve(GameState);
		const smSystem = container.resolve(SceneManagerSystem);
		const dlgHud = gs.dialogueHud;
		const camera = gs.scene.activeCamera as UniversalCamera;

		if (!gs || !smSystem || !dlgHud || !camera) {
			return;
		}

		if (!gs.dialogueMap.has(node)) {
			return;
		}

		gs.actionPauseSet.add(PAUSE_DIALOGUE);

		if(itr) {
			camera.position = itr.viewNode.absolutePosition;
			// TO DO: Implement moving camera to target over time
			camera.setTarget(itr.itrNode.absolutePosition);
		}

		smSystem.setGameMode(GameMode.Dialogue);
		dlgHud.clearEntryStacks();

		this.startDialogueNode(node);
	}

	public startDialogueNode(node: string) {
		const gs = container.resolve(GameState);

		if (!gs.dialogueMap.has(node)) {
			return;
		}

		const dialogueData = gs.dialogueMap.get(node) as DialogueNode;
		gs.activeDialogue = dialogueData;
		this.runLine(0);
	}

	public runLine(id: number) {
		const gs = container.resolve(GameState);

		// Get dialogue HUD
		if (!gs.activeDialogue) {
			return;
		}

		const dlgHud = container.resolve(GameState).dialogueHud;
		const line = gs.activeDialogue.lines[id];

		if (!dlgHud) {
			return;
		}

		if (!line) {
			dlgHud.addExitEntry();
			return;
		}

		switch (line.type) {
			case "Line":
				this.displayTextLine(id, line, dlgHud);
			case "Options":
				this.displayOptionsLine(line, dlgHud);
			case "Cmd":
				this.runCommand(line);
		}
	}

	public endDialogue() {
		const smSystem = container.resolve(SceneManagerSystem);
		const gs = container.resolve(GameState);

		gs.actionPauseSet.delete(PAUSE_DIALOGUE);
		smSystem.setGameMode(GameMode.Explore);
	}

	private displayTextLine(id: number, line: DialogueLine, dlgHud: DialogueHUD) {
		const gs = container.resolve(GameState);

		if (!line.text) {
			return;
		}

		let charData;
		const character = line.character;
		if (character) {
			// Gets sprite in the scene matching the character name
			// Moves camera to target the sprite
		}

		if (line.text) {
			// Display text entry for dialogue
			dlgHud.addTextDialogueEntry(line);
		}

		const nextLineId = id + 1;
		const nextLine = gs.activeDialogue?.lines[nextLineId];
		if (!nextLine) {
			dlgHud.addExitEntry();
		} else if (nextLine.type === "Options") {
			this.runLine(nextLineId);
		} else {
			dlgHud.addContinueEntry(id, nextLineId);
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

	private runCommand(line: DialogueLine) {
		if (!line.cmd || !line.vars) {
			return;
		}
		switch (line.cmd) {
			case "setvar":
				this.setStringVariable(line.vars[0] as string, line.vars[1] as string);
				return;
			case "movecam":
				this.moveCamera(line.vars[0] as Vector3, line.vars[1] as Vector3);
				return;
			case "startcombat":
				this.startCombat(line.vars[0] as string);
				return;
		}
	}

	// COMMANDS
	private setFlag(flag: string) {}

	private setStringVariable(name: string, value: string) {}

	private setNumberVariable(name: string, value: number) {}

	private moveCamera(position: Vector3, target: Vector3) {}

	private setSpeaker(charId: string) {}

	private playSound(soundUrl: string) {}

	private startCombat(encounterId: string) {
		this.endDialogue();
		const cmSystem = container.resolve(CombatManagerSystem);
		cmSystem.startCombat(encounterId);
	}
}


