'use strict';
const $q = require('q');
const fs = require('fs');
const _ = require('underscore');
const path = require('path');

var initilizeObj = (obj, defaultTo={}) => {
	if(!obj){
		return defaultTo;
	}else{
		return obj;
	}
}


exports.readAllJS = function(routesFolder, cb) {
	return $q.all(fs.readdirSync(routesFolder).map(function(filename) {
		var defer = $q.defer();
		let directPath = path.join(routesFolder, filename);
		if (filename.substr(filename.length - 3) === '.js') {
			let filename_short = filename.substr(0, filename.length - 3);
			cb(filename_short, filename, directPath, function() {
				defer.resolve();
			});
		}
		return defer.promise;
	}));
}

exports.processVal = function(body, definitions) {
	let proceesed = {};
	let missing = [];
	let badTypes = [];
	let found = [];
	_.map(definitions, (definition, name) => {
		var setVal = (val, isDefault=false) => {
			if(typeof val === definition.type){
					return val;
			} else if( ['false','true','t','f','1','0'].indexOf(val) > -1 &&  definition.type === 'boolean'){
				return val === 'true' || val === 't' || val === '1'
			} else if( (val === null || !( val && ( val!==0 || val!==false )))&&(definition.allowNull) ) {
					return null;
			} else if(definition.type === 'number'){
				if(isNaN(val)){
					badTypes.push({variable_name: name, val: Number(val), unparsed_val: val, shouldBe: definition.type, is: 'NaN', isDefault: isDefault});
				}
				return Number(val);
			} else {
				badTypes.push({val: val, shouldBe: definition.type, is: typeof val, isDefault: isDefault});
				return val;
			}
		}

		if(body[name]){
			found.push(name);
			proceesed[name] = setVal(body[name]);
		} else if(definition.default || definition.allowNull){
			proceesed[name] = setVal(definition.default, true);
		} else {
			missing.push(name);
		}

	});
	return {
		proceesed,
		missing,
		badTypes,
		found,
		failed: badTypes.length>0 || missing.length>0
	}
}

exports.shouldHave = function(req, res, options) {
	options.body = initilizeObj(options.body);
	options.query = initilizeObj(options.query);
	options.headers = initilizeObj(options.headers);

	let body = exports.processVal(req.body, options.body);
	let query = exports.processVal(req.query, options.query);
	let headers = exports.processVal(req.headers, options.headers);

	return $q.Promise((resolve, reject) => {
		if(!body.failed && !query.failed && !headers.failed){
			req.body = body.proceesed;
			req.query = query.proceesed;
			req.headers = _.extend(req.headers,headers.proceesed);
			resolve({
				body: req.body,
				query: req.query,
				headers: req.headers
			})
		}else{
			reject(res.errors.badRequest('Not all requested parameters were sent.', {
				body, query, headers
			}));
		}
	});
}
