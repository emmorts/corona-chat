import SocketHandler from "client/SocketHandler";
import RTCMediaStream from "client/RTCMediaStream";
import { SRemovePeer, SSessionDescription, SAddPeer, SIceCandidate } from "common/Messages";
import { EventEmitter } from "common/EventEmitter";
import config from "common/config";
import { SocketMessageType } from "common/SocketMessageType";

const ICE_SERVERS: RTCIceServer[] = [
  ...config.stunServers, 
  ...config.turnServers
];

type P2PChannelEventType = "localStreamAdded" | "peerStreamAdded" | "peerStreamRemoved" | "peerAdded" | "peerRemoved" | "peerLocalDescriptionSet" | "peerRemoteDescriptionSet" | "iceCandidateSet";

export default class P2PChannel extends EventEmitter<P2PChannelEventType> {
  #peers: {
    [socketId: string]: RTCPeerConnection
  } = {};

  registerSocketEvents(socketHandler: SocketHandler) {
    socketHandler.on(SocketMessageType.ADD_PEER, async message => await this.handleAddPeer(message));
    socketHandler.on(SocketMessageType.REMOVE_PEER, message => this.handleRemovePeer(message));
    socketHandler.on(SocketMessageType.ICE_CANDIDATE, message => this.handleICECandidate(message));
    socketHandler.on(SocketMessageType.SESSION_DESCRIPTION, async message => await this.handleSessionDescription(message));
  }

  async createRTCOffer(socketId: string): Promise<RTCSessionDescriptionInit> {
    const peerConnection = this.#peers[socketId];

    try {
      const sessionDescription = await peerConnection.createOffer();

      await peerConnection.setLocalDescription(sessionDescription);

      this.fire("peerLocalDescriptionSet", {
        socketId,
        sessionDescription: sessionDescription
      });
      return sessionDescription;
    } catch (error) {
      throw new Error(`Failed to create RTC offer (${error})`);
    }
  }

  close() {
    for (const peerId in this.#peers) {
      this.#peers[peerId].close();
    }

    this.#peers = {};
  }

  private async handleAddPeer(message: SAddPeer) {
    const { socketId, shouldCreateOffer } = message;

    console.log(`Adding peer '${socketId}'`);
    
    if (socketId in this.#peers) {
      console.log(`Already connected to peer '${socketId}'`);
      return;
    }

    const peerConnection = this.createRTCPeerConnection();

    this.#peers[socketId] = peerConnection;
    
    peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        this.fire("iceCandidateSet", {
          socketId,
          iceCandidate: {
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate
          }
        });
      }
    }

    this.fire("peerAdded", {
      socketId,
      peerConnection,
      shouldCreateOffer
    });
  }

  private handleRemovePeer(message: SRemovePeer) {
    const { socketId } = message;

    console.log(`Removing peer '${socketId}'`);

    if (socketId in this.#peers) {
        this.#peers[socketId].close();
    }

    delete this.#peers[socketId];

    this.fire("peerRemoved", {
      socketId
    })
  }

  private async handleSessionDescription(message: SSessionDescription) {
    const { socketId } = message;
    const remoteSessionDescription = new RTCSessionDescription(message.sessionDescription);
    const peerConnection = this.#peers[socketId];

    try {
      await peerConnection.setRemoteDescription(remoteSessionDescription);

      if (remoteSessionDescription.type === "offer") {
        const peerSessionDescription = await this.createRTCAnswer(peerConnection);

        console.log(`RTC remote session description has been successfully set`);

        this.fire("peerRemoteDescriptionSet", {
          socketId,
          sessionDescription: peerSessionDescription
        });
      }
    } catch (error) {
      console.error(`Failed to set remote session description`, error);
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