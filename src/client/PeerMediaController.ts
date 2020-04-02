import RTCMediaStream from "client/RTCMediaStream";
import EventEmitter from "common/EventEmitter";
import Logger from "common/Logger";
import { Point } from "common/Structures";
import { visualiseAnalyser } from "client/utils/AnalyserUtils";

export enum PeerMediaControllerEventType {
  AUDIO_STREAM_STARTED,
  AUDIO_STREAM_STOPPED,
  VIDEO_STREAM_STARTED,
  VIDEO_STREAM_STOPPED,
};

interface PeerMediaControllerEventConfiguration {
  [PeerMediaControllerEventType.AUDIO_STREAM_STARTED]: { (stream: MediaStream): void };
  [PeerMediaControllerEventType.AUDIO_STREAM_STOPPED]: { (): void };
  [PeerMediaControllerEventType.VIDEO_STREAM_STARTED]: { (stream: MediaStream): void };
  [PeerMediaControllerEventType.VIDEO_STREAM_STOPPED]: { (): void };
}

interface PeerAudioFilterConfiguration {
  context: AudioContext;
  gainFilter: GainNode;
  analyserFilter?: AnalyserNode;
};

export default class PeerMediaController extends EventEmitter<PeerMediaControllerEventConfiguration> {
  #audioStream: RTCMediaStream;
  #videoStream: RTCMediaStream;
  #peerAudioFilterConfigurationMap = new Map<string, PeerAudioFilterConfiguration>();

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

  async startLocalAudioStream() {
    this.#audioStream = new RTCMediaStream({ muted: true, audio: true, video: false });
    
    const stream = await this.#audioStream.getUserMedia();

    this.#audioStream.attachMediaElement(stream);

    this.fire(PeerMediaControllerEventType.AUDIO_STREAM_STARTED, stream);
  }

  stopLocalAudioStream() {
    if (this.#audioStream && this.#audioStream.isAttached) {
      this.#audioStream.remove();

      this.fire(PeerMediaControllerEventType.AUDIO_STREAM_STOPPED);
    } else {
      Logger.error("Failed to remove audio stream - not attached");
    }
  }

  async startLocalVideoStream() {
    this.#videoStream = new RTCMediaStream({ muted: true, audio: false, video: true });
    
    const stream = await this.#videoStream.getUserMedia();

    this.#videoStream.attachMediaElement(stream);

    this.fire(PeerMediaControllerEventType.VIDEO_STREAM_STARTED, stream);
  }

  stopLocalVideoStream() {
    if (this.#videoStream && this.#videoStream.isAttached) {
      this.#videoStream.remove();

      this.fire(PeerMediaControllerEventType.VIDEO_STREAM_STOPPED);
    } else {
      Logger.error("Failed to remove video stream - not attached");
    }
  }

  async startRemoteMediaStream(socketId: string, peerConnection: RTCPeerConnection, localMediaController: PeerMediaController) {
    peerConnection.ontrack = this.handleTrackAdded.bind(this);

    this.setupRemoteMediaStream(socketId, peerConnection, localMediaController);
  }

  setGain(socketId: string, value: number) {
    if (this.#audioStream) {
      const audioFilterConfiguration = this.#peerAudioFilterConfigurationMap.get(socketId);

      const gainMax = 2;
      const gainMin = 0;
      const gainValue = value * (gainMax - gainMin) / 100 + gainMin;

      audioFilterConfiguration.gainFilter.gain.setValueAtTime(gainValue, audioFilterConfiguration.context.currentTime);
    }
  }

  updateVideoStreamPosition(position: Point) {
    if (this.#videoStream && this.#videoStream.isAttached) {
      this.#videoStream.mediaElement.style.top = `${position.y}px`;
      this.#videoStream.mediaElement.style.left = `${position.x}px`;
    }
  }

  hasPeerAudioFilters(socketId: string) {
    return this.#peerAudioFilterConfigurationMap.has(socketId);
  }

