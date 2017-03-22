'use strict';

let apiLog;

class ApiError extends Error{
  constructor(message, data, response, route) {
    super(message);
    this.name = this.constructor.name;
    this.response = response;
    this.data = data;
    this.info = {
      route: route
    };
    apiLog.error(this);
  }
}

module.exports = (log)=>{
  apiLog = log;
  return ApiError;
};
