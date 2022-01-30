import { EventHandler } from '../core/PinboardClient';
import Guild from '../models/Guild';

export function createGuild(guildId: string) {
  return new Guild({
    guildId
  });
}

const handler: EventHandler<'guildCreate'> = async function (guild) {
  // Delete any duplicate guilds
  await Guild.deleteMany({ guildId: guild.id });

  const dbGuild = createGuild(guild.id);
  await dbGuild.save();
};

export default handler;
