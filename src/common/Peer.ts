import { Point } from './Structures';

export default class Peer {
  #name: string;
  #socketId: string;
  #position: Point;
  #isOwner: boolean;
  #mood: string

  constructor(options: {
    name: string,
    socketId: string,
    position: Point,
    mood?: string,
    isOwner?: boolean
  }) {
    this.#name = options.name;
    this.#socketId = options.socketId;
    this.#position = options.position;
    this.#isOwner = options.isOwner;
    this.#mood = options.mood;
  }

  get isInstantiated() {
    return !!this.#socketId;
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

  get mood() {
    return this.#mood;
  }

  set mood(mood) {
    this.#mood = mood;
  }
}