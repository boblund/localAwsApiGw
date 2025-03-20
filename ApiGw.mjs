export { ApiGw };

//import appModulePath from 'app-module-path';
import fs from 'fs';

function getHandler( name ){
	return fs.existsSync( `./${ name }.mjs` ) ? `./${ name }.mjs` : `./${ name }.js`;
}

const localEnv = await ( async () => {
	try{
		const { env } = await import( './localGwEnv.mjs' );
		return env;
	}catch( e ){ return {}; }
} )();

function ApiGw( apis, layersModulePath, apiDir ) {
	return async () => {
		if( layersModulePath ) fs.symlinkSync( layersModulePath, `${ apiDir }/node_modules` ); //appModulePath.addPath( layersModulePath );
		const lambdas = {};
		const savedProcessEnv = process.env; // Save callers environment
		for( const api in apis ) {
			for( const apiEntry of apis[ api ] ) {
				process.env = { ...apiEntry.route.environment, ...localEnv }; // Environment for lambda
				for( const envVar in process.env ) {
					// Override any template and default variables with any set in the process' envionemt
					process.env[envVar] = savedProcessEnv[envVar] ? savedProcessEnv[envVar] : process.env[envVar];
				}
				lambdas[api] = lambdas[api] ? lambdas[api] : [];
				lambdas[api].push( {
					method: apiEntry.method,
					lambda: { // Import lambda in its environment
						env: process.env,
						lambdaFunc: ( await import( getHandler( apiEntry.route.lambdaPath ) ) )[apiEntry.route.lambdaHandler]
					}
				} );
			};
		};
		if( layersModulePath ) fs.rmSync( `${ apiDir }/node_modules` );//appModulePath.removePath( layersModulePath );
		process.env = savedProcessEnv; // Restore callers environment

		this.invoke = async function( route, method, event, context ){
			try {
				let lambda = lambdas[route].reduce( ( a, e ) => { if( e.method == method ) { return e.lambda; } }, {} );
				if( lambda ) {
					const savedProcessEnv = process.env; // Save callers environment
					process.env = lambda.env;  // Environment for lambda
					const result = await lambda.lambdaFunc( event, context ); // Call lambda
					process.env = savedProcessEnv; // Restore callers environment
					return result;
				} else {
					throw { statusCode: 404, body: 'resource not found' };
				}
			} catch( e ) {
				return {
					statusCode: e.statusCode ? e.statusCode : 500,
					body: e.body ? e.body : e.message
				};
			};
		};

		return this;
	};
}
