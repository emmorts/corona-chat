import AbstractLogger from "common/loggers/AbstractLogger";
import { LogLevel } from "common/loggers/LogLevel";

const isNode = typeof window === 'undefined';

export default class ConsoleLogger extends AbstractLogger {

  get name() {
    return 'ConsoleLogger';
  }

  _log(message: string, severity: LogLevel) {
    switch (severity) {
      case LogLevel.TRACE:
        this._trace(message);
        break;
      case LogLevel.INFO:
        this._info(message);
        break;
      case LogLevel.WARN:
        this._warn(message);
        break;
      case LogLevel.ERROR:
        this._error(message);
        break;
      default:
    }
  }

  _trace(message: string) {
    if (isNode) {
      console.log(`[TRACE] ${message}`);
    } else {
      console.debug(message);
    }
  }

  _info(message: string) {
    if (isNode) {
      console.log(`\x1b[36m[INFO] ${message}\x1b[0m`);
    } else {
      console.log(message);
    }
  }

  _warn(message: string) {
    if (isNode) {
      console.log(`\x1b[33m[WARN] ${message}\x1b[0m`);
    } else {
      console.warn(message);
    }
  }

  _error(message: string) {
    if (isNode) {
      console.log(`\x1b[31m[ERROR] ${message}\x1b[0m`);
    } else {
      console.error(message);
    }
  }
}
