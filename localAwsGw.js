// License: Creative Commons Attribution-NonCommercial 4.0 International

'use strict';

// Integrated local AWS s3 static web and rest/ws api server.
// Based on https://stackoverflow.com/a/34838031/6996491.

const express = require('express');
const restApiGw = require('./restApiGw.js');
const wsApiGw = require('./wsApiGw.js');
const apiGwLambdas = require('./apiGwLambdas.js');
const {existsSync} = require('fs');

const servers = require('./cmdLineParse.js'); //process command line
if(Object.keys(servers).length == 0) {
	process.exit(1);
}

const httpServer = require('http').createServer();
let app = null;

(async () => {
	for(let server in servers) {
		switch(server) {
			case 'web':
				if(existsSync(servers.web.filesPath)) {
					app = app ? app : express(); //app if necessary
					app.use(express.static(servers.web.filesPath));
				} else {
					console.error(`${process.argv[1].split('/').pop()}: ${servers.web.filesPath} does not exist`);
					process.exit(1);
				}
				break;

			case 'rest':
				app = app ? app : express(); //app if necessary
				const {restApi} = await apiGwLambdas(servers.rest);
				if(restApi && Object.keys(restApi).length > 0) {
					restApiGw(app, restApi);
				} else {
					console.error(`${process.argv[1].split('/').pop()}: no restApi`);
					process.exit(1);
				}
				break;

			case 'ws':
				if(!servers?.ws) break;
				const {wsApi} = await apiGwLambdas(servers.ws);
				if(wsApi && Object.keys(wsApi.routes).length > 0) {
					wsApiGw(httpServer, wsApi);
				} else {
					console.error(`${process.argv[1].split('/').pop()}: no wsApi`);
					process.exit(1);
				}
				break;
		}
	}

	if(app) httpServer.on('request', app); // Mount the app if it exists
	httpServer.listen(process.env.PORT, function() {
		console.log(`${process.argv[1].split('/').pop()} server listening on ${process.env.PORT}`);
	});
})()
