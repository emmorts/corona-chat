import { SocketMessageType } from "common/SocketMessageType";
import * as Message from "common/Messages";
import SocketHandler from "client/SocketHandler";
import RTCChannel from "client/RTCChannel";
import Room from "client/Room";
import PeerController from "client/PeerController";
import Peer from "common/Peer";
import { Point } from "common/Structures";

export interface ClientStartParameters {
  name: string;
}

export default class Client {
  #defaultChannel = "corona";

  #socketHandler: SocketHandler;
  #rtcChannel: RTCChannel;
  #room: Room;
  #localSocketId: string;
  #peerControllers: {
    [socketId: string]: PeerController
  } = {};

  get localPeerController() {
    if (this.#localSocketId) {
      return this.#peerControllers[this.#localSocketId];
    }

    return null;
  }

  set localPeerController(peerController: PeerController) {
    if (this.#localSocketId) {
      this.#peerControllers[this.#localSocketId] = peerController;
    }
  }

  start(parameters: ClientStartParameters) {
    this.#socketHandler = new SocketHandler();
    this.handleSocketEvents(parameters.name);
    
    this.#rtcChannel = new RTCChannel();
    this.#rtcChannel.registerSocketEvents(this.#socketHandler);
    this.handleChannelEvents();
    
    this.#room = new Room();
    this.handleRoomEvents();
  }

  private initLocalPeerController(socketId: string) {
    this.#localSocketId = socketId;

    this.localPeerController = new PeerController();
    this.localPeerController.mediaController.setupLocalMediaStream();
  }

  private initRemotePeerControllers(peerSocketIds: string[]) {
    peerSocketIds.forEach(peerSocketId => {
      this.#peerControllers[peerSocketId] = new PeerController();
    });
  }

  private handleSocketEvents(name: string) {
    this.#socketHandler.on(SocketMessageType.CONNECTED, (message: Message.SConnected) => {
      this.initLocalPeerController(message.socketId);
      this.initRemotePeerControllers(message.peers);

      this.sendJoinChannelMessage();
      this.sendSpawnPeerCellMessage(name);
    });

    this.#socketHandler.on(SocketMessageType.DISCONNECTED, () => {
      this.#rtcChannel.close();
    })

    this.#socketHandler.on(SocketMessageType.SPAWN_PEER_CELL, (message: Message.SSpawnPeerCell) => {
      const peerController = this.#peerControllers[message.socketId];

      peerController.peer = new Peer({ ...message });

      this.#room.addPeer(peerController.peer, peerController.graphicsController);
    });

    this.#socketHandler.on(SocketMessageType.UPDATE_PEER_CELL_POSITION, (message: Message.SUpdatePeerCellPosition) => {
      const peerController = this.#peerControllers[message.socketId];

      peerController.updatePosition(message.position);
    });

    this.#socketHandler.on(SocketMessageType.REMOVE_PEER, (message: Message.SRemovePeer) => {
      const { socketId } = message;

      this.#peerControllers[socketId].destroy();

      this.#room.removePeer(socketId)
    })
  }

  private handleChannelEvents() {
    this.#rtcChannel.on("peerAdded", async ({ socketId, peerConnection, shouldCreateOffer }) => {
      if (!(socketId in this.#peerControllers)) {
        this.#peerControllers[socketId] = new PeerController();
      }

      await this.streamLocalMediaToPeer(socketId, peerConnection);

      if (shouldCreateOffer) {
        await this.#rtcChannel.createRTCOffer(socketId);
      }
    });

    this.#rtcChannel.on("iceCandidateSet", ({ socketId, iceCandidate }) => this.#socketHandler.send({
      type: SocketMessageType.ICE_CANDIDATE,
      socketId,
      iceCandidate
    } as Message.CIceCandidate));

    this.#rtcChannel.on("peerLocalDescriptionSet", ({ socketId, sessionDescription }) => this.#socketHandler.send({
      type: SocketMessageType.SESSION_DESCRIPTION,
      socketId,
      sessionDescription
    } as Message.CSessionDescription));

    this.#rtcChannel.on("peerRemoteDescriptionSet", ({ socketId, sessionDescription }) => this.#socketHandler.send({
      type: SocketMessageType.SESSION_DESCRIPTION,
      socketId,
      sessionDescription
    } as Message.CSessionDescription));
  }

  private handleRoomEvents() {
    this.#room.on("localPositionChanged", (position: Point) => {
      this.localPeerController.updatePosition(position);

      this.sendUpdatePeerPositionMessage(position);
    });

    this.#room.on("peerGainChanged", ({ socketId, gain }) => {
      this.#peerControllers[socketId].mediaController.setGain(gain);
    })
  }

  private async streamLocalMediaToPeer(socketId: string, peerConnection: RTCPeerConnection) {
    const localMediaController = this.localPeerController.mediaController;
    const peerMediaController = this.#peerControllers[socketId].mediaController;

    await peerMediaController.setupRemoteMediaStream(peerConnection, localMediaController);
  }

  private sendJoinChannelMessage() {
    this.#socketHandler.send({
      type: SocketMessageType.JOIN_CHANNEL,
      channel: this.#defaultChannel
    } as Message.CJoinChannel);
  }

  private sendSpawnPeerCellMessage(name: string) {
    this.#socketHandler.send({
      type: SocketMessageType.SPAWN_PEER_CELL,
      name
    } as Message.CSpawnPeerCell);
  }

  private sendUpdatePeerPositionMessage(position: Point) {
    this.#socketHandler.send({
      type: SocketMessageType.UPDATE_PEER_CELL_POSITION,
      position
    } as Message.CUpdatePeerCellPosition);
  }
}