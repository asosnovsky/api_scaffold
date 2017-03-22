'use strict';

module.exports = (req, res, system) => {
	const log = system.log;
	//const <service> = system.import_service('<service>');
  //const <Model> = system.storage.sequelize.<Model>;

	return req.
	shouldHave({
		body: {/* Your body definition here
			'name': { //name of body parameter
				'type': 'string',// type of variable 'string'|'number'| 'object'
				'default': 'this'// default value, if this is not set, then the request will treat this as required!
			}
		*/}
	}).
	then(() =>
		res.response.success('Good!')
	);
}
