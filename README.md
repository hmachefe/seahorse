seahorse
========

Seahorse is a configurable mock REST API. I may be used for testing and it is written in javascript.

Last version is 0.0.5.

Install it
==========

```
% npm install seahorse
````

Use it
======

As a npm package
----------------

Start a mock REST API server with no configuration (no route defined) that listen on port 3000 by default.

```
% seahorse
```

Start a mock REST API server with a configuration file (config.json) that listen on port 4000.

```
% seahorse config.json -p 4000
```

Display help.

```
% seahorse config.json -h
Usage: seahorse <source> [options]

Options:
  --help    -h          display this text
  --version -v          output version
  --logs    -l          activate logs
  --port    -p <port>   set port

Examples:
  seahorse config.json
  seahorse --port 1234
```

As a javascript library
-----------------------

```
var server   = require('../vendor/seahorse.min').server;

var config = [
  {
    "httpRequest" : {
        "method" : "get",
        "path" : "/foo"
    },
    "httpResponse" : {
        "statusCode" : 200,
        "body" : "{\"key\": \"value\"}",
        "headers" : [ {
            "name": "Access-Control-Allow-Headers",
            "values": ["Content-Type, Authorization"]
        },
        {
            "name": "Content-Type",
            "values": ["application/json; charset=utf-8"]
        } ],
        "delay": 1
    }
  }
];

server.start(config, 3000);
```

See [example/example.js](example/example.js) for a  very simple use of the lib.

Configuration file format
=========================

The configuration file contains an array of route objects.
Every route object is built with two keys: httpRequest witch make seahorse check if a request matches with this route, and httpResponse that gives seahorse the appropriate response to send in case the request matches the route.

Read the [configuration file schema](SCHEMA.md) to check the JSON syntax.

httpRequest key
---------------

The httpRequest key has a value that is an object that shall contains two keys: method (get, post, put or delete) and path.
The path key may be either a simple string ("path": "/foo/api.json") or a regexp. 
To use regexp as route path, you shall prefix the regexp with a string "regexp:" ("path" : "regexp:^\/foo\/.*\.json$")
The previous example will match <code>/foo/bar.json</code> and <code>/foo/bar/bas.json</code> but will not match <code>/foo.json</code> neither <code>foo/bar.jsonx</code>

In addition, query parameters may be specified. The query key is an object in witch each key is a parameter with its value.

For example, the following httpRequest object : 

```
httpRequest: {
  method: "get",
  path: "/foo",
  query: {
    "name": "john"
  }
}
```

Will math <code>GET /foo?name=john</code>, but will not match <code>GET /foo</code>, <code>GET /foo?name=jack</code>, <code>GET /bar?name=john</code> or <code>POST /foo?name=john</code>

httpResponse key
----------------

The httpResponse is an object that specify, if the request matches the httpRequest object:
* the status code to be sent in the response, 
* the body or file to be sent in the payload, 
* optionnaly, the headers to be added to the response, 
* and, optionnaly, a delay that will simulate server latency.

Example
-------

See [example/config.json](example/config.json) :
 
```
[{
  "httpRequest" : {
      "method" : "get",
      "path" : "/help",
      "query" : {
        "id": 1,
        "format": "json"
      }
  },
  "httpResponse" : {
      "statusCode" : 200,
      "file":"/Users/jean-thierrybonhomme/Developments/seahorse/lib/help.txt",
      "headers" : [ {
          "name": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
      },
      {
          "name": "Content-Type",
          "value": "text/plain"
      } ],
      "delay": 2000
  }
}]
```

Buildin API
===========

Seahorse uses a specific route for its internal needs (<code>_config</code>)
Obviously, you can not use this path for your own needs.

Once you started seahorse (given you started it on localhost:3000), you can call /_config:

## get /_config

Return the current configuration

```
% curl "http://localhost:3000/_config"
[{"httpRequest":{"method":"delete","path":"/help"},"httpResponse":{"statusCode":200,"body":"{\"key\": \"value\"}","headers":[{"name":"Access-Control-Allow-Headers","value":"Content-Type, Authorization"},{"name":"Content-Type","value":"application/json; charset=utf-8"}],"delay":1}}]
```

## post /_config

Set a new configuration

```
% curl -X POST --data '[{"httpResquest":...}]' "http://localhost:3000/_config"
```

## put /_config

Update the configuration. If new routes are specified, they will be added, else, current routes will be updated.

```
% curl -X POST --data '[{"httpResquest":...}]' "http://localhost:3000/_config"
```

Test
====

Launch tests with :

```
% grunt test
```

Thanks
======

This project uses these third packages:

* [express](http://expressjs.com/)
* [hippie](https://github.com/vesln/hippie)
* [grunt-mocha-test](https://github.com/pghalliday/grunt-mocha-test)
* [should](https://github.com/visionmedia/should.js)
* [grunt-nodemon](https://github.com/ChrisWren/grunt-nodemon)
* [minimist](https://github.com/substack/minimist)
* [node-throttle](https://github.com/TooTallNate/node-throttle)

[![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/)

Todo
====

* Handle cookies

Licence
=======

This software is provided under [MIT licence](LICENCE.md).