'use strict';

/*Requirements*/
const tools = require('./tools');
const express = require('express');
const storage = require('./storage');
const path = require('path');
const fs = require('fs');
const clc = require('cli-color');
const host = require('./host');
let errors;

/*Start Routers*/
const app = express();
const api = express.Router();

let loggers;
let apiConfig;

/* read main folderName*/
const mainFileName = path.dirname(require.main.filename);

class System {
  constructor(settings) {
    this.mainFileName = mainFileName;
    this.app = app;
    this.router = api;
    this.apiConfig = apiConfig = tools.util.readConfig(settings, mainFileName);
    loggers = this.loggers = {
      system: tools.log('system', apiConfig.log.level, (apiConfig.log.path && apiConfig.log.path.system) ? apiConfig.log.path.system : null),
      database: tools.log('database', apiConfig.log.level, (apiConfig.log.path && apiConfig.log.path.database) ? apiConfig.log.path.database : null, 'green'),
      api: tools.log(apiConfig.name, apiConfig.log.level, (apiConfig.log.path && apiConfig.log.path.api) ? apiConfig.log.path.api : null, 'blue')
    };
    this.routeStock = {
      get: {},
      post: {}
    };
    this.errors = errors = require('./errors')(loggers);
    this.init_script = tools.util.init_script;
    loggers.system.info('System Initilized');
  }
  get(reqUrlPath, cb) {
    loggers.system.info('Registering GET', reqUrlPath);
    api.get('/' + reqUrlPath, cb)
  }
  post(reqUrlPath, cb) {
    loggers.system.info('Registering POST', reqUrlPath);
    api.post('/' + reqUrlPath, cb)
  }
  import_service(serviceName){
    let system = this;
    let serviceRoute = path.join(apiConfig.server.apiLocation,'services',serviceName);
    if(fs.existsSync(serviceRoute) || fs.existsSync(serviceRoute+'.js')){
      return require(serviceRoute)({
        log: loggers.api,
        storage: system.storage,
        apiConfig: apiConfig,
        import_service: system.import_service,
        ApiError: errors.ApiError
      });
    }else{
      return require(serviceName);
    }
  }
  init(onDone) {
    var system = this;
    storage(apiConfig, loggers.database, errors.DatabaseError).then((storage) => {
      /*Save storage*/
      system.storage = storage;

      /*Request Methods*/
      loggers.system.info('Setting up Request Methods');
      host.setUpReqMethods(app, errors.ApiError);

      /*Body Parser*/
      loggers.system.info('Setting up body-parser');
      host.setUpBodyParser(app, apiConfig);

      /*Headers*/
      loggers.system.info('Setting up headers');
      host.setUpHeaders(app, apiConfig);

      /*Inbound Logger*/
      loggers.system.info('Setting up Inbound Logger');
      host.setUpLoggerForInboundCalls(app, loggers.api, storage);

      /*Options tweak*/
      loggers.system.info('Setting up All Options return 200');
      host.setUpAllOptionsReturn200(app);

      /*StaticPage*/
      loggers.system.info('Setting up static pages');
      host.setUpStaticPage(api, apiConfig, loggers.system);

      /*CrossDomain*/
      loggers.system.info('Setting up crossdomain.xml');
      host.setUpCrossDomain(api);

      /*Opening Version Route*/
      loggers.system.info('Opening Version Route');
      api.all('/version', (req, res) => res.response.success('v' + apiConfig.version));
      app.all('/version', (req, res) => res.response.success('v' + apiConfig.version));

      return host.readRoutes(path.join(apiConfig.server.apiLocation, 'routes'), system, loggers.system)
    }).

    then(() => {
      /*List Details*/
      loggers.system.info('Setting the api under', clc.bold('/v' + apiConfig.version + '/'));
      app.use('/', api);

      /*404*/
      loggers.system.info('Setting up 404');
      host.setUp404(app, loggers.api);

      /*Error Catchers*/
      loggers.system.info('Setting up Error Catchers');
      host.configureErrors(app, loggers.api, errors.ApiError);

      /*Show Routes*/
      loggers.system.debug(system.routeStock);

      /*Start HTTP*/
      let HOST = app.listen(apiConfig.secret.port, function() {
        loggers.system.info('HTTP: Server is on PORT', clc.bold(HOST.address().port));
      });

      /*Start HTTPS*/
      if (apiConfig.server.ssl) {
        let HTTPS = require('https').createServer(apiConfig.server.ssl, app).listen(apiConfig.server.ssl.port || 443, function() {
          loggers.system.info('HTTPS: Server is on PORT', clc.bold(apiConfig.server.ssl.port));
        });
      }

      if(onDone){
        onDone(system);
      }
    }).
    catch((error)=>{
      loggers.system.error(error);
    });
  }
}

module.exports = System;
