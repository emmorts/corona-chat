import * as pixi from "pixi.js";
import { Point } from "common/Structures";

const CELL_RADIUS = 40;
const OWNER_CELL_COLOR = 0x008000;
const OWNER_CELL_OUTLINE_COLOR = 0x003300;
const CELL_COLOR = 0xFFA500;
const CELL_OUTLINE_COLOR = 0x003300;
const AUDIO_RANGE_OUTLINE_COLOR = 0x008000;
const AUDIO_RANGE_OUTLINE_ALPHA = 0x99;
const CONVERSATION_COLOR = 0xEEFB54;

type DraggableGraphics = pixi.Graphics & {
  data: pixi.interaction.InteractionData;
  dragging: boolean;
  dragStartLocalPosition: pixi.Point;
  dragStartPosition: pixi.Point;
};

export interface DrawPeerCellOptions {
  name: string;
  position: Point;
  isOwner: boolean;
  onDrag: (position: Point) => void;
  onDragEnd: (position: Point) => void;
}

export function drawPeerCell(options: DrawPeerCellOptions): pixi.Graphics {
  const fillColor = options.isOwner ? OWNER_CELL_COLOR : CELL_COLOR;
  const outlineColor = options.isOwner ? OWNER_CELL_OUTLINE_COLOR : CELL_OUTLINE_COLOR;

  const graphics = new pixi.Graphics();

  graphics.lineStyle(4, outlineColor, 1);
  graphics.beginFill(fillColor, 1);
  graphics.drawCircle(0, 0, CELL_RADIUS);
  graphics.endFill();
  graphics.position.set(options.position.x, options.position.y);

  if (options.isOwner) {
    graphics.interactive = true;
    graphics.buttonMode = true;
  
    graphics.on("pointerdown", onDragStart);

    function onDragStart(this: DraggableGraphics, event: pixi.interaction.InteractionEvent) {
      this.data = event.data;
      this.alpha = 0.5;
      this.dragging = true;
    
      this.dragStartLocalPosition = this.data.getLocalPosition(this.parent);
      this.dragStartPosition = new pixi.Point().copyFrom(this.position);

      this.on("pointermove", onDragMove);
      this.on("pointerup", onDragEnd);
      this.on("pointerupoutside", onDragEnd);
    }
    
    function onDragEnd(this: DraggableGraphics, event: pixi.interaction.InteractionEvent) {
      this.removeListener("pointermove", onDragMove);
      this.removeListener("pointerup", onDragEnd);
      this.removeListener("pointerupoutside", onDragEnd);

      this.alpha = 1;
      this.dragging = false;
      this.data = null;
      this.dragStartPosition = null;
      this.dragStartLocalPosition = null;

      if (options.onDragEnd) {
        const absolutePosition = this.toGlobal(new pixi.Point(0, 0));
  
        options.onDragEnd({
          x: absolutePosition.x,
          y: absolutePosition.y
        });
      }
    }
    
    function onDragMove(this: DraggableGraphics, event: pixi.interaction.InteractionEvent) {
      if (this.data && this.dragging) {
        const newPosition = this.data.getLocalPosition(this.parent);
    
        const candidateX = this.dragStartPosition.x + (newPosition.x - this.dragStartLocalPosition.x);
        const candidateY = this.dragStartPosition.y + (newPosition.y - this.dragStartLocalPosition.y);

        if (candidateX !== this.x || candidateY !== this.y) {
          this.x = candidateX;
          this.y = candidateY;

          if (options.onDrag) {
            const absolutePosition = this.toGlobal(new pixi.Point(0, 0));
      
            options.onDrag({
              x: absolutePosition.x,
              y: absolutePosition.y
            });
          }
        }
      }
    }
  }

  return graphics;
}

interface DrawPeerAudioRangeOptions {
  audioRange: number;
  position: Point;
}

