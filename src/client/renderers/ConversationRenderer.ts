import { Sprite, Texture } from "pixi.js";
import { Conversation } from "client/models/Conversation";
import { getOffscreenCanvas, createRadialGradient } from "client/utils/GraphicsUtils";
import { IRenderer } from "client/renderers/IRenderer";

const CONVERSATION_COLOR = 0xEEFB54;
const ConversationTexture = createTexture();

export default class ConversationRenderer implements IRenderer {
  #conversationSprite: Sprite;

  constructor(public conversation: Conversation) {}

  draw() {
    this.#conversationSprite = Sprite.from(ConversationTexture);
    this.#conversationSprite.anchor.set(0.5, 0.5);
    this.#conversationSprite.position.set(this.conversation.center.x, this.conversation.center.y);
    this.#conversationSprite.scale.set(this.conversation.radius / 100, this.conversation.radius / 100);
  
    return this.#conversationSprite;
  }

  destroy() {
    this.#conversationSprite.destroy();
  }
}

function createTexture() {
  const defaultcircleRadius = 100;

  const offscreenCanvas = getOffscreenCanvas(defaultcircleRadius * 2, defaultcircleRadius * 2);
  const offscreenCanvasContext = offscreenCanvas.getContext("2d");

  offscreenCanvasContext.fillStyle = createRadialGradient(offscreenCanvasContext, defaultcircleRadius, defaultcircleRadius, defaultcircleRadius, CONVERSATION_COLOR);

  offscreenCanvasContext.beginPath();
  offscreenCanvasContext.arc(defaultcircleRadius, defaultcircleRadius, defaultcircleRadius, 0, Math.PI * 2);
  offscreenCanvasContext.fill();
  offscreenCanvasContext.closePath();

  return Texture.from(offscreenCanvas);
}