import { Command, ApplicationCommandOptionType, CommandInteraction, EmbedBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Types } from 'mongoose';

import { getMember } from '../../utils/functions';
import { noUser, equalPerms, moderationDmEmbed, moderationEmbed } from '../../utils/embeds';
import { EMBED_COLOURS } from '../../utils/constants';

import warnData from '../../models/warnings';

const command: Command = {
	config: {
		commandName: 'kick',
		commandAliases: ['tempremove'],
		commandDescription: 'Removes a user from the Discord server.',
		userPermissions: 'KickMembers',
		commandUsage: '<member> [reason]',
		limitedChannel: 'None',
		slashCommand: true,
		COOLDOWN_TIME: 30,
		slashOptions: [
			{
				name: 'user',
				description: 'The user who you would like to kick.',
				type: ApplicationCommandOptionType.User,
				required: true,
			},
			{
				name: 'reason',
				description: 'The reason for the kick.',
				type: ApplicationCommandOptionType.String,
				required: true,
			},
		],
	},
	run: async ({ bot, message, args, interaction }) => {
		let member: any;
		let reason: any;

		if (!message) {
			member = interaction.options.getMember('user');
			// eslint-disable-next-line prefer-destructuring
			reason = args[1];

			if (!member) return noUser(message, false, interaction as CommandInteraction);
		} else {
			member = getMember(message, String(args[0]), true);
			reason = args.slice(1).join(' ');

			if (!member) return noUser(message);
		}

		if (member.permissions && member.permissions.has(PermissionFlagsBits.KickMembers)) return equalPerms(message, 'Kick Members');
		if (!reason) reason = 'None Provided';

		await moderationDmEmbed(member, 'Kick', `Hello **${member.user.username}**,\n\nWe noticed your account has recently broke Saikou's Community Rules again. Because of this, your account has received a kick from our Discord Server.\n\nIf you continue to break the rules, your account will be permanently banned from accessing the Discord Server. To learn more about our rules, visit <#397797150840324115>\n\nWe build our games and community for players to have fun. Creating a safe environment and enjoyable experience for everyone is a crucial part of what we're about, and our community rules in place is what we ask and expect players to abide by to achieve this.\n\nPlease check the attached moderator note below for more details.`, reason);

		member.kick(reason);

		const successEmbed = new EmbedBuilder() // prettier-ignore
			.setDescription(`✅ **${member.displayName ? member.displayName : member.username} has been kicked.**`)
			.setColor(EMBED_COLOURS.green);

		if (!message) {
			interaction.followUp({ embeds: [successEmbed] });
		} else {
			message.channel.send({ embeds: [successEmbed] });
		}

		const userWarns = await warnData.findOne({ userID: member.id });

		// -- Adding warning to user
		if (!userWarns) {
			await warnData.create({
				userID: member.id,
				warnings: [{ _id: new Types.ObjectId(), date: new Date(), moderator: message ? message.author.id : interaction.user.id, reason: `**[kick]** ${reason}` }],
			});
		} else {
			userWarns.warnings.push({ _id: new Types.ObjectId(), date: new Date(), moderator: message ? message.author.id : interaction.user.id, reason: `**[kick]** ${reason}` });
			await userWarns.save();
		}

		await moderationEmbed(message, bot, 'Kick', member, reason, false, interaction as CommandInteraction);
		if (reason === 'None Provided') await (bot.channels.cache.get(process.env.MODERATION_CHANNEL) as TextChannel).send({ content: `<@${message ? message.author.id : interaction.user.id}>, Please provide a reason for this punishment in your proof as one wasn't provided.` });
	},
};

export = command;
