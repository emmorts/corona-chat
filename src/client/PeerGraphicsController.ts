import * as pixi from "pixi.js";
import Peer from "../common/Peer";
import { drawPeerCell, drawPeerCellName, drawPeerAudioRange } from "./utils/GraphicsUtils";
import { EventEmitter } from "../common/EventEmitter";
import { Point } from "../common/Structures";

type PeerGraphicsEventType = "cellMove";

export default class PeerGraphicsController extends EventEmitter<PeerGraphicsEventType> {
  #displayObjects: pixi.DisplayObject[] = [];

  #cellGraphics: pixi.Graphics;
  #cellNameText: pixi.Text;
  #cellAudioRangeSprite: pixi.Sprite;

  get displayObjects(): pixi.DisplayObject[] {
    return this.#displayObjects;
  }

  get cellPosition() {
    return {
      x: this.#cellGraphics.x,
      y: this.#cellGraphics.y
    }
  }

  set cellPosition(position: Point) {
    const { x, y } = this.#cellGraphics.parent.toLocal(new pixi.Point(position.x, position.y));

    this.displayObjects.forEach(displayObject => displayObject.position.set(x, y));
  }

  drawCell(peer: Peer) {
    this.#cellGraphics = drawPeerCell({
      name: peer.name,
      position: peer.position,
      isOwner: peer.isOwner,
      onDrag: position => this.fire("cellMove", position),
      onDragEnd: position => this.fire("cellMove", position)
    });

    this.#displayObjects.push(this.#cellGraphics);

    this.#cellNameText = drawPeerCellName({
      name: peer.name,
      position: peer.position
    });

    this.#displayObjects.push(this.#cellNameText);

    if (peer.isOwner) {
      this.#cellAudioRangeSprite = drawPeerAudioRange({
        audioRange: 300,
        position: peer.position,
      });

      this.#displayObjects.push(this.#cellAudioRangeSprite);
    }
  }

  destroy() {
    this.displayObjects.forEach(displayObject => {
      displayObject.destroy();
    });
  }
}