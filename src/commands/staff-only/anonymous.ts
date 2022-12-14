import { Command, ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { EMBED_COLOURS } from '../../utils/constants';

import suggestData from '../../models/suggestions';

const command: Command = {
	config: {
		commandName: 'anonymous',
		commandAliases: ['reveal'],
		commandDescription: 'Reveals the author behind an anonymous suggestion or report.',
		commandUsage: '<id>',
		userPermissions: 'ManageMessages',
		limitedChannel: '🤖staff-cmds',
		slashOptions: [
			{
				name: 'id',
				description: 'The ID for the report or suggestion.',
				type: ApplicationCommandOptionType.String,
				required: true,
			},
		],
	},
	run: async ({ bot, args, interaction }) => {
		const inputtedID = args[0];
		const data = await suggestData.findOne({ messageID: inputtedID });

		if (!data) {
			return interaction.editReply({ content: 'Inputted ID does not exist! ' });
		}

		const fetchedUser = await bot.users.fetch(`${BigInt(data!.userID)}`);

		return interaction.editReply({
			embeds: [
				new EmbedBuilder() // prettier-ignore
					.setTitle('🔎 User Found!')
					.addFields([
						// prettier-ignore
						{ name: 'Username', value: `${fetchedUser.username}#${fetchedUser.discriminator}`, inline: true },
						{ name: 'User ID', value: fetchedUser.id, inline: true },
						{ name: 'Suggestion Content', value: data!.suggestionMessage },
					])
					.setColor(EMBED_COLOURS.blurple),
			],
		});
	},
};

export = command;
