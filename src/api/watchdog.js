import { notify } from './notify';
import scanner from './scanner';
import { Scope, Scan } from './models';
import { code } from '../utils/text';
import { add_missing } from './util';
import moment from 'moment';
import config from '../utils/config';

let current;
let lastScan = new Date();
let lastWarned = 0;

const scan = async (scope) => {
	const last = await Scan.findOne({ scope }).sort({ date: -1 });
	let res = {};
	if (scope.type == 'ip') {
		// { added: [ 80 ], removed: [], changed: true }
		res = await scanner.scan_ip(scope.value, scope.settings.ports, last?.output.total || []);
		if (res.changed) {
			console.log(`Port scan results for ${code(scope.value)} has changed:\nNew Open Ports: ${code(res.added)}\nNew Closed Ports: ${code(res.removed)}`);
			await notify(`Port scan results for ${code(scope.value)} has changed`, `New Open Ports: ${code(res.added)}\nNew Closed Ports: ${code(res.removed)}`);
		}
	} else if (scope.type == 'domain') {
		// { added: [ '129.241.208.11' ], removed: [], changed: true }
		res = {};
		res.dns = await scanner.scan_dns(scope.value, last?.output.dns.total);
		if (res.dns.changed) {
			console.log(`DNS results for ${code(scope.value)}\` has changed:\nAdded ${code(res.dns.added)}\nRemoved: ${code(res.dns.removed)}`);
			await notify(`DNS results for ${code(scope.value)} has changed`, `Added ${code(res.dns.added)}\nRemoved: ${code(res.dns.removed)}`);
			await add_missing('ip', res.dns.added, scope);
		}
		if (scope.settings.subdomains) {
			/* { added: ['auth.itemize.no', 'wiki.itemize.no'], removed: [], changed: true } */
			res.crtsh = await scanner.scan_crtsh(scope.value, last?.output.crtsh?.total || []);
			if (res.crtsh.changed) {
				console.log(`Found new sub domain for ${code(scope.value)}\: ${code(res.crtsh.added)}`);
				await notify(`Found new sub domain for ${code(scope.value)}\: ${code(res.crtsh.added)}`);
				await add_missing('domain', res.crtsh.added, scope);
			}
		}
		res.changed = Boolean(res.dns.changed || res.crtsh?.changed);
	} else if (scope.type == 'endpoint') {
		// { diff: {status: 200, content_length: 3306, regex: true}, changed: true }
		res = await scanner.scan_endpoint(scope.value, last?.output.total, scope.regex);
		if (res.changed) {
			const human = (s) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
			const formatted = Object.entries(res.diff)
				.map(([k, v]) => `${human(k)}: ${code(v)}`)
				.join('\n');
			console.log(`Endpoint result has changed for ${code(scope.value)}:\n${formatted}`);
			await notify(`Endpoint result has changed for ${code(scope.value)}`, formatted);
		}
	}

	const scan = new Scan({ scope, ok: (!res.changed && last?.ok) || !last, output: res, time: (Date.now() - lastScan.getTime()) / 1000 });
	await scan.save();
	scope.last_scan = scan;
	await scope.save();
};

const tick = async () => {
	if (current) return;
	const queue = await Scope.find({ $or: [{ disabled: false }, { disabled: null }] }).populate('last_scan');
	queue.sort((a, b) => (a.last_scan?.date || -Infinity) - (b.last_scan?.date || -Infinity));
	if (queue.length == 0) return console.log('Queue is empty');
	//console.log('full queue:', queue);
	current = queue[0];
	console.log(`Starting new ${current.type} scan of ${current.value}`);
	lastScan = new Date();
	lastWarned = 0;
	try {
		await scan(current);
		current = undefined;
	} catch (err) {
		const last = await Scan.findOne({ scope: current }).sort({ date: -1 });
		const scan = new Scan({ scope: current, ok: false, output: { error: err }, time: (Date.now() - lastScan.getTime()) / 1000 });
		await scan.save();
		current.last_scan = scan;
		await current.save();
		current = undefined;

		if (last && last.output?.error) {
			if (err == last.output.error || err.message == last.output.error.message) {
				return;
			}
		}
		console.error('An error occured while trying to scan:', current, '\n', err);
		notify(`An error occurend while trying to scan ${current.type}: ${code(current.value)}`, 'Trace:\n```\n' + err + '\n```');
	}
};

const watchWatcher = () => {
	if (Date.now() - (lastWarned || lastScan.getTime()) > config.MAX_SCAN_TIME * 1000 && current) {
		let t = moment(lastScan).fromNow();
		const cur = { type: current.type, value: current.value, settings: current.settings, added: current.added, parrent: current.parrent };
		console.error(`Current scan has been running for ${code(t)}`, 'Current scan:\n```json\n' + JSON.stringify(cur, null, 2) + '\n```');
		notify(`Current scan has been running for ${code(t)}`, 'Current scan:\n```json\n' + JSON.stringify(cur, null, 2) + '\n```', { type: 'alert' });
		lastWarned = Date.now();
	}
};

const start = () => {
	console.log('Starting watchdog...');
	setTimeout(tick, 0);
	setTimeout(cleanup, 0);
	setInterval(tick, Math.max(config.SCAN_PAUSE, 1) * 1000);
	setInterval(watchWatcher, 2000);
	setInterval(cleanup, Math.max(config.CLEANUP_INTERVAL, 10) * 1000);
};

/**
 * Removes scans without any parrent
 */
const cleanup = async () => {
	const orphants = await Scan.aggregate([
		{ $lookup: { from: 'scopes', localField: 'scope', foreignField: '_id', as: 'parent' } },
		{ $match: { parent: [] } },
		{ $project: { _id: 1 } }
	]);
	if (orphants.length) {
		console.log(`Found ${orphants.length} orphant scans. Deleting...`);
		const res = await Scan.deleteMany({ _id: { $in: orphants } });
		console.log('Deleted orphants:', res);
	}
};

export default {
	start,
	get lastScan() {
		return lastScan;
	},
	get current() {
		return current;
	}
};
