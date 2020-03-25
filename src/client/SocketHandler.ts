import { EventEmitter } from "common/EventEmitter";
import config from 'common/config';
import { SocketMessage } from "common/SocketMessage";
import { SocketMessageType } from "common/SocketMessageType";
import { CPong } from "common/Messages";

export default class SocketHandler extends EventEmitter<SocketMessageType> {
  #socket: WebSocket;

  constructor() {
    super();

    this.#socket = new WebSocket(this.socketServerUrl);

    this.#socket.onopen = () => {
      console.log("Connected to signaling server");

      this.#socket.onmessage = this.handleMessage.bind(this);
    };

    this.#socket.onclose = () => {
      console.log("Disconnected from signaling server");
      
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
      this.send({
        type: SocketMessageType.PONG
      } as CPong);
    } else {
      this.fire(payload.type, payload);
    }
  }

}