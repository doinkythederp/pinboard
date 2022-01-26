import { Client } from 'discord.js';
import { homedir } from 'os';
import Logger, { format, LoggerConfig } from '../logger';
import { pluginsDir } from '../util';
import { resolve as resolvePath, parse as parsePath } from 'path';
import Plugin, { PluginConfig } from './Plugin';
import { readdir } from 'fs/promises';

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

  public plugins = new Map<string, Plugin>();

  public async loadPlugins() {
    const channel = this.logger.getChannel('plugins', format.green.bold);
    channel.info(`Loading Pinboard plugins...`);

    if (this.plugins.size) {
      channel.warn('At least one plugin has already been registered!');
      channel.warn('Re-loading is not supported.');
      // clear loaded plugins
      this.plugins = new Map();
    }

    const stats = { loaded: 0, total: 0, loadedCmds: 0, totalCmds: 0 };
    const loaders: Promise<void>[] = [];
    for (const pluginFile of await readdir(pluginsDir)) {
      const { name: id, ext } = parsePath(pluginFile);
      if (ext !== '.js') continue;
      loaders.push(
        this.loadPlugin(id)
          .then((cmdStats) => {
            stats.loaded++;
            stats.loadedCmds += cmdStats.loads.length;
            stats.totalCmds += cmdStats.loads.length + cmdStats.fails.size;
            channel.debug(
              `Successfully loaded plugin with id ${format.bold(id)}`
            );
          })
          .catch((err) =>
            channel.error(
              `Failed to load plugin ${format.bold(id)}:\n${format`${err}`}`
            )
          )
          .finally(() => stats.total++)
      );
    }

    await Promise.all(loaders);
    channel.info(
      `Loaded ${format.bold`${stats.loadedCmds}/${stats.totalCmds}`} command(s) from ${format.bold`${stats.loaded}/${stats.total}`} plugin(s).`
    );
    return stats;
  }

  private async loadPlugin(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const pluginConfig = (await import(resolvePath(pluginsDir, id)))
      .default as PluginConfig;
    const plugin = new Plugin(this, id, pluginConfig);
    const stats = await plugin.loadCommands();
    this.plugins.set(plugin.config.name, plugin);
    return stats;
  }
}

export interface PinboardClientConfig {
  token: string;
  logger?: LoggerConfig;
}

export interface PluginLoaderStats {}
