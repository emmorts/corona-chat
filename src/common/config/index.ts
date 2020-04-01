import { LogLevel } from "common/loggers/LogLevel";

export default {
  "socketServerPort": 3000,
  "maxConnections": 255,
  "heartbeatInterval": 60000,
  "stunServers": [{
    "urls": [ "stun:stun.l.google.com:19302" ],
  }],
  "turnServers": [{
    "urls": [ "turn:numb.viagenie.ca" ],
    "username": "h.guzas@gmail.com",
    "credential": "qwqwqw"
  }],
  "loggers": [{
    "name": 'ConsoleLogger',
    "severity": LogLevel.ALL ^ LogLevel.TRACE,
  }],
}