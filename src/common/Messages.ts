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
  audioRange: number,
  position: {
    x: number,
    y: number
  }
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

export interface IConnected {
  type: "connected",
  socketId: string,
  peers: string[]
}