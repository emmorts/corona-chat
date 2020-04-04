import { Point } from "common/Structures";
import Peer from "common/Peer";
import PeerMediaController, { PeerMediaControllerEventType } from "client/media/PeerMediaController";
import PeerRenderer from "client/renderers/PeerRenderer";
import ControlsManager, { ControlItemType, ControlsManagerEventType } from "client/ControlsManager";

export default class PeerController {
  #peer: Peer;
  #controlsManager: ControlsManager;
  #mediaController: PeerMediaController = new PeerMediaController();
  #graphicsController: PeerRenderer = new PeerRenderer();

  constructor() {
    this.#mediaController.once(PeerMediaControllerEventType.VIDEO_STREAM_STARTED, () => this.updateCameraPosition());
  }

  get peer() {
    return this.#peer;
  }

  set peer(peer: Peer) {
    this.#peer = peer;

    if (peer.isOwner) {
      this.#controlsManager = this.setupControlsManager();
    }

    this.updateCameraPosition();
  }

  get mediaController() {
    return this.#mediaController;
  }

  get graphicsController() {
    return this.#graphicsController;
  }

  updatePosition(position: Point) {
    this.graphicsController.cellPosition = position;
    this.#peer.position = position;

    this.updateCameraPosition();
  }

  destroy() {
    this.#graphicsController.destroy();
    this.#mediaController.destroy();
  }

  private setupControlsManager() {
    const controlsManager = new ControlsManager();

    controlsManager.bind();
    controlsManager.on(ControlsManagerEventType.CONTROL_ENABLED, this.handleControlEnabled.bind(this));
    controlsManager.on(ControlsManagerEventType.CONTROL_DISABLED, this.handleControlDisabled.bind(this));

    return controlsManager;
  }

  private updateCameraPosition() {
    this.#mediaController.updateVideoStreamPosition({
      x: this.peer.position.x + 55,
      y: this.peer.position.y - 70
    });
  }

  private async handleControlEnabled(type: ControlItemType) {
    switch (type) {
      case "camera":
        await this.#mediaController.startLocalVideoStream();
        break;
      case "microphone":
        await this.#mediaController.startLocalAudioStream();
        break;
    }
  }

  private handleControlDisabled(type: ControlItemType) {
    switch (type) {
      case "camera":
        this.#mediaController.stopLocalVideoStream();
        break;
      case "microphone":
        this.#mediaController.stopLocalAudioStream();
        break;
    }
  }
}