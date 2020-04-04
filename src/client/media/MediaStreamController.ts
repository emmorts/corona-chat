import EventEmitter from "common/EventEmitter";
import Logger from "common/Logger";

export type MediaStreamControllerConstructorOptions = MediaStreamConstraints & {
  muted?: boolean;
  playsInline?: boolean;
};

export enum MediaStreamControllerEventType {
  STARTED
};

interface MediaStreamControllerEventConfiguration {
  [MediaStreamControllerEventType.STARTED]: { (): void };
};

export default class MediaStreamController extends EventEmitter<MediaStreamControllerEventConfiguration> {
  #options: MediaStreamControllerConstructorOptions;
  #mediaStream: MediaStream;
  #mediaElement: HTMLAudioElement | HTMLVideoElement;
  #isAttached = false;

  constructor(options?: MediaStreamControllerConstructorOptions) {
    super();

    this.#options = {
      audio: true,
      video: true,
      muted: false,
      playsInline: true
    };

    if (options) {
      this.#options = {
        ...this.#options,
        ...options
      };
    }
  }

  get isAttached() {
    return this.#isAttached;
  }

  get mediaStream() {
    return this.#mediaStream;
  }

  get mediaElement() {
    return this.#mediaElement;
  }

  getUserMedia(): Promise<MediaStream> {
    return new Promise((resolve, reject) => {
      const userMediaPromise = this._getUserMedia();

      if (!userMediaPromise) {
        reject(new Error("Unsupported media"));
      } else {
        userMediaPromise
          .then(resolve)
          .catch(error => {
            reject(new Error(`Access denied for media stream (${error})`));
          })
      }
    });
  }

  attachMediaElement(stream: MediaStream) {
    this.#mediaStream = stream;
    this.#mediaStream.onremovetrack = (event: MediaStreamTrackEvent) => {
      this.remove();
    }

    this.#mediaElement = this.createMediaElement(stream);

    this.#isAttached = true;

    this.fire(MediaStreamControllerEventType.STARTED);
  }

  remove() {
    document.body.removeChild(this.#mediaElement);

    for (const track of this.#mediaStream.getTracks()) {
      this.#mediaStream.removeTrack(track);
    }

    this.#mediaStream = null;

    this.#isAttached = false;
  }

  private createMediaElement(stream: MediaStream): HTMLAudioElement | HTMLVideoElement {
    const mediaElement = this.#options.video
      ? document.createElement("video")
      : document.createElement("audio");

    mediaElement.muted = this.#options.muted;

    mediaElement.setAttribute("autoplay", "autoplay");

    if (this.#options.playsInline) {
      mediaElement.setAttribute("playsinline", "");
    }

    if (this.#options.muted) {
      mediaElement.setAttribute("muted", "");
    }

    mediaElement.setAttribute("controls", "");

    document.body.appendChild(mediaElement);
    
    if ("srcObject" in mediaElement) {
      mediaElement.srcObject = stream;
    } else {
      (mediaElement as any).src = window.URL.createObjectURL(stream); // for older browsers
    }

    return mediaElement;
  }

  private _getUserMedia(): Promise<MediaStream> {
    // @ts-ignore
    const getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
    if (getUserMedia) {
      const promisifiedGetUserMedia: Promise<MediaStream> = new Promise((resolve, reject) => {
        getUserMedia.call(navigator, this.#options, resolve, reject);
      });
      
      return promisifiedGetUserMedia;
    }

    return null;
  }
}
