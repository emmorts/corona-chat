import * as ws from "ws";
import { P2PSocket } from "server/P2PSocket";

export default class MessageHandler {
  #socket: P2PSocket;
  #eventHandlers: {
    [eventName: string]: ((...params: any[]) => void)[]
  } = {};

  constructor(socket: P2PSocket) {
    this.#socket = socket;
  }

  on(eventName: string, handler: (...params: any[]) => void) {
    if (!(eventName in this.#eventHandlers)) {
      this.#eventHandlers[eventName] = [];
    }

    this.#eventHandlers[eventName].push(handler);
  }

  send(message: any) {
    this.#socket.send(JSON.stringify(message));
  }

  handleMessage(message: ws.Data) {
    let payload;

    try {
      payload = JSON.parse(message as string);
    } catch (error) {
      throw new Error(`Failed to parse payload ${message}`);
    }

    this.fire(payload.type, payload);
  }

  private fire(eventName: string, ...params: any[]) {
    if (eventName in this.#eventHandlers) {
      this.#eventHandlers[eventName].forEach(handler => {
        handler(...params);
      })
    }
  }
}