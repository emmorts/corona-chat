import P2PMediaStream from "./P2PMediaStream";
import { EventEmitter } from "../common/EventEmitter";

export type PeerMediaControllerEventType = "mediaStreamStarted";

export default class PeerMediaController extends EventEmitter<PeerMediaControllerEventType> {
  #audioContext: AudioContext = new AudioContext();
  #mediaStream: P2PMediaStream;

  #gainFilter = this.#audioContext.createGain();
  #filters: AudioNode[] = [ this.#gainFilter ];

  get hasMediaStream() {
    return !!this.#mediaStream?.mediaStream;
  }

  get mediaStream() {
    return this.#mediaStream;
  }

  get nativeMediaStream() {
    return this.#mediaStream?.mediaStream;
  }

  get mediaElement() {
    return this.#mediaStream?.mediaElement;
  }

  setMediaStream(p2pMediaStream: P2PMediaStream, isOwner: boolean) {
    this.#mediaStream = p2pMediaStream;

    if (this.#mediaStream.mediaStream) {
      this.setupMediaStream(isOwner);
    } else {
      this.#mediaStream.once("started", () => this.setupMediaStream(isOwner));
    }
  }

  setGain(value: number) {
    this.#mediaStream.mediaElement.muted = value > 0;

    this.#gainFilter.gain.value = value;
  }

  destroy() {
    if (this.#mediaStream) {
      this.#mediaStream.remove();
    }
  }

  private setupMediaStream(isOwner: boolean) {
    if (!isOwner) {
      this.addAudioFilters();
    }

    this.fire("mediaStreamStarted");
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