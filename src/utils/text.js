export const capitalize = (str) => str.replace(/\b[a-z]/g, (c) => c.toUpperCase());

export const plural = (n, s, S) => {
	if (!S) S = s + 's';
	return `${n} ${n == 1 ? s : S}`;
};

export const formatMS = (ms, full = false) => {
	if (typeof ms == 'number') ms = Math.max(0, ms);
	const d = new Date(ms);
	let t = '';
	if (d.getUTCHours() || (t && full)) t += ' ' + plural(d.getUTCHours(), 'hour');
	if (d.getUTCMinutes() || (t && full)) t += ' ' + plural(d.getUTCMinutes(), 'minute');
	if (d.getUTCSeconds() || (t && full)) t += ' ' + plural(d.getUTCSeconds(), 'second');
	t = t.trim();
	return t ? t : '0 seconds';
};

export const ago = (date, suffix = ' ago', full = false) => {
	if (typeof date != 'object') date = new Date(date);
	return formatMS(Date.now() - date.getTime(), full) + suffix;
};

export const code = (l) => {
	if (Array.isArray(l)) {
		return l.length ? '`' + l.join('`, `') + '`' : '';
	}
	return l ? '`' + l + '`' : '';
};
