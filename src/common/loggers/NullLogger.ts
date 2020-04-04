import AbstractLogger from "common/loggers/AbstractLogger";

export default class NullLogger extends AbstractLogger {

  static get identifier() {
    return 'NullLogger';
  }

  _log() {}
  
}
