export default {
  "socketServerPort": 3000,
  "maxConnections": 255,
  "heartbeatInterval": 5000,
  "stunServers": [{
    urls: [ "stun:stun.l.google.com:19302" ],
  }],
  "turnServers": [{
    urls: [ "turn:numb.viagenie.ca" ],
    username: "h.guzas@gmail.com",
    credential: "qwqwqw"
  }]
}