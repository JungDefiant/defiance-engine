import { World } from "bitecs";


export default interface ISystem {
    world: World;
    update(): void;
}    