import * as ws from "ws";
import { P2PSocket } from "server/P2PSocket";
import { SocketMessage } from "common/SocketMessage";
import { SocketMessageType } from "common/SocketMessageType";
import * as Message from "common/Messages";
import EventEmitter from "common/EventEmitter";

interface MessageHandlerEventConfiguration {
  [SocketMessageType.SPAWN_PEER_CELL]: { (message: Message.CSpawnPeerCell): void },
  [SocketMessageType.UPDATE_PEER_CELL_POSITION]: { (message: Message.CUpdatePeerCellPosition): void },
  [SocketMessageType.JOIN_CHANNEL]: { (message: Message.CJoinChannel): void },
  [SocketMessageType.ICE_CANDIDATE]: { (message: Message.CIceCandidate): void },
  [SocketMessageType.SESSION_DESCRIPTION]: { (message: Message.CSessionDescription): void },
};

export default class MessageHandler extends EventEmitter<MessageHandlerEventConfiguration> {
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

    // TODO: Check if type is registered within event configuration
    this.fire(payload.type as any, payload as any);
  }
}