'use strict';

let dbLog;

class DatabaseError extends Error{
  constructor(message, data, response, database) {
    super(message);
    this.name = this.constructor.name;
    this.response = response;
    this.data = data;
    this.info = {
      database: database
    };
    dbLog.error(this);
  }
}

module.exports = (log)=>{
  dbLog = log;
  return DatabaseError;
};
