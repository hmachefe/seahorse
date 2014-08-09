/*! seahorse - v0.0.7 - 2014-08-09 */
(function(global){
  'use strict';

  var fs         = require('fs');
  var Throttle   = require('throttle');
  var util       = require('util');

  var utils = {
    _debug : false,

    _getExtension: function(filename) {
      var i = filename.lastIndexOf('.');
      return (i < 0) ? '' : filename.substr(i);
    },

    _sendfile: function(filename, res, rate) {      
      var stream = fs.createReadStream(filename);
      var th = new Throttle(rate);

      stream.on('open', function() {
        if( utils._debug ) {
          util.log('open ' + filename);
        }
        // automaticaly pipes readable stream to res (= writeableStream), data are then transfered
        // with a limited rate through the throttle
        stream.pipe(th).pipe(res);
      });

      stream.on('data', function(chunk) {
        if( utils._debug ) {
          util.log('read a chunk  :' + chunk.length + ' bytes');
        }
      });

      stream.on('close', function(chunk) {
        if( utils._debug ) {
          util.log('closed ' + filename);
        }
      });

      stream.on('error', function(err) {
        console.log('error from reading stream ' + err.toString());
        res.end(err);
      });
    },

    _allowCrossDomain: function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
      // intercept OPTIONS method
      if ('OPTIONS' == req.method) {
        res.send(200);
      }
      else {
        next();
      }
    }
  };

  global.utils = utils;

})(this);

(function(global, utils){
  'use strict';
  var util      = require('util');

  var routes = {
  	config: [],

    checkConfig: function(config) {
      try
      {
        var json = JSON.stringify(config);
        if( false === (config instanceof Array) ) {
          throw "object is not an array";
        }
        config.forEach(function(element, index, array) {
          if( (typeof element.httpRequest === 'undefined') || (typeof element.httpResponse === 'undefined')){
            throw "["+index+"] httpResponse or httpRequest missing";
          }
          if ((typeof element.httpRequest.method === 'undefined') || (typeof element.httpRequest.path === 'undefined')) {
            throw "["+index+"] method or path is missing in httpRequest key";
          }
          if (typeof element.httpResponse.statusCode === 'undefined') {
            throw "["+index+"] statusCode is missing in httpResponse key";
          }
          if ( (element.httpRequest.method.toUpperCase() === 'GET' ) && 
               (typeof element.httpResponse.body === 'undefined')    && 
               (typeof element.httpResponse.file === 'undefined')    && 
               (typeof element.httpResponse.static === 'undefined') ) {
            throw "["+index+"] body, file or static are missing in httpResponse key";
          }          
        });
      }
      catch(e)
      {
        util.log("error: input file is not a valid json config file, " + e);
        return false;
      }
      return true;
    },

    setConfig: function(config, app) {
      if(this.checkConfig(config)) {
        this.config = config;
        return true;
      }
      return false;
    },

    updateConfig: function(config, app) {
      var that = this;
      if(this.checkConfig(config)) {
        config.forEach(function(element1, index1, array) {
          var match = that.config.every(function(element2, index2, array){
            if( ( element2.httpRequest.path   === element1.httpRequest.path   ) && 
                ( element2.httpRequest.method === element1.httpRequest.method ) && 
                ( element2.httpRequest.query  === element1.httpRequest.query  ) ) {
              // update the current config element with these new properties
              // todo: check this method is correct (element2 will keep a reference to element1)
              element2.httpResponse = element1.httpResponse;
              return false;
            }
            else {
              return true;
            }

          });
          if( match === true ) {
            // add this element to the current config
            that.config.push(element1);
          }
        });
        return true;
      }
      return false;
    },

    getConfig: function() {
  	  return this.config;
    },

    _matchPath: function(element, req) {

      if (  element.httpRequest.method.toUpperCase() !== req.method.toUpperCase() )
        return false;

      if (/^regexp:/.test(element.httpRequest.path)) {
        var r = new RegExp(element.httpRequest.path.split(":")[1]);
        if( r.test(req.params[0]) !== true )
          return false;
      }
      else {
        if( element.httpRequest.path  !== req.params[0] )
          return false;
      }

    	return true;
    },

    all: function(req, res) {
      var matchingResponse = {};
      var that = this;
      // is there at least one element in confg that match with request ?
      var match = this.config.some(function(element, index, array) {

        if( that._matchPath(element, req) ) {

          if( typeof element.httpRequest.query !== 'undefined' ) {
            // do all query parameters match with config ?
            for (var queryKey in element.httpRequest.query ) {
              if( typeof req.query[queryKey] === 'undefined' ||
                element.httpRequest.query[queryKey].toString() !== req.query[queryKey].toString() ) {
                 return false;
              }
            }
            matchingResponse = element;
            return true;
          }
          matchingResponse = element;
          return true;
        }
        return false;
      });

      if( match ) {
        setTimeout(function() {
          // get headers
          if( typeof matchingResponse.httpResponse.headers !== 'undefined' ) {
            matchingResponse.httpResponse.headers.forEach(function(element, index, array) {
              res.setHeader(element.name, element.values);
            });
          }
          // set status code
          if( typeof matchingResponse.httpResponse.statusCode !== 'undefined' ) {
            res.status(matchingResponse.httpResponse.statusCode);
          }
          else {
            res.status(200);
          }

          if( typeof matchingResponse.httpResponse.body !== 'undefined') {
            res.send(matchingResponse.httpResponse.body);
          }
          else {
            var filename,
                rate = matchingResponse.httpResponse.bandwidth;

            if( typeof matchingResponse.httpResponse.file !== 'undefined') {
              filename = matchingResponse.httpResponse.file;
            }
            else if( typeof matchingResponse.httpResponse.static !== 'undefined') {
              filename = matchingResponse.httpResponse.static+req.originalUrl;
            }

            if( typeof filename !== 'undefined') {
              if( typeof rate !== 'undefined'){
                utils._sendfile(filename, res, rate);
              }
              else {
                res.sendfile(filename);
              }
            }
            else {
              res.send("");
            }
          }
        }, (typeof matchingResponse.httpResponse.delay === 'undefined')?1:matchingResponse.httpResponse.delay);
      }
      else {
        res.send("Not found", 404);
      }
    }
  };

  global.routes  = routes;
})(this, this.utils);

