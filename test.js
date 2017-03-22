'use strict';

const System = require('./index').System;


// Setup system
let system = new System({
    configPath: './config.json',
    configSecretPath: './config.json',
    packagePath: './package.json'
});

system.init();
