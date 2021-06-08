import fetch from 'node-fetch';
import config from '../utils/config';

const default_discord_options = {
	url: config.BASE_URL,
	timestamp: undefined,
	color: 0x3cb34f,
	footer: {
		text: undefined,
		icon_url: undefined
	},
	image: undefined,
	thumbnail: undefined,
	author: {
		name: undefined,
		url: undefined,
		icon_url: undefined
	}
};

export const send_discord = async (title, msg, options) => {
	options = { ...default_discord_options, ...options };
	const url = config.DISCORD_WEBHOOK;
	const body = {
		username: config.DISCORD_USERNAME,
		avatar_url: config.DISOCRD_AVATAR,
		embeds: [
			{
				title: title,
				description: msg,
				...options,
				image: {
					url: options.image
				},
				thumbnail: {
					url: options.thumbnail
				}
			}
		]
	};
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	if (res.error) {
		const wait = 10;
		console.error(`Error sending Discord notification, retrying in ${wait} seconds...\nMsg: ${msg}`);
		setTimeout(() => send_msg(msg), wait * 1000);
	}
};

export const notify = async (title, msg, options) => {
	const { type, path } = { type: 'warning', path: '/', ...options };
	const colors = { warning: 0xb43c3c, info: 0x3cb34f, alert: 0xb46e3c };
	await send_discord(title, msg, { color: colors[type], url: config.BASE_URL + path });
};

export default { send_discord, notify };
