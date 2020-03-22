import Peer from "../common/Peer";
import P2PMediaStream from "./P2PMediaStream";

export default class PeerController {
  #peer: Peer;
  #audioContext: AudioContext = new AudioContext();
  #mediaStream: P2PMediaStream;

  #gainFilter = this.#audioContext.createGain();
  #filters: AudioNode[] = [
    this.#gainFilter
  ];

  constructor() {
    this.#filters.push(...[
      this.#audioContext.createGain()
    ]);
  }

  get peer() {
    return this.#peer;
  }

  set peer(peer: Peer) {
    this.#peer = peer;
  }

  get hasMediaStream() {
    return !!this.#mediaStream?.mediaStream;
  }

  get nativeMediaStream() {
    return this.#mediaStream?.mediaStream;
  }

  get mediaStream() {
    return this.#mediaStream;
  }

  set mediaStream(p2pMediaStream: P2PMediaStream) {
    this.#mediaStream = p2pMediaStream;

    if (this.peer && !this.peer.isOwner) {
      if (this.#mediaStream.mediaStream) {
        this.addAudioFilters();
      } else {
        this.#mediaStream.once("started", () => this.addAudioFilters());
      }
    }
  }

  setGain(value: number) {
    this.#mediaStream.mediaElement.muted = value > 0;

    this.#gainFilter.gain.value = value;
  }

  updateCameraPosition() {
    if (this.#mediaStream?.mediaElement) {
      this.#mediaStream.mediaElement.style.top = `${this.peer.position.y - 70}px`;
      this.#mediaStream.mediaElement.style.left = `${this.peer.position.x + 55}px`;
    }
  }

  private addAudioFilters() {
    const source = this.#audioContext.createMediaStreamSource(this.nativeMediaStream);

    this.connectAudioFilters(source);
  }

  private connectAudioFilters(source: MediaStreamAudioSourceNode) {
    const filterCount = this.#filters.length;

    this.#filters.reduce((previousFilterNode: AudioNode, currentFilterNode: AudioNode, index: number) => {
      if (index === filterCount - 1) {
        return previousFilterNode.connect(this.#audioContext.destination);
      } else {
        return previousFilterNode.connect(currentFilterNode);
      }
    }, source);
  }
}