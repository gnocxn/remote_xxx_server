var _ = require('lodash'),
	async = require('async'),
	request = require('request'),
	Xray = require('x-ray'),
	path = require('path'),
	fs = require('fs'),
	pretty = require('prettysize'),
	msg = require('./msg');

request = request.defaults({jar: true});
var login_cookie = null;
module.exports = {
	LOGIN: function (email, password, cb) {
		if (!email || !password) return;
		var bodyTlp = _.template('referer=<%=referer%>&login=<%=email%>&password=<%=password%>&log=');

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
			jar: j
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
	UPLOAD: function (video, cookie, cb) {
		var uploadUrl = 'http://upload.xvideos.com/account/uploads/new';
		var submitAction = 'http://upload.xvideos.com/account/uploads/submit?video_type=other';
		var cookie = login_cookie || cookie;
		var headers = {
			'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.75 Safari/537.36 OPR/36.0.2130.32',
			'Cookie': cookie
		}
		async.waterfall([
			function (cb1) {
				var options = {
					url: uploadUrl,
					headers: headers,
					method: 'GET'
				}
				//console.log(options)
				request(options, function (e, r, b) {
					//console.log(b);
					var x = Xray();
					x(b, '#progress_key@value')(function (error, data) {
						cb1(error, data);
					})
				})
			},
			function (APC_UPLOAD_PROGRESS, cb2) {
				//console.log(APC_UPLOAD_PROGRESS);
				if (!APC_UPLOAD_PROGRESS) {
					cb2(null, null)
				} else {
					try {
						var j = request.jar()
						//var headers = _.clone(headers);
						headers = _.extend(headers, {
							'content-type': 'multipart/form-data'
						})
						var stats = fs.statSync(video.filename);
						var totalSize = pretty(stats['size'], true, true);
						var readStream = fs.createReadStream(video.filename);
						//var options = _.clone(options);
						var options = {
							url: submitAction,
							headers: headers,
							method: 'POST',
							formData: {
								APC_UPLOAD_PROGRESS: APC_UPLOAD_PROGRESS,
								message: '',
								tags: video.xvideos_tags,
								upload_file: readStream
							},
							jar: j
						}
						console.log(msg.Success('Begin upload...'));
						request(options, function (e, r, b) {
							if (e) {
								console.log(msg.Error(e), options);
							} else {
								//console.log(b);
								var cookie = j.getCookieString('http://www.xvideos.com');
								var x = Xray();
								x(b, 'p.inlineOK a@href')(function (error, data) {
									headers = _.omit(headers, 'content-type');
									cb2(error, {
										comit: data,
										cookie: cookie
									});
								})
							}
						});
						var uploaded = 0;
						readStream.on('data', function (data) {
							uploaded += data.length;
							var str = 'Uploaded ' + pretty(uploaded, true, true) + '/' + totalSize + '...';
							process.stdout.clearLine();
							process.stdout.cursorTo(0);
							process.stdout.write(msg.Warning(str));
						}).on('end', function () {
							console.log(msg.Success('\nUpload successfully.'));
						});
					} catch (ex) {
						console.log(ex);
					}

				}

			},
			function (obj, cb3) {
				if (!obj) cb3(null, false);
				//console.log(obj);
				var comitUrl = 'http://upload.xvideos.com' + obj.comit;
				//var headers = _.clone(headers);
				headers = _.extend(headers, {
					'Cookie': obj.cookie
				});
				var j = request.jar()
				var options = {
					url: comitUrl,
					method: 'GET',
					headers: headers,
					jar: j
				}
				//console.log(options);
				request(options, function (e, r, b) {
					if (e) {
						console.log(msg.Error(e));
					} else {
						var cookie = j.getCookieString('http://www.xvideos.com');
						var x = Xray();
						x(b, {
							status: 'span.ok@text',
							editLink: 'a[target="_top"]@href'
						})(function (error, data) {
							if (error) {
								throw error;
							}
							if (data) {
								if (data.status === 'Uploaded video saved !') {
									console.log(msg.Success(data.status));
									var xvideoUrlEdit = 'http://upload.xvideos.com' + data.editLink;
									cb3(null, _.extend(data, {cookie: cookie, editLink: xvideoUrlEdit}));
								} else {
									cb3(null, null);
								}
							}
						})
					}
				});
			},
			function (obj, cb4) {
				if (!obj.cookie || !obj.status || !obj.editLink) cb4(null, null);
				async.waterfall([
						function (cb1) {
							headers = _.extend(headers, {
								'Cookie': obj.cookie
							});
							var j = request.jar();
							var options = {
								url: obj.editLink,
								method: 'GET',
								headers: headers,
								jar: j
							}
							request(options, function (e, r, b) {
								var cookie = j.getCookieString('http://www.xvideos.com');
								cb1(e, cookie);
							})
						},
						function (cookie, cb2) {
							headers = _.extend(headers, {
								'Cookie': cookie,
								'content-type': 'application/x-www-form-urlencoded'
							});
							var options = {
								url: obj.editLink,
								method: 'POST',
								headers: headers,
								formData: {
									update_video_information: 'Update information',
									hide: 2,
									title: video.title,
									keywords: video.xvideos_tags,
									description: video.description || ''
								}
							}
							request(options, function (e, r, b) {
								cb2(e, obj.editLink);
							})
						}
					],
					function (error, result) {
						cb4(error, result);
					})

			}
		], function (error, result) {
			if (error) {
				console.log(msg.Error(error))
			} else {
				if (result) {
					console.log(msg.Warning(result));
				}
				console.log(msg.Success('Done!!!'));
				cb(null, result);
			}
		})
	}
}