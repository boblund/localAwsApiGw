// License: Creative Commons Attribution-NonCommercial 4.0 International

'use strict';

const defaults = {apiT:'template.yaml', wsT:'template.yaml'};
const options = ['_', 'web', 'api', 'apiT', 'ws', 'wsT'];
const required = ['web', 'api', 'ws'];
const usage = `--web=dir | --api=dir [apiT=template.yaml] | --ws=dir [wsT=template.yaml]`
const servers = {};

var argv = require('minimist')(process.argv.slice(2), {default: defaults});

if(!Object.keys(argv).every(e=>options.includes(e)) // only valid options
	|| !required.some(e=>Object.keys(argv).indexOf(e) >= 0) // at least one required
	|| !process.env.PORT) { // server PORT required
	console.log('USAGE: PORT= xxxx node', process.argv[1].split('/').pop(), usage);
} else {
	for(const option of Object.keys(argv)){
		switch(option) {
			case 'web':
				servers.web = {filesPath: argv.web};
				break;
			
			case 'api':
				servers.api = {filesPath: argv.api, templateName: argv.apiT};
				break;

			case 'ws':
				servers.ws = {filesPath: argv.ws, templateName: argv.wsT};
				break;
		}
	}
}

module.exports = servers;
