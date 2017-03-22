'use strict';
const bunyan  = require('bunyan');
const path    = require('path');
const moment  = require('moment');
const clc     = require('cli-color');
const util     = require('./util');

module.exports = function(name, level, location=null, nameColor='white') {
  let streams = [];
  streams.push({
    level: level,
    stream: new PrettyStream(nameColor)
  });
  if (location) {
    util.makeIfNotExists(location);
    streams.push({
      path: path.join(location, 'log_' + moment.now()+'.log')
    });
  }

  var log = bunyan.createLogger({
    name: name,
    streams: streams
  });

  log.raw = function() {
    console.log.apply(null, arguments);
  };

  return log;
}

class PrettyStream {
  constructor(nameColor) {
    this.nameColor = nameColor;
  }
  write(str) {
    let nameColor = this.nameColor;
    let msg = JSON.parse(str);
    let level = bunyan.nameFromLevel[msg.level];
    let message = msg.err?(msg.err.stack?msg.err.stack:JSON.stringify(msg.err,null,4)):msg.msg;
    switch (msg.level) {
      case 20:
      message = {};
      Object.keys(msg).filter((x) => ['name', 'hostname', 'pid', 'level', 'msg', 'time', 'v'].indexOf(x) === -1).forEach(function(key) {
        message[key] = msg[key];
      });
      message = clc.yellowBright.bgBlackBright(JSON.stringify(message, null, 2));
      break;
      case 30:
      level = clc.cyan(level);
      message = clc.underline(clc.cyan(message));
      break;
      case 40:
      level = clc.yellow(level);
      message = clc.yellow(message);
      break;
      case 50:
      level = clc.red(level);
      message = '\n' + clc.red(message);
      break;
      case 60:
      level = clc.bgYellow(clc.red(level));
      message = clc.bgYellow(clc.red(message));
      break;
    }
    console.log('[' + [(String(msg.pid)), clc.bold.underline[nameColor](msg.name), level, clc.bold(moment(msg.time).format('YYYY-MM-DD HH:mm:ss'))].join('|') + '] >', message)
  }
}
