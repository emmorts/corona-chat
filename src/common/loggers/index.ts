import ConsoleLogger from "common/loggers/ConsoleLogger";
import NullLogger from "common/loggers/NullLogger";
import AbstractLogger from "common/loggers/AbstractLogger";
import { LogLevel } from "common/loggers/LogLevel";

const loggers = {
  [NullLogger.identifier]: NullLogger,
  [ConsoleLogger.identifier]: ConsoleLogger,
} as {
  [key: string]: { new(mask: LogLevel): AbstractLogger }
};

export default {
  loggers,
  getByName: (loggerName: string, logMask: LogLevel): AbstractLogger => {
    if (!(loggerName in loggers)) {
      throw new Error(`Logger '${loggerName}' is not registered`);
    }

    return new loggers[loggerName](logMask);
  }
};