import { SocketMessageType } from "common/SocketMessageType";
import * as Message from "common/Messages";
import SocketHandler from "client/SocketHandler";
import RTCChannel, { RTCChannelEventType } from "client/RTCChannel";
import Room, { RoomEventType } from "client/Room";
import PeerController from "client/PeerController";
import Peer from "common/Peer";
import { Point } from "common/Structures";
import { PeerMediaControllerEventType } from "client/PeerMediaController";
import Logger from "common/Logger";

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
    // this.localPeerController.mediaController.setupLocalMediaStream();
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
    this.#rtcChannel.on(RTCChannelEventType.PEER_ADDED, async (socketId, peerConnection, shouldCreateOffer) => {
      if (!(socketId in this.#peerControllers)) {
        this.#peerControllers[socketId] = new PeerController();
      }

      await this.streamLocalMediaToPeer(socketId, peerConnection, shouldCreateOffer);
    });

    this.#rtcChannel.on(RTCChannelEventType.ICE_CANDIDATE_SET, (socketId, iceCandidate) => this.#socketHandler.send({
      type: SocketMessageType.ICE_CANDIDATE,
      socketId,
      iceCandidate
    } as Message.CIceCandidate));

    this.#rtcChannel.on(RTCChannelEventType.PEER_LOCAL_DESCRIPTION_SET, (socketId, sessionDescription) => this.#socketHandler.send({
      type: SocketMessageType.SESSION_DESCRIPTION,
      socketId,
      sessionDescription
    } as Message.CSessionDescription));

    this.#rtcChannel.on(RTCChannelEventType.PEER_REMOTE_DESCRIPTION_SET, (socketId, sessionDescription) => this.#socketHandler.send({
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
      this.#peerControllers[socketId].mediaController.setGain(gain);
    })
  }

  private async streamLocalMediaToPeer(socketId: string, peerConnection: RTCPeerConnection, shouldCreateOffer: boolean) {
    const localMediaController = this.localPeerController.mediaController;
    const peerMediaController = this.#peerControllers[socketId].mediaController;

    if (shouldCreateOffer) {
      peerMediaController.on(PeerMediaControllerEventType.MEDIA_TRACKS_ADDED, async () => {
        Logger.info(`Tracks added, '${socketId}' should create offer`)
        // await this.#rtcChannel.createRTCOffer(socketId);
      });
    }

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