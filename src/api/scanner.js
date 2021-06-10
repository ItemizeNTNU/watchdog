import nmap from 'node-nmap';
import fetch from 'node-fetch';
import { promises as dns } from 'dns';
import postgres from 'postgres';
import punycode from 'tr46';
import { notify } from './notify';
import { code } from '../utils/text';

const diff_arrays = (a, b) => {
	a = new Set(a);
	b = new Set(b);
	const added = [...b].filter((n) => !a.has(n)).sort();
	const removed = [...a].filter((n) => !b.has(n)).sort();
	const total = [...new Set([...a, ...b])].sort();
	return { added, removed, total };
};

const diff_arrays_output = (a, b) => {
	const { added, removed, total } = diff_arrays(a, b);
	return { added, removed, total, changed: added.length + removed.length > 0 };
};

export const raw_ip_scan = async (ip, port, extended) => {
	return await new Promise((resolve, reject) => {
		const scan = new nmap.NmapScan(ip, `-p ${port}${extended ? ' -sC -sV' : ''}`);
		scan.on('error', (err) => {
			console.error(`An error occured while trying to ip scan '${ip}' ports: '${port}', extended: ${extended}`);
			console.error('Scan:', scan);
			console.error(err);
			notify('IP scan error', `Error running IP scan for:${code(ip)}, ports: ${code(port)}, extended: ${code(extended)}\nOutput data:\n${'```'}${scan.rawData}${'```'}`)
			reject(err)
		});
		scan.on('complete', (data) => resolve(data[0].openPorts.map((p) => (extended ? p : p.port))));
		scan.startScan();
	});
};

export const scan_ip = async (ip, port, expected) => {
	const open = await raw_ip_scan(ip, port, false);
	return diff_arrays_output(expected, open);
};

const diff_objects = (a, b) => {
	const diff = {};
	const u = undefined;
	for (let [k, v] of Object.entries(a || { status: u, content_length: u, regex: u })) {
		if (b[k] != v) {
			diff[k] = b[k];
		}
	}
	return { diff, total: { ...a, ...diff }, changed: Boolean(Object.keys(diff).length) };
};

export const scan_endpoint = async (url, old, regex) => {
	const res = await fetch(url, { redirect: 'manual' });
	const blob = await res.blob();
	const text = await blob.text();
	const now = { status: res.status, content_length: blob.size };
	if (regex) now.regex = RegExp(regex).test(text);
	return diff_objects(old, now);
};

const try_def = async (f, d) => {
	try {
		return await f();
	} catch (err) {
		return d;
	}
};

export const scan_dns = async (domain, old_ips) => {
	const res4 = await try_def(async () => await dns.resolve4(domain), []);
	const res6 = await try_def(async () => await dns.resolve6(domain), []);
	const res = [...res4, ...res6];
	return diff_arrays_output(old_ips, res);
};

export const scan_crtsh = async (domain, old_domains) => {
	old_domains = old_domains.map((d) => punycode.toUnicode(d).domain);
	const sql = postgres('postgres://guest@crt.sh:5432/certwatch');
	domain = punycode.toASCII(domain);
	const res = await sql`SELECT distinct(NAME_VALUE) FROM certificate_and_identities WHERE ${domain} @@ identities(CERTIFICATE);`;
	sql.end();
	const new_domains = [...res].map((d) => punycode.toUnicode(d.name_value).domain);
	const diff = diff_arrays_output(old_domains, new_domains);
	delete diff.removed;
	diff.changed = diff.added.length > 0;
	return diff;
};

export default { scan_ip, scan_endpoint, scan_dns, scan_crtsh, raw_ip_scan };
