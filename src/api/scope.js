import { Router } from 'express';
import mongoose from 'mongoose';
import { Scope, Scan } from './models';
import { auto_scan_dns, loggedIn } from './util';

export const router = Router();
// router.use(loggedIn);

router.get('/scopes/:type', async (req, res) => {
	const { type } = req.params;
	const allowed_types = ['any', ...Scope.schema.paths.type.enumValues];
	if (!allowed_types.includes(type)) {
		res.send({ error: true, msg: `Invlaid type ${type}. Needs to be one of the following: [${allowed_types.join(', ')}]` });
		return;
	}
	const query = type == 'any' ? {} : { type };
	res.send(await Scope.find(query).populate('parent').populate('last_scan').sort({ added: 1 }).lean());
});

router.get('/scopes', async (req, res) => {
	res.send(await Scope.find({}).populate('parent').populate('last_scan').sort({ added: 1 }).lean());
});

router.delete('/scope/:id', async (req, res) => {
	await Scan.deleteMany({ scope: req.params.id });
	await Scope.deleteOne({ _id: req.params.id });
	res.send(await Scope.find({}).populate('parent').populate('last_scan').sort({ added: 1 }).lean());
});

router.post('/scopes', async (req, res) => {
	const scope = req.body;
	for (let [k, v] of Object.entries(scope)) {
		if (typeof v === 'string') scope[k] = v.trim();
	}
	for (let [k, v] of Object.entries(scope.settings)) {
		if (typeof v === 'string') scope.settings[k] = v.trim();
	}
	if (!Scope.schema.paths.type.enumValues.includes(scope.type)) return res.status(400).send({ error: true, msg: 'Invalid type' });
	if (scope.value.length == 0) return res.status(400).send({ error: true, msg: 'Value is required' });
	if (scope.type == 'ip') {
		if (!/((\d+)[-,])*\d+/.test(scope.settings.ports)) return res.status(400).send({ error: true, msg: 'Invalid ports specified' });
	}
	if (scope.type == 'domain') {
		scope.settings.subdomains = Boolean(scope.settings.subdomains);
	}
	if (scope.type == 'endpoint') {
		scope.settings.status = /\d+/.test(scope.settings.status) ? Number(scope.settings.status) : undefined;
		scope.settings.content_length = /\d+/.test(scope.settings.content_length) ? Number(scope.settings.content_length) : undefined;
		scope.settings.contains = scope.settings.contains ? String(scope.settings.contains) : undefined;
		scope.settings.regex = scope.settings.regex ? String(scope.settings.regex) : undefined;
	}
	let _id = scope._id || mongoose.Types.ObjectId();
	delete scope._id;
	delete scope.last_scan;
	const updateRes = await Scope.updateOne({ _id }, scope, { upsert: true });
	if (updateRes.upserted?.length > 0 && scope.type == 'domain') {
		auto_scan_dns(scope.value); // don't wait, do this in background, notify over discord if anything is found
	}
	res.send(await Scope.find({}).sort({ added: 1 }).lean());
});

router.get('/scans/:scope', async (req, res) => {
	res.send(await Scan.find({ scope: req.params.scope }).sort({ date: -1 }).lean());
});

router.post('/scan/health/:scan', async (req, res) => {
	res.send(await Scan.updateOne({ _id: req.params.scan }, { ok: req.body.ok }));
});
