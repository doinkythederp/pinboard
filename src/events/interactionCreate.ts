import * as Sentry from '@sentry/node';
import PinboardClient, { EventHandler } from '../core/PinboardClient';
import { format } from '../logger';

function getCommand(client: PinboardClient, command: string) {
  for (const plugin of client.plugins.values()) {
    if (plugin.commands.has(command)) {
      return plugin.commands.get(command)!;
    }
  }

  return null;
}

const handler: EventHandler<'interactionCreate'> = async function (
  interaction
) {
  const channel = this.logger.getChannel('cmds', format.yellow.bold);

  if (!interaction.isCommand()) return;
  const command = getCommand(this, interaction.commandName);
  if (!command) {
    channel.debug(`Missing command ${format.bold(interaction.commandName)}`);
    await interaction.reply(
      "Sorry, that command isn't available right now. Maybe try again later?"
    );
    return;
  }

  try {
    await command.run(this, interaction);
  } catch (err) {
    channel.error(
      format`Error while running command ${format.bold(
        interaction.commandName
      )}:\n${err}`
    );

    Sentry.captureException(err, {
      user: {
        username: interaction.user.tag,
        id: interaction.user.id
      },
      tags: {
        command: interaction.commandName
      }
    });
  }
};

export default handler;
