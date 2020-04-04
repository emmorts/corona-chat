import AbstractLogger from "common/loggers/AbstractLogger";
import { LogLevel } from "common/loggers/LogLevel";

const isNode = typeof window === 'undefined';

export default class ConsoleLogger extends AbstractLogger {

  static get identifier() {
    return 'ConsoleLogger';
  }

  _log(message: string, severity: LogLevel, ...optionalParams: any[]) {
    switch (severity) {
      case LogLevel.TRACE:
        this._trace(message, ...optionalParams);
        break;
      case LogLevel.INFO:
        this._info(message, ...optionalParams);
        break;
      case LogLevel.WARN:
        this._warn(message, ...optionalParams);
        break;
      case LogLevel.ERROR:
        this._error(message, ...optionalParams);
        break;
      default:
    }
  }

  _trace(message: string, ...optionalParams: any[]) {
    if (isNode) {
      console.log(`[TRACE] ${message}`, ...optionalParams);
    } else {
      console.debug(message, ...optionalParams);
    }
  }

  _info(message: string, ...optionalParams: any[]) {
    if (isNode) {
      console.log(`\x1b[36m[INFO] ${message}\x1b[0m`, ...optionalParams);
    } else {
      console.log(message, ...optionalParams);
    }
  }

  _warn(message: string, ...optionalParams: any[]) {
    if (isNode) {
      console.log(`\x1b[33m[WARN] ${message}\x1b[0m`, ...optionalParams);
    } else {
      console.warn(message, ...optionalParams);
    }
  }

  _error(message: string, ...optionalParams: any[]) {
    if (isNode) {
      console.log(`\x1b[31m[ERROR] ${message}\x1b[0m`, ...optionalParams);
    } else {
      console.error(message, ...optionalParams);
    }
  }
}
