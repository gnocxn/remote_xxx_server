var request = require('request'),
	async = require('async'),
	_ = require('lodash');

module.exports = {
	LOGIN: function (email, password, cb) {
		if (!email || !password) return;
		var formData = {
			referer: 'http://www.xvideos.com/',
			login: email,
			password: password
		}

		request.post({url: 'http://upload.xvideos.com/account', formData: formData}, function (err, httpResponse, body) {
			cb(err, httpResponse, body);
		})
	}
}