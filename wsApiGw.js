// License: Creative Commons Attribution-NonCommercial 4.0 International

'use strict';

// Based on https://github.com/JamesKyburz/aws-lambda-ws-server

const SourceIp = require('os').networkInterfaces().en0.find(e=>e.family == 'IPv4').address;
const url = require('url');

function wsApiGw(httpServer, wsApi) {
	const apiGw = new (require('./ApiGw'))(wsApi.routes);
	const mappingKey = wsApi.mappingKey || 'action';

	// Create web socket server on top of a regular http server
	const wsServer = require('ws').Server;
	const wss = new wsServer({
		server: httpServer,
		verifyClient (info, fn) {
			wss.emit('verifyClient', info, fn);
		}
	});

	const clients = {};

	// Local equivalent functions for AWS.ApiGatewayManagementApi.
	// Add deleteConnection if required.
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
						"Identity": {
							SourceIp,
							"UserAgent": null
						},
						"LastActiveAt": new Date()
					});
				} else {
					reject({code: 'GoneException', message: 410});
				}
			});
		}
	};

	wss.removeAllListeners('verifyClient');
	wss.on('verifyClient', async (info, fn) => {
		//const qString = url.parse(info.req.url,true).query;
		const result = await apiGw.invoke(
			'$connect',
			{ //event
				requestContext: {
					routeKey: '$connect',
					connectionId: info.req.headers['sec-websocket-key']
				},
				headers: {
					...info.req.headers,
					queryStringParameters: url.parse(info.req.url,true).query
				},
				body: info.req.body
			},
			{ clientContext } //context
		);
		fn(result.statusCode === 200, result.statusCode, result.body);
	});

	wss.on('connection', (ws, req) => {
		const connectionId = req.headers['sec-websocket-key'];
		clients[connectionId] = ws;

		ws.on('ping', d => {console.log(`ping ${d}`);});

		ws.on('close', async () => {
			try {
				delete clients[connectionId];
				await apiGw.invoke(
					'$disconnect',
					{ //event
						requestContext: {
							routeKey: '$disconnect',
							connectionId: req.headers['sec-websocket-key']
						},
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
				await clientContext.postToConnection({ error: 'Invalid JSON:' + message });
				return;
			}

			routeKey = d[mappingKey] && wsApi.routes[d[mappingKey]] ? d[mappingKey] : '$default';
			try {
				if(routeKey != '$default') {
					await apiGw.invoke(
						routeKey,
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
