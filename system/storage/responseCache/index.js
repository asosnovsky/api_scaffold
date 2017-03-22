'use strict';
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const Q = require('q');

let cacheFolderName = 'cache';
let log;
let DatabaseError;

let connectTo = (fileName)=>Q.Promise((resolve,reject)=>{
  fs.open(fileName, 'a', (err, fd) => {
    if (err) {
      reject( new DatabaseError(err) );
    }else{
      resolve({
        save: (method, url, query, body, headers)=>{
          fs.write(fd,JSON.stringify({
            method: method,
            url: url,
            query: query,
            body: body,
            headers: headers,
            date_saved: Date.now()
          })+'\n');
        }
      })
    }
  });
});


exports.init = (config, logger, error)=>{
  DatabaseError = error;
  log = logger;
  log.info('Setting up response cache handle');
  if (!fs.existsSync(cacheFolderName)){
    fs.mkdirSync(cacheFolderName);
  }

  return connectTo(path.join(cacheFolderName,moment().format('YYYY_MM_DD')+'.log'))
}
