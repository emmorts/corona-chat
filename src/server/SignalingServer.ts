import { Server } from "http";
import { ulid } from "ulid";
import * as ws from "ws";
import Peer from "common/Peer";
import config from "common/config";
import { P2PSocket } from "server/P2PSocket";
import MessageHandler from "server/MessageHandler";
import * as Message from "common/Messages";
import { SocketMessageType } from "common/SocketMessageType";
import Logger from "common/Logger";
import { SocketMessage } from "common/SocketMessage";

type P2PChannelCollection = {
  [channelName: string]: {
    [socketId: string]: P2PSocket
  }
}

type P2PSocketCollection = {
  [socketId: string]: P2PSocket
}

export default class SignalingServer {
  #httpServer: Server;
  #socketServer: ws.Server;
  #channels: P2PChannelCollection = {};
  #sockets: P2PSocketCollection = {};
  #socketHeartbeatIntervals: { [socketId: string]: NodeJS.Timeout } = {};

  constructor(server: Server) {
    this.#httpServer = server;
  }

  start() {
    const port = process.env.PORT || config.socketServerPort;

    this.#httpServer.listen(port, () => {
      Logger.info(`HTTP server running on ${port} port.`);

      this.#socketServer = new ws.Server({ server: this.#httpServer });

      this.#socketServer.on("connection", this.handleSocketConnected.bind(this));
      this.#socketServer.on("error", this.handleSocketConnectionError.bind(this));

      Logger.info(`Socket server has been initialized.`);
    });
  }

  private handleSpawnPeerCell(socket: P2PSocket, message: Message.CSpawnPeerCell) {
    const peerController = new Peer({
      name: message.name,
      socketId: socket.id,
      position: {
        x: 50 + ~~(Math.random() * 300),
        y: 50 + ~~(Math.random() * 500)
      },
      audioRange: 300
    });

    for (const peerId in this.#sockets) {
      if (peerId !== socket.id) {
        this.#sockets[socket.id].messageHandler.send({
          type: SocketMessageType.SPAWN_PEER_CELL,
          isOwner: false,
          socketId: this.#sockets[peerId].peerController.socketId,
          name: this.#sockets[peerId].peerController.name,
          position: this.#sockets[peerId].peerController.position,
          audioRange: this.#sockets[peerId].peerController.audioRange
        } as Message.SSpawnPeerCell)
      }
    }

    for (const peerId in this.#sockets) {
      this.#sockets[peerId].messageHandler.send({
        type: SocketMessageType.SPAWN_PEER_CELL,
        isOwner: socket.id === peerId,
        socketId: peerController.socketId,
        name: peerController.name,
        position: peerController.position,
        audioRange: peerController.audioRange
      } as Message.SSpawnPeerCell);
    }

    socket.peerController = peerController;
  }

  private handleUpdatePeerCellPosition(socket: P2PSocket, receivedMessage: Message.CUpdatePeerCellPosition) {
    this.#sockets[socket.id].peerController.position = receivedMessage.position;

    for (const peerId in this.#sockets) {
      if (peerId !== socket.id) {
        const messsage: Message.SUpdatePeerCellPosition = {
          type: SocketMessageType.UPDATE_PEER_CELL_POSITION,
          socketId: socket.id,
          position: receivedMessage.position
        }

        this.#sockets[peerId].messageHandler.send(messsage)
      }
    }
  }

  private handleRelayICECandidate(socket: P2PSocket, message: Message.CIceCandidate) {
    const { socketId, iceCandidate } = message;

    Logger.trace(`Socket '${socket.id}' relaying ICE candidate to '${socketId}'`)

    if (socketId in this.#sockets) {
      this.#sockets[socketId].messageHandler.send({
        type: SocketMessageType.ICE_CANDIDATE,
        socketId: socket.id,
        iceCandidate
      } as Message.SIceCandidate);
    }
  }

  private handleRelaySessionDescription(socket: P2PSocket, message: Message.CSessionDescription) {
    const { socketId, sessionDescription } = message;

    Logger.trace(`Socket '${socket.id}' relaying session description to '${socketId}'`)

    if (socketId in this.#sockets) {
      this.#sockets[socketId].messageHandler.send({
        type: SocketMessageType.SESSION_DESCRIPTION,
        socketId: socket.id,
        sessionDescription: sessionDescription
      } as Message.SSessionDescription);
    }
  }

  private handleJoinChannel(socket: P2PSocket, message: Message.CJoinChannel) {
    const { channel } = message;

    Logger.trace(`Socket '${socket.id}' joining channel '${channel}'`);

    if (channel in socket.channels) {
      Logger.warn(`Socket '${socket.id}' is already in channel '${channel}'`);

      return;
    }

    if (!(channel in this.#channels)) {
        this.#channels[channel] = {};
    }

    for (const id in this.#channels[channel]) {
      this.#channels[channel][id].messageHandler.send({
        type: SocketMessageType.ADD_PEER,
        socketId: socket.id,
        shouldCreateOffer: false
      } as Message.SAddPeer);

      socket.messageHandler.send({
        type: SocketMessageType.ADD_PEER,
        socketId: id,
        shouldCreateOffer: true
      } as Message.SAddPeer)
    }

    this.#channels[channel][socket.id] = socket;
    socket.channels[channel] = channel;
  }

  private handleSocketConnected(socket: P2PSocket) {
    socket.id = ulid();
    socket.channels = {};

    this.#sockets[socket.id] = socket;

    socket.messageHandler = new MessageHandler(socket);

    socket.messageHandler.send({
      type: SocketMessageType.CONNECTED,
      socketId: socket.id,
      peers: Object.keys(this.#sockets).filter(s => s !== socket.id)
    } as Message.SConnected);

    socket.messageHandler.on(SocketMessageType.SPAWN_PEER_CELL, (message: Message.CSpawnPeerCell) => this.handleSpawnPeerCell(socket, message));
    socket.messageHandler.on(SocketMessageType.UPDATE_PEER_CELL_POSITION, (message: Message.CUpdatePeerCellPosition) => this.handleUpdatePeerCellPosition(socket, message));
    socket.messageHandler.on(SocketMessageType.JOIN_CHANNEL, (message: Message.CJoinChannel) => this.handleJoinChannel(socket, message));
    socket.messageHandler.on(SocketMessageType.ICE_CANDIDATE, (message: Message.CIceCandidate) => this.handleRelayICECandidate(socket, message));
    socket.messageHandler.on(SocketMessageType.SESSION_DESCRIPTION, (message: Message.CSessionDescription) => this.handleRelaySessionDescription(socket, message));

    socket.on("message", (message: ws.Data) => {
      socket.messageHandler.handleMessage(message);
    });

    socket.on("error", (error: any) => this.handleSocketError(socket, error));
    socket.on("close", () => this.handleCloseConnection(socket));

    this.startHeartbeat(socket);

    Logger.info(`Socket '${socket.id}' connection has been established.`);
  }

  private startHeartbeat(socket: P2PSocket) {
    this.#socketHeartbeatIntervals[socket.id] = setInterval(() => {
      socket.messageHandler.send({ type: SocketMessageType.PING } as Message.SPing);
    }, config.heartbeatInterval);
  }

  private handleSocketConnectionError(error: Error) {
    Logger.error(`Unhandled error code: ${error}.`);

    process.exit(1);
  }

  private handleSocketError(socket: P2PSocket, error: Error) {
    Logger.error(`Socket '${socket.id}' received error ${error.message}`);
  }

  private handleCloseConnection(socket: P2PSocket) {
    for (const channel in socket.channels) {
      this.removePeer(socket, channel);
    }

    delete this.#sockets[socket.id];

    Logger.info(`Socket '${socket.id}' connection has been closed.`);
  }

  private removePeer(socket: P2PSocket, channel: string) {
    Logger.trace(`Removing socket ${socket.id} from all channels.`);

    if (this.#socketHeartbeatIntervals[socket.id]) {
      clearInterval(this.#socketHeartbeatIntervals[socket.id]);
    }

    if (!(channel in socket.channels)) {
      Logger.warn(`'${socket.id}' was not found in channel '${channel}'`);
    } else {
      delete socket.channels[channel];
      delete this.#channels[channel][socket.id];
  
      for (const socketId in this.#channels[channel]) {
        this.#channels[channel][socketId].messageHandler.send({
          type: SocketMessageType.REMOVE_PEER,
          socketId: socket.id
        } as Message.SRemovePeer);

        socket.messageHandler.send({
          type: SocketMessageType.REMOVE_PEER,
          socketId: socketId
        } as Message.SRemovePeer);
      }
    }

  }

}