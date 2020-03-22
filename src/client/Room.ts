import Peer from "../common/Peer";
import { CUpdatePeerCellPosition, CUpdatePeerMood, SUpdatePeerMood, IRemovePeer, SSpawnPeerCell, SUpdatePeerCellPosition, IConnected } from "../common/Messages";
import { Point } from "../common/Structures";
import SocketHandler from "./SocketHandler";
import RoomRenderer from "./RoomRenderer";
import PeerController from "./PeerController";
import P2PMediaStream from "./P2PMediaStream";
import { getManhattanDistance } from "./utils/MathUtils";

export default class Room {
  #socketHandler: SocketHandler;
  #renderer: RoomRenderer;
  #ownerSocketId: string;
  #peerControllers: {
    [socketId: string]: PeerController
  } = {};

  constructor(socketHandler: SocketHandler, renderer: RoomRenderer) {
    this.#socketHandler = socketHandler;
    this.#renderer = renderer;

    this.#renderer.on("peerCellMove", (position: Point) => this.handlePlayerCellMove(position));
    this.#renderer.on("updatePeerMood", (mood: string) => this.sendUpdatePeerMoodMessage(mood));

    this.setupSocketHandlerEvents();
  }

  addLocalStream(mediaStream: P2PMediaStream) {
    this.setupPeerController(this.#ownerSocketId, { mediaStream });

    this.#peerControllers[this.#ownerSocketId].updateCameraPosition();
  }

  addPeerStream(socketId: string, mediaStream: P2PMediaStream) {
    this.setupPeerController(socketId, { mediaStream });

    this.#peerControllers[socketId].updateCameraPosition();
  }

  private setupSocketHandlerEvents() {
    this.#socketHandler.on("connected", (message: IConnected) => {
      this.setupPeerController(message.socketId);

      message.peers.forEach(peerSocketId => {
        this.setupPeerController(peerSocketId);
      });
    })

    this.#socketHandler.on("removePeer", (message: IRemovePeer) => {
      if (this.#peerControllers[message.socketId]) {
        delete this.#peerControllers[message.socketId];
      }

      this.#renderer.removePeer(message.socketId);
    });
  
    this.#socketHandler.on("spawnPeerCell", (message: SSpawnPeerCell) => {
      if (message.isOwner) {
        this.#ownerSocketId = message.ownerId;
      }

      const peer = new Peer({
        name: message.name,
        socketId: message.ownerId,
        isOwner: message.isOwner,
        position: message.position,
        mood: message.mood
      });

      this.#renderer.addPeer(peer);
      this.setupPeerController(message.ownerId, { peer });
    });
  
    this.#socketHandler.on("updatePeerCellPosition", (message: SUpdatePeerCellPosition) => {
      this.#renderer.updatePeerPosition(message.socketId, message.position);

      this.#peerControllers[message.socketId].updateCameraPosition();
      });

    this.#socketHandler.on("updatePeerMood", (message: SUpdatePeerMood) => {
      this.#renderer.updatePeerMood(message.socketId, message.mood);
    });
  }

  private handlePlayerCellMove(position: Point) {
    this.updateCameraPosition(position);
    this.updatePeerGains();
    this.sendUpdatePeerPositionMessage(position);
  }

  private sendUpdatePeerPositionMessage(position: Point) {
    const message: CUpdatePeerCellPosition = {
      type: "updatePeerCellPosition",
      position
    };

    this.#socketHandler.send(message);
  }

  private sendUpdatePeerMoodMessage(mood: string) {
    const message: CUpdatePeerMood = {
      type: "updatePeerMood",
      mood
    };

    this.#socketHandler.send(message);
  }

  private setupPeerController(socketId: string, options?: {
    peer?: Peer,
    mediaStream?: P2PMediaStream
  }) {
    if (!(socketId in this.#peerControllers)) {
      this.#peerControllers[socketId] = new PeerController();
    }

    if (options?.peer) {
      this.#peerControllers[socketId].peer = options.peer;
    }

    if (options?.mediaStream) {
      this.#peerControllers[socketId].mediaStream = options.mediaStream;
    }
  }

  private updateCameraPosition(position: Point) {
    const ownerPeerController = this.#peerControllers[this.#ownerSocketId];

    ownerPeerController.updateCameraPosition();
  }

  private updatePeerGains() {
    const ownerPosition = this.#peerControllers[this.#ownerSocketId].peer.position;

    for (const socketId in this.#peerControllers) {
      if (socketId !== this.#ownerSocketId) {
        const peerController = this.#peerControllers[socketId];
        const distanceToPeer = getManhattanDistance(ownerPosition, peerController.peer.position);
        const gain = this.getGainFromDistance(distanceToPeer);

        peerController.setGain(gain);
      }
    }
  }

  private getGainFromDistance(distance: number) {
    return Math.max(-1 * Math.log10(distance) * 50 + 150, 0);
  }

}