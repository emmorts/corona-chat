import SocketHandler from "./SocketHandler";
import P2PMediaStream from "./P2PMediaStream";
import { IRemovePeer } from "../common/Messages";
import { EventEmitter } from "../common/EventEmitter";

const ICE_SERVERS: RTCIceServer[] = [{
  urls: [ "stun:stun.l.google.com:19302" ],
}, {
  urls: [ "turn:numb.viagenie.ca" ],
  username: "h.guzas@gmail.com",
  credential: "qwqwqw"
}];

type P2PChannelEventType = "localStreamAdded" | "peerStreamAdded";

export default class P2PChannel extends EventEmitter<P2PChannelEventType> {
  #defaultChannel = "corona";
  #socketHandler: SocketHandler;

  #localMediaStream: P2PMediaStream;

  #peers: {
    [socketId: string]: RTCPeerConnection
  } = {};
  #peerMediaStreams: {
    [socketId: string]: P2PMediaStream
  } = {};

  constructor(socketHandler: SocketHandler) {
    super();

    this.#localMediaStream = new P2PMediaStream({
      muted: true
    });

    this.#socketHandler = socketHandler;

    this.#socketHandler.on("connected", () => this.handleSocketConnected());
    this.#socketHandler.on("disconnected", () => this.handleSocketDisconnected());
    this.#socketHandler.on("addPeer", message => this.handleAddPeer(message));
    this.#socketHandler.on("removePeer", message => this.handleRemovePeer(message));
    this.#socketHandler.on("sessionDescription", message => this.handleSessionDescription(message));
    this.#socketHandler.on("iceCandidate", message => this.handleICECandidate(message));
  }

  private handleSocketConnected() {
    this.#localMediaStream
      .getUserMedia()
      .then(stream => this.#localMediaStream.attachMediaElement(stream))
      .then(() => {
        this.fire("localStreamAdded", this.#localMediaStream);

        this.sendJoinChannelMesssage(this.#defaultChannel);
      })
      .catch(error => {
        console.error(error);

        const errorElement = document.createElement("div");
        errorElement.innerText = "Media is not supported on your browser or connection is not secure.";
        document.body.appendChild(errorElement);
      });
  }

  private handleSocketDisconnected() {
    for (const peerId in this.#peerMediaStreams) {
      this.#peerMediaStreams[peerId].remove();
    }

    for (const peerId in this.#peers) {
      this.#peers[peerId].close();
    }

    this.#peers = {};
    this.#peerMediaStreams = {};
  }

  private handleAddPeer(message: any) {
    const peerId = message.peerId as string;
    const shouldCreateOffer = message.shouldCreateOffer as boolean;

    console.log(`Adding peer '${peerId}'`);
    
    if (peerId in this.#peers) {
      console.log(`Already connected to peer '${peerId}'`);
      return;
    }

    const rtcConfiguration: RTCConfiguration = {
      iceServers: ICE_SERVERS
    };
    const rtcOptionalOptions = {
      optional: [ {"DtlsSrtpKeyAgreement": true}]
    };

    // @ts-ignore
    const peerConnection = new RTCPeerConnection(rtcConfiguration, rtcOptionalOptions);

    this.#peers[peerId] = peerConnection;
    
    peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        this.#socketHandler.send({
          type: "relayICECandidate",
          peerId: peerId,
          iceCandidate: {
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate
          }
        });
      }
    }
  
    peerConnection.ontrack = (event: RTCTrackEvent) => {
      if (!this.#peerMediaStreams[peerId]) {
        this.#peerMediaStreams[peerId] = new P2PMediaStream({ muted: false });
        this.#peerMediaStreams[peerId].attachMediaElement(event.streams[0]);
      
        this.fire("peerStreamAdded", peerId, this.#peerMediaStreams[peerId]);
      }
    }

    for (const track of this.#localMediaStream.mediaStream.getTracks()) {
      peerConnection.addTrack(track, this.#localMediaStream.mediaStream);
    }

    if (shouldCreateOffer) {
        console.log(`Creating RTC offer to '${peerId}'`);

        peerConnection
          .createOffer()
          .then((description: RTCSessionDescriptionInit) => {
            console.log(`Local offer description is`, description);

            peerConnection
              .setLocalDescription(description)
              .then(() => {
                this.#socketHandler.send({
                  type: "relaySessionDescription",
                  peerId: peerId,
                  sessionDescription: description
                });

                console.log(`Setting offer description successful.`);
              })
              .catch((error: Error) => {
                console.log(`Failed to set offer description.`, error);
              })
          })
          .catch((error: Error) => {
            console.log(`Error sending offer`, error);
          });
    }
  }

  private handleRemovePeer(message: IRemovePeer) {
    const peerId = message.socketId as string;

    console.log(`Removing peer '${peerId}'`);

    if (peerId in this.#peerMediaStreams) {
      this.#peerMediaStreams[peerId].remove();
    }

    if (peerId in this.#peers) {
        this.#peers[peerId].close();
    }

    delete this.#peers[peerId];
    delete this.#peerMediaStreams[peerId];
  }

  private handleSessionDescription(message: any) {
    const peerId = message.peerId as string;
    const sessionDescription = new RTCSessionDescription(message.sessionDescription);
    
    console.log('Remote description received: ', sessionDescription);

    const peer = this.#peers[peerId];

    peer.setRemoteDescription(sessionDescription)
      .then(() => {
        console.log(`Setting remote description for peer '${peerId}' succeeded!`);

        if (sessionDescription.type === "offer") {
          console.log("Creating answer");

          peer.createAnswer()
            .then(localSessionDescription => {
              console.log(`Answer description is `, localSessionDescription);

              peer.setLocalDescription(localSessionDescription)
                .then(() => {
                  this.#socketHandler.send({
                    type: "relaySessionDescription",
                    peerId: peerId,
                    sessionDescription: localSessionDescription
                  });

                  console.log(`Answer setting local description successful`);
                })
                .catch(error => {
                  console.log(`Failed to answer setting local description`, error);
                });
            })
            .catch(error => {
              console.log(`Error creating answer`, error)
            });
        }
      })
      .catch(error => {
        console.log(`Failed to set remote session description`, error);
      });
  }

  private handleICECandidate(message: any) {
    const peerId = message.peerId as string;
    const iceCandidate = message.iceCandidate as RTCIceCandidateInit;
    const peer = this.#peers[peerId];

    peer.addIceCandidate(new RTCIceCandidate(iceCandidate));
  }

  private sendJoinChannelMesssage(channelName: string) {
    this.#socketHandler.send({
      type: "joinChannel",
      channel: channelName
    });
  }
}