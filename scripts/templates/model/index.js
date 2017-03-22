'use strict';
module.exports = {
	name: '{{model}}',
	schema: (dataTypes) => ({

	}),
	associate: function({{model}}, models) {

	},
	options: {
		paranoid: true,//set true to never delete anything
		instanceMethods: require('./instanceMethods'),
		classMethods: require('./classMethods'),
		getterMethods: require('./getterMethods'),
		setterMethods: require('./setterMethods')
	},
}
