import { Router } from 'express';
import mongoose from 'mongoose';
import { Scope, Scan } from './models';
import { loggedIn } from './util';
import watchdog from './watchdog.js';

export const router = Router();
router.use(loggedIn);

router.get('/stats/scopes', async (req, res) => {
	const time = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

	const data = await Scan.aggregate([
		{ $match: { date: { $gt: time } } },
		{
			$group: {
				_id: {
					scope: '$scope',
					date: {
						$dateFromParts: {
							year: { $year: '$date' },
							month: { $month: '$date' },
							day: { $dayOfMonth: '$date' },
							hour: { $hour: '$date' },
							minute: {
								$subtract: [{ $minute: '$date' }, { $mod: [{ $minute: '$date' }, 15] }]
							}
						}
					}
				},
				ok: { $min: { $cond: ['$ok', 1, 0] } },
				count: { $sum: 1 },
				time: { $avg: '$time' }
			}
		},
		{ $sort: { '_id.date': 1 } },
		{
			$group: {
				_id: { scope: '$_id.scope' },
				data: { $push: { date: '$_id.date', ok: '$ok', count: '$count', time: '$time' } }
			}
		}
		//{ $lookup: { from: 'scopes', localField: '_id.scope', foreignField: '_id', as: 'scope' } },
		//{ $unwind: '$scope' },
		//{ $lookup: { from: 'scans', localField: 'scope.last_scan', foreignField: '_id', as: 'last' } },
		//{ $unwind: '$last' },
		//{ $sort: { "scope.added": 1 } },
	]);
	let scopes = await Scope.find({}).populate('last_scan').sort({ added: 1 }).lean();
	scopes = scopes.map((scope) => ({ scope, data: [] }));
	const map = scopes.reduce((m, c) => {
		m[c.scope._id] = c;
		return m;
	}, {});
	data.forEach((scans) => ((map[scans._id.scope] || {}).data = scans.data));

	scopes.last = await Scan.findOne({ date: -1 }).lean();
	res.send(scopes);
});

router.get('/stats/system', async (req, res) => {
	const stats = ['totalSize', 'size', 'avgObjSize', 'storageSize', 'freeStorageSize', 'count'];
	const scans = await mongoose.connection.collection('scans').stats();
	const scopes = await mongoose.connection.collection('scopes').stats();
	const obj = { scans: {}, scopes: {}, lastScan: watchdog.lastScan, current: watchdog.current };
	stats.forEach((k) => (obj.scans[k] = scans[k] ?? 0));
	stats.forEach((k) => (obj.scopes[k] = scopes[k] ?? 0));
	res.send(obj);
});
