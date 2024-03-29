# A Node JS Local AWS S3 Static Web and API Gateway Server

This repo was developed so I could locally test an app that consists of:
- A static web site served from S3
- An associated REST API served by the API Gateway
- A Node JS client that uses a websocket served by API Gateway V2

## Notable Features

- localAwsApiGw is an integrated Node JS server that runs locally and emulates the AWS interface for S3 static web and REST and WebSocket API Gateways.
- Static web and lambda integration files are loaded from their local development location so are the same as what eventually gets deployed in the AWS cloud.
- SAM/Cloudformation REST and WebSocket templates are read and parsed to create the routing information and environment variables used by the lambda integrations and are therefore also the same as what eventually gets deployed in the AWS cloud.
- The developer can specify default AWS environment variables.
- localAwsApiGw generates the appropriate lambda integration event and context arugments.
- The environment variable ```LOCAL_AWS_GW``` is set to ```true``` so that lambda integrations can detect when running locally, if required (see example below).

## Installation

```
git clone git@github.com:boblund/localAwsApiGw.git
cd localAwsApiGw
npm install
```

Use of HTTPS requires configuring the appropriate key and self-signed certificate in the directory where ```localAwsGw``` is running. The following ```openssl``` command can be used:

```
openssl req -x509 -newkey rsa:4096 -keyout <hostname>.key -out <hostname>.cert -sha256 -days <cert expirary> -nodes
```

Where <hostname> is hostname where ```localAwsGw``` is running. For example

```
openssl req -x509 -newkey rsa:4096 -keyout pi.local.key -out pi.local.cert -sha256 -days 3650 -nodes
```

Creates ```pi.local.key``` and ```pi.local.cert``` files containing the key and certificate for ```pi.local``` that expire in 3650 days.

## Use

### Set up default lambda environment

A lambda's execution environment consists of: process.env and the event and context parameters. These are defined, in part, by the SAM/Cloudformation template. Other values may be required and can be added:
- process.env: The lambda's process.env is set in the following order:
	- The lambda's template environment variables.
	- The contents of localGwEnv.js.
	- Local process environment variables that are present in either of the two above.
- event and context: Modify ```event``` and ```context``` ```apiGw.invoke``` arguments in restApiGw.js or wsApiGw.js as required.

The files ```aws-rest-event-env.json``` and ```aws-ws-event-context.json``` show the AWS default values for process.env, event and context.

### Modify Websocket lambda functions if necessary

Websocket lambda integrations need to be modified to detect when running locally to use local versions of
```AWS.ApiGatewayManagementApi.postToConnection().promise()``` and ```AWS.ApiGatewayManagementApi.getConnection().promise()```.

For example:
```
const postToConnection = context.clientContext
  ? (o) => { return context.clientContext.postToConnection(o)} //localApiGw
  : (o) => { return apigwApi.postToConnection(o).promise() } //AWS
```

then

```
// send message on a websocket
await postToConnection({
  ConnectionId: your.connectionId,
  Data: yourStringData
})
```

### Running the server

```SOME_VAR=xxx PORT=yyy node localAwsGw.js --web=dir | --rest=dir [restT=template.yaml] | --ws=dir [wsT=template.yaml]```

```SOME_VAR``` is a lambda environment variable to override

```PORT``` is where the server will listen.

```dir``` is the absolute or relative path to the server files:
- ```--web``` static web pages
- ```--api``` REST api files
- ```--ws``` websocket api files

```restT``` and ```wsT``` default to ```template.yaml``` but can be ```anything.[yaml|json|yml]```.

Example:

```
PORT=3000 node localAwsGw.js --web=webPageFiles --rest=restApiFiles --ws=wsApiFiles --wsT=myTemplate.json
```

## Disclaimer

I use this for testing my project with two SAM templates for the REST API and Websocket API. I have no experience with how well ```apiGwLambdas.js``` will parse other templates to create the routes and environment so check the returned objects if things don't work.

## Acknowledgements

Parts of the implementation are based on others' work with approriate links in the code.

## License <a name="license"></a>

Creative Commons Attribution-NonCommercial 4.0 International
