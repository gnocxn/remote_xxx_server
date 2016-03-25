var vantage = require("vantage")();
var grab = require('./grab_bot');
var xvideos = require('./xvideos');
var async = require('async');
var _ = require('lodash');

const low = require('lowdb')
const storage = require('lowdb/file-sync')
const db = low('db.json', {storage});


vantage
	.command("porncom <link>")
	.description("Grab link at porn.com")
	.option('-q --quality [nbr]', 'Choose <nbr> quality for download')
	.action(function (args, callback) {
		//console.log(args)
		var href = args.link,
			quality = args.options.quality;
		async.waterfall([
			function (cb1) {
				grab.PORNCOM(href, cb1);
			},
			function (video, cb2) {
				grab.DOWNLOAD(video, quality, cb2);
			},
			function (video, cb34) {
				async.parallel([
					function (cb3) {
						grab.RESIZE_TO(video, '640x480', cb3);
					},
					function (cb4) {
						grab.CREATE_PROMOTION(video, cb4);
					}
				], function (error, result) {
					var _video = _.merge(result[0], result[1]);
					cb34(null, _video);
				})
			},
			function (video, cb5) {
				grab.ADD_PROMOTION(video, cb5);
			}
		], function (error, result) {
			console.log(result);
			db('videos').push(_.extend(result,{updatedAt : new Date()}));
			callback();
		});
	});

vantage
	.command('xvideos')
	.description('XVIDEOS tools...')
	.option('-l,--login <authenticate>', 'Login before upload....')
	.option('-u,--upload <videoId>', 'Upload by video Id....')
	.action(function (args, callback) {
		if (args.options.login) {
			var authenticate = args.options.login.split(','),
				username = authenticate[0],
				password = authenticate[1]

			xvideos.LOGIN(username, password, function (cookie) {
				if (cookie) {
					var user = db('user').find({username : username});
					if(!user){
						db('users').push({
							username: username,
							password: password,
							cookie: cookie
						});
					}else{
						user.cookie = cookie;
					}
				}
				callback()
			})
		} else if (args.options.upload) {
			var videoId = args.options.upload;
			var defaultUser = 'cafe4taipei@gmail.com';
			var user = db('users').find({username: defaultUser});

			xvideos.UPLOAD(videoId, user.cookie, function (err, data) {
				console.log(err, data);
				callback();
			});
		}
	})

vantage
	.delimiter("websvr~$")
	.listen(9000)
	.show();