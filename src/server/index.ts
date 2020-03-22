import SignalingServer from "server/SignalingServer";
import HttpServer from "server/HttpServer";

const signalingServer = new SignalingServer(HttpServer);

signalingServer.start();