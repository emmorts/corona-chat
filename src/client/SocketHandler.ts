import EventEmitter from "common/EventEmitter";
import config from 'common/config';
import { SocketMessage } from "common/SocketMessage";
import { SocketMessageType } from "common/SocketMessageType";
import * as Message from "common/Messages";
import Logger from "common/Logger";

interface MessageHandlerEventConfiguration {
  [SocketMessageType.DISCONNECTED]: { (): void };
  [SocketMessageType.CONNECTED]: { (message: Message.SConnected): void };
  [SocketMessageType.SPAWN_PEER_CELL]: { (message: Message.SSpawnPeerCell): void };
  [SocketMessageType.UPDATE_PEER_CELL_POSITION]: { (message: Message.SUpdatePeerCellPosition): void };
  [SocketMessageType.REMOVE_PEER]: { (message: Message.SRemovePeer): void };
  [SocketMessageType.ADD_PEER]: { (message: Message.SAddPeer): void };
  [SocketMessageType.ICE_CANDIDATE]: { (message: Message.SIceCandidate): void };
  [SocketMessageType.SESSION_DESCRIPTION]: { (message: Message.SSessionDescription): void };
};

export default class SocketHandler extends EventEmitter<MessageHandlerEventConfiguration> {
  #socket: WebSocket;

  constructor() {
    super();

    this.#socket = new WebSocket(this.socketServerUrl);

    this.#socket.onopen = () => {
      Logger.info("Connected to signaling server");

      this.#socket.onmessage = this.handleMessage.bind(this);
    };

    this.#socket.onclose = () => {
      Logger.info("Disconnected from signaling server");
      
      this.fire(SocketMessageType.DISCONNECTED);
    }
  }

  get socketServerUrl() {
    const port = process.env.PORT || config.socketServerPort;
    const isSecure = window.location.protocol.startsWith("https");
    const protocol = isSecure ? "wss" : "ws";

    if (process.env.NODE_ENV === 'development') {
      return `${protocol}://${window.location.hostname}:${port}`;
    }
    
    return `${protocol}://${window.location.hostname}`;
  }

  send(message: SocketMessage) {
    this.#socket.send(JSON.stringify(message));
  }

  private handleMessage(message: MessageEvent) {
    let payload: SocketMessage;

    try {
      payload = JSON.parse(message.data);

    } catch (error) {
      console.error(`Failed to parse payload`, message.data);
    }

    if (payload.type === SocketMessageType.PING) {
      this.sendPongMessage();
    } else {
      // TODO: Check if type is registered within event configuration
      this.fire(payload.type as any, payload as any);
    }
  }

  private sendPongMessage() {
    this.send({
      type: SocketMessageType.PONG
    } as Message.CPong);
  }

  private isMessageRegistered(type: any, object: any): object is MessageHandlerEventConfiguration {
    return type in object;
  }

}