import adapter from "webrtc-adapter";
import SocketHandler from "./SocketHandler";
import P2PChannel from "./P2PChannel";
import { createCanvas } from "./utils/CanvasUtils";
import { createLogin } from "./utils/LoginUtils";
import Room from "./Room";
import { CSpawnPeerCell } from "../common/Messages";
import RoomRenderer from "./RoomRenderer";
import P2PMediaStream from "./P2PMediaStream";

createLogin(username => {
  const socketHandler = new SocketHandler();
  const channel = new P2PChannel(socketHandler);
  
  const canvasElement = createCanvas();
  const renderer = new RoomRenderer(canvasElement);
  const room = new Room(socketHandler, renderer);

  channel.on("localStreamAdded", (stream: P2PMediaStream) => {
    room.addLocalStream(stream);

    renderer.start();
  });
  channel.on("peerStreamAdded", (socketId: string, stream: P2PMediaStream) => room.addPeerStream(socketId, stream));

  socketHandler.on("connected", () => {
    const message: CSpawnPeerCell = {
      type: "spawnPeerCell",
      name: username
    };

    socketHandler.send(message);
  });
});
