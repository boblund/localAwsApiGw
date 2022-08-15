# A Node JS Local AWS S3 Static Web and API Gateway Server

This repo was developed so I could locally test an app that consists of:
- A static web site served from S3
- An associated REST API served by the API Gateway
- A Node JS client that uses a websocket served by API Gateway V2

## Notable Features

- localAwsApiGw is an integrated Node JS static web, REST and WebSocket server that runs locally.
- All lambda integration files are referenced from their local development location so are the same as what eventually gets deployed in the AWS cloud.
- SAM/Cloudformation REST and WebSocket templates are read and parsed to create the routing information, event, context and the environment variables used by the lambda integrations and are therefore also the same as what eventually gets deployed in the AWS cloud.

## Installation

Clone github.com/boblund/localAwsApiGw

```
cd localAwsApiGw
npm install
```

The [lambda-local module](https://www.npmjs.com/package/lambda-local) ```clientContext``` option needs to support passing a function.
Open ```node_modules/lambda-local/build/lambdalocal.js``` in your favorite editor. Change:

```
function _executeSync(opts) {
  ...
  if (opts.clientContext) {
    try {
      clientContext = JSON.parse(opts.clientContext);
```

to

```
function _executeSync(opts) {
  ...
  if (opts.clientContext) {
    try {
      clientContext = opts.clientContext;
```

## Use

### Modify Websocket lambda functions

REST lambda integrations can be used as is with localAwsApiGw. Websocket lambda integrations need to be modified to detect when running locally to use a local version of
```AWS.ApiGatewayManagementApi.postToConnection().promise()```.

```
let postToConnection = process.env.IS_LAMBDA_LOCAL
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

```PORT=xxxx node localAwsGw.js --web=dir | --rest=dir [restT=template.yaml] | --ws=dir [wsT=template.yaml]```

```PORT``` is where the server will listen.

```dir``` is the absolute or relative path to the respective server files.

```restT``` and ```wsT``` default to ```template.yaml``` but can be ```anything.[yaml|json|yml]```.

Example:

```
PORT=3000 node localAwsGw.js --web=s3Files --rest=restApiFiles --ws=wsApiFiles --wsT=myTemplate.json
```

## Disclaimer

I use this for testing my project with two SAM templates for the REST API and Websocket API. I have no experience with how well ```apiGwLambdas.js``` will parse other templates to create the routes and environment so check the returned objects if things don't work.

## Acknowledgements

Much of the implementation is based on others' work with approriate links in the code.
