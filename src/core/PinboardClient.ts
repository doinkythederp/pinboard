import * as Sentry from '@sentry/node';
import {
  ApplicationCommand,
  Awaitable,
  Client,
  ClientEvents,
  Collection,
  GuildResolvable
} from 'discord.js';
import { readdir } from 'fs/promises';
import { homedir } from 'os';
import { parse as parsePath, resolve as resolvePath } from 'path';
import Logger, { format, LoggerConfig } from '../logger';
import { eventsDir, pluginsDir } from '../util';
import Command, { PermissionType } from './Command';
import Plugin, { PluginConfig } from './Plugin';

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

    const discordjsChannel = this.logger.getChannel(
      'discord.js',
      format.magenta
    );
    this.on('debug', (msg) => discordjsChannel.debug(msg))
      .on('warn', (msg) => discordjsChannel.warn(msg))
      .on('error', (msg) => discordjsChannel.error(msg));
  }

  public readonly logger: Logger;

  public override async login(): Promise<string> {
    await this.logger.openLogFile();
    this.logger.info('Starting pinboard!');

    const handleLogin = new Promise<void>((resolve, reject) => {
      this.once('ready', () => {
        this.logger.info('Pinboard has logged in to Discord.');
        (async () => {
          if (await this.shouldUpdateCommands()) {
            await this.updateCommands();
          }
        })().then(resolve, reject);
      });
    });

    await Promise.all([
      this.loadPlugins(),
      this.loadEvents(),
      super.login(this.config.token),
      handleLogin
    ]);

    if (!this.isReady()) throw new Error('unreachable');
    this.user.setStatus('online');

    return this.config.token;
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

  private getCommands() {
    const commands = new Map<string, Command>();
    for (const plugin of this.plugins.values()) {
      for (const [name, command] of plugin.commands) {
        commands.set(name, command);
      }
    }
    return commands;
  }

  private async shouldUpdateCommands() {
    if (!this.isReady())
      throw new Error(
        'Pinboard must be logged in to check if commands should be updated.'
      );

    const channel = this.logger.getChannel('cmds', format.yellow.bold);

    if (this.config.deploy?.force) {
      channel.info(
        'Commands should be updated because `deploy.force` is set to true.'
      );
      return true;
    }

    const commands = this.getCommands();
    const currentCommands = await this.application.commands.fetch();

    function outdatedOrMissing(
      command: Command,
      currentCommands: Collection<
        string,
        ApplicationCommand<{
          guild: GuildResolvable;
        }>
      >
    ) {
      const slashCommand = command.toSlashCommand();
      const currentCommand = currentCommands.find(
        (cmd) => cmd.name === slashCommand.name
      );
      if (!currentCommand?.equals(slashCommand)) {
        channel.info(
          format`Commands should be updated because ${format.bold(
            slashCommand.name
          )} is outdated or missing.`
        );

        channel.debug(format`Old: ${currentCommand}`);
        channel.debug(format`New: ${slashCommand}`);

        return true;
      }

      return false;
    }

    for (const command of commands.values()) {
      if (command.config.permissionType === PermissionType.DEV_ONLY) continue;
      if (outdatedOrMissing(command, currentCommands)) {
        return true;
      }
    }

    for (const currentCommand of currentCommands.values()) {
      if (!commands.has(currentCommand.name)) {
        channel.info(
          format`Commands should be updated because ${format.bold(
            currentCommand.name
          )} needs to be removed.`
        );
        return true;
      }
    }

    if (this.config.devServer) {
      const devServer = await this.guilds.fetch(this.config.devServer);
      const currentDevCommands = await devServer.commands.fetch();

      for (const command of commands.values()) {
        if (command.config.permissionType !== PermissionType.DEV_ONLY) continue;
        if (outdatedOrMissing(command, currentDevCommands)) {
          return true;
        }
      }
    }

    return false;
  }

  private async updateCommands() {
    if (!this.isReady())
      throw new Error('Pinboard must be logged in to update commands.');
    const channel = this.logger.getChannel('cmds', format.yellow.bold);
    const commands = [...this.getCommands().values()];

    channel.info('Updating commands...');

    await this.application.commands.set(
      commands
        .filter(
          (cmd) =>
            !this.config.deploy?.treatDevAsGlobal &&
            cmd.config.permissionType !== PermissionType.DEV_ONLY
        )
        .map((cmd) => cmd.toSlashCommand())
    );

    if (this.config.devServer) {
      channel.info('Updating dev-only commands...');
      const devServer = await this.guilds.fetch(this.config.devServer);
      await devServer.commands.set(
        commands
          .filter(
            (cmd) =>
              Boolean(this.config.deploy?.treatDevAsGlobal) ||
              cmd.config.permissionType === PermissionType.DEV_ONLY
          )
          .map((cmd) => cmd.toSlashCommand())
      );
    }

    channel.info(
      `Successfully updated ${format.bold`${commands.length}`} command(s)!`
    );
  }

  private async loadEvents() {
    const channel = this.logger.getChannel('events', format.cyan.bold);
    channel.info(`Loading events...`);

    const stats = { loaded: 0, total: 0 };
    const loaders: Promise<void>[] = [];
    for (const eventFile of await readdir(eventsDir)) {
      const { name: event, ext } = parsePath(eventFile);
      if (ext !== '.js') continue;
      stats.total++;
      loaders.push(
        import(resolvePath(eventsDir, eventFile))
          .then(({ default: handler }) => {
            stats.loaded++;
            this.on(event, async (...args) => {
              try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                await handler(...args);
              } catch (err) {
                Sentry.captureException(err, {
                  tags: { event }
                });
                channel.error(
                  `Handler for event ${format.bold(
                    event
                  )} errored:\n${format`${err}`}`
                );
              }
            });
          })
          .catch((err) => {
            channel.error(
              `Failed to load event ${format.bold(event)}:\n${format`${err}`}`
            );
          })
      );
    }

    await Promise.all(loaders);

    channel.info(
      format`Loaded ${format.bold`${stats.loaded}`}/${format.bold`${stats.total}`} event(s).`
    );
  }
}

export interface PinboardClientConfig {
  token: string;
  sentryDSN?: string;
  development?: boolean;
  logger?: LoggerConfig;
  devServer?: string;
  deploy?: DeployConfig;
}

export interface DeployConfig {
  force?: boolean;
  treatDevAsGlobal?: boolean;
}

export interface PluginLoaderStats {}

export type EventHandler<Event extends keyof ClientEvents> = (
  this: PinboardClient,
  ...args: ClientEvents[Event]
) => Awaitable<void>;