  getPeerAudioFilters(socketId: string) {
    return this.#peerAudioFilterConfigurationMap.get(socketId);
  }

  setupPeerAudioFilters(socketId: string) {
    const context = new AudioContext();

    const gainFilter = context.createGain();
    gainFilter.gain.value = 1;

    const analyserFilter = context.createAnalyser();
    analyserFilter.fftSize = 256;
    
    this.#peerAudioFilterConfigurationMap.set(socketId, {
      context,
      gainFilter,
      analyserFilter
    });

    console.debug(`Peer '${socketId}' audio filter configuration has been added`);
  }

  destroy() {
    if (this.#audioStream) {
      this.#audioStream.remove();
    }
    if (this.#videoStream) {
      this.#videoStream.remove();
    }
  }

  private setupRemoteMediaStream(socketId: string, peerConnection: RTCPeerConnection, localMediaController: PeerMediaController) {
    if (!localMediaController.hasPeerAudioFilters(socketId)) {
      localMediaController.setupPeerAudioFilters(socketId);
    }

    if (localMediaController.streams.length) {
      this.streamToPeer(socketId, peerConnection, localMediaController, localMediaController.streams);
    }

    localMediaController.on([ PeerMediaControllerEventType.AUDIO_STREAM_STARTED, PeerMediaControllerEventType.VIDEO_STREAM_STARTED ], (stream) => {
      this.streamToPeer(socketId, peerConnection, localMediaController, [ stream ]);
    });
  }

  private streamToPeer(socketId: string, peerConnection: RTCPeerConnection, localMediaController: PeerMediaController, streams: MediaStream[]) {
    const audioFiltersConfiguration = localMediaController.getPeerAudioFilters(socketId);
    const sender = this.addLocalStreamsToPeer(peerConnection, streams, audioFiltersConfiguration);

    localMediaController.on([ PeerMediaControllerEventType.AUDIO_STREAM_STOPPED, PeerMediaControllerEventType.VIDEO_STREAM_STOPPED ], () => {
      peerConnection.removeTrack(sender);
    });
  }

  private handleTrackAdded(event: RTCTrackEvent) {
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

  private addLocalStreamsToPeer(peerConnection: RTCPeerConnection, streams: MediaStream[], audioFiltersConfiguration: PeerAudioFilterConfiguration): RTCRtpSender {
    let rtcRtpSender: RTCRtpSender;

    streams.forEach(stream => {
      for (const audioTrack of stream.getAudioTracks()) {
        rtcRtpSender = peerConnection.addTrack(this.addAudioFiltersToTrack(audioFiltersConfiguration, audioTrack), stream);
      }
  
      for (const videoTrack of stream.getVideoTracks()) {
        rtcRtpSender = peerConnection.addTrack(videoTrack, stream);
      }
    });

    return rtcRtpSender;
  }

  private addAudioFiltersToTrack(filterConfiguration: PeerAudioFilterConfiguration, track: MediaStreamTrack): MediaStreamTrack {
    const streamSource = filterConfiguration.context.createMediaStreamSource(new MediaStream([ track ]));
    const streamDestination = filterConfiguration.context.createMediaStreamDestination();

    const audioFilters: AudioNode[] = [
      filterConfiguration.gainFilter
    ];

    if (filterConfiguration.analyserFilter) {
      audioFilters.push(filterConfiguration.analyserFilter);

      visualiseAnalyser(filterConfiguration.analyserFilter);
    }

    this.connectAudioFilters(streamSource, [...audioFilters, streamDestination]);

    const filteredMediaStreamTrack = streamDestination.stream.getAudioTracks()[0];

    return filteredMediaStreamTrack;
  }

  private connectAudioFilters(source: MediaStreamAudioSourceNode, filters: AudioNode[]) {
    filters.reduce((previousFilterNode: AudioNode, currentFilterNode: AudioNode) => previousFilterNode.connect(currentFilterNode), source);
  }
}