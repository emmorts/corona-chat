import * as pixi from "pixi.js";
import { EventEmitter } from "common/EventEmitter";
import { Point } from "common/Structures";
import Peer from "common/Peer";
import PeerGraphicsController from "client/PeerGraphicsController";
import { Conversation } from "client/models/Conversation";
import ConversationRenderer from "client/renderers.ts/ConversationRenderer";

type RendererEventType = "localPositionChanged";

export default class RoomRenderer extends EventEmitter<RendererEventType> {
  #app: pixi.Application;

  #peerGraphics: {
    [socketId: string]: PeerGraphicsController
  } = {};
  #conversationRenderers: ConversationRenderer[] = [];
  #backgroundContainer = new pixi.Container();
  #peerContainer = new pixi.Container();

  constructor() {
    super();

    pixi.utils.skipHello();

    this.#app = new pixi.Application({
      resizeTo: window,
      antialias: true,
      transparent: true,
    });

    this.#app.stage.addChild(this.#backgroundContainer);
    this.#app.stage.addChild(this.#peerContainer);

    document.body.querySelector(".js-room").appendChild(this.#app.view);
  }

  addConversation(conversation: Conversation) {
    const conversationRenderer = new ConversationRenderer(conversation);
    const conversationSprite = conversationRenderer.draw();

    this.#backgroundContainer.addChild(conversationSprite);

    this.#conversationRenderers.push(conversationRenderer);
  }

  removeConversation(conversation: Conversation) {
    const foundIndex = this.#conversationRenderers.findIndex(renderer => renderer.conversation.hashCode === conversation.hashCode);
    if (foundIndex !== -1) {
      this.#conversationRenderers[foundIndex].destroy();
      this.#conversationRenderers.splice(foundIndex, 1);
    }
  }

  addPeer(peer: Peer, graphicsController: PeerGraphicsController) {
    graphicsController.drawCell(peer);

    if (peer.isOwner) {
      graphicsController.on("cellMove", (position: Point) => this.fire("localPositionChanged", position));
    }

    this.#peerGraphics[peer.socketId] = graphicsController;

    graphicsController.displayObjects.forEach(displayObject => {
      this.#peerContainer.addChild(displayObject);
    });
  }

  removePeer(socketId: string) {
    delete this.#peerGraphics[socketId];
  }

  updatePeerPosition(socketId: string, position: Point) {
    this.#peerGraphics[socketId].cellPosition = position;
  }
}