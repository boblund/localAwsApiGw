// License: Creative Commons Attribution-NonCommercial 4.0 International
// Based on https://steveholgado.com/aws-lambda-local-development/#creating-our-lambda-function


export { restApiGw };
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { ApiGw } from './ApiGw.mjs';

async function restApiGw( app, restApi, nodeModuleLayertPath, apiDir ) {
	app.use( bodyParser.urlencoded( { extended: true } ) );
	app.use( express.text() );
	app.use( cors() );

	const apiGw = await new ApiGw( restApi, nodeModuleLayertPath, apiDir )();

	app.post( '/api/webhook', express.raw( { type: 'application/json' } ), async ( req, res ) => {
		const result = await apiGw.invoke(
			'/webhook',
			req.method,
			{ headers: req.headers, body: req.body }	//event
		);

		// Respond to HTTP request
		res
			.status( result.statusCode ? result.statusCode : 500 )
			.set( result?.headers )
			.end( result.body ? result.body  : result.message );
	} );

	app.use( '/api/*', async ( req, res ) => {
		let route = req.baseUrl.replace( /^\/[^/]*\//, "/" );
		// invoke should consider reg.method
		const result = await apiGw.invoke(
			route,
			req.method,
			{ headers: req.headers, body: req.body }	//event
		);

		// Respond to HTTP request
		res
			.status( result.statusCode ? result.statusCode : 500 )
			.set( result?.headers )
			.end( result.body ? result.body  : result.message );
	} );
}
