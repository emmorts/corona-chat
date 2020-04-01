import EventEmitter from "common/EventEmitter";

export type ControlItemType = "camera" | "microphone";
export enum ControlsManagerEventType {
  CONTROL_ENABLED,
  CONTROL_DISABLED
}

interface ControlManagerEventConfiguration {
  [ControlsManagerEventType.CONTROL_ENABLED]: { (type: ControlItemType): void };
  [ControlsManagerEventType.CONTROL_DISABLED]: { (type: ControlItemType): void };
}

export default class ControlsManager extends EventEmitter<ControlManagerEventConfiguration> {
  #controlElement: { [key in ControlItemType]?: HTMLElement } = {};
  #controlEnabled: { [key in ControlItemType]?: boolean } = {
    camera: false,
    microphone: false
  }

  bind() {
    this.bindMediaControls();
  }

  enableControl(type: ControlItemType) {
    this.#controlEnabled[type] = true;
    this.#controlElement[type].firstElementChild.className = `icon icon-${type}`;

    this.fire(ControlsManagerEventType.CONTROL_ENABLED, type);
  }

  disableControl(type: ControlItemType) {
    this.#controlEnabled[type] = false;
    this.#controlElement[type].firstElementChild.className = `icon icon-${type}-off`;

    this.fire(ControlsManagerEventType.CONTROL_DISABLED, type);
  }

  private bindMediaControls() {
    const mediaControlsElement = document.createElement("div");

    mediaControlsElement.className = "media-controls";

    this.#controlElement.camera = this.createControlItem("camera");
    this.#controlElement.microphone = this.createControlItem("microphone");

    mediaControlsElement.appendChild(this.#controlElement.camera);
    mediaControlsElement.appendChild(this.createSeparator());
    mediaControlsElement.appendChild(this.#controlElement.microphone);

    document.body.appendChild(mediaControlsElement);
  }

  private createControlItem(type: ControlItemType) {
    const controlItem = document.createElement("div");
    controlItem.className = "control-item";
    controlItem.addEventListener("click", () => this.handleControlItemClick(type));
    controlItem.addEventListener("touchend", () => this.handleControlItemClick(type));

    const icon = document.createElement("div");
    icon.className = `icon icon-${type}-off`;

    controlItem.appendChild(icon);

    return controlItem;
  }

  private createSeparator() {
    const separatorElement = document.createElement("div");
    separatorElement.className = "control-separator";

    return separatorElement;
  }

  private handleControlItemClick(type: ControlItemType) {
    if (this.#controlEnabled[type]) {
      this.disableControl(type);
    } else {
      this.enableControl(type);
    }
  }
}