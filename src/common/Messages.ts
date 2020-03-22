export interface CSpawnPeerCell {
  type: "spawnPeerCell",
  name: string
}

export interface SSpawnPeerCell {
  type: "spawnPeerCell",
  socketId: string,
  ownerId: string,
  isOwner: boolean,
  name: string,
  position: {
    x: number,
    y: number
  }
  mood: string
}

export interface CUpdatePeerCellPosition {
  type: "updatePeerCellPosition",
  position: {
    x: number,
    y: number,
  }
}

export interface SUpdatePeerCellPosition {
  type: "updatePeerCellPosition",
  socketId: string,
  position: {
    x: number,
    y: number,
  }
}

export interface IRemovePeer {
  type: "removePeer",
  socketId: string
}

export interface IPing {
  type: "ping"
}

export interface IPong {
  type: "pong"
}

export interface CUpdatePeerMood {
  type: "updatePeerMood",
  mood: string
}

export interface SUpdatePeerMood {
  type: "updatePeerMood",
  socketId: string,
  mood: string
}

export interface IConnected {
  type: "connected",
  socketId: string,
  peers: string[]
}