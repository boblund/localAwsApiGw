'use strict';

const localEnv = (()=>{
	try{ return require('./localGwEnv.js');
	}catch(e){ return {}; }
})();

function ApiGw(apis) {
	const lambdas = {};
	const savedProcessEnv = process.env; // Save callers environment
	for(const api in apis) {
		for(const apiEntry of apis[api]) {
			process.env = {...apiEntry.route.environment, ...localEnv}; // Environment for lambda
			for(const envVar in process.env) {
				// Override any template and default variables with any set in the process' envionemt
				process.env[envVar] = savedProcessEnv[envVar] ? savedProcessEnv[envVar] : process.env[envVar];
			}
			lambdas[api] = lambdas[api] ? lambdas[api] : [];
			lambdas[api].push({
				method: apiEntry.method,
				lambda: { // Import lambda in its environment
					env: process.env,
					lambdaFunc: (require(apiEntry.route.lambdaPath))[apiEntry.route.lambdaHandler]
				}
			});
		};
	};
	process.env = savedProcessEnv; // Restore callers environment

	this.invoke = async function(route, method, event, context){
		try {
			let lambda = lambdas[route].reduce((a,e) => { if(e.method == method) { return e.lambda; } }, {});
			if(lambda) {
				const savedProcessEnv = process.env; // Save callers environment
				process.env = lambda.env;  // Environment for lambda
				const result = await lambda.lambdaFunc(event, context); // Call lambda
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
	};
}

module.exports = ApiGw;
