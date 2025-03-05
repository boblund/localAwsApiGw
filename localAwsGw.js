#!/usr/bin/env node

// License: Creative Commons Attribution-NonCommercial 4.0 International

'use strict';

// Integrated local AWS s3 static web and rest/ws api server.
// Based on https://stackoverflow.com/a/34838031/6996491.

const express = require( 'express' );
const fs = require( 'fs' );
const os = require( 'os' );
const restApiGw = require( './restApiGw.js' );
const wsApiGw = require( './wsApiGw.js' );
const apiGwLambdas = require( './apiGwLambdas.js' );
const { existsSync } = require( 'fs' );
const hostName = os.hostname(); //'bobsm1.local';

const servers = require( './cmdLineParse.js' ); //process command line
if( Object.keys( servers ).length == 0 ) {
	process.exit( 1 );
}

const httpServer = process.env.HTTPS
	? require( 'https' ).createServer( {
		key: fs.readFileSync( `${ hostName }.key` ),
		cert: fs.readFileSync( `${ hostName }.cert` )
	} )
	: require( 'http' ).createServer();

const portRange = [ 10000, 60000 ];
function generatePort() { return ( Math.floor( Math.random() * ( portRange[1] - portRange[0] + 1 ) ) + portRange[0] ); }

function listen( server ) {
	return new Promise( ( res, rej ) => {
		const port = process.env.PORT ? process.env.PORT : generatePort();
		server.listen( port, function() { res( port ); } )
			.on( 'error', e => {
				rej( e );
			} );
	} );
}

let app = null;

( async () => {
	for( let server in servers ) {
		switch( server ) {
			case 'web':
				if( existsSync( servers.web.filesPath ) ) {
					app = app ? app : express(); //app if necessary
					app.use( express.static( servers.web.filesPath ) );
				} else {
					console.error( `${ process.argv[1].split( '/' ).pop() }: ${ servers.web.filesPath } does not exist` );
					process.exit( 1 );
				}
				break;

			case 'rest':
				app = app ? app : express(); //app if necessary
				const { restApi, nodeModuleLayertContentUri } = await apiGwLambdas( servers.rest );
				const nodeModuleLayertPath = nodeModuleLayertContentUri
					? `${ servers.rest.filesPath }/${ nodeModuleLayertContentUri }nodejs/node_modules`
					: undefined;
				if( restApi && Object.keys( restApi ).length > 0 ) {
					restApiGw( app, restApi, nodeModuleLayertPath );
				} else {
					console.error( `${ process.argv[1].split( '/' ).pop() }: no restApi` );
					process.exit( 1 );
				}
				break;

			case 'ws':
				if( !servers?.ws ) break;
				const { wsApi } = await apiGwLambdas( servers.ws );
				if( wsApi && Object.keys( wsApi.routes ).length > 0 ) {
					wsApiGw( httpServer, wsApi );
				} else {
					console.error( `${ process.argv[1].split( '/' ).pop() }: no wsApi` );
					process.exit( 1 );
				}
				break;
		}
	}

	if( app ) httpServer.on( 'request', app ); // Mount the app if it exists

	let port = null;
	while( true ) {
		try {
			if( port = await listen( httpServer ) )
				break;
		} catch( e ){
			if( e.code == 'EADDRINUSE' ) continue;
			console.error( `server error: ${ e.code }` );
			process.exit( 1 );
		}
	}
	process.stdout.write( `${ process.argv[1].split( '/' ).pop() } server listening on ${ port }\n` );
} )();
