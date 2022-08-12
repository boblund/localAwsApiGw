'use strict';

// Based on https://steveholgado.com/aws-lambda-local-development/#creating-our-lambda-function

const express = require('express');
const bodyParser = require('body-parser');
const lambdaLocal = require('lambda-local');
process.env.IS_LAMBDA_LOCAL = true;

function restApiGw(app, restApi) {
	app.use(bodyParser.json())
	app.use(bodyParser.urlencoded({ extended: true }))
	app.use(express.text());
	//const cors = require('cors');
	app.use(require('cors')());

	app.use('*', async (req, res) => {
		let options = restApi[req.baseUrl];
		if(!options) {
			//console.log(`no options`);
			res
			.status(200)
			.end()
		} else {
			//console.log(`${req.baseUrl}`);
			const result = await lambdaLocal.execute({
				...options, //appOptns[req.baseUrl],
				timeoutMs: 1000*60,
				verboseLevel: 0,
				event: {
					headers: req.headers, // Pass on request headers
					body: req.body // Pass on request body
				}
			});

			// Respond to HTTP request
			//console.log(`res: ${result.body}`);
			res
				.status(result?.statusCode)
				.set(result?.headers)
				.end(result?.body);
		}
	})
}

module.exports = restApiGw
