import config from "common/config";
import Loggers from "common/loggers/";
import { LogLevel } from "common/loggers/LogLevel";
import AbstractLogger from "common/loggers/AbstractLogger";

class Logger {
  #logger: AbstractLogger = null;

  constructor() {
    if (config && config.loggers && config.loggers.length) {
      config.loggers.reduce((prevLogger, currentLogger) => {
        const loggerName = currentLogger.name.trim();
        const logger = Loggers.getByName(loggerName, currentLogger.severity);
        if (!logger) {
          throw new Error(`Unable to fetch logger '${loggerName}'.`);
        }

        if (prevLogger) {
          prevLogger.setNext(logger);
        } else {
          this.#logger = logger;
        }

        return logger;
      }, null as AbstractLogger);
    }
  }

  trace(message: string, ...optionalParams: any[]) {
    if (this.#logger) {
      this.#logger.log(message, LogLevel.TRACE, ...optionalParams);
    }
  }

  info(message: string, ...optionalParams: any[]) {
    if (this.#logger) {
      this.#logger.log(message, LogLevel.INFO, ...optionalParams);
    }
  }

  warn(message: string, ...optionalParams: any[]) {
    if (this.#logger) {
      this.#logger.log(message, LogLevel.WARN, ...optionalParams);
    }
  }

  error(message: string, ...optionalParams: any[]) {
    if (this.#logger) {
      this.#logger.log(message, LogLevel.ERROR, ...optionalParams);
    }
  }
}

export default new Logger();
