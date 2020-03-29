import { Point } from "common/Structures";
import { BufferCodec } from "buffercodec";

export class Conversation {
  #hashCode: string;

  constructor(public center: Point, public radius: number) {
    this.#hashCode = this.getHash();
  }

  get hashCode() {
    return this.#hashCode;
  }
  
  equals(conversation: Conversation) {
    return this.center.x === conversation.center.x && this.center.y === conversation.center.y && this.radius === conversation.radius;
  }

  private getHash() {
    const buffer = new BufferCodec()
      .int16(this.center.x)
      .int16(this.center.y)
      .uint16(this.radius)
      .result();

    return new Uint8Array(buffer).join("");
  }

}