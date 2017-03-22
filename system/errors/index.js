'use strict';

module.exports = (loggers)=>({
  ApiError: require('./ApiError')(loggers.api),
  DatabaseError: require('./DatabaseError')(loggers.database)
});
