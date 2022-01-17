import { Client } from 'discord.js';

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
  }

  public override login(): Promise<string> {
    return super.login(this.config.token);
  }
}

export interface PinboardClientConfig {
  token: string;
}
