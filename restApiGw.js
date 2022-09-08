// License: Creative Commons Attribution-NonCommercial 4.0 International

'use strict';

// Based on https://steveholgado.com/aws-lambda-local-development/#creating-our-lambda-function

const express = require('express');
const bodyParser = require('body-parser');

function restApiGw(app, restApi) {
	app.use(bodyParser.json())
	app.use(bodyParser.urlencoded({ extended: true }))
	app.use(express.text());
	app.use(require('cors')());

	const apiGw = new (require('./ApiGw'))(restApi);

	app.use('/api/*', async (req, res) => {
		let route = req.baseUrl.replace(/^\/[^/]*\//, "/");
		const result = await apiGw.invoke(
			route,
			{headers: req.headers, body: req.body}	//event
		);

		// Respond to HTTP request
		res
			.status(result.statusCode ? result.statusCode : 500)
			.set(result?.headers)
			.end(result.body ? result.body  : result.message);
	})
}

module.exports = restApiGw
