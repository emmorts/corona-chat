import { SocketMessageType } from "common/SocketMessageType";
import * as Message from "common/Messages";
import SocketHandler from "client/network/SocketHandler";
import RTCController, { RTControllerEventType } from "client/network/RTCController";
import Room, { RoomEventType } from "client/Room";
import PeerController from "client/PeerController";
import Peer from "common/Peer";
import { Point } from "common/Structures";
import Logger from "common/Logger";

export interface ClientStartParameters {
  name: string;
}

export default class Client {
  #defaultChannel = "corona";

  #roomHTMLElement: HTMLElement;
  #socketHandler: SocketHandler;
  #rtcChannel: RTCController;
  #room: Room;
  #localSocketId: string;
  #peerControllers: {
    [socketId: string]: PeerController
  } = {};

  constructor(roomHTMLElement: HTMLElement) {
    if (!roomHTMLElement) {
      throw new Error("Room HTML element reference not provided");
    }

    this.#roomHTMLElement = roomHTMLElement;
  }

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
    
    this.#rtcChannel = new RTCController();
    this.#rtcChannel.registerSocketEvents(this.#socketHandler);
    this.handleChannelEvents();
    
    this.#room = new Room(this.#roomHTMLElement);
    this.handleRoomEvents();
  }

  private initLocalPeerController(socketId: string) {
    this.#localSocketId = socketId;

    this.localPeerController = new PeerController();
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

    this.#socketHandler.on(SocketMessageType.DISCONNECTED, () => this.#rtcChannel.closeAll());

    this.#socketHandler.on(SocketMessageType.SPAWN_PEER_CELL, (message: Message.SSpawnPeerCell) => {
      const peerController = this.#peerControllers[message.socketId];

      peerController.peer = new Peer({ ...message });

      this.#room.addPeer(peerController.peer, peerController.graphicsController);
    });

    this.#socketHandler.on(SocketMessageType.UPDATE_PEER_CELL_POSITION, (message: Message.SUpdatePeerCellPosition) => {
      this.#peerControllers[message.socketId].updatePosition(message.position);
      this.#room.updateConversations();
    });

    this.#socketHandler.on(SocketMessageType.REMOVE_PEER, (message: Message.SRemovePeer) => {
      const { socketId } = message;

      this.#peerControllers[socketId].destroy();
      this.#rtcChannel.close(socketId);
      this.#room.removePeer(socketId);
    })
  }

  private handleChannelEvents() {
    this.#rtcChannel.on(RTControllerEventType.PEER_ADDED, async (socketId, peerConnection) => {
      if (!(socketId in this.#peerControllers)) {
        this.#peerControllers[socketId] = new PeerController();
      }

      await this.streamLocalMediaToPeer(socketId, peerConnection);
    });

    this.#rtcChannel.on(RTControllerEventType.ICE_CANDIDATE_SET, (socketId, iceCandidate) => this.#socketHandler.send({
      type: SocketMessageType.ICE_CANDIDATE,
      socketId,
      iceCandidate
    } as Message.CIceCandidate));

    this.#rtcChannel.on(RTControllerEventType.PEER_LOCAL_DESCRIPTION_SET, (socketId, sessionDescription) => this.#socketHandler.send({
      type: SocketMessageType.SESSION_DESCRIPTION,
      socketId,
      sessionDescription
    } as Message.CSessionDescription));

    this.#rtcChannel.on(RTControllerEventType.PEER_REMOTE_DESCRIPTION_SET, (socketId, sessionDescription) => this.#socketHandler.send({
      type: SocketMessageType.SESSION_DESCRIPTION,
      socketId,
      sessionDescription
    } as Message.CSessionDescription));
  }

  private handleRoomEvents() {
    this.#room.on(RoomEventType.LOCAL_POSITION_CHANGED, (position: Point) => {
      this.localPeerController.updatePosition(position);

      this.sendUpdatePeerPositionMessage(position);
    });

    this.#room.on(RoomEventType.PEER_GAIN_CHANGED, (socketId, gain) => {
      this.localPeerController.mediaController.setGain(socketId, gain);
    })
  }

  private async streamLocalMediaToPeer(socketId: string, peerConnection: RTCPeerConnection) {
    const localMediaController = this.localPeerController.mediaController;
    const peerMediaController = this.#peerControllers[socketId].mediaController;

    await peerMediaController.startRemoteMediaStream(socketId, peerConnection, localMediaController);
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