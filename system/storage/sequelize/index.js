'use strict';
const Sequelize = require('sequelize');
const dataTypes = require('sequelize');
const fs = require('fs');
const clc = require('cli-color');
const path = require('path');
const Q = require('q');

let connections = {};
let models = {};
let DatabaseError;

var connectTo = (connDetail, log) => {
  let logging = false;
  if(connDetail.logging) {
    logging = function(msg){
      log.debug(arguments)
    }
  }
  return connections[connDetail.database] = {
    models: {},
    sync: function() {
			var db = this;
			Object.keys(db.models).forEach(function(modelName) {
				if ("associate" in db.models[modelName]) {
          log.info('Reading {{associate}} of ' + clc.yellow(modelName));
					db.models[modelName].associate(db.models[modelName], db.models);
				}
			});
			return db.connection.sync();
		},
    connection: new Sequelize(
      connDetail.database,
      connDetail.username,
      connDetail.password,
      {
        dialect: connDetail.dialect,
        port: connDetail.port,
        host: connDetail.host,
        logging: logging
      }
    )
  };
}

var addModel = (modelDef) => {
  // I use to handle multiple connections in this service,
  // But that is no longer needed. So below is a quick fix for that.
  // I am keeping it here, in case we do want to connect multiple databases in the future
	if (!(modelDef.db in connections)) {
		// throw new DatabaseError('A model is trying to access a non-existing database : ' + modelDef.db);
		modelDef.db = Object.keys(connections)[0];
	}
  if(modelDef.name in models){
    throw new DatabaseError('A model with the name `'+modelDef.name+'` was already declared!')
  }
	var db = connections[modelDef.db];
	if (typeof modelDef.schema !== 'function') {
		throw new DatabaseError('A model was defined without a valid schema.');
	}
	let schema = modelDef.schema(dataTypes);
	let options = modelDef.options;
  if(!options.dontAppendId){
    schema.id = {
      type: dataTypes.INTEGER,
      unique: true,
      autoIncrement: true,
      primaryKey: true
    };
  }
	if (options.timestamps === undefined) options.timestamps = true;
	if (options.underscored === undefined) options.underscored = true;
	options.classMethods.associate = modelDef.associate;
	let m = db.connection.define(modelDef.name, schema, options);
  m.afterFind(function(inst, detail){
    if(!inst && !detail.transaction){
      throw new DatabaseError('NOT_FOUND: ' + detail.tableNames.join('+'), detail.tableNames, 'notFound', modelDef.db);
    }
  });
	return db.models[modelDef.name] = models[modelDef.name] = m;
};

var readAllModels = (log, apiConfig)=>{
  let modelDirectory = apiConfig.secret.database.sequelize.models;
	fs.readdirSync(modelDirectory).forEach((modelFileName) => {
    console.log(path.join(modelDirectory, modelFileName))
		let modelDef = require(path.join(modelDirectory, modelFileName))
		addModel(modelDef);
		log.info('Added the model:', clc.yellow(modelFileName));
	});
	return Q.all(Object.keys(connections).map((dbName) => Q.Promise((resolve,reject) => {
		return connections[dbName].sync().then(function() {
			log.info('Successfully', clc.bold('synced'), dbName);
      resolve(connections[dbName]);
		}, function(err) {
      reject(new DatabaseError(err));
		});
	}))).then(()=>models);
};

exports.init = (apiConfig, log, error)=>{
  DatabaseError = error;
  log.info('Reading connections...');
  connectTo(apiConfig.secret.database.sequelize, log);

  return readAllModels(log, apiConfig);
}
