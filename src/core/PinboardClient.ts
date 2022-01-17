import { Client } from 'discord.js';
import { homedir } from 'os';
import Logger, { LoggerConfig } from '../logger';

export default class PinboardClient extends Client {
  public constructor(public config: PinboardClientConfig) {
    super({
      // these will be automatically calculated
      intents: [],
      presence: {
        // indicates that the bot is not yet ready
        status: 'dnd'
      }
    });

    this.logger = new Logger(
      config.logger,
      new Map<string, string>()
        .set(config.token.split('.')[2]!, '*'.repeat(10))
        .set(homedir(), '~')
    );

    const discordjsChannel = this.logger.getChannel('discord.js');
    this.on('debug', (msg) => discordjsChannel.debug(msg))
      .on('warn', (msg) => discordjsChannel.warn(msg))
      .on('error', (msg) => discordjsChannel.error(msg));
  }

  public readonly logger: Logger;

  public override async login(): Promise<string> {
    await this.logger.openLogFile();
    this.logger.info('Starting pinboard!');

    return super.login(this.config.token);
  }
}

export interface PinboardClientConfig {
  token: string;
  logger?: LoggerConfig;
}
