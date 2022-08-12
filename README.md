# A Node JS Local AWS S3 Static Web and API Gateway Server

This repo was developed so I could locally test an app that consists of:
- A static web site served from S3
- An associated web API served by the API Gateway
- A Node JS client that uses a websocket served by API Gateway V2

## Notable Features

- localAwsApiGw is an integrated Node JS static web, REST and WebSocket server that runs locally.
- All app specific files are referenced from their local development location so are always in sync with what eventually gets deployed in the AWS cloud.
- SAM/Cloudformation REST and WebSocket templates are read and parsed to create the routing information used by localAwsApiGw and are therefore also always
in sync with what eventually gets deployed in the AWS cloud

## Usage

```node localAwsGw.js --web=dir | --api=dir [apiT=template.yaml] | --ws=dir [wsT=template.yaml]```

```dir``` is is the absolute or relative path to the respective server files.

```apiT``` and ```apiT``` default to ```template.yaml``` but can be ```anything.[yaml|json|yml]```

## Disclaimer

This has been tested but not extensively; your mileage may vary.

## Feedback welcome

I am interested in ideas about how to improve this but can't commit to if or when anything will be done.

## Acknowledgements

Much of the implementation is based on others' work with approriate links in the code.
