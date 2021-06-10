import dotenv from 'dotenv';
dotenv.config();

const random = (n) => {
	let out = '';
	const alph = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
	for (let i = 0; i < n; i++) {
		out += alph[Math.floor(Math.random() * alph.length)];
	}
	return out;
};

const check_missing = (obj, keys, ignore) => {
	keys
		.filter((k) => !ignore.includes(k))
		.forEach((k) => {
			if (!obj[k]) {
				console.error(`Missing or invalid mandatory environment variable '${k}' with current value:`, obj[k]);
				process.exit(1);
			}
		});
};

export const { NODE_ENV } = process.env;
export const dev = NODE_ENV == 'development';

const defaults = {
	PORT: 3000,
	ISSUER: 'https://auth.itemize.no',
	CLIENT_ID: undefined,
	CLIENT_SECRET: undefined,
	SECRET: random(32),
	BASE_URL: dev ? 'http://localhost:3000' : 'https://status.itemize.no',
	MONGO_DB_URL: 'mongodb://mongo/watchdog',
	MAX_SCAN_TIME: 5 * 60,
	SCAN_PAUSE: 1 * 60,
	CLEANUP_INTERVAL: 10 * 60,
	DISCORD_WEBHOOK: undefined,
	DISCORD_USERNAME: 'Itemize Watchdog',
	DISOCRD_AVATAR: 'https://status.itemize.no/icon.png',
	NODE_ENV,
	dev
};

let config = { ...defaults };
Object.assign(config, process.env);
Object.freeze(config);

check_missing(config, Object.keys(defaults), ['dev']);

export const { PORT, ISSUER, CLIENT_ID, CLIENT_SECRET, SECRET, BASE_URL, MONGO_DB_URL, MAX_SCAN_TIME, SCAN_PAUSE, CLEANUP_INTERVAL } = config;
export default config;
