'use strict';

const baseEnv = {
	AWS_REGION: 'us-east-1',
	LOCAL_AWS_GW: true
};

function ApiGw(apis) {
	const lambdas = {};
	const savedProcessEnv = process.env; // Save callers environment
	for(const api in apis) {
		process.env = {...apis[api].environment, ...baseEnv}; // Environment for lambda
		lambdas[api] = { // Import lambda in its environment
			env: process.env,
			lambdaFunc: (require(apis[api].lambdaPath))[apis[api].lambdaHandler]
		}
	};
	process.env = savedProcessEnv; // Restore callers environment

	this.invoke = async function(route, event, context){
		try {
			if(lambdas[route]) {
				const savedProcessEnv = process.env; // Save callers environment
				process.env = lambdas[route].env;  // Environment for lambda
				const result = await lambdas[route].lambdaFunc(event, context); // Call lambda
				process.env = savedProcessEnv; // Restore callers environment
				return result;
			} else {
				throw {statusCode: 404, body: 'resource not found'};
			}
		} catch(e) {
			return {
				statusCode: e.statusCode ? e.statusCode : 500,
				body: e.body ? e.body : e.message
			};
		};
	}
}

module.exports = ApiGw;
