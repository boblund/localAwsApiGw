// License: Creative Commons Attribution-NonCommercial 4.0 International

'use strict';

// Based on https://steveholgado.com/aws-lambda-local-development/#creating-our-lambda-function

const express = require('express');
const bodyParser = require('body-parser');
const lambdaLocal = require('lambda-local');
process.env.IS_LAMBDA_LOCAL = true; // Guarenteed way for lambda to detect running locally

function restApiGw(app, restApi) {
	app.use(bodyParser.json())
	app.use(bodyParser.urlencoded({ extended: true }))
	app.use(express.text());
	app.use(require('cors')());

	app.use('*', async (req, res) => {
		let options = restApi[req.baseUrl];
		if(!options) {
			res
			.status(404)
			.end()
		} else {
			//console.log(`${req.baseUrl}`);
			const result = await lambdaLocal.execute({
				...options,
				timeoutMs: 1000*60,
				verboseLevel: 0,
				event: {
					headers: req.headers, // Pass on request headers
					body: req.body // Pass on request body
				}
			});

			// Respond to HTTP request
			res
				.status(result?.statusCode)
				.set(result?.headers)
				.end(result?.body);
		}
	})
}

module.exports = restApiGw
