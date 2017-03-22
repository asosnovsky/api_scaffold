const fs = require('fs');
const path = require('path');
const os = require('os');
const execSync = require('child_process').execSync;

var clearFolder = function(dirLoc) {
  if( fs.existsSync(dirLoc) ) {
    fs.readdirSync(dirLoc).forEach((fileName)=>{
      fs.unlinkSync(path.join(dirLoc,fileName));
    });
    fs.rmdirSync(dirLoc);
    fs.mkdirSync(dirLoc);
  } else {
    fs.mkdirSync(dirLoc);
  }
};

let systemSequelizePath = path.join(__dirname,'migrations');
let strategyPath = path.join(__dirname,'migrate','soft-sync.js');
let apiConfigPath = path.join('config.json');


let apiConfig = JSON.parse(fs.readFileSync(apiConfigPath,'utf8'));
let dbConfig = apiConfig.database.sequelize;

let signature = [os.userInfo().username,os.hostname(),os.platform(),'v'+os.release()].join('_').replace(/\W+/g,'_');

fs.writeFileSync(
  path.join(systemSequelizePath,'migrations',Date.now()+'_'+signature+'.js'),
  fs.readFileSync(
    strategyPath, 'utf8'
  )
)
fs.writeFileSync(
  path.join(systemSequelizePath,'config','config.json'),
  JSON.stringify({
    development: dbConfig
  }, null, 4)
);

console.log(execSync([
    'sequelize', 'db:migrate',
    '--config='+path.join(systemSequelizePath,'config','config.json'),
    '--migrations-path='+path.join(systemSequelizePath,'migrations')
].join(' ')).toString());
