import { LogLevel } from "common/loggers/LogLevel";

export default interface ILogger {
  setNext(logger: ILogger): void;
  log(message: string, severity: LogLevel, ...optionalParams: any[]): void;
}