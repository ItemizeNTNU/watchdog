import sirv from 'sirv';
import express from 'express';
import compression from 'compression';
import * as sapper from '@sapper/server';
import { auth } from 'express-openid-connect';
import mongoose from 'mongoose';
import { json as jsonParser } from 'body-parser';
import jose from 'jose';
import watchdog from './api/watchdog';

import { router as scope } from './api/scope';
import { router as stats } from './api/stats';
import config from './utils/config';

const APIS = [scope, stats];

mongoose.connection.on('error', console.log);
mongoose.connect(config.MONGO_DB_URL, { keepAlive: 1, useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true });

express()
	.disable('x-powered-by')
	.use(
		compression({ threshold: 0 }),
		sirv('static', { dev: config.dev }),
		jsonParser(),
		auth({
			issuerBaseURL: config.ISSUER,
			baseURL: config.BASE_URL,
			clientID: config.CLIENT_ID,
			clientSecret: config.CLIENT_SECRET,
			secret: config.SECRET,
			idpLogout: false,
			idTokenSigningAlg: 'HS256',
			authRequired: false,
			afterCallback: async (req, res, session, decodedState) => {
				const claims = jose.JWT.decode(session.id_token);
				if (!claims.roles.includes('admin')) {
					decodedState.returnTo = '/unauthorized';
					return;
				}
				return session;
			}
		}),
		(req, res, next) => {
			// create req.user object
			if (req.oidc?.user) {
				const { name, roles, email, sub } = { roles: [], ...req.oidc?.user };
				req.user = { name, roles, email, id: sub };
			}
			next();
		}
	)
	.use('/api', ...APIS)
	.use(
		sapper.middleware({
			session: (req, res) => ({
				user: req.user
			})
		})
	)
	.listen(config.PORT, (err) => {
		if (err) console.log('error', err);
	});

watchdog.start();
