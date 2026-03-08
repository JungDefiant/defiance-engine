import { Scene } from "@babylonjs/core";
import { World } from "bitecs";


export default interface ISystem {
    scene?: Scene;
    world?: World;
    update(): void;
}    