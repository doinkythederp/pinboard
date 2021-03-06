import * as fs from 'fs';
import { rootDir } from '../util';
import { resolve as resolvePath } from 'path';
import BaseLogger from './BaseLogger';
import * as kleur from 'kleur/colors';
import { inspect, stripVTControlCharacters } from 'util';
import LoggerChannel from './LoggerChannel';
import format from './format';

kleur.$.enabled = true;

function center(str: string, length: number) {
  const padding = (length - stripVTControlCharacters(str).length) / 2;
  return [
    ' '.repeat(Math.floor(padding)),
    str,
    ' '.repeat(Math.ceil(padding))
  ].join('');
}

function stringify(msg: unknown, colors: boolean) {
  return typeof msg === 'string'
    ? msg
    : inspect(msg, {
        colors
      });
}

function inferColor() {
  if ('NO_COLOR' in process.env) return process.env.NO_COLOR === '0';
  return process.stdout.isTTY;
}

export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR
}

export default class Logger implements BaseLogger {
  public constructor(
    config: LoggerConfig = {},
    censoredData = new Map<string, string>()
  ) {
    this.config = {
      ...config,
      color: typeof config.color === 'boolean' ? config.color : inferColor(),
      debug:
        typeof config.debug === 'boolean'
          ? config.debug
          : (config.debug ?? []).concat(
              ...(process.env.PINBOARD_DEBUG?.split(',') ?? [])
            ),
      stdout: config.stdout ?? true,
      logFile: config.logFile ?? null
    };

    Object.defineProperty(this, 'censoredData', {
      enumerable: false,
      value: censoredData
    });

    this.channel = this.getChannel('logger');
  }

  public async openLogFile() {
    if (!this.config.logFile) return;
    const logFileLocation = resolvePath(rootDir, this.config.logFile);
    this.channel.debug(`Opening log file @ ${logFileLocation}`);
    this.fileHandle = await fs.promises.open(logFileLocation, 'a');
    this.fileHandleStream = this.fileHandle.createWriteStream();
  }

  private readonly censoredData!: Map<string, string>;
  private readonly channel: LoggerChannel;
  private fileHandle: fs.promises.FileHandle | null = null;
  private fileHandleStream: fs.WriteStream | null = null;
  private readonly dateFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'short',
    timeStyle: 'medium'
  });

  public config: Required<LoggerConfig>;

  private log(level: LogLevel, msg: unknown, channel?: string) {
    let stringifiedMessage = stringify(msg, this.config.color);
    for (const [censor, replacement] of this.censoredData.entries()) {
      stringifiedMessage = stringifiedMessage.replaceAll(censor, replacement);
    }

    // format message
    const formattedMessage = [
      format.gray.italic(
        this.dateFormatter.format(new Date()).concat(':').padEnd(22)
      ),
      center(channel ?? format.gray`~`, 10),
      center(this.formatLogLevel(level), 5),
      stringifiedMessage
    ]
      .join(' ')
      .concat('\n');

    if (this.config.stdout)
      process.stdout.write(
        this.config.color
          ? formattedMessage
          : stripVTControlCharacters(formattedMessage)
      );

    this.fileHandleStream?.write(stripVTControlCharacters(formattedMessage));
  }

  private formatLogLevel(level: LogLevel) {
    let levelName = LogLevel[level]!;
    switch (level) {
      case LogLevel.DEBUG:
        levelName = format.gray(levelName);
        break;
      case LogLevel.INFO:
        levelName = format.blue.bgWhite.bold(levelName);
        break;
      case LogLevel.WARN:
        levelName = format.yellow(levelName);
        break;
      case LogLevel.ERROR:
        levelName = format.red.bold(levelName);
        break;
    }
    return levelName;
  }

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

  public async destroy() {
    this.channel.debug('Destroying logger!');
    this.config.stdout = false;
    this.fileHandleStream?.end();
    this.fileHandleStream = null;
    await this.fileHandle?.close();
    this.fileHandle = null;
  }

  public getChannel(name: string, formatter?: (input: string) => string) {
    // this.channel won't be defined when being called from the constructor
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.channel) this.channel.debug(`Creating channel "${name}"`);

    return new LoggerChannel((level, msg) => {
      if (
        level !== LogLevel.DEBUG ||
        this.config.debug === true ||
        (Array.isArray(this.config.debug) && this.config.debug.includes(name))
      )
        this.log(
          level,
          msg,
          this.config.color && formatter ? formatter(name) : name
        );
    });
  }
}

export interface LoggerConfig {
  color?: boolean;
  debug?: string[] | boolean;
  stdout?: boolean;
  logFile?: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      NO_COLOR?: string;
      PINBOARD_DEBUG?: string;
    }
  }
}
