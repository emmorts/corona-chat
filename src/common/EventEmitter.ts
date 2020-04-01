export interface EventHandler {
  recurrent: boolean;
  proxy: (...args: any[]) => void
}

type EventListenerSignatureType<T> = T extends (...args: infer R) => any ? R : never;
type EventListenerType<T extends (...args: any[]) => void> = (...args: EventListenerSignatureType<T>) => ReturnType<T>;
type EventHandlerType = {
  recurrent: boolean;
  proxy: (...args: any[]) => any;
};

type EventHandlerCollectionType<T> = Partial<Record<keyof T, EventHandlerType[]>>;

export default class EventEmitter<TConfiguration extends Partial<Record<string | number, any>>={}> {
  private eventHandlers: EventHandlerCollectionType<TConfiguration> = {};

  on<K extends keyof TConfiguration>(eventName: K, listener: EventListenerType<TConfiguration[K]>): EventEmitter<TConfiguration>;
  on<K extends keyof TConfiguration>(eventNames: K[], listener: EventListenerType<TConfiguration[K]>): EventEmitter<TConfiguration>;
  on<K extends keyof TConfiguration>(eventNames: K | K[], listener: EventListenerType<TConfiguration[K]>): EventEmitter<TConfiguration> {
    if (eventNames instanceof Array) {
      eventNames.forEach(eventName => this.setupEventHandler(eventName, true, listener));
    } else {
      this.setupEventHandler(eventNames, true, listener);
    }

    return this;
  }

  once<K extends keyof TConfiguration>(eventName: K, listener: EventListenerType<TConfiguration[K]>): EventEmitter<TConfiguration>;
  once<K extends keyof TConfiguration>(eventNames: K[], listener: EventListenerType<TConfiguration[K]>): EventEmitter<TConfiguration>;
  once<K extends keyof TConfiguration>(eventNames: K | K[], listener: EventListenerType<TConfiguration[K]>): EventEmitter<TConfiguration> {
    if (eventNames instanceof Array) {
      eventNames.forEach(eventName => this.setupEventHandler(eventName, false, listener));
    } else {
      this.setupEventHandler(eventNames, false, listener);
    }

    return this;
  }

  fire<K extends keyof TConfiguration>(eventName: K, ...args: Parameters<EventListenerType<TConfiguration[K]>>): void;
  fire<K extends keyof TConfiguration>(eventNames: K[], ...args: Parameters<EventListenerType<TConfiguration[K]>>): void;
  fire<K extends keyof TConfiguration>(eventNames: K | K[], ...args: Parameters<EventListenerType<TConfiguration[K]>>): void {
    if (eventNames instanceof Array) {
      eventNames.forEach(eventName => this.fireEvent(eventName, ...args));
    } else {
      this.fireEvent(eventNames, ...args);
    }
  }

  private setupEventHandler<K extends keyof TConfiguration>(eventName: K, recurrent: boolean, listener: (...args: any[]) => void) {
    if (!(eventName in this.eventHandlers) || !(this.eventHandlers[eventName] instanceof Array)) {
      this.eventHandlers[eventName] = [];
    }

    this.eventHandlers[eventName].push({
      recurrent: recurrent,
      proxy: listener,
    });
  }

  private fireEvent<K extends keyof TConfiguration>(eventName: K, ...args: Parameters<EventListenerType<TConfiguration[K]>>) {
    if (eventName in this.eventHandlers && this.eventHandlers[eventName].length) {
      const handlers = this.eventHandlers[eventName];

      for (let i = handlers.length - 1; i >= 0; i--) {
        handlers[i].proxy(...args);

        if (!handlers[i].recurrent) {
          handlers.splice(i, 1);
        }
      }
    }
  }
}