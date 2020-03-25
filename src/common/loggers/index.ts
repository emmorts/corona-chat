import ConsoleLogger from "common/loggers/ConsoleLogger";
import NullLogger from "common/loggers/NullLogger";
import AbstractLogger from "common/loggers/AbstractLogger";
import { LogLevel } from "common/loggers/LogLevel";

const loggers: { new(mask: LogLevel): AbstractLogger }[] = [] = [
  ConsoleLogger,
  NullLogger,
];

export default {
  loggers,
  getByName: (loggerName: string, logMask: LogLevel): AbstractLogger => {
    return new ConsoleLogger(logMask);
    // const loggerTypeRef = loggers.find(x => x.name.toLowerCase() === loggerName.toLowerCase());
    // if (!loggerTypeRef) {
    //   throw new Error(`Couldn't find a logger ${loggerName}`);
    // }
    
    // return new loggerTypeRef(logMask);
  }
};