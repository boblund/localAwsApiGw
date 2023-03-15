// License: Creative Commons Attribution-NonCommercial 4.0 International

'use strict';

const defaults = {restT:'template.yaml', wsT:'template.yaml'};
const options = ['_', 'web', 'rest', 'restT', 'ws', 'wsT'];
const required = ['web', 'rest', 'ws'];
const usage = `--web=dir | --rest=dir [--restT=template.yaml] | --ws=dir [--wsT=template.yaml]`;
const servers = {};

var argv = require('minimist')(process.argv.slice(2), {default: defaults});

if(!Object.keys(argv).every(e=>options.includes(e)) // only valid options
	|| !required.some(e=>Object.keys(argv).indexOf(e) >= 0) // at least one required
) {
	console.log('USAGE: [PORT= xxxx] node', process.argv[1].split('/').pop(), usage);
} else {
	for(const option of Object.keys(argv)){
		/*severs[option] = {
			filesPath: argv[option],
			templateName: option == 'rest' ? argv.restT : option === 'ws' ? argv.wsT : ''}
		*/
		switch(option) {
			case 'web':
				servers.web = {filesPath: argv.web};
				break;
			
			case 'rest':
				servers.rest = {filesPath: argv.rest, templateName: argv.restT};
				break;

			case 'ws':
				servers.ws = {filesPath: argv.ws, templateName: argv.wsT};
				break;
		}
	}
}

module.exports = servers;
