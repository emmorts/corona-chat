import { Server } from "http";
import { ulid } from "ulid";
import * as ws from "ws";
import config from "common/config";
import { P2PSocket } from "server/P2PSocket";
import MessageHandler from "server/MessageHandler";
import { SUpdatePeerCellPosition, CUpdatePeerCellPosition, CUpdatePeerMood, SUpdatePeerMood, CSpawnPeerCell, IRemovePeer, IPing, IConnected } from 'common/Messages';
import Peer from 'common/Peer';

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
  #heartbeatInterval: NodeJS.Timeout;

  constructor(server: Server) {
    this.#httpServer = server;
  }

  start() {
    const port = process.env.PORT || config.socketServerPort;

    this.#httpServer.listen(port, () => {
      console.log(`HTTP server running on ${port} port.`);

      this.#socketServer = new ws.Server({ server: this.#httpServer });

      this.#socketServer.on("connection", this.handleSocketConnected.bind(this));
      this.#socketServer.on("error", this.handleSocketConnectionError.bind(this));

      console.log(`Socket server has been initialized.`);
    });
  }

  private handleSpawnPeerCell(socket: P2PSocket, message: CSpawnPeerCell) {
    const peerController = new Peer({
      name: message.name,
      socketId: socket.id,
      position: {
        x: ~~(Math.random() * 500),
        y: ~~(Math.random() * 500)
      },
      mood: "neutral"
    });

    for (const peerId in this.#sockets) {
      if (peerId !== socket.id) {
        this.#sockets[socket.id].messageHandler.send({
          type: "spawnPeerCell",
          isOwner: false,
          ownerId: this.#sockets[peerId].peerController.socketId,
          name: this.#sockets[peerId].peerController.name,
          position: this.#sockets[peerId].peerController.position,
          mood: this.#sockets[peerId].peerController.mood
        })
      }
    }

    for (const peerId in this.#sockets) {
      this.#sockets[peerId].messageHandler.send({
        type: "spawnPeerCell",
        isOwner: socket.id === peerId,
        ownerId: peerController.socketId,
        name: peerController.name,
        position: peerController.position,
        mood: peerController.mood
      });
    }

    socket.peerController = peerController;
  }

  private handleUpdatePeerCellPosition(socket: P2PSocket, receivedMessage: CUpdatePeerCellPosition) {
    this.#sockets[socket.id].peerController.position = receivedMessage.position;

    for (const peerId in this.#sockets) {
      if (peerId !== socket.id) {
        const messsage: SUpdatePeerCellPosition = {
          type: "updatePeerCellPosition",
          socketId: socket.id,
          position: receivedMessage.position
        }

        this.#sockets[peerId].messageHandler.send(messsage)
      }
    }
  }

  private handleUpdatePeerMood(socket: P2PSocket, receivedMessage: CUpdatePeerMood) {
    this.#sockets[socket.id].peerController.mood = receivedMessage.mood;

    for (const peerId in this.#sockets) {
      if (peerId !== socket.id) {
        const message: SUpdatePeerMood = {
          type: "updatePeerMood",
          socketId: socket.id,
          mood: receivedMessage.mood
        }

        this.#sockets[peerId].messageHandler.send(message)
      }
    }
  }

  private handleRelayICECandidate(socket: P2PSocket, message: any) {
    const peerId = message.peerId  as string;
    const iceCandidate = message.iceCandidate as any;

    console.log(`Socket '${socket.id}' relaying ICE candidate to '${peerId}'`)

    if (peerId in this.#sockets) {
      this.#sockets[peerId].messageHandler.send({
        type: "iceCandidate",
        peerId: socket.id,
        iceCandidate: iceCandidate
      });
    }
  }

  private handleRelaySessionDescription(socket: P2PSocket, message: any) {
    const peerId = message.peerId  as string;
    const sessionDescription = message.sessionDescription as any;

    console.log(`Socket '${socket.id}' relaying session description to '${peerId}'`)

    if (peerId in this.#sockets) {
      this.#sockets[peerId].messageHandler.send({
        type: "sessionDescription",
        peerId: socket.id,
        sessionDescription: sessionDescription
      });
    }
  }

  private handleJoinChannel(socket: P2PSocket, message: any) {
    const channel = message.channel as string;

    console.log(`Socket '${socket.id}' joining channel '${channel}'`);

    if (channel in socket.channels) {
        console.log(`Socket '${socket.id}' is already in channel '${channel}'`);

        return;
    }

    if (!(channel in this.#channels)) {
        this.#channels[channel] = {};
    }

    for (const id in this.#channels[channel]) {
      this.#channels[channel][id].messageHandler.send({
        type: "addPeer",
        peerId: socket.id,
        shouldCreateOffer: false
      });

      socket.messageHandler.send({
        type: "addPeer",
        peerId: id,
        shouldCreateOffer: true
      })
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
      type: "connected",
      socketId: socket.id,
      peers: Object.keys(this.#sockets).filter(s => s !== socket.id)
    } as IConnected);

    socket.messageHandler.on("spawnPeerCell", message => this.handleSpawnPeerCell(socket, message));
    socket.messageHandler.on("updatePeerCellPosition", message => this.handleUpdatePeerCellPosition(socket, message));
    socket.messageHandler.on("joinChannel", message => this.handleJoinChannel(socket, message));
    socket.messageHandler.on("relayICECandidate", message => this.handleRelayICECandidate(socket, message));
    socket.messageHandler.on("relaySessionDescription", message => this.handleRelaySessionDescription(socket, message));
    socket.messageHandler.on("updatePeerMood", message => this.handleUpdatePeerMood(socket, message));

    socket.on("message", (message) => {
      socket.messageHandler.handleMessage(message);
    });

    socket.on("error", (error) => this.handleSocketError(socket, error));
    socket.on("close", () => this.handleCloseConnection(socket));

    this.startHeartbeat(socket);

    console.log(`Socket '${socket.id}' connection has been established.`);
  }

  private startHeartbeat(socket: P2PSocket) {
    this.#heartbeatInterval = setInterval(() => {
      socket.messageHandler.send({
        type: "ping"
      } as IPing);
    }, config.heartbeatInterval);
  }

  private handleSocketConnectionError(error: Error) {
    console.log(`Unhandled error code: ${error}.`);

    process.exit(1);
  }

  private handleSocketError(socket: P2PSocket, error: Error) {
    console.log(`Socket '${socket.id}' received error ${error.message}`);
  }

  private handleCloseConnection(socket: P2PSocket) {
    for (const channel in socket.channels) {
      this.removePeer(socket, channel);
    }

    delete this.#sockets[socket.id];

    console.log(`Socket '${socket.id}' connection has been closed.`);
  }

  private removePeer(socket: P2PSocket, channel: string) {
    console.log(`Removing socket ${socket.id} from all channels.`);

    if (!(channel in socket.channels)) {
      console.log(`'${socket.id}' was not found in channel '${channel}'`);
    } else {
      delete socket.channels[channel];
      delete this.#channels[channel][socket.id];
  
      for (const socketId in this.#channels[channel]) {
        this.#channels[channel][socketId].messageHandler.send({
          type: "removePeer",
          socketId: socket.id
        } as IRemovePeer);

        socket.messageHandler.send({
          type: "removePeer",
          socketId: socketId
        } as IRemovePeer);
      }
    }

  }

}