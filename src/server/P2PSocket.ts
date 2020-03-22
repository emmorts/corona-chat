import { WebSocket } from "ws";
import MessageHandler from "server/MessageHandler";
import Peer from 'common/Peer';

export type P2PChannelCollection = {
  [key: string]: string
};

export type P2PSocket = WebSocket & {
  id: string,
  messageHandler: MessageHandler,
  peerController: Peer,
  channels: P2PChannelCollection
};