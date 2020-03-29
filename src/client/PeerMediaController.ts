import RTCMediaStream from "client/RTCMediaStream";
import { EventEmitter } from "common/EventEmitter";

export type PeerMediaControllerEventType = "mediaStreamStarted";

export default class PeerMediaController extends EventEmitter<PeerMediaControllerEventType> {
  #audioContext: AudioContext = new AudioContext();
  #mediaStream: RTCMediaStream;

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

  async setupLocalMediaStream() {
    this.#mediaStream = new RTCMediaStream({ muted: true });
    
    const stream = await this.#mediaStream.getUserMedia();

    this.#mediaStream.attachMediaElement(stream);

    this.fire("mediaStreamStarted");
  }

  async setupRemoteMediaStream(peerConnection: RTCPeerConnection, localMediaController: PeerMediaController): Promise<void> {
    return new Promise(resolve => {
      peerConnection.ontrack = (event: RTCTrackEvent) => {
        if (!this.#mediaStream) {
          this.#mediaStream = new RTCMediaStream({ muted: false });
          this.#mediaStream.attachMediaElement(event.streams[0]);
          
          this.fire("mediaStreamStarted");
        }
      }
  
      if (localMediaController.hasMediaStream) {
        this.addLocalTracksToPeer(peerConnection, localMediaController);

        resolve();
      } else {
        localMediaController.once("mediaStreamStarted", () => {
          this.addLocalTracksToPeer(peerConnection, localMediaController);

          resolve();
        });
      }
    });
  }

  setGain(value: number) {
    if (this.#mediaStream) {
      const gainMax = 2;
      const gainMin = 0;
      const gainValue = value * (gainMax - gainMin) / 100 + gainMin

      this.#mediaStream.setMute(value === 0);

      this.#gainFilter.gain.setValueAtTime(gainValue, this.#audioContext.currentTime);
    }
  }

  destroy() {
    if (this.#mediaStream) {
      this.#mediaStream.remove();
    }
  }

  private async addLocalTracksToPeer(peerConnection: RTCPeerConnection, localMediaController: PeerMediaController) {
    for (const track of localMediaController.nativeMediaStream.getTracks()) {
      if (track.kind === "audio") {        
        peerConnection.addTrack(this.addAudioFiltersToTrack(track), localMediaController.nativeMediaStream);
      } else {
        peerConnection.addTrack(track, localMediaController.nativeMediaStream);
      }
    }
  }

  private addAudioFiltersToTrack(track: MediaStreamTrack): MediaStreamTrack {
    const streamSource = this.#audioContext.createMediaStreamSource(new MediaStream([ track ]));
    const streamDestination = this.#audioContext.createMediaStreamDestination();

    this.connectAudioFilters(streamSource, [...this.#filters, streamDestination]);

    this.#gainFilter.gain.value = 1;

    const filteredMediaStreamTrack = streamDestination.stream.getAudioTracks()[0];

    return filteredMediaStreamTrack;
  }

  private connectAudioFilters(source: MediaStreamAudioSourceNode, filters: AudioNode[]) {
    filters.reduce((previousFilterNode: AudioNode, currentFilterNode: AudioNode) => {
      return previousFilterNode.connect(currentFilterNode);
    }, source);
  }
}