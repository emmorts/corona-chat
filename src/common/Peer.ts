import { Point } from './Structures';

export default class Peer {
  #name: string;
  #socketId: string;
  #position: Point;
  #isOwner: boolean;
  #audioRange: number;

  constructor(options: {
    name: string,
    socketId: string,
    position: Point,
    audioRange: number,
    isOwner?: boolean
  }) {
    this.#name = options.name;
    this.#socketId = options.socketId;
    this.#position = options.position;
    this.#isOwner = options.isOwner;
    this.#audioRange = options.audioRange;
  }

  get name() {
    return this.#name;
  }

  get socketId() {
    return this.#socketId;
  }

  get position() {
    return this.#position;
  }

  get isOwner() {
    return this.#isOwner;
  }

  set position(point: Point) {
    this.#position.x = point.x;
    this.#position.y = point.y;
  }

  get audioRange() {
    return this.#audioRange;
  }

  set audioRange(audioRange) {
    this.#audioRange = audioRange;
  }
}