import * as mongoose from 'mongoose';

export interface IGuild {
  guildId: string;
}

const guildSchema = new mongoose.Schema<IGuild>({
  guildId: { type: String, required: true }
});

const Guild = mongoose.model<IGuild>('Guild', guildSchema);
export default Guild;
