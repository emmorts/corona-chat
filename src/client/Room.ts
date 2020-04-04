import { SmartMap } from "smartmap";
import EventEmitter from "common/EventEmitter";
import { Point } from "common/Structures";
import Peer from "common/Peer";
import RoomRenderer, { RendererEventType } from "client/renderers/RoomRenderer";
import { getHeuristicDistance } from "client/utils/MathUtils";
import PeerRenderer from "client/renderers/PeerRenderer";
import { ClusterPoint, findClusters, Cluster } from "client/utils/ClusterUtils";
import { Conversation } from "client/models/Conversation";

const CONVERSATION_SIZE_INCREMENT = 50;

export enum RoomEventType {
  LOCAL_POSITION_CHANGED,
  PEER_GAIN_CHANGED,
};

interface RoomEventConfiguration {
  [RoomEventType.LOCAL_POSITION_CHANGED]: { (position: Point): void };
  [RoomEventType.PEER_GAIN_CHANGED]: { (socketId: string, gain: number): void };
};

export default class Room extends EventEmitter<RoomEventConfiguration> {
  #container: HTMLElement;
  #renderer: RoomRenderer;
  #peers: Peer[] = [];
  #conversations: SmartMap<Conversation> = new SmartMap("hashCode");

  constructor(container: HTMLElement) {
    super();

    if (!container) {
      throw new Error("Container element was not provided for Room");
    }

    this.#container = container;
    
    this.#renderer = new RoomRenderer(this.#container);
    this.#renderer.on(RendererEventType.LOCAL_POSITION_CHANGED, (position: Point) => this.handlePeerCellMove(position));
  }

  get localPeer() {
    return this.#peers.find(peer => peer.isOwner);
  }

  addPeer(peer: Peer, graphicsController: PeerRenderer) {
    this.#peers.push(peer);

    this.#renderer.addPeer(peer, graphicsController);

    this.updateConversations();
  }

  removePeer(socketId: string) {
    const peerIndex = this.#peers.findIndex(peer => peer.socketId === socketId);
    if (peerIndex !== -1) {
      this.#renderer.removePeer(socketId);

      this.#peers.splice(peerIndex, 1);
    }
  }

  updateConversations() {
    const clusterPoints: ClusterPoint[] = this.#peers.map(peer => ({
      id: peer.socketId,
      x: peer.position.x,
      y: peer.position.y,
      radius: peer.audioRange
    }));

    const clusters = findClusters(clusterPoints, CONVERSATION_SIZE_INCREMENT);

    if (clusters.length) {
      const candidateConversations = new SmartMap<Conversation>("hashCode");
      clusters.forEach(cluster => candidateConversations.add(new Conversation(cluster.center, cluster.radius)))

      for (const candidateConversation of candidateConversations) {
        if (!this.#conversations.contains(candidateConversation.hashCode)) {
          this.#conversations.add(candidateConversation);
          this.#renderer.addConversation(candidateConversation);
        }
      }

      for (const conversation of this.#conversations) {
        if (!candidateConversations.contains(conversation.hashCode)) {
          this.#conversations.delete(conversation.hashCode);
          this.#renderer.removeConversation(conversation);
        }
      }
    }
  }

  private handlePeerCellMove(position: Point) {
    this.updatePeerGains();
    this.updateConversations();

    this.fire(RoomEventType.LOCAL_POSITION_CHANGED, position);
  }

  private updatePeerGains() {
    const localPosition = this.localPeer.position;
    const localAudioRange = this.localPeer.audioRange;

    this.#peers.forEach(peer => {
      if (peer !== this.localPeer) {
        const distanceToPeer = getHeuristicDistance(localPosition, peer.position);
        const gain = this.getGainFromDistance(distanceToPeer, localAudioRange);

        this.fire(RoomEventType.PEER_GAIN_CHANGED, peer.socketId, gain);
      }
    });
  }

  private getGainFromDistance(distance: number, audioRange: number) {
    if (distance < audioRange) {
      return 100;
    } else {
      const spreadCoefficient = 4_500;

      return Math.max(0, -1 / spreadCoefficient * (distance - audioRange) ** 2 + 100);
    }
  }

}