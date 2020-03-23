import * as pixi from "pixi.js";
import Peer from "../common/Peer";
import { EventEmitter } from "../common/EventEmitter";
import { Point } from "../common/Structures";
import PeerGraphicsController from "./PeerGraphicsController";

type RendererEventType = "peerCellMove";

export default class RoomRenderer extends EventEmitter<RendererEventType> {
  #app: pixi.Application;

  #peerGraphics: {
    [socketId: string]: PeerGraphicsController
  } = {};

  constructor() {
    super();

    this.#app = new pixi.Application({
      resizeTo: window,
      antialias: true,
      transparent: true
    });

    document.body.querySelector(".js-room").appendChild(this.#app.view);
  }

  addPeer(peer: Peer, graphicsController: PeerGraphicsController) {
    graphicsController.drawCell(peer);
    graphicsController.on("cellMove", (position: Point) => this.fire("peerCellMove", position));

    this.#peerGraphics[peer.socketId] = graphicsController;

    graphicsController.displayObjects.forEach(displayObject => {
      this.#app.stage.addChild(displayObject);
    });
  }

  removePeer(socketId: string) {
    this.#peerGraphics[socketId].destroy();

    delete this.#peerGraphics[socketId];
  }

  updatePeerPosition(socketId: string, position: Point) {
    this.#peerGraphics[socketId].cellPosition = position;
  }
}