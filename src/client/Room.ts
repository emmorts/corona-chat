import { EventEmitter } from "common/EventEmitter";
import { Point } from "common/Structures";
import Peer from "common/Peer";
import RoomRenderer from "client/RoomRenderer";
import { getManhattanDistance, getHeuristicDistance } from "client/utils/MathUtils";
import PeerGraphicsController from "client/PeerGraphicsController";

export type RoomEventType = "localPositionChanged" | "peerGainChanged";

export default class Room extends EventEmitter<RoomEventType> {
  #renderer = new RoomRenderer();
  #peers: Peer[] = [];

  constructor() {
    super();

    this.#renderer.on("localPositionChanged", (position: Point) => this.handlePeerCellMove(position));
  }

  get localPeer() {
    return this.#peers.find(peer => peer.isOwner);
  }

  addPeer(peer: Peer, graphicsController: PeerGraphicsController) {
    this.#peers.push(peer);

    this.#renderer.addPeer(peer, graphicsController);
  }

  removePeer(socketId: string) {
    const peerIndex = this.#peers.findIndex(peer => peer.socketId === socketId);
    if (peerIndex !== -1) {
      this.#renderer.removePeer(socketId);

      this.#peers.splice(peerIndex, 1);
    }
  }

  private handlePeerCellMove(position: Point) {
    this.updatePeerGains();

    this.fire("localPositionChanged", position);
  }

  private updatePeerGains() {
    const localPosition = this.localPeer.position;
    const localAudioRange = this.localPeer.audioRange;

    this.#peers.forEach(peer => {
      if (peer !== this.localPeer) {
        const distanceToPeer = getHeuristicDistance(localPosition, peer.position)
        const gain = this.getGainFromDistance(distanceToPeer, localAudioRange);

        this.fire("peerGainChanged", {
          socketId: peer.socketId,
          gain
        })
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