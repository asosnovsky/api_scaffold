'use strict';
const express = require('express');
const path = require('path');
const crossdomain = require('crossdomain');
const bodyParser = require('body-parser');
const clc = require('cli-color');
const util = require('./util');
const _ = require('underscore');
const deepFreeze = require('deep-freeze');
const responses = require('./responses');

exports.setUpStaticPage = (app, apiConfig, log) => {
  if(apiConfig.show_static_page){
    let publicRoute = apiConfig.server.publicRoute;
    log.info('Hosting static files on', clc.green(publicRoute));
    app.use('/public',express.static(publicRoute));
  }
}

exports.setUpBodyParser = (app, apiConfig) => {
  let maxSize = (
    apiConfig.server['max-request-size']
  ) ? apiConfig.server['max-request-size'] : '10mb';
  app.use(bodyParser.urlencoded({
    limit: maxSize,
    extended: true
  }));
  app.use(bodyParser.json({
    limit: maxSize
  }));
};

exports.setUp404 = (app) => {
  app.all('/*', function(req, res) {
    res.response.pageNotFound({
        path: req.url
      },
      'page not found'
    )
  });
}

exports.setUpHeaders = (app, apiConfig) => {
  app.use(function(req, res, next) {
    let headers = apiConfig.server.headers;
    Object.keys(headers).forEach((headerName) => {
      res.header(headerName, headers[headerName]);
    });
    next();
  });
};

exports.setUpLoggerForInboundCalls = (app, log, storage) => {
  app.use(function(req, res, next) {
    let ID = Math.random()
      .toString(36)
      .substr(2, 6);
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    log.info('[' + ID + '|0]', ip, '>', req.method, req.path);
    req.cacheThis = ()=>storage.responseCache.save(
      req.method,
      req.path,
      req.query,
      req.body,
      req.headers
    );
    let oldEnd = res.end;
    res.end = function() {
      log.info('[' + ID + '|1]', ip, '>', req.method, req.path, '->', res.statusCode);
      oldEnd.apply(res, arguments);
    };
    next();
  });
};

exports.setUpAllOptionsReturn200 = (app) => {
  app.options('*',(req,res,next)=>{
  	res.header('Access-Control-Allow-Origin','*');
  	res.header('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');
  	res.sendStatus(200);
  });
}

exports.setUpReqMethods = (app, ApiError) => {
  app.use(function(req, res, next) {
    req.forceResponseType = false;
    req.shouldHave = (options) => util.shouldHave(req, res, options);
    res.standardSend = responses
      .standardSend(req, res);
    res.response = responses
      .type(req, res);
    res.next = next;
    res.errors = {};
    _.forEach(res.response,(response, name)=>{
      res.errors[name] = (message, data)=>new ApiError(message, data, response, req.url);
    });
    global.errors = deepFreeze(res.errors);
    next();
  });
}

exports.setUpCrossDomain = (api) => {
  api.all('crossdomain', function(req, res, next) {
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.status(200)
      .send(require('crossdomain')({
        domain: '*'
      }));
  });
}

exports.configureErrors = (app, log, ApiError) => {
  app.use(function(error, req, res, next) {
    if(error.response){
      var e;
      if(typeof error.response === 'string' && res.errors[error.response]){
        e = res.errors[error.response](error.message,{data: error.data, info: error.info});
      } else {
        e = error;
      }
      if( e instanceof ApiError ) {
        if(!req.forceResponseType && !(req.forceResponseType in res.response)){
          e.response(e.data,e.message);
        }else if(req.forceResponseType in res.response) {
          res.response[req.forceResponseType](e.data, e.message);
        }
      }else{
        log.error(error.stack);
        res.response.serverError({
          stack: error.stack ? error.stack.split('\n') : error.stack,
          url: req.url,
          note: 'This was caught with an invalid error call'
        },'Error: ' + (error.name || error.message));
      }
    }else if(error.name === 'SequelizeValidationError'){
      res.response.notAccepted(
        {
          errors: error.errors,
          body: req.body,
          query: req.query
        },
        'FKey_VIOLATION: ' + error.index
      );
    }else if(error.name === 'SequelizeForeignKeyConstraintError'){
      res.response.notAccepted(
        {
          parent_detail: error.parent.detail,
          original_detail: error.original.detail,
          table: error.table,
          index: error.index,
          detail: error.message
        },
        'FKey_VIOLATION: ' + error.index
      );
    }else if(error.name === 'SequelizeUniqueConstraintError'){
      res.response.notAccepted(
        {
          errors: error.errors
        },
        error.errors[0].message.replace(/(must be unique)/g,'already exists')
      );
    }else
    {
      log.error(error.stack);
      res.response.serverError({
        stack: error.stack ? error.stack.split('\n') : error.stack,
        url: req.url,
        body: req.body,
        query: req.query,
        errors: error.errors ? error.errors : []
      },'Error: ' + (error.name || error.message));
    }
  });
}

exports.readRoutes = (routesFolder, system, log) => {
  log.info('Reading routesFolder', clc.bold(routesFolder));
  return util.readAllJS(routesFolder, function(route, filename, directPath, done) {
    let routeType = route.split('-')[0].toLowerCase();
    let endPoint = route.split('-')
      .slice(1)
      .join('/');
    system.routeStock[routeType][endPoint] = directPath;
    if (['get', 'post'].indexOf(routeType) > -1) {
      system[routeType](endPoint, (req, res, next) => {
        try {
          system.loggers.api.info(routeType.toUpperCase(), endPoint);
          let resp = require(directPath)(req, res, {
            log: system.loggers.api,
            storage: system.storage,
            import_service: system.import_service
          });
          if(resp){
            resp.catch(next);
          }
        } catch (error) {
          next(error);
        };
      });
    } else {
      log.warn('Ignoring ...', filename);
    }
    done();
  });
}
