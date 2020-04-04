import { html, Component } from "htm/preact";
import * as style from "./index.scss";

export interface LoginProps {
  onStart: (name: string) => void;
};

export interface LoginState {
  name: string;
}

export default class Login extends Component<LoginProps, LoginState> {

  constructor() {
    super();

    this.state = {
      name: ""
    };
  }

  onInput = ({ target }: { target: HTMLInputElement }) => {
    this.setState({ name: target.value });
  }

  onSubmit() {
    this.setState({ name: this.state.name });

    this.props.onStart(this.state.name);
  }

  render() {
    return html`
      <div class="${ style.login }">
        <div class="${ style.loginContent}">
          <form onSubmit=${() => this.onSubmit()}>
            <input type="text" autofocus placeholder="Name" class="${ style.userName }" value=${this.state.name} onInput=${this.onInput} maxlength="25" />
            <button class="${ style.joinButton }">Join</button>
          </form>
        </div>
      </div>
    `;
  }
}