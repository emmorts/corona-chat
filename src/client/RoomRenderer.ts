import * as pixi from "pixi.js";
import { EventEmitter } from "common/EventEmitter";
import { Point } from "common/Structures";
import Peer from "common/Peer";
import PeerGraphicsController from "client/PeerGraphicsController";

type RendererEventType = "localPositionChanged";

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

    if (peer.isOwner) {
      graphicsController.on("cellMove", (position: Point) => this.fire("localPositionChanged", position));
    }

    this.#peerGraphics[peer.socketId] = graphicsController;

    graphicsController.displayObjects.forEach(displayObject => {
      this.#app.stage.addChild(displayObject);
    });
  }

  removePeer(socketId: string) {
    delete this.#peerGraphics[socketId];
  }

  updatePeerPosition(socketId: string, position: Point) {
    this.#peerGraphics[socketId].cellPosition = position;
  }
}