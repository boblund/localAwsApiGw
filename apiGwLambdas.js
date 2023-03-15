// License: Creative Commons Attribution-NonCommercial 4.0 International

"use strict";

const jsYaml = require('js-yaml');
const { schema } = require('yaml-cfn');
const {readFileSync} = require('fs');
const {join} = require('path');
const ssm = new (require('aws-sdk')).SSM({region: 'us-east-1'});

async function apiGwLambdas({filesPath, templateName}) {
	let apis = {};
	const templatePath = join(filesPath, templateName);
	let template = '';

	switch (templatePath.split('.').pop()) {
		case 'json':
			try {
				template = JSON.parse(readFileSync(templatePath, 'utf8'));
			} catch(e) {
				return undefined;
			}

			break;
		
		case 'yaml':
		case 'yml':
			try {
				template = jsYaml.load(
					readFileSync(templatePath, 'utf8'),
					{ schema: schema }
				);
				break;

			} catch(e) {
				console.error(`apiGwLambdas: error parsing ${templatePath}`);
				return apis;
			}
		
		default:
			console.error(`apiGwLambdas: error parsing ${templatePath}`);
			return apis;
	}

	for(let param in template.Parameters) {
		if(template.Parameters[param].Type.includes('AWS::SSM::Parameter::Value')) {
			// Parameter is aws:ssm. Retrive actual value
			let value = null;
			try {
				value = (await ssm.getParameter({
					Name: template.Parameters[param].Default,
					WithDecryption: true
				}).promise()).Parameter.Value;
			} catch(e){}
			template.Parameters[param].Default = value;
		}
	}

	var CodeUri, Handler, Environment, Api, ApiKey, Routes, Method;

	for(let resourceName in template.Resources) {
		let resource = template.Resources[resourceName];

		switch(true) {
			case resource.Type == 'AWS::Serverless::Api':
				apis.restApi = {};
				continue;

			case resource.Type == "AWS::Serverless::Function" && resource.Properties.Events != undefined:
				let Events;
				({CodeUri, Handler, Environment, Events} = resource.Properties);
				ApiKey = Events[Object.keys(Events)[0]].Properties.Path;
				Method = Events[Object.keys(Events)[0]].Properties.Method;
				Routes = apis.restApi;
				break;

			case resource.Type == 'AWS::ApiGatewayV2::Api' && resource.Properties.ProtocolType == 'WEBSOCKET':
				apis.wsApi={};
				apis.wsApi.mappingKey = resource.Properties.RouteSelectionExpression.split('.')[2];
				apis.wsApi.routes = {};
				continue;

			case resource.Type == "AWS::ApiGatewayV2::Route":
				const integName = resourceName.match(/(^.*)Route/)[1]+'Integ';
				const integFunction = template.Resources[integName].Properties
					.IntegrationUri['Fn::Sub'].match(/^.*functions\/\$\{(.*)\.Arn.*/)[1];
				({CodeUri, Handler, Environment} = template.Resources[integFunction].Properties);
				ApiKey = resource.Properties.RouteKey;
				Routes = apis.wsApi.routes;
				break;

			default:
				continue;
		}

		const [app, lambdaHandler] = Handler.split('.');
		const environment = Environment?.Variables ? Environment?.Variables : {};
	
		for(let envVar in environment) {
			environment[envVar] = environment[envVar].Ref
				? template.Parameters[environment[envVar].Ref].Default
				: environment[envVar]['Fn::Sub']
					? environment[envVar]['Fn::Sub']
					: environment[envVar];
		}

		Routes[ApiKey] = Routes[ApiKey] ? Routes[ApiKey] : [];
		Routes[ApiKey].push({
			method: Method ? Method.toUpperCase() : 'WEBSOCKET',
			route: {
				lambdaPath: join(filesPath, CodeUri, app),
				lambdaHandler,
				environment
			}
		});
	}

	return apis;
}

module.exports = apiGwLambdas;