export function drawPeerAudioRange(options: DrawPeerAudioRangeOptions): pixi.Sprite {
  const offscreenCanvas = document.querySelector(".js-offscreen-canvas") as HTMLCanvasElement;

  offscreenCanvas.width = options.audioRange * 2;
  offscreenCanvas.height = options.audioRange * 2;

  const offscreenCanvasContext = offscreenCanvas.getContext("2d");

  offscreenCanvasContext.lineWidth = 2;

  offscreenCanvasContext.beginPath();
  offscreenCanvasContext.setLineDash([5, 5]);
  offscreenCanvasContext.arc(options.audioRange, options.audioRange, options.audioRange, 0, Math.PI * 2);
  offscreenCanvasContext.strokeStyle = "#" + AUDIO_RANGE_OUTLINE_COLOR.toString(16).padStart(6, "0") + AUDIO_RANGE_OUTLINE_ALPHA.toString(16).padStart(2, "0")
  offscreenCanvasContext.closePath();
  offscreenCanvasContext.stroke();

  const sprite = pixi.Sprite.from(offscreenCanvas);
  sprite.anchor.set(0.5, 0.5);
  sprite.position.set(options.position.x, options.position.y);

  return sprite;
}

export interface DrawPeerCellNameOptions {
  name: string;
  position: Point;
}

export function drawPeerCellName(options: DrawPeerCellNameOptions): pixi.Text {
  const peerNameText = new pixi.Text(options.name, {
    fontSize: 18
  } as pixi.TextStyle);

  peerNameText.anchor.set(0.5, 0.5);
  peerNameText.position.set(options.position.x, options.position.y);

  return peerNameText;
}

interface DrawConversationCircleOptions {
  position: Point;
  radius: number;
}

export function drawConversationCircle(options: DrawConversationCircleOptions): pixi.Sprite {
  const offscreenCanvas = document.querySelector(".js-offscreen-canvas") as HTMLCanvasElement;

  const circleRadius = 100;
  offscreenCanvas.width = circleRadius * 2;
  offscreenCanvas.height = circleRadius * 2;

  const offscreenCanvasContext = offscreenCanvas.getContext("2d");

  const radialGradient = offscreenCanvasContext.createRadialGradient(circleRadius, circleRadius, 1, circleRadius, circleRadius, circleRadius);
  radialGradient.addColorStop(0, hexToRgba(CONVERSATION_COLOR, 1));
  radialGradient.addColorStop(1, hexToRgba(CONVERSATION_COLOR, 0));

  offscreenCanvasContext.beginPath();

  offscreenCanvasContext.arc(circleRadius, circleRadius, circleRadius, 0, Math.PI * 2);
  offscreenCanvasContext.strokeStyle = "#" + CONVERSATION_COLOR.toString(16).padStart(6, "0") + AUDIO_RANGE_OUTLINE_ALPHA.toString(16).padStart(2, "0")
  offscreenCanvasContext.closePath();
  offscreenCanvasContext.stroke();

  const sprite = pixi.Sprite.from(offscreenCanvas);
  sprite.anchor.set(0.5, 0.5);
  sprite.position.set(options.position.x, options.position.y);

  return sprite;
}

export function getOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const offscreenCanvas = document.querySelector(".js-offscreen-canvas") as HTMLCanvasElement;

  offscreenCanvas.width = width;
  offscreenCanvas.height = height;

  return offscreenCanvas;
}

export function createRadialGradient(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: number): CanvasGradient {
  const radialGradient = context.createRadialGradient(x, y, 1, x, y, radius);
  radialGradient.addColorStop(0, hexToRgba(color, 96));
  radialGradient.addColorStop(1, hexToRgba(color, 0));

  return radialGradient;
}

function hexToRgba(hex: number, alpha: number): string {
  const color = hex.toString(16).padStart(6, "0");
  const transparency = alpha.toString(16).padStart(2, "0");

  return `#${color}${transparency}`;
}