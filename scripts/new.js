'use strict';
const fs = require('fs');
const path = require('path');
const clc = require('cli-color');

const mainFileName = path.dirname(require.main.filename);

//Paths
const templateFolder = path.join(__dirname, 'templates');
var getTemplatePath = (temp) => (path.join(templateFolder, temp));
const rootFolder = '';
const apiFolder = path.join(rootFolder, 'api');
const seqModelsFolder = path.join(rootFolder, 'models');
var getApiPath = (folder) => (path.join(apiFolder, folder));

//Read Input
const command = process.argv[2];
const name = process.argv[3];

//Read options
var options = {};
process.argv.slice(3).forEach(function(args) {
	var argsSplit = args.split('=');
	if (argsSplit.length === 2) {
		options[argsSplit[0]] = argsSplit[1];
	}
});

//Work-Dir
var templateDir = getTemplatePath(command);
var apiDir = getApiPath(command + 's');

//Run Command
switch (command) {
	case 'model':
		let officialName = name[0].toUpperCase() + name.substr(1).toLowerCase();
		let toRoute = path.join(seqModelsFolder, officialName);
		let db = options['db'] || 'database';

		console.log('Creating Model:', officialName, 'in database:', db);
		if (!fs.existsSync(toRoute)) {
			fs.mkdirSync(toRoute);
		} else {
			throw new Error('The model ' + officialName + ' already exists, cannot override an existing model');
		}
		fs.readdirSync(templateDir).forEach(function(filename) {
			let fullFileName = path.join(templateDir, filename);
			let file = fs.readFileSync(fullFileName, 'utf8').replace(/{{model}}/g, officialName).replace(/{{db}}/g, db);
			fs.writeFileSync(path.join(toRoute, filename), file);
		});
		break;
	case 'route':
		let type = options['type'] || 'get';
		if (['get', 'post'].indexOf(type) === -1) {
			throw new Error('Route must be a get or post');
		}
		console.log('Building', type.toUpperCase(), name);
		let fileName = type + '-' + name.toLowerCase().replace(/\//g, '-') + '.js';
		let fullFileName = path.join(apiDir, fileName);
		if (!fs.existsSync(fullFileName)) {
			fs.writeFileSync(fullFileName, fs.readFileSync(path.join(templateDir, type + '.js')));
		} else {
			throw new Error('The route ' + name + ' already exists, cannot override an existing route');
		}
		break;
	case 'service':
		let nicerName = name;
		console.log('Building service', nicerName);
		let serviceFileName = path.join(apiDir, nicerName + '.js');
		if (!fs.existsSync(serviceFileName)) {
			fs.writeFileSync(serviceFileName,
				fs.readFileSync(path.join(templateDir, 'index.js'), 'utf8')
			);
		} else {
			throw new Error('The service ' + name + ' already exists, cannot override an existing controller');
		}
		break;
	default:
		console.warn(clc.red('Invalid command `' + command + '`'));
}
console.log(clc.green('[[Finished!]]'), 'no errors')
