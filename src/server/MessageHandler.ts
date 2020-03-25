import * as ws from "ws";
import { P2PSocket } from "server/P2PSocket";
import { SocketMessage } from "common/SocketMessage";
import { SocketMessageType } from "common/SocketMessageType";
import { EventEmitter } from "common/EventEmitter";

export default class MessageHandler extends EventEmitter<SocketMessageType> {
  #socket: P2PSocket;

  constructor(socket: P2PSocket) {
    super();

    this.#socket = socket;
  }

  send(message: SocketMessage) {
    this.#socket.send(JSON.stringify(message));
  }

  handleMessage(message: ws.Data) {
    let payload: SocketMessage;

    try {
      payload = JSON.parse(message as string);
    } catch (error) {
      throw new Error(`Failed to parse payload ${message}`);
    }

    this.fire(payload.type, payload);
  }
}