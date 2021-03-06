import { resolve as resolvePath, parse as parsePath } from 'path';
import { pluginsDir } from '../util';
import { readdir } from 'fs/promises';
import PinboardClient from './PinboardClient';
import { format } from '../logger';
import Command from './Command';

export default class Plugin {
  public constructor(
    public readonly client: PinboardClient,
    public readonly id: string,
    public readonly config: PluginConfig
  ) {}

  public commands = new Map<string, Command>();

  public async loadCommands() {
    const stats: CommandLoaderStats = {
      loads: [],
      fails: new Map()
    };

    const channel = this.client.logger.getChannel('cmds', format.yellow.bold);

    channel.debug(`Loading commands for ${format.bold(this.config.name)}`);
    for (const commandFile of await readdir(resolvePath(pluginsDir, this.id))) {
      const { name, ext } = parsePath(commandFile);
      if (ext !== '.js') continue;

      try {
        const command = await import(
          resolvePath(resolvePath(pluginsDir, this.id, commandFile))
        ).then((mod: { default: Command }) => mod.default);

        this.commands.set(command.config.name, command);

        stats.loads.push(name);
        channel.debug(
          `Sucessfully loaded command ${format.bold(
            command.config.name
          )} for plugin ${format.bold(this.config.name)}`
        );
      } catch (err) {
        stats.fails.set(name, err);
        channel.error(
          `Error while loading command ${format.bold(
            name
          )} for plugin ${format.bold(this.config.name)}:\n${format`${err}`}`
        );
      }
    }

    return stats;
  }
}

export interface PluginConfig {
  name: string;
  hidden: boolean;
}

export interface CommandLoaderStats {
  loads: string[];
  fails: Map<string, unknown>;
}
