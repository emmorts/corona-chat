import "webrtc-adapter";
import "core-js/stable";
import "regenerator-runtime/runtime";

import { html, render } from "htm/preact";
import { createLogin } from "client/utils/LoginUtils";
import Client from "client/Client";
import App from "client/components/App/App";

// if ((module as any).hot) {
//   (module as any).hot.accept()
// }

render(html`<${App} />`, document.body);

// createLogin(name => {
//   const client = new Client();

//   client.start({ name });
// });
