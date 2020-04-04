import { html, Component } from "htm/preact";
import Login from "client/components/Login/Login";
import Room from "client/components/Room/Room";
import Client from "client/Client";

export interface AppState {
  started: boolean;
  name?: string;
}

export default class App extends Component<{}, AppState> {
  #client: Client;

  constructor() {
    super();

    this.state = {
      started: false
    };
  }

  onStart(name: string) {
    this.setState({
      started: true,
      name
    });
  }

  render() {
    return html`
      ${!this.state.started 
        ? html`<${Login} onStart=${ this.onStart.bind(this) }/>`
        : html`<${Room} ref=${ this.setRoomRef.bind(this) } />`
      }
    `;
  }

  private setRoomRef(element: Room) {
    const roomHTMLElement = element.base as HTMLElement;

    this.#client = new Client(roomHTMLElement);

    this.#client.start({
      name: this.state.name
    });
  }
  
}