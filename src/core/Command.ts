import {
  ApplicationCommandData,
  ApplicationCommandType,
  CommandInteraction,
  InteractionReplyOptions,
  MessagePayload
} from 'discord.js';
import { format } from '../logger';
import PinboardClient from './PinboardClient';

async function replyToInteraction(
  interaction: CommandInteraction,
  content: string | MessagePayload | InteractionReplyOptions
): Promise<void> {
  if (interaction.replied) await interaction.followUp(content);
  else if (interaction.deferred) await interaction.editReply(content);
  else await interaction.reply(content);
}

export default class Command {
  public constructor(
    private readonly cb: (
      this: PinboardClient,
      interaction: CommandInteraction
    ) => void | Promise<void>,
    public readonly config: Readonly<CommandConfig>
  ) {}

  public async run(
    client: PinboardClient,
    interaction: CommandInteraction
  ): Promise<void> {
    const channel = client.logger.getChannel('cmds', format.yellow.bold);

    if (!interaction.guildId) {
      channel.debug(
        format`Denying command ${format.bold(this.config.name)} sent via DM`
      );
      return interaction.reply(
        'Sorry, Pinboard commands cannot be used in DMs.'
      );
    }

    try {
      await this.cb.call(client, interaction);
    } catch (err) {
      channel.error(
        format`Error while running command ${format.bold(
          this.config.name
        )}:\n${err}`
      );
      await replyToInteraction(
        interaction,
        'Sorry, there was an issue on our side. Maybe try again?'
      );
    }
  }

  public toSlashCommand(): ApplicationCommandData {
    return {
      name: this.config.name,
      description: this.config.description,
      type: this.config.type,
      // PUBLIC | undefined => true, others => false
      defaultPermission: !this.config.permissionType
    };
  }
}

export interface CommandConfig {
  name: string;
  description: string;
  type?: ApplicationCommandType;
  permissionType?: PermissionType;
}

export enum PermissionType {
  PUBLIC,
  RESTRICTED,
  DEV_ONLY
}
