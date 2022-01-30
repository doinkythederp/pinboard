import { EventHandler } from '../core/PinboardClient';
import Guild from '../models/Guild';

const handler: EventHandler<'guildDelete'> = async function (guild) {
  // Delete the guild (and any duplicates) from the database
  await Guild.deleteMany({ guildId: guild.id });
};

export default handler;
