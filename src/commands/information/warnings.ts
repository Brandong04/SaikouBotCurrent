import { Command, ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonInteraction, SelectMenuBuilder, SelectMenuInteraction, Message, GuildMember, PermissionFlagsBits, ButtonStyle, ComponentType } from 'discord.js';
import moment from 'moment';

import { getMember } from '../../utils/functions';
import { EMBED_COLOURS, PROMPT_TIMEOUT } from '../../utils/constants';
import warnData from '../../models/warnings';

const activeInteraction = new Set();

const command: Command = {
	config: {
		commandName: 'warnings',
		commandAliases: ['warns', 'viewwarns', 'checkwarns', 'delwarn', 'editwarn', 'deletewarn'],
		commandDescription: "Be able to check a user's warnings through this command!",
		commandUsage: '[user]',
		slashCommand: true,
		slashOptions: [
			{
				name: 'user',
				description: "The user who's warnings you'd like to check.",
				type: ApplicationCommandOptionType.User,
				required: false,
			},
		],
	},
	run: async ({ bot, message, args, interaction }) => {
		let member: any;

		if (!message) {
			member = interaction.options.getUser('user') || interaction.user;
		} else {
			member = getMember(message, args.join(' '), true) || bot.users.cache.get(`${args[0]}`);
		}

		if (!member) member = message.member;

		const userWarns = await warnData.findOne({ userID: member.id ? member.id : member.user.id });
		const noWarnsEmbed = new EmbedBuilder() // prettier-ignore
			.setDescription('ℹ️ This user has no warnings.')
			.setColor(EMBED_COLOURS.blurple);

		if (!userWarns || !userWarns.warnings.length) return message ? message.channel.send({ embeds: [noWarnsEmbed] }) : interaction.followUp({ embeds: [noWarnsEmbed] });

		const menuOptions: any = [];
		const warningsEmbed = new EmbedBuilder() // prettier-ignore
			.setColor(EMBED_COLOURS.blurple);

		warningsEmbed.setAuthor({ name: `${member.displayName ? member.displayName : member.username} has ${userWarns.warnings.length} warnings in ${message ? message.guild!.name : interaction.guild!.name}`, iconURL: member.user ? member.user.displayAvatarURL() : member.displayAvatarURL() });

		userWarns.warnings.forEach((warn: any, count: number) => {
			const moderator = message ? message.guild!.members.cache.get(warn.moderator) : interaction.guild!.members.cache.get(warn.moderator);
			// eslint-disable-next-line no-underscore-dangle
			warningsEmbed.addFields([{ name: `Warning: ${count + 1} | Moderator: ${moderator ? moderator.user.tag : 'SaikouDev'}`, value: `${warn.reason} - ${moment(warn.date).format('MMMM Do YYYY')}` }]);

			if (message ? message.member?.permissions.has(PermissionFlagsBits.ManageMessages) : (interaction.member as GuildMember).permissions.has(PermissionFlagsBits.ManageMessages)) {
				menuOptions.push({
					label: `Warning ${count + 1}`,
					value: `${warn._id}`,
					description: warn.reason.length > 100 ? `${warn.reason.substring(0, 97)}...` : warn.reason,
					emoji: '🛡️',
				});
			}
		});

		if (message ? message.member?.permissions.has(PermissionFlagsBits.ManageMessages) : (interaction.member as GuildMember).permissions.has(PermissionFlagsBits.ManageMessages)) {
			/* IF USER HAS PROMPT OPEN */
			if (activeInteraction.has(message ? message.author.id : interaction.user.id)) {
				warningsEmbed.setFooter({ text: 'Exit previous warning prompt to receive options to delete/edit warns.' });
				return message ? message.channel.send({ embeds: [warningsEmbed] }) : interaction.followUp({ embeds: [warningsEmbed] });
			}

			activeInteraction.add(message ? message.author.id : interaction.user.id);

			const warningSentEmbed: any = message
				? await message.channel.send({
						embeds: [warningsEmbed],
						components: [
							new ActionRowBuilder<ButtonBuilder>().addComponents([
								// prettier-ignore
								new ButtonBuilder().setLabel('Edit 📝').setStyle(ButtonStyle.Success).setCustomId('editWarn'),
								new ButtonBuilder().setLabel('Remove 🗑️').setStyle(ButtonStyle.Danger).setCustomId('removeWarn'),
								new ButtonBuilder().setLabel('Exit 🚪').setStyle(ButtonStyle.Primary).setCustomId('exit'),
							]),
						],
				  })
				: await interaction.followUp({
						embeds: [warningsEmbed],
						components: [
							new ActionRowBuilder().addComponents([
								// prettier-ignore
								new ButtonBuilder().setLabel('Edit 📝').setStyle(ButtonStyle.Success).setCustomId('editWarn'),
								new ButtonBuilder().setLabel('Remove 🗑️').setStyle(ButtonStyle.Danger).setCustomId('removeWarn'),
								new ButtonBuilder().setLabel('Exit 🚪').setStyle(ButtonStyle.Primary).setCustomId('exit'),
							]),
						],
				  });

			const collector = message ? message.channel.createMessageComponentCollector({ filter: (msgFilter) => msgFilter.user.id === message.author.id, componentType: ComponentType.Button, time: 30000 }) : interaction.channel!.createMessageComponentCollector({ filter: (menu: any) => menu.user.id === interaction.user.id, componentType: ComponentType.Button, time: PROMPT_TIMEOUT });

			collector.on('collect', async (button: ButtonInteraction) => {
				switch (button.customId) {
					case 'exit':
						await button.update({
							components: [],
						});

						collector.stop();
						activeInteraction.delete(message ? message.author.id : interaction.user.id);
						break;
					case 'editWarn':
						await button.update({
							embeds: [
								new EmbedBuilder() // prettier-ignore
									.setTitle('Select Warning 🔎')
									.setDescription('Please select a warning from the menu below that you would like to edit.')
									.setColor(EMBED_COLOURS.blurple),
							],
							components: [
								new ActionRowBuilder<SelectMenuBuilder>() // prettier-ignore
									.addComponents([new SelectMenuBuilder().setCustomId('editwarn-menu').setPlaceholder('Please select a warning').addOptions(menuOptions)]),
							],
						});

						// eslint-disable-next-line no-case-declarations
						const editWarnCollector = message ? message.channel.createMessageComponentCollector({ filter: (interactionFilter) => interactionFilter.user.id === message.author.id, componentType: ComponentType.SelectMenu, time: PROMPT_TIMEOUT }) : interaction.channel!.createMessageComponentCollector({ filter: (menu: any) => menu.user.id === interaction.user.id, componentType: ComponentType.SelectMenu, time: PROMPT_TIMEOUT });

						editWarnCollector.on('collect', async (editWarnInteraction: SelectMenuInteraction) => {
							const [warnID] = editWarnInteraction.values;
							const matchingWarn = userWarns.warnings.find((warning: any) => String(warning._id) === String(warnID));

							if (matchingWarn) {
								warningSentEmbed.edit({
									embeds: [
										new EmbedBuilder() // prettier-ignore
											.setTitle('New Reason 📝')
											.setDescription('Please provide the new reason for the warning.')
											.setColor(EMBED_COLOURS.blurple),
									],
									components: [],
								});

								try {
									const collectingMessage = message ? await message.channel.awaitMessages({ filter: (sentMsg: Message) => sentMsg.author.id === message.author.id, time: PROMPT_TIMEOUT, max: 1, errors: ['time'] }) : await interaction.channel!.awaitMessages({ filter: (sentMsg: Message) => sentMsg.author.id === interaction.user.id, time: PROMPT_TIMEOUT, max: 1, errors: ['time'] });
									await warnData.updateOne({ userID: member.id, 'warnings._id': matchingWarn._id }, { $set: { 'warnings.$.reason': collectingMessage.first()!.content } });

									warningSentEmbed.edit({
										embeds: [
											new EmbedBuilder() // prettier-ignore
												.setDescription(`✅ **${message ? member.displayName : member.username}'s warning was edited.**`)
												.setColor(EMBED_COLOURS.green),
										],
										components: [],
									});

									collectingMessage.first()!.delete();
									collector.stop();
									editWarnCollector.stop();
									activeInteraction.delete(message ? message.author.id : interaction.user.id);
								} catch (err) {
									warningSentEmbed.edit({
										embeds: [
											new EmbedBuilder() // prettier-ignore
												.setDescription(`❌ **You ran out of time to edit the warning.**`)
												.setColor(EMBED_COLOURS.red),
										],
										components: [],
									});
								}
							}
						});
						break;

					case 'removeWarn':
						await button.update({
							embeds: [
								new EmbedBuilder() // prettier-ignore
									.setTitle('Select Warning 🔎')
									.setDescription('Please select a warning from the menu below that you would like to delete.')
									.setColor(EMBED_COLOURS.blurple),
							],
							components: [
								new ActionRowBuilder<SelectMenuBuilder>() // prettier-ignore
									.addComponents([new SelectMenuBuilder().setCustomId('delete-menu').setPlaceholder('Please select a warning').addOptions(menuOptions).setMinValues(1).setMaxValues(userWarns.warnings.length)]),
							],
						});

						// eslint-disable-next-line no-case-declarations
						const warnRemoveCollector = message ? message.channel.createMessageComponentCollector({ filter: (filterInteraction) => filterInteraction.user.id === message.author.id, componentType: ComponentType.SelectMenu, time: PROMPT_TIMEOUT }) : interaction.channel!.createMessageComponentCollector({ filter: (menu: any) => menu.user.id === interaction.user.id, componentType: ComponentType.SelectMenu, time: PROMPT_TIMEOUT });

						warnRemoveCollector.on('collect', async (menuInteraction: SelectMenuInteraction) => {
							menuInteraction.values.forEach(async (warningID) => {
								const matchingWarn = userWarns.warnings.find((warning: any) => String(warning._id) === String(warningID));
								await warnData.updateOne({ userID: member.id }, { $pull: { warnings: { _id: matchingWarn._id } } });
							});

							await warningSentEmbed.edit({
								embeds: [
									new EmbedBuilder() // prettier-ignore
										.setDescription(`✅ **${message ? member.displayName : member.username}'s warnings were deleted.**`)
										.setColor(EMBED_COLOURS.green),
								],
								components: [],
							});
							collector.stop();
							warnRemoveCollector.stop();
							activeInteraction.delete(message ? message.author.id : interaction.user.id);
						});
						break;
				}
			});

			collector.on('end', () => {
				warningSentEmbed.edit({ components: [] });
				activeInteraction.delete(message ? message.author.id : interaction.user.id);
			});
		} else {
			return message ? message.channel.send({ embeds: [warningsEmbed] }) : interaction.followUp({ embeds: [warningsEmbed] });
		}
	},
};

export = command;
