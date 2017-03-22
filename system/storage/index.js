'use strict';

const $q = require('q');

module.exports = (config, log, DatabaseError)=>$q.all([
  require('./sequelize').init(config, log, DatabaseError),
  require('./responseCache').init(config, log, DatabaseError)
]).
then((databases)=>({
  sequelize: databases[0],
  responseCache: databases[1]
}));
