import Command from '../../core/Command';

export default new Command(
  async (interaction) => {
    await interaction.reply(interaction.user.toString().repeat(10));
  },
  {
    name: 'test',
    description: 'pinboard 2.0 testing123'
  }
);
