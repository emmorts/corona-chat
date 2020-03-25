import "webrtc-adapter";
import "core-js/stable";
import "regenerator-runtime/runtime";

import { createLogin } from "client/utils/LoginUtils";
import Client from "client/Client";

createLogin(name => {
  const client = new Client();

  client.start({ name });
});
