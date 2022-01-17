import BaseLogger from './BaseLogger';
import { LogLevel } from './Logger';

export default class LoggerChannel implements BaseLogger {
  public constructor(
    private readonly log: (level: LogLevel, msg: unknown) => void
  ) {}

  public debug(msg: unknown) {
    return this.log(LogLevel.DEBUG, msg);
  }

  public info(msg: unknown) {
    return this.log(LogLevel.INFO, msg);
  }

  public warn(msg: unknown) {
    return this.log(LogLevel.WARN, msg);
  }

  public error(msg: unknown) {
    return this.log(LogLevel.ERROR, msg);
  }
}
