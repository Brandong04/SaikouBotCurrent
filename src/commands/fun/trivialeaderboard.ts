import { Command, ApplicationCommandOptionType, GuildMember, EmbedBuilder, TextChannel } from 'discord.js';

import triviaUsers from '../../models/correctTrivia';

import { EMBED_COLOURS } from '../../utils/constants';

const command: Command = {
	config: {
		commandName: 'trivialeaderboard',
		commandAliases: ['tl', 'lbtrivia', 'lb', 'leaderboard'],
		commandDescription: 'Compete against your friends for that sweet number one spot in the most correct trivias.',
		slashCommand: true,
		slashOptions: [
			{
				name: 'amount',
				description: 'The amount of users you would like displayed.',
				type: ApplicationCommandOptionType.Number,
				required: false,
			},
		],
	},
	run: async ({ bot, message, args, interaction }) => {
		const numbers = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'keycap_ten'];
		let number = '';
		let tenUsers = '';
		let triviaData;

		const leaderboard = new EmbedBuilder() // prettier-ignore
			.setTitle('👑 Trivia Leaderboard')
			.setColor(EMBED_COLOURS.blurple)
			.setFooter({ text: `${message ? message.guild!.name : interaction.guild!.name}`, iconURL: message ? message.guild?.iconURL()! : interaction.guild?.iconURL()! })
			.setTimestamp();

		if (args[0] && !Number.isNaN(Number(args[0]))) {
			leaderboard.setDescription(`Displaying the **top ${args[0]}** users with the most trivia points.`);
			triviaData = await triviaUsers.find({}).sort({ answersCorrect: -1 }).limit(Number(args[0]));
		} else {
			leaderboard.setDescription('Displaying the **top 10** users with the most trivia points.');
			triviaData = await triviaUsers.find({}).sort({ answersCorrect: -1 }).limit(10);
		}

		if (triviaData.length === 0) {
			leaderboard.setDescription('Uh oh! Looks like no data was found. Try getting some correct trivias and try again!');
			if (!message) return interaction.followUp({ embeds: [leaderboard] });
			return message.channel.send({ embeds: [leaderboard] });
		}

		triviaData.forEach((user, count: number) => {
			switch (count + 1) {
				case 1:
					number = '🥇';
					break;
				case 2:
					number = '🥈';
					break;
				case 3:
					number = '🥉';
					break;
				default:
					number = numbers[count] ? `:${numbers[count]}:` : `**${count + 1}**`;
					break;
			}
			tenUsers += `${number} <@${user.userID}> | **${user.answersCorrect.toLocaleString()} Points**\n`;
		});

		const tooManyEmbed = new EmbedBuilder() // prettier-ignore
			.setTitle('❌ Too many users!')
			.setDescription('There is too many users to display this embed, try providing less.')
			.setThumbnail('https://i.ibb.co/FD4CfKn/NoBolts.png')
			.setColor(EMBED_COLOURS.red);

		try {
			leaderboard.addFields([{ name: 'Users', value: tenUsers }]);
		} catch (err) {
			if (!message) return interaction.followUp({ embeds: [tooManyEmbed] });
			return message.channel.send({ embeds: [tooManyEmbed] });
		}

		if (!message) {
			interaction.followUp({ embeds: [leaderboard] });
		} else {
			message.channel.send({ embeds: [leaderboard] });
		}

		const topUser = await triviaUsers.find({}, '-_id').sort({ answersCorrect: -1 }).limit(1);

		const kingUsers = message ? message.guild!.roles.cache.find((role: any) => role.name === 'Trivia King 👑')!.members.map((member: GuildMember) => member.user.id) : interaction.guild!.roles.cache.find((role: any) => role.name === 'Trivia King 👑')!.members.map((member: GuildMember) => member.user.id);
		const topUserInServer = message ? message.guild?.members.cache.get(`${BigInt(Object.values(topUser)[0]!.userID)}`) : interaction.guild?.members.cache.get(`${BigInt(Object.values(topUser)[0]!.userID)}`);

		if (kingUsers.length === 0 && topUserInServer) {
			topUserInServer.roles.add(message ? message.guild!.roles.cache.find((role: any) => role.name === 'Trivia King 👑')! : interaction.guild!.roles.cache.find((role: any) => role.name === 'Trivia King 👑')!, 'New Leaderboard King!');
			(bot.channels.cache.get(process.env.OFFTOPIC_CHANNEL) as TextChannel).send({ content: `<@${Object.values(topUser)[0]!.userID}> is the new trivia leaderboard king! 👑` });
		}

		kingUsers.forEach(async (userID: string) => {
			const oldTopUserInServer = message ? message.guild?.members.cache.get(`${BigInt(userID)}`) : interaction.guild?.members.cache.get(`${BigInt(userID)}`);

			if (topUserInServer && oldTopUserInServer) {
				if (String(userID) !== String(Object.values(topUser)[0]!.userID)) {
					/* Removing Role from old leaderboard king */
					oldTopUserInServer.roles.remove(message ? message.guild!.roles.cache.find((role: any) => role.name === 'Trivia King 👑')! : interaction.guild!.roles.cache.find((role: any) => role.name === 'Trivia King 👑')!, 'New Leaderboard King!').catch(() => {});

					/* Adding Role to new leaderboard king */
					topUserInServer.roles.add(message ? message.guild!.roles.cache.find((role: any) => role.name === 'Trivia King 👑')! : interaction.guild!.roles.cache.find((role: any) => role.name === 'Trivia King 👑')!, 'New Leaderboard King!').catch(() => {});

					(bot.channels.cache.get(process.env.OFFTOPIC_CHANNEL) as TextChannel).send({ content: `<@${Object.values(topUser)[0]!.userID}> is the new trivia leaderboard king! 👑` });
				}
			}
		});
	},
};

export = command;
