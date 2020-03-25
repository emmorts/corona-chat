import { SocketMessageType } from "common/SocketMessageType";
import { SocketMessage } from "common/SocketMessage";
import { Point } from "common/Structures";

export interface CJoinChannel extends SocketMessage {
  type: SocketMessageType.JOIN_CHANNEL;
  channel: string;
}

export interface SIceCandidate extends SocketMessage {
  type: SocketMessageType.ICE_CANDIDATE;
  socketId: string;
  iceCandidate: RTCIceCandidateInit;
}

export interface CIceCandidate extends SocketMessage {
  type: SocketMessageType.ICE_CANDIDATE;
  socketId: string;
  iceCandidate: RTCIceCandidateInit;
}

export interface SSessionDescription extends SocketMessage {
  type: SocketMessageType.SESSION_DESCRIPTION;
  socketId: string;
  sessionDescription: RTCSessionDescriptionInit;
}

export interface CSessionDescription extends SocketMessage {
  type: SocketMessageType.SESSION_DESCRIPTION;
  socketId: string;
  sessionDescription: RTCSessionDescriptionInit;
}

export interface CSpawnPeerCell extends SocketMessage {
  type: SocketMessageType.SPAWN_PEER_CELL;
  name: string;
}

export interface SSpawnPeerCell extends SocketMessage {
  type: SocketMessageType.SPAWN_PEER_CELL;
  socketId: string;
  isOwner: boolean;
  name: string;
  audioRange: number;
  position: Point;
}

export interface CUpdatePeerCellPosition extends SocketMessage {
  type: SocketMessageType.UPDATE_PEER_CELL_POSITION;
  position: Point;
}

export interface SUpdatePeerCellPosition extends SocketMessage {
  type: SocketMessageType.UPDATE_PEER_CELL_POSITION;
  socketId: string,
  position: Point;
}

export interface SAddPeer extends SocketMessage {
  type: SocketMessageType.ADD_PEER;
  socketId: string;
  shouldCreateOffer: boolean;
}

export interface SRemovePeer extends SocketMessage {
  type: SocketMessageType.REMOVE_PEER;
  socketId: string;
}

export interface SPing extends SocketMessage {
  type: SocketMessageType.PING;
}

export interface CPong extends SocketMessage {
  type: SocketMessageType.PONG;
}

export interface SConnected extends SocketMessage {
  type: SocketMessageType.CONNECTED;
  socketId: string;
  peers: string[];
}