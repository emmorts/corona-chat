export interface EventHandler {
  recurrent: boolean;
  proxy: (...args: any[]) => void
}

export class EventEmitter<T extends string> {
  private eventHandlers: { [propertyName: string]: EventHandler[] } = {};

  on(name: T, listener: (...args: any[]) => void): EventEmitter<T> {
    if (!(name in this.eventHandlers) || !(this.eventHandlers[name] instanceof Array)) {
      this.eventHandlers[name] = [];
    }

    this.eventHandlers[name].push({
      recurrent: true,
      proxy: listener,
    });

    return this;
  }

  once(name: T, listener: (...args: any[]) => void): EventEmitter<T> {
    if (!(name in this.eventHandlers) || !(this.eventHandlers[name] instanceof Array)) {
      this.eventHandlers[name] = [];
    }
    this.eventHandlers[name].push({
      recurrent: false,
      proxy: listener,
    });

    return this;
  }

  fire(name: T, ...args: any[]): void {
    if (name in this.eventHandlers && this.eventHandlers[name].length) {
      const handlers = this.eventHandlers[name];

      for (let i = handlers.length - 1; i >= 0; i--) {
        handlers[i].proxy(...args);

        if (!handlers[i].recurrent) {
          handlers.splice(i, 1);
        }
      }
    }
  }
}
