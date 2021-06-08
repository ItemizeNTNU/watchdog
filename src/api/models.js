import mongoose from 'mongoose';

export const Scope = mongoose.model(
	'scopes',
	mongoose.Schema({
		type: { type: String, enum: ['ip', 'domain', 'endpoint'] },
		value: String,
		settings: {
			ports: String, // ip
			subdomains: Boolean, // dns
			regex: String // endpoint
		},
		parent: { type: mongoose.Schema.Types.ObjectId, ref: 'scopes' },
		added: { type: Date, default: Date.now },
		last_scan: { type: mongoose.Schema.Types.ObjectId, ref: 'scans' },
		disabled: Boolean
	})
);
Scope.schema.index({ added: -1 });
export const Scan = mongoose.model(
	'scans',
	mongoose.Schema({
		scope: { type: mongoose.Schema.Types.ObjectId, ref: 'scopes' },
		date: { type: Date, default: Date.now },
		ok: Boolean,
		output: Object,
		time: Number
	})
);
Scan.schema.index({ date: -1 });
