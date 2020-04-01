import RTCMediaStream from "client/RTCMediaStream";
import EventEmitter from "common/EventEmitter";
import { ControlItemType } from "client/ControlsManager";
import Logger from "common/Logger";
import { Point } from "common/Structures";

export enum PeerMediaControllerEventType {
  MEDIA_TRACKS_ADDED = "MEDIA_TRACKS_ADDED",
  AUDIO_STREAM_STARTED = "AUDIO_STREAM_STARTED",
  AUDIO_STREAM_STOPPED = "AUDIO_STREAM_STOPPED",
  VIDEO_STREAM_STARTED = "VIDEO_STREAM_STARTED",
  VIDEO_STREAM_STOPPED = "VIDEO_STREAM_STOPPED",
};

interface PeerMediaControllerEventConfiguration {
  [PeerMediaControllerEventType.MEDIA_TRACKS_ADDED]: { (): void };
  [PeerMediaControllerEventType.AUDIO_STREAM_STARTED]: { (stream: MediaStream): void };
  [PeerMediaControllerEventType.AUDIO_STREAM_STOPPED]: { (): void };
  [PeerMediaControllerEventType.VIDEO_STREAM_STARTED]: { (stream: MediaStream): void };
  [PeerMediaControllerEventType.VIDEO_STREAM_STOPPED]: { (): void };
}

export default class PeerMediaController extends EventEmitter<PeerMediaControllerEventConfiguration> {
  #audioContext: AudioContext = new AudioContext();
  #mediaStream: RTCMediaStream;
  #audioStream: RTCMediaStream;
  #videoStream: RTCMediaStream;

  #gainFilter = this.#audioContext.createGain();
  #filters: AudioNode[] = [ this.#gainFilter ];

  get audioTracks() {
    return this.#audioStream?.mediaStream.getAudioTracks() ?? [];
  }

  get videoTracks() {
    return this.#videoStream?.mediaStream.getVideoTracks() ?? [];
  }

  get audioStream() {
    return this.#audioStream?.mediaStream;
  }

  get videoStream() {
    return this.#videoStream?.mediaStream;
  }

  get streams() {
    const streams: MediaStream[] = [];

    if (this.audioStream) {
      streams.push(this.audioStream);
    }

    if (this.videoStream) {
      streams.push(this.videoStream);
    }

    return streams;
  }

  async setupLocalAudioStream() {
    this.#audioStream = new RTCMediaStream({ muted: true, audio: true, video: false });
    
    const stream = await this.#audioStream.getUserMedia();

    this.#audioStream.attachMediaElement(stream);

    this.fire(PeerMediaControllerEventType.AUDIO_STREAM_STARTED, stream);
  }

  removeLocalAudioStream() {
    if (this.#audioStream && this.#audioStream.isAttached) {
      this.#audioStream.remove();

      this.fire(PeerMediaControllerEventType.AUDIO_STREAM_STOPPED);
    } else {
      Logger.error("Failed to remove audio stream - not attached");
    }
  }

  async setupLocalVideoStream() {
    this.#videoStream = new RTCMediaStream({ muted: true, audio: false, video: true });
    
    const stream = await this.#videoStream.getUserMedia();

    this.#videoStream.attachMediaElement(stream);

    this.fire(PeerMediaControllerEventType.VIDEO_STREAM_STARTED, stream);
  }

  removeLocalVideoStream() {
    if (this.#videoStream && this.#videoStream.isAttached) {
      this.#videoStream.remove();

      this.fire(PeerMediaControllerEventType.VIDEO_STREAM_STOPPED);
    } else {
      Logger.error("Failed to remove video stream - not attached");
    }
  }

  async setupRemoteMediaStream(peerConnection: RTCPeerConnection, localMediaController: PeerMediaController) {
    peerConnection.ontrack = (event: RTCTrackEvent) => {
      console.log("ontrack", event);

      if (!this.#mediaStream) {
        const stream = event.streams[0];
        const isVideo = event.track.kind === "video";

        if (isVideo) {
          this.#videoStream = new RTCMediaStream({ muted: false, video: true, audio: false });
          this.#videoStream.attachMediaElement(stream);

          this.fire(PeerMediaControllerEventType.VIDEO_STREAM_STARTED, stream);
        } else {
          this.#audioStream = new RTCMediaStream({ muted: false, video: false, audio: true });
          this.#audioStream.attachMediaElement(stream);

          this.fire(PeerMediaControllerEventType.AUDIO_STREAM_STARTED, stream);
        }
      }
    }

    if (localMediaController.streams.length) {
      const sender = this.addLocalTracksToPeer(peerConnection, localMediaController.streams);

      localMediaController.on([ PeerMediaControllerEventType.AUDIO_STREAM_STOPPED, PeerMediaControllerEventType.VIDEO_STREAM_STOPPED ], () => {
        peerConnection.removeTrack(sender)
      });
    }

    localMediaController.on([ PeerMediaControllerEventType.AUDIO_STREAM_STARTED, PeerMediaControllerEventType.VIDEO_STREAM_STARTED ], (stream) => {
      const sender = this.addLocalTracksToPeer(peerConnection, [ stream ]);

      localMediaController.on([ PeerMediaControllerEventType.AUDIO_STREAM_STOPPED, PeerMediaControllerEventType.VIDEO_STREAM_STOPPED ], () => {
        peerConnection.removeTrack(sender)
      });
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

  updateVideoStreamPosition(position: Point) {
    if (this.#videoStream && this.#videoStream.isAttached) {
      this.#videoStream.mediaElement.style.top = `${position.y}px`;
      this.#videoStream.mediaElement.style.left = `${position.x}px`;
    }
  }

  destroy() {
    if (this.#mediaStream) {
      this.#mediaStream.remove();
    }
  }

  private addLocalTracksToPeer(peerConnection: RTCPeerConnection, streams: MediaStream[]): RTCRtpSender {
    let rtcRtpSender: RTCRtpSender;

    streams.forEach(stream => {
      for (const audioTrack of stream.getAudioTracks()) {
        rtcRtpSender = peerConnection.addTrack(this.addAudioFiltersToTrack(audioTrack), stream);
      }
  
      for (const videoTrack of stream.getVideoTracks()) {
        rtcRtpSender = peerConnection.addTrack(videoTrack, stream);
      }
    });

    this.fire(PeerMediaControllerEventType.MEDIA_TRACKS_ADDED);

    return rtcRtpSender;
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