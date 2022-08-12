const express = require('express');
const app = express();
const restApiGw = require('./restApiGw.js');
const wsApiGw = require('./wsApiGw.js');

const apiGwLambdas = require('./apiGwLambdas.js');
const USAGE = `USAGE: node ${process.argv[1].split('/').pop()} api_dir web_dir [template_file.[json|yaml|yml]]`;

const servers = require('./cmdLineParse.js'); //process command line
if(Object.keys(servers).length == 0) {
	process.exit(1);
} else {
	//console.log('servers:', JSON.stringify(servers, null, 2));
}

(async () => {
	for(let server in servers) {
		switch(server) {
			case 'web':
				app.use(express.static(servers.web.filesPath));
				break;

			case 'api':
				const {restApi} = await apiGwLambdas(servers.api);
				restApiGw(app, restApi);
				break;

			case 'ws':
				const {wsApi} = await apiGwLambdas(servers.ws);
				wsApiGw(app, wsApi);
				//app.listen(3001, () => console.log('listening on port: 3001'));
				break;
		}
	}
	app.listen(3000, () => console.log('listening on port: 3000'));
})()
