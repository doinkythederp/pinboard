import PinboardClient, { EventHandler } from '../core/PinboardClient';

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
  if (!interaction.isCommand()) return;
  const command = getCommand(this, interaction.commandName);
  if (!command) {
    await interaction.reply(
      "Sorry, that command isn't available right now. Maybe try again later?"
    );
    return;
  }
  await command.run(this, interaction);
};

export default handler;
