import { html, Component } from "htm/preact";
import * as style from "./index.scss";

export default class Room extends Component {

  componentDidMount() {
    
  }

  render() {
    return html`
      <div class="${ style.room }"></div>
    `;
  }
  
}