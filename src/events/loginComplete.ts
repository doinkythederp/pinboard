import { EventHandler } from '../core/PinboardClient';
import Guild from '../models/Guild';
import { createGuild } from './guildCreate';

const handler: EventHandler<'ready'> = async function () {
  // Check for any missing guilds in the database and add them as needed
  const checkers: Promise<void>[] = [];
  for (const { id } of (await this.guilds.fetch()).values()) {
    checkers.push(
      Guild.exists({ guildId: id }).then(async (exists) => {
        if (exists) return;
        const newGuild = createGuild(id);
        await newGuild.save();
      })
    );
  }

  await Promise.all(checkers);
  if (checkers.length)
    this.logger.info(
      `Added ${checkers.length} missing guild(s) to the database`
    );
};

export default handler;
