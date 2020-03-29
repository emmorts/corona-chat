import { DisplayObject } from "pixi.js";

export interface IRenderer {
  draw(): DisplayObject;
  destroy(): void;
}