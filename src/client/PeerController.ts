import { Point } from "common/Structures";
import Peer from "common/Peer";
import RTCMediaStream from "client/RTCMediaStream";
import PeerMediaController from "client/PeerMediaController";
import PeerGraphicsController from "client/PeerGraphicsController";

export default class PeerController {
  #peer: Peer;
  #mediaController: PeerMediaController = new PeerMediaController();
  #graphicsController: PeerGraphicsController = new PeerGraphicsController();

  constructor() {
    this.#mediaController.once("mediaStreamStarted", () => this.updateCameraPosition());
  }

  get peer() {
    return this.#peer;
  }

  set peer(peer: Peer) {
    this.#peer = peer;

    this.updateCameraPosition();
  }

  get mediaController() {
    return this.#mediaController;
  }

  get graphicsController() {
    return this.#graphicsController;
  }

  get hasMediaStream() {
    return this.#mediaController.hasMediaStream;
  }

  get nativeMediaStream() {
    return this.#mediaController.nativeMediaStream;
  }

  get mediaStream() {
    return this.#mediaController.mediaStream;
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

  private updateCameraPosition() {
    if (this.#mediaController.hasMediaStream) {
      this.#mediaController.mediaElement.style.top = `${this.peer.position.y - 70}px`;
      this.#mediaController.mediaElement.style.left = `${this.peer.position.x + 55}px`;
    }
  }
}