import { AbstractMesh, Camera, FollowCamera, Mesh, Quaternion, Scene, TransformNode, UniversalCamera, Vector2, Vector3 } from "@babylonjs/core";
import { InputController } from "./inputController";


export class PlayerController extends TransformNode {
    public camera!: UniversalCamera;
    public scene: Scene;
    public mesh: Mesh;

    private _deltaTime!: number;
    private _input!: InputController;
    private _camRoot!: TransformNode;
    private _yTilt!: TransformNode;

    private _moveDirection!: Vector3;
    private _h!: number;
    private _v!: number;
    private _inputAmt!: number;

    private _moveSpeed: number = 0.03;

    private static readonly ORIGINAL_TILT: Vector3 = new Vector3(0.5934119456780721, 0, 0);

    constructor(assets, scene: Scene, input?: InputController) {
        super("player", scene);
        this.scene = scene;
        this._setupPlayerCamera();

        this.mesh = assets.mesh;
        this.mesh.parent = this;

        this._input = input as InputController;

        scene.registerBeforeRender(() => {
            this._beforeRenderUpdate();
        });
    }

    private _beforeRenderUpdate(): void {
        this._updateFromControls();
        //move our mesh
        this.mesh.moveWithCollisions(this._moveDirection);
        this._updateCamera();
    }

    private _updateCamera(): void {
        let centerPlayer = this.mesh.position.y;
        this._camRoot.position = Vector3.Lerp(this._camRoot.position, new Vector3(this.mesh.position.x, centerPlayer, this.mesh.position.z), 0.4);
    }

    private _setupPlayerCamera() {
        this._camRoot = new TransformNode("camRoot");
        this._camRoot.position = Vector3.Zero();
        this._camRoot.rotation = new Vector3(0, Math.PI, 0);

        let yTilt = new TransformNode("ytilt");
        //adjustments to camera view to point down at our player
        yTilt.rotation = PlayerController.ORIGINAL_TILT;
        this._yTilt = yTilt;
        yTilt.parent = this._camRoot;

        this.camera = new UniversalCamera("camera", new Vector3(0, 20, -30), this.scene);
        this.camera.attachControl(true);
        this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
        this.camera.orthoTop = 15;
        this.camera.orthoBottom = -15;
        this.camera.orthoLeft = -15;
        this.camera.orthoRight = 15;
        this.camera.lockedTarget = this._camRoot.position;
        this.camera.parent = yTilt;

        this.scene.activeCamera = this.camera;
    }

    private _updateFromControls(): void {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;

        this._moveDirection = Vector3.Zero();
        this._h = this._input.horizontal; //right, x
        this._v = this._input.vertical; //fwd, y

        //--MOVEMENTS BASED ON CAMERA (as it rotates)--
        let fwd = this._camRoot.forward;
        let right = this._camRoot.right;
        let correctedVertical = fwd.scaleInPlace(this._v);
        let correctedHorizontal = right.scaleInPlace(this._h);

        //movement based off of camera's view
        let move = correctedHorizontal.addInPlace(correctedVertical);

        //clear y so that the character doesnt fly up, normalize for next step, taking into account whether we've DASHED or not
        this._moveDirection = new Vector3((move).normalize().x, 0, (move).normalize().z);

        //clamp the input value so that diagonal movement isn't twice as fast
        let inputMag = Math.abs(this._h) + Math.abs(this._v);
        if (inputMag < 0) {
            this._inputAmt = 0;
        } else if (inputMag > 1) {
            this._inputAmt = 1;
        } else {
            this._inputAmt = inputMag;
        }
        //final movement that takes into consideration the inputs
        this._moveDirection = this._moveDirection.scaleInPlace(this._inputAmt * this._moveSpeed);

        //check if there is movement to determine if rotation is needed
        let input = new Vector3(this._input.horizontalAxis, 0, this._input.verticalAxis); //along which axis is the direction
        if (input.length() == 0) {//if there's no input detected, prevent rotation and keep player in same rotation
            return;
        }

        //rotation based on input & the camera angle
        let angle = Math.atan2(this._input.horizontalAxis, this._input.verticalAxis);
        angle += this._camRoot.rotation.y;
        let targ = Quaternion.FromEulerAngles(0, angle, 0);
        // this.mesh.rotationQuaternion = Quaternion.Slerp(this.mesh.rotationQuaternion, targ, 10 * this._deltaTime);
    }
}