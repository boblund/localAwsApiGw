const WebSocket = require('ws');
const lambdaLocal = require('lambda-local');

function wsApiGw(app, wsApi) {
	const mappingKey = wsApi.mappingKey || 'action';

	const wss = new WebSocket.Server({
		port: process.env.PORT,
		verifyClient (info, fn) {
			wss.emit('verifyClient', info, fn)
		}
	});

	console.log('localWsServer.js started on port', process.env.PORT);

	const clients = {};
	const context = () => ({
		postToConnection ({Data, ConnectionId}) {
			return new Promise((resolve, reject) => {
				const ws = clients[ConnectionId];
				if (ws) {
					ws.send(Data, err => {
						(err ? reject(err) : resolve())
					})
				} else {
					const err = new Error('Unknown client:', ConnectionId);
					err.statusCode = 410;
					reject(err);
				}
			})
		}
	});

	wss.removeAllListeners('verifyClient');
	wss.on('verifyClient', async (info, fn) => {
		//let result = await routes['$connect'](event('$connect', info.req), context())
		//let result = await wsApi.routes['$connect'].lambdaPath
		const result = await lambdaLocal.execute({
			...wsApi.routes['$connect'],
			timeoutMs: 1000*60,
			verboseLevel: 0,
			event: {
				requestContext: {routeKey: '$connect', connectionId: info.req.headers['sec-websocket-key']},
				headers: info.req.headers, // Pass on request headers
				body: info.req.body // Pass on request body
			},
			clientContext: context()
		});

		fn(result.statusCode === 200, result.statusCode, result.body);
	});
	wss.on('connection', (ws, req) => {
		const connectionId = req.headers['sec-websocket-key'];
		clients[connectionId] = ws;
		//routes['$connect'](event('$connect', req), context())

		ws.on('close', async () => {
			try {
				delete clients[connectionId]
				//await routes['$disconnect'](event('$disconnect', req), context())
				await lambdaLocal.execute({
					...wsApi.routes['$disconnect'],
					timeoutMs: 1000*60,
					verboseLevel: 0,
					event: {
						requestContext: {routeKey: '$disconnect', connectionId: req.headers['sec-websocket-key']},
						headers: req.headers, // Pass on request headers
						body: req.body // Pass on request body
					},
					clientContext: context()
				});
			} catch (e) {
				console.error(e);
			}
		})

		ws.on('message', async message => {
			let routeKey = null
					, d = null

			try {
				d = JSON.parse(message)
			} catch(e) {
				console.error('ws.on messgage error:', e.code, e.message)
				await context().postToConnection({ error: 'Invalid JSON:' + message })
				return
			}

			routeKey = d[mappingKey] && wsApi.routes[d[mappingKey]] ? d[mappingKey] : '$default'
			message = message.toString();
			try {
				if(routeKey != '$default') {
					//await routes[routeKey](event(routeKey, req, message),context());
					await lambdaLocal.execute({
						...wsApi.routes[routeKey],
						timeoutMs: 1000*60,
						verboseLevel: 0,
						event: {
							requestContext: {routeKey, connectionId: req.headers['sec-websocket-key']},
							headers: req.headers, // Pass on request headers
							body: message // Pass on request body
						},
						clientContext: context()
					});
				}        
			} catch (e) {
				console.error('ws server error:', e.code, e.message);
			}
		})
	});
}

module.exports = wsApiGw;
