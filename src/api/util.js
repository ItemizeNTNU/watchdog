import { Scope } from './models.js';
import { notify } from './notify.js';
import scanner from './scanner.js';
import { code } from '../utils/text';

export const loggedIn = (req, res, next) => {
	if (!req.user) {
		res.status(401).send({ error: true, msg: 'Permission denied' });
		return;
	}
	next();
};

/**
 * Do a full portscan with service detection. If any http or https services are detected, then add endpoint
 * scopes for these as well.
 */
export const auto_scan_dns = async (domain, doNotify = true) => {
	console.log(`Doing full port scan with service detection for ${domain}...`);
	return scanner.raw_ip_scan(domain, '1-65545', true).then(async (data) => {
		console.log(
			`Found open ports for ${domain}:`,
			data.map((p) => [p.port, p.service + (p.tunnel ? '+' + p.tunnel : '')])
		);
		for (let open of data) {
			if (open.service != 'http') continue;
			const proto = open.tunnel == 'ssl' ? 'https' : 'http';
			const port = { '80-http': '', '443-https': '' }[`${open.port}-${proto}`] ?? `:${open.port}`;
			const url = `${proto}://${domain}${port}/`;
			const coveredEndpoint = await Scope.findOne({ type: 'endpoint', value: url }).select({ _id: 1 });
			if (!coveredEndpoint) {
				const domainParent = await Scope.findOne({ type: 'domain', value: domain });
				await new Scope({
					type: 'endpoint',
					value: url,
					settings: {
						subdomains: false
					},
					parent: domainParent || parent
				}).save();
				console.log(`Added new endpoint rules for:`, url);
				if (doNotify) await notify(`Generated new endpoint rule for ${code(domain)}`, `Added new endpoint monitor for: ${code(url)}`, { type: 'info' });
			}
		}
	});
};

/**
 * When new resources are found, add scopes with some default settings. Auto adding new domains will also do an automatic dns scan.
 * See #auto_scan_dns.
 */
export const add_missing = async (type, values, parent) => {
	const covered = (
		await Scope.find({ type, value: { $in: values } })
			.select({ value: 1 })
			.lean()
	).map((e) => e.value);
	const new_values = values.filter((a) => !covered.includes(a));
	try {
		const settings = {
			ip: { ports: '1-65535' },
			domain: { subdomains: false },
			endpoint: { regex: '' }
		};
		await Scope.insertMany(
			new_values.map((d) => ({
				type,
				value: d,
				settings: settings[type],
				parent,
				added: new Date()
			}))
		);
		console.log(`Added new ${type} rules for:`, new_values);
		await notify(`Generated new ${type} rules for ${code(parent.value)}`, `Added new ${type} listeners for: ${code(new_values)}`, { type: 'info' });

		if (type == 'domain') await Promise.all(new_values.map(auto_scan_dns));
	} catch (err) {
		console.error(err);
		await notify(`Generated new ${type} rules for ${code(parent.value)}`, `Added new ${type} listeners for: ${code(new_values)}`);
	}
};
