import Peer from "../common/Peer";
import P2PMediaStream from "./P2PMediaStream";
import PeerMediaController from "./PeerMediaController";
import PeerGraphicsController from "./PeerGraphicsController";
import { Point } from "../common/Structures";

export default class PeerController {
  #peer: Peer;
  #mediaController: PeerMediaController = new PeerMediaController();
  #graphicsController: PeerGraphicsController = new PeerGraphicsController();

  constructor() {
    this.#mediaController.on("mediaStreamStarted", () => this.updateCameraPosition());
  }

  get peer() {
    return this.#peer;
  }

  set peer(peer: Peer) {
    this.#peer = peer;
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

  set mediaStream(p2pMediaStream: P2PMediaStream) {
    this.#mediaController.setMediaStream(p2pMediaStream, this.peer.isOwner);
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
    if (this.#mediaController?.mediaElement) {
      this.#mediaController.mediaElement.style.top = `${this.peer.position.y - 70}px`;
      this.#mediaController.mediaElement.style.left = `${this.peer.position.x + 55}px`;
    }
  }
}