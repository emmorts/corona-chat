import SocketHandler from "client/SocketHandler";
import { SSessionDescription, SAddPeer, SIceCandidate } from "common/Messages";
import EventEmitter from "common/EventEmitter";
import config from "common/config";
import { SocketMessageType } from "common/SocketMessageType";
import Logger from "common/Logger";

const ICE_SERVERS: RTCIceServer[] = [
  ...config.stunServers, 
  ...config.turnServers
];

export enum RTCChannelEventType {
  PEER_ADDED,
  PEER_REMOVED,
  PEER_LOCAL_DESCRIPTION_SET,
  PEER_REMOTE_DESCRIPTION_SET,
  ICE_CANDIDATE_SET,
};

interface RTCChannelEventConfiguration {
  [RTCChannelEventType.PEER_ADDED]: { (socketId: string, peerConnection: RTCPeerConnection, shouldCreateOffer: boolean): void };
  [RTCChannelEventType.PEER_REMOVED]: { (socketId: string): void };
  [RTCChannelEventType.PEER_LOCAL_DESCRIPTION_SET]: { (socketId: string, sessionDescription: RTCSessionDescriptionInit): void };
  [RTCChannelEventType.PEER_REMOTE_DESCRIPTION_SET]: { (socketId: string, sessionDescription: RTCSessionDescriptionInit): void };
  [RTCChannelEventType.ICE_CANDIDATE_SET]: { (socketId: string, iceCandidate: RTCIceCandidateInit): void };
};

export default class RTCChannel extends EventEmitter<RTCChannelEventConfiguration> {
  #peers: {
    [socketId: string]: RTCPeerConnection
  } = {};

  registerSocketEvents(socketHandler: SocketHandler) {
    socketHandler.on(SocketMessageType.ADD_PEER, async message => await this.handleAddPeer(message));
    socketHandler.on(SocketMessageType.ICE_CANDIDATE, message => this.handleICECandidate(message));
    socketHandler.on(SocketMessageType.SESSION_DESCRIPTION, async message => await this.handleSessionDescription(message));
  }

  close(socketId: string) {
    if (socketId in this.#peers) {
      this.#peers[socketId].close();
    }

    delete this.#peers[socketId];

    Logger.info(`Connection to peer '${socketId}' has been successfully closed`);
  }

  closeAll() {
    for (const peerId in this.#peers) {
      this.#peers[peerId].close();
    }

    this.#peers = {};
  }

  private async handleAddPeer(message: SAddPeer) {
    const { socketId, shouldCreateOffer } = message;

    if (socketId in this.#peers) {
      Logger.warn(`Already connected to peer '${socketId}'`);
      return;
    }

    const peerConnection = this.createRTCPeerConnection();

    this.#peers[socketId] = peerConnection;
    
    peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        this.fire(RTCChannelEventType.ICE_CANDIDATE_SET, socketId,  {
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          candidate: event.candidate.candidate
        });
      }
    }

    peerConnection.onnegotiationneeded = async () => {
      const sessionDescription = await peerConnection.createOffer();

      if (peerConnection.signalingState === "stable") {
        await peerConnection.setLocalDescription(sessionDescription);
  
        this.fire(RTCChannelEventType.PEER_LOCAL_DESCRIPTION_SET, socketId, sessionDescription);
      }
    }

    Logger.info(`Added peer '${socketId}'`);

    this.fire(RTCChannelEventType.PEER_ADDED, socketId, peerConnection, shouldCreateOffer);
  }

  private async handleSessionDescription(message: SSessionDescription) {
    const { socketId } = message;
    const remoteSessionDescription = new RTCSessionDescription(message.sessionDescription);
    const peerConnection = this.#peers[socketId];

    try {
      const promises: Promise<void>[] = [
        peerConnection.setRemoteDescription(remoteSessionDescription)
      ];

      if (remoteSessionDescription.type === "offer" && peerConnection.signalingState !== "stable") {
        promises.splice(0, 0, peerConnection.setLocalDescription({ type: "rollback" }));
      }

      await Promise.all(promises);

      if (remoteSessionDescription.type === "offer") {
        const peerSessionDescription = await this.createRTCAnswer(peerConnection);

        Logger.info(`RTC remote SDP has been successfully set`);

        this.fire(RTCChannelEventType.PEER_REMOTE_DESCRIPTION_SET, socketId, peerSessionDescription);
      }
    } catch (error) {
      Logger.error(`Failed to set remote session description (${error})`);
    }
  }

  private async createRTCAnswer(peerConnection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
    try {
      const sessionDescription = await peerConnection.createAnswer();

      await peerConnection.setLocalDescription(sessionDescription);

      return sessionDescription;
    } catch (error) {
      throw new Error(`Failed to create answer (${error})`);
    }
  }

  private createRTCPeerConnection(): RTCPeerConnection {
    const rtcConfiguration: RTCConfiguration = { iceServers: ICE_SERVERS };
    const rtcOptionalOptions = { optional: [ {"DtlsSrtpKeyAgreement": true}] };

    // @ts-ignore
    return new RTCPeerConnection(rtcConfiguration, rtcOptionalOptions);
  }

  private handleICECandidate(message: SIceCandidate) {
    const { socketId, iceCandidate } = message;

    this.#peers[socketId].addIceCandidate(new RTCIceCandidate(iceCandidate));
  }
}