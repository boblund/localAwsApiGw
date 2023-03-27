// License: Creative Commons Attribution-NonCommercial 4.0 International
// Based on https://github.com/JamesKyburz/aws-lambda-ws-server

'use strict';

const url = require('url'),
	SourceIp = (() => {
		const interfaces = require('os').networkInterfaces();
		for(const iface of Object.keys(interfaces)){
			for(const e of interfaces[iface]) {
				if(e.family == 'IPv4' && !(e.internal)) return e.address;
			}
		}
		return null;
	})();

function wsApiGw(httpServer, wsApi) {
	const apiGw = new (require('./ApiGw'))(wsApi.routes),
		mappingKey = wsApi.mappingKey || 'action';

	// Create web socket server on top of a regular http server
	const wsServer = require('ws').Server;
	const wss = new wsServer({ server: httpServer });
	const clients = {};

	// Local equivalent of AWS.ApiGatewayManagementApi functions. Add deleteConnection if required.
	const clientContext = {
		postToConnection ({Data, ConnectionId}) {
			return new Promise((resolve, reject) => {
				const ws = clients[ConnectionId];
				if (ws) {
					ws.send(Data, err => {
						(err ? reject(err) : resolve());
					});
				} else {
					const err = new Error('Unknown client:', ConnectionId);
					err.statusCode = 410;
					reject(err);
				}
			});
		},

		getConnection({ConnectionId}) {
			return new Promise((resolve, reject) => {
				if(clients[ConnectionId]) {
					resolve({
						"ConnectedAt": new Date,
						"Identity": { SourceIp, "UserAgent": null },
						"LastActiveAt": new Date()
					});
				} else {
					reject({code: 'GoneException', message: 410});
				}
			});
		}
	};

	wss.on('connection', async(ws, req) => {
		const connectionId = req.headers['sec-websocket-key'];
		await apiGw.invoke(
			'$connect', 'WEBSOCKET',
			{ //event
				requestContext: { routeKey: '$connect', connectionId: req.headers['sec-websocket-key'] },
				headers: { ...req.headers, queryStringParameters: url.parse(req.url,true).query },
				body: req.body
			},
			{ clientContext } //context
		);
		clients[connectionId] = ws;

		ws.on('ping', d => {console.log(`ping ${d}`);});

		ws.on('close', async () => {
			try {
				delete clients[connectionId];
				await apiGw.invoke(
					'$disconnect', 'WEBSOCKET',
					{ //event
						requestContext: { routeKey: '$disconnect', connectionId: req.headers['sec-websocket-key'] },
						headers: req.headers,
						body: req.body
					}
				);				
			} catch (e) {
				console.error(e);
			}
		});

		ws.on('message', async message => {
			let routeKey = null;
			let d = null;

			try {
				d = JSON.parse(message);
			} catch(e) {
				console.error('ws.on messgage error:', e.code, e.message);
				await clientContext.postToConnection({
					Data: JSON.stringify({ error: 'Invalid JSON:' + message }),
					ConnectionId: connectionId
				});
				return;
			}

			routeKey = d[mappingKey] && wsApi.routes[d[mappingKey]] ? d[mappingKey] : '$default';
			try {
				if(routeKey != '$default') {
					await apiGw.invoke(
						routeKey,
						'WEBSOCKET',
						{	//event
							requestContext: {routeKey, connectionId: req.headers['sec-websocket-key']},
							headers: req.headers,
							body: message.toString()
						},
						{ clientContext }	//context
					);
				}        
			} catch (e) {
				console.error('ws server error:', e.statusCode, e.body);
			}
		});
	});
}

module.exports = wsApiGw;