(function(global, utils, routes){
  'use strict';

  var express = require('express');
  var util    = require('util');
  var app     = express();

  var server = {
    _server: null,

    start: function(config, port) {
      app.use(utils._allowCrossDomain);
      app.use(express.json());       // to support JSON-encoded bodies
      app.use(express.urlencoded()); // to support URL-encoded bodies
      util.log("start seahorse server on port " + port);
  
      // permanent route for current configuration reading
      app.get("/_config", function(req, res) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.send(JSON.stringify(routes.getConfig()), 200);
      });
  
      // route for setting a new configuration (erase the previous one)
      app.post("/_config", function(req, res) {
        var newConfig = req.body;
        routes.setConfig(newConfig, app);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.send(JSON.stringify(routes.getConfig()), 200);
      });
  
      // route for updating the current configuration (update the previous one with the new keys)
      app.put("/_config", function(req, res) {
        var newConfig = req.body;
        routes.updateConfig(newConfig, app);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.send(JSON.stringify(routes.getConfig()), 200);
      });
  
      // set initial config
      if( typeof config !== 'undefined') {
        routes.setConfig(config, app);
      }
      else {
        throw "initial config is undefined";
      }
  
      // mock routes
      app.all("*", function(req, res) {
        if( utils._debug ) {
          util.log('request ' + req.method + ' ' + req.originalUrl);
        }
        routes.all(req, res);
      });
  
      // start listening
      this._server = app.listen(port);
    },

    // never used ... todo: add SIGINT listener to properly close the server
    stop: function() {
      if( this._server !== null ) {
        util.log("stop seahorse server");
        this._server.close();      
      }
    }
  };

  global.server = server;
})(this, this.utils, this.routes);
