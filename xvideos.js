var _ = require('lodash'),
	async = require('async'),
	request = require('request'),
	needle = require('needle'),
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
	LOGIN2: function (email, password, cb) {
		if (!email || !password) return;
		var data = {
			referer: 'http://www.xvideos.com/profiles/cafe4taipei/',
			login: email,
			password: password,
			log: ''
		};

		needle.post('http://upload.xvideos.com/account/', data, function (e, r, b) {
			if (!e && r.statusCode == 200 || r.statusCode == 302) {
				var cookies = r.cookies;
				console.log(cookies);
				cb(null, cookies);
			}
		})
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
					var j = request.jar()
					//var headers = _.clone(headers);
					headers = _.extend(headers, {
						'content-type': 'multipart/form-data'
					});
					var progressTlp = _.template('http://upload.xvideos.com/account/uploads/progress?upload_id=<%=progressId%>&basic_upload=1')
					var progressUrl = progressTlp({progressId: APC_UPLOAD_PROGRESS});
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
							if (r.statusCode === 302) {
								var comit = r.headers['location'];
								//console.log(msg.Warning(comit) + '\n');
								var cookie = j.getCookieString('http://www.xvideos.com');
								headers = _.omit(headers, 'content-type');
								//console.log('COMIT',comit);
								if (!comit) {
									var x = Xray();
									x(b, {
										success: 'p.inlineOK a@href',
										error: 'p.inlineError'
									})(function (error, data) {
										console.log(data);
										cb2(error, {
											comit: (data.success) ? data.success : null,
											cookie: cookie
										});
									})
								} else {
									console.log(msg.Warning('\nWait 15 second before comit...'));
									setTimeout(function () {
										cb2(null, {
											comit: comit,
											cookie: cookie
										});
									}, 15000)
								}
							}
						}
					});
					setTimeout(function () {
						var current = 0;
						readStream.on('data', function (data) {
							current += data.length;
							var str = 'Uploaded ' + pretty(current, true, true) + '/' + totalSize;
							process.stdout.clearLine();
							process.stdout.cursorTo(0);
							process.stdout.write(msg.Warning(str));
						});
					}, 1000)

				}

			},
			function (obj, cb3) {
				if (!obj) cb3(null, false);
				//console.log(obj);
				var comitUrl = 'http://upload.xvideos.com' + obj.comit;
				//var headers = _.clone(headers);
				//console.log('\n'+comitUrl);
				headers = _.extend(headers, {
					'Host': 'upload.xvideos.com',
					'Cookie': obj.cookie,
					'Referer': 'http://upload.xvideos.com/account/uploads/new',
					'Upgrade-Insecure-Requests': 1
				});
				var j = request.jar()
				var options = {
					url: comitUrl,
					method: 'GET',
					headers: headers,
					jar: j
				}
				//console.log(options);
				var _obj = {}

				function waitForComit(status) {
					console.log('\n' + comitUrl);
					console.log(msg.Warning(status));
					if (status === 'Uploaded video saved !') {
						cb3(null, _obj);
						return;
					}
					request(options, function (e, r, b) {
						if (e) {
							console.log(msg.Error(e));
						} else {
							//console.log(b,r.statusCode);
							var cookie = j.getCookieString('http://www.xvideos.com');
							var x = Xray();
							x(b, {
								status: 'span.ok@text',
								editLink: 'a[target="_top"]@href',
								inlineError: 'p.inlineError'
							})(function (error, data) {
								if (error) {
									throw error;
								}
								if (data) {
									//waitForComit(data)
									if (data.status) {
										var xvideoUrlEdit = 'http://upload.xvideos.com' + data.editLink;
										_obj = _.extend(data, {cookie: cookie, editLink: xvideoUrlEdit});
									}
									var status = data.status || data.inlineError;
									waitForComit(status);
								}
							})
						}
					});
				}

				waitForComit('Wait for video saved...');
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
								//console.log(b);
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
								var result = r.headers['location'];
								//console.log(result);
								headers = _.omit(headers, 'content-type');
								cb2(e, {
									editLink: obj.editLink,
									msgLink: result
								});
							})
						}
					],
					function (error, result) {
						cb4(error, result);
					})

			},
			function (obj, cb5) {
				var options = {
					url: obj.msgLink,
					method: 'GET',
					headers: headers
				}

				request(options, function (e, r, b) {
					if (b) {
						var x = Xray();
						x(b, 'p.inlineOK')(function (error, data) {
							console.log(msg.Success(data));
						})
					} else {
						console.log(b);
					}
					cb5(null, obj.editLink);
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
	},
	UPLOAD2: function (video, cookies, cb) {
		var submitAction = 'http://upload.xvideos.com/account/uploads/submit?video_type=other';
        try{
            async.waterfall([
                function (cb1) {
                    var uploadUrl = 'http://upload.xvideos.com/account/uploads/new';
                    var headers = {
                        cookies: cookies
                    }
                    needle.get(uploadUrl, headers, function (e, r, b) {
                        var x = Xray();
                        cookies = r.cookies;
                        x(b, '#progress_key@value')(function (error, data) {
                            cb1(error, {
                                cookies: cookies,
                                APC_UPLOAD_PROGRESS: data
                            });
                        })
                    })
                },
                function (obj, cb2) {
                    if (!obj.APC_UPLOAD_PROGRESS) {
                        cb2(null, null)
                    } else {
                        var progressTlp = _.template('http://upload.xvideos.com/account/uploads/progress?upload_id=<%=progressId%>&basic_upload=1')
                        var progressUrl = progressTlp({progressId: obj.APC_UPLOAD_PROGRESS});

                        function progress(done) {
                            if (done == 1) {
                                return;
                            }
                            var headers = {
                                cookies: obj.cookies
                            }

                            needle.get(progressUrl, headers, function (e, r, b) {
                                if (e) {
                                    console.log(msg.Error(e.toString()));
                                }
                                if (r.statusCode == 200) {
                                    var done = 0;
                                    //if(b !== '[]')
                                    var obj = JSON.parse(r.body);
                                    //console.log(obj, _.isArray(obj));
                                    if (!_.isArray(obj)) {
                                        var current = pretty(obj.current, true, true);
                                        var total = pretty(obj.total, true, true);
                                        var str = 'Uploaded... ' + current + '/' + total;
                                        done = obj.done;
                                        process.stdout.clearLine();
                                        process.stdout.cursorTo(0);
                                        process.stdout.write(msg.Warning(str));
                                    }
                                    progress(done);
                                }
                            });
                        }

                        var submitAction = 'http://upload.xvideos.com/account/uploads/submit?video_type=other';
                        var options = {
                            cookies: obj.cookies,
                            open_timeout: 0,
                            read_timeout: 0,
                            multipart: true
                        }
                        var data = {
                            APC_UPLOAD_PROGRESS: obj.APC_UPLOAD_PROGRESS,
                            message: '',
                            tags: video.xvideos_tags,
                            upload_file: {
                                file: video.filename,
                                content_type: 'video/mp4'
                            }
                        }
                        needle.post(submitAction, data, options, function (e, r, b) {
                            if (e) {
                                console.log(msg.Error(e));
                            } else {
                                var comit = r.headers['location'];
                                //console.log(comit);
                                var comitUrl = 'http://upload.xvideos.com';
                                if (!comit) {
                                    //console.log(b);
                                    var x = Xray();
                                    x(b, {
                                        success: 'p.inlineOK a@href',
                                        error: 'p.inlineError'
                                    })(function (error, data) {
                                        if(data.error){
                                            //console.log(msg.Error(data.error));
                                            cb2(data.error, null);
                                        }else{
                                            comitUrl+=data.success;

                                            cb2(error, {
                                                comitUrl:comitUrl,
                                                cookies : r.cookies
                                            });
                                        }
                                    })
                                }else{
                                    cb2(null, {
                                        comitUrl: comitUrl + comit,
                                        cookies: r.cookies
                                    })
                                }

                            }
                        });


                        progress(0);
                    }
                },
                function (obj, cb3) {
                    if (!obj.comitUrl) cb3(null, null);
                    var headers = {
                        cookies: obj.cookies
                    }
                    needle.get(obj.comitUrl, headers, function (e, r, b) {
                        if (e) {
                            console.log(msg.Error(e));
                        } else {
                            var x = Xray();
                            x(b, {
                                status: 'span.ok@text',
                                editLink: 'a[target="_top"]@href',
                                inlineError: 'p.inlineError'
                            })(function (error, data) {
                                if (data.status) {
                                    console.log('\n'+msg.Success(data.status));
                                    var urlEdit = 'http://upload.xvideos.com' + data.editLink;
                                    cb3(null, {
                                        cookies: r.cookies,
                                        urlEdit: urlEdit
                                    })
                                }
                            })
                        }
                    })
                },
                function (obj, cb4) {
                    if (!obj.urlEdit) cb4(null, null);
                    var headers = {
                        cookies: obj.cookies
                    }
                    var data = {
                        update_video_information: 'Update information',
                        hide: 1,
                        title: video.title,
                        keywords: video.xvideos_tags,
                        description: video.description || ''
                    }
                    needle.post(obj.urlEdit, data, headers, function (e, r, b) {
                        if (e) {
                            console.log(msg.Error(e));
                        } else {
                            var result = r.headers['location'];
                            console.log(result);
                            cb4(null, {
                                cookies: r.cookies,
                                editLink: obj.urlEdit,
                                msgLink: result
                            })
                        }
                    })
                },
                function (obj, cb5) {
                    if (!obj.msgLink || !obj.editLink || obj.msgLink === undefined){
                        cb5(null, null);
                    }else{
                        needle.get(obj.msgLink, {cookies: obj.cookies}, function (e, r, b) {
                            var x = Xray();
                            x(b, 'p.inlineOK')(function (error, data) {
                                console.log(msg.Success(data));
                            });
                            cb5(null, obj.editLink);
                        })
                    }
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
        }catch(ex){
            cb(null,null)
        }
		//var cookie = login_cookie || cookies;

	}
}