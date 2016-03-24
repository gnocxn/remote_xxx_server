var request = require('request'),
	async = require('async'),
	Xray = require('x-ray'),
	_ = require('lodash');

request = request.defaults({jar: true});
var login_cookie = null;
module.exports = {
	LOGIN: function (email, password, cb) {
		if (!email || !password) return;
		var bodyTlp = _.template('referer=<%=referer%>&login=<%=email%>&password=<%=password%>&log=');
		/*var formData = {
		 referer: 'http://www.xvideos.com/profiles/cafe4taipei/',
		 login: email,
		 password: password,
		 log : null
		 }*/

		var headers = {
			'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.75 Safari/537.36 OPR/36.0.2130.32',
			'Content-Type': 'application/x-www-form-urlencoded'
		}
		var j = request.jar()
		var options = {
			url: 'http://upload.xvideos.com/account/',
			method: 'POST',
			headers: headers,
			form: {
				referer: 'http://www.xvideos.com/profiles/cafe4taipei/',
				login: email,
				password: password,
				log: ''
			},
			jar : j
		}

		var _req = request(options, function (error, response, body) {
			if (error) console.log('ERROR', err);
			//console.log(response.statusCode, j.getCookieString('http://www.xvideos.com'));
			if (!error && response.statusCode == 200 || response.statusCode == 302) {
				// Print out the response body
				login_cookie = j.getCookieString('http://www.xvideos.com');
				console.log(login_cookie)
				cb(login_cookie);
			}
		});
	},
	UPLOAD: function (cb) {
		var uploadUrl = 'http://upload.xvideos.com/account/uploads/new';
		var options = {
			url : uploadUrl,
			headers : {
				'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.75 Safari/537.36 OPR/36.0.2130.32',
				'Cookie' : login_cookie
			},
			method : 'GET'
		}
		request(options, function(e, r, b){
			console.log(b);
			cb();
		})
	}
}