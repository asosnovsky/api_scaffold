'use strict';
const q = require('q');
const path = require('path');
const fs = require('fs');
const _ = require('underscore');
const inflection = require('inflection');

module.exports = {
  up: function (queryInterface, Sequelize) {
    let modelPath = path.join(__dirname, '..', '..','..','system','storage','sequelize', 'models');
    let dbTables = {};
    let localTables = {};
    return q.all([
      queryInterface.showAllTables().then(function(tableNames) {
        return q.all(
          tableNames.map((tableName)=>
            queryInterface.describeTable(tableName).
              then((table)=>{
                dbTables[tableName] = table;
              })
          )
        )
      }),
      fs.readdirSync(modelPath).map((modelName)=>{
        localTables[inflection.pluralize(modelName)] = require(path.join(modelPath,modelName)).schema(Sequelize)
      })
    ]).
    then((datas)=>{
      fs.writeFileSync('tmp/dbTables.json',JSON.stringify(dbTables,null,4))
      fs.writeFileSync('tmp/localTables.json',JSON.stringify(localTables,null,4))
      _.map(dbTables,(dbTable, tableName)=>{
        let localTable = localTables[tableName];
        if(localTable){
          _.forEach(localTable, (colDetails, colName)=>{
            if(!dbTable[colName]){
              console.log('Adding the collumn', colName, 'to', tableName);
              queryInterface.addColumn(
                tableName,
                colName,
                colDetails
              );
            }else{
              queryInterface.changeColumn(
                tableName,
                colName,
                colDetails
              );
            }
          })
        }
      })
    });
    ;
  }
};
