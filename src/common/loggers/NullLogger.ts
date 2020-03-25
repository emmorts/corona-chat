import AbstractLogger from "common/loggers/AbstractLogger";

export default class NullLogger extends AbstractLogger {
  get name() {
    return 'NullLogger';
  }

  _log() {}
}
