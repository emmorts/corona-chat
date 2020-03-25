import { LogLevel } from "common/loggers/LogLevel";
import ILogger from "common/loggers/ILogger";

export default abstract class AbstractLogger implements ILogger {
  protected _mask: number;
  protected _next: ILogger;

  get name() {
    return "AbstractLogger";
  }

  constructor(mask: number) {
    this._mask = mask;
    this._next = null;
  }

  setNext(logger: ILogger) {
    this._next = logger;

    return logger;
  }

  log(message: string, severity: LogLevel) {
    if ((severity & this._mask) !== 0) {
      this._log(message, severity);
    }

    if (this._next) {
      this._next.log(message, severity);
    }
  }

  abstract _log(message: string, severity: LogLevel): void;
}
