import { connect } from 'mongoose';
import { Client, ActivityType } from 'discord.js';
import { green } from 'chalk';

export = async (bot: Client) => {
	console.log(green(`\n[discord] ${bot.user!.username} is online!`));

	// -- Login to MongoDB database
	const databaseOptions = {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		keepAlive: true,
	};

	await connect(`${process.env.MONGO_PASSWORD}`, databaseOptions).then((): void => console.log(green(`[mongo_database]: Connected to MongoDB successfully.`)));

	// -- Setting status
	const statuses: string[] = [`🎮 SaikouBot | /help`, `🥪 Kaiou's picnic`, `✨ @SaikouDev`];

	setInterval(() => {
		bot.user!.setActivity(String(statuses[Math.floor(Math.random() * statuses.length)]), { type: ActivityType.Streaming, url: 'https://www.twitch.tv/test' });
	}, 15000);
};
