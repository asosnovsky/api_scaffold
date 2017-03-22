'use strict';
const fs = require('fs');
const path = require('path');
const _ = require('underscore');
const deepFreeze = require('deep-freeze');
const Q = require('q');

let readJSON = exports.readJSON = (fileName)=>{
  let json;
  try{
    json = JSON.parse(fs.readFileSync(fileName, 'utf8'));
  }catch(err){
    throw new Error("Could not open the file " + fileName)
  }

  return json;
};

exports.readConfig = (settings, mainFileName)=>{
  let configJSON = readJSON(settings.configPath);
  if(settings.configSecretPath){
    configJSON.secret = readJSON(settings.configSecretPath);
  }else{
    configJSON.secret = {};
  }
  if(!configJSON.server.apiLocation){
    configJSON.server.apiLocation = path.join(mainFileName,'api');
    configJSON.server.publicRoute = path.join(mainFileName,'public');
    exports.makeIfNotExists(configJSON.server.publicRoute);
    exports.makeIfNotExists(configJSON.server.apiLocation);
    exports.makeIfNotExists(path.join(configJSON.server.apiLocation,'routes'));
    exports.makeIfNotExists(path.join(configJSON.server.apiLocation,'services'));
  }
  if(!configJSON.secret.database){
    configJSON.secret.database = {};
  }
  if(!configJSON.secret.database.sequelize){
    configJSON.secret.database.sequelize = {};
  }
  if(!configJSON.secret.database.sequelize.models){
    configJSON.secret.database.sequelize.models = path.join(mainFileName,'models');
    exports.makeIfNotExists(configJSON.secret.database.sequelize.models);
  }
  global.apiConfig = deepFreeze(_.extend(configJSON,readJSON(settings.packagePath)));
  return apiConfig;
}

exports.makeIfNotExists = (folderName, checks=0, orginFolder=null)=>{
  let parentFolderName = path.join(folderName,'..');
  if(!fs.existsSync(parentFolderName) && checks < 5 ){
    exports.makeIfNotExists(parentFolderName, checks+1, orginFolder?orginFolder:folderName);
  } else if(checks >= 5) {
    throw new Error('Too many levels of creations for ' + orginFolder);
  }
  if (!fs.existsSync(folderName)) {
      fs.mkdirSync(folderName);
  }
}
