import Peer from "../common/Peer";
import { drawGrid, drawPeerCell } from "./utils/CanvasUtils";
import { pointIntersectsCircle } from "./utils/MathUtils";
import { EventEmitter } from "../common/EventEmitter";
import { Point } from "../common/Structures";
import { isMobile } from './utils/BrowserUtils';

const PEER_CELL_RADIUS = 50;

type RendererEventType = "peerCellMove" | "updatePeerMood";

export default class RoomRenderer extends EventEmitter<RendererEventType> {
  #canvas: HTMLCanvasElement;
  #context: CanvasRenderingContext2D;
  #peers: Peer[] = [];
  #lastUpdate: number;
  #loopHandle: number;

  #draggingPeer: Peer = null;
  #dragEventHandler: (event: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    super();

    this.#canvas = canvas;
    this.#context = canvas.getContext("2d");

    this.setupCanvasEvents();
  }

  start() {
    this.loopRender(Date.now());
  }

  addPeer(peer: Peer) {
    this.#peers.push(peer);
  }

  removePeer(socketId: string) {
    const peerIndex = this.#peers.findIndex(peer => peer.socketId === socketId);
    if (peerIndex !== -1) {
      this.#peers.splice(peerIndex, 1);
    }
  }

  updatePeerPosition(socketId: string, position: Point) {
    const foundPeer = this.#peers.find(peer => peer.socketId === socketId);
    if (foundPeer) {
      foundPeer.position = position;
    }
  }

  updatePeerMood(socketId: string, mood: string) {
    const foundPeer = this.#peers.find(peer => peer.socketId === socketId);
    if (foundPeer) {
      foundPeer.mood = mood;
    }
  }

  private loopRender(timestamp: number) {
    this.#loopHandle = window.requestAnimationFrame(time => this.loopRender(time));
    
    let deltaT = 0;
    if (this.#lastUpdate) {
      deltaT = timestamp - this.#lastUpdate;
    }

    this.render(deltaT);

    this.#lastUpdate = timestamp;
  }

  private render(deltaT: number) {
    this.clear();

    drawGrid(this.#context);

    this.#peers.forEach(peer => {
      if (peer.isInstantiated) {
        drawPeerCell(this.#context, peer.name, peer.position, peer.isOwner, peer.mood, PEER_CELL_RADIUS)
      }
    });
  }

  private clear() {
    this.#context.clearRect(
      0,
      0,
      this.#canvas.width,
      this.#canvas.height
    );
  }

  private setupCanvasEvents() {
    this.#canvas.addEventListener(isMobile() ? "touchstart" : "mousedown", event => this.handleDragStartEvent(event));
    this.#canvas.addEventListener(isMobile() ? "touchmove" : "mousemove", event => this.handleDragEvent(event));
    this.#canvas.addEventListener(isMobile() ? "touchend" : "mouseup", event => this.handleDragEndEvent(event));
    
    var selectmood = document.getElementById("moodselector");
    selectmood.addEventListener("change", event => {
      const target = event.target as HTMLSelectElement;

      selectmood.style.visibility = "hidden"

      const ownedPeer = this.#peers.find(peer => peer.isOwner);
      if (ownedPeer) {
        ownedPeer.mood = target.value;

        this.fire("updatePeerMood", ownedPeer.mood);
      }
    });

    this.#canvas.addEventListener("contextmenu", event => {
      const ownedPeer = this.#peers.find(peer => peer.isOwner);
      if (ownedPeer) {
        const mousePosition = {
          x: event.clientX,
          y: event.clientY
        };
  
        if (pointIntersectsCircle(mousePosition, ownedPeer.position, PEER_CELL_RADIUS)) {
          selectmood.style.visibility = "visible"
          selectmood.style.top = (event.y- selectmood.clientHeight/2).toString()
          selectmood.style.left = (event.x -selectmood.clientWidth/2).toString()   
        }
      }
    });
  }

  private handleDragStartEvent(event: TouchEvent | MouseEvent) {
    const eventPosition: Point = isMobile()
      ? {
        x: (event as TouchEvent).touches[0].clientX,
        y: (event as TouchEvent).touches[0].clientY
      }
      : {
        x: (event as MouseEvent).clientX,
        y: (event as MouseEvent).clientY
      };

    const ownedPeer = this.#peers.find(peer => peer.isOwner);
    if (ownedPeer && pointIntersectsCircle(eventPosition, ownedPeer.position, PEER_CELL_RADIUS)) {
      this.#draggingPeer = ownedPeer;
    }
  }

  private handleDragEvent(event: TouchEvent | MouseEvent) {
    if (this.#draggingPeer) {
      const eventPosition: Point = isMobile()
        ? {
          x: (event as TouchEvent).touches[0].clientX,
          y: (event as TouchEvent).touches[0].clientY
        }
        : {
          x: (event as MouseEvent).clientX,
          y: (event as MouseEvent).clientY
        };

      this.#draggingPeer.position = {
        x: eventPosition.x,
        y: eventPosition.y
      };

      this.fire("peerCellMove", this.#draggingPeer.position);
    }
  }

  private handleDragEndEvent(event: TouchEvent | MouseEvent) {
    if (this.#draggingPeer) {
      this.fire("peerCellMove", this.#draggingPeer.position);

      this.#draggingPeer = null;
    }
  }
}