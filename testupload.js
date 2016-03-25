var _ = require('lodash'),
	async = require('async'),
	request = require('request'),
	requestProgress = require('request-progress'),
	Xray = require('x-ray'),
	path = require('path'),
	fs = require('fs'),
	pretty = require('prettysize'),
	msg = require('./msg');

var cookie = "HEXAVID_LOGIN=62379eff6061958bygFnpbkd5oOPC0woLtTfdTXS_XNn9XI44qE5bMM5E2lSk7kjJ8fsV0tD2-WfuDYGzzDtq88frOGSBa4lp1cvGDTiXxZoT8HTk81303hbQyvYBnHAW8s54tivyt_wOX_R3Hr4Tn1OPx_vVVYdW3d34_q6HMtrma9A6BoVDrDrB4iOmXKAKp7QbNjIw4XmlL0l4kAB0gTV7QdO82hkmCS2_uj-U5SKRU1_aa0aCLmfmocH0nclI5-JiXReeasnQIBY";
var uploadUrl = 'http://upload.xvideos.com/account/uploads/new';
var filename = path.join(path.resolve('/tmp/'), 'short-haired-korean-slobbers-all-over-a-cock-9cbbf77466cadd8cec679b04dc5a5a45_FINAL.mp4');
var tags = 'Blowjob Boob-Licking Compilation Deep-Throat Handjob Hardcore Homemade Kissing Korean Licking Masturbation Missionary POV Pussy-Masturbation Winter-Wear';
var submitAction = 'http://upload.xvideos.com/account/uploads/submit?video_type=other';
var headers = {
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.75 Safari/537.36 OPR/36.0.2130.32',
	'Cookie': cookie
}

async.waterfall([
	function (cb1) {
		var options = {
			url: uploadUrl,
			headers : headers,
			method: 'GET'
		}
		//console.log(options)
		request(options, function (e, r, b) {
			var x = Xray();
			x(b, '#progress_key@value')(function (error, data) {
				cb1(error, data);
			})
		})
	},
	function (APC_UPLOAD_PROGRESS, cb2) {
		//console.log(APC_UPLOAD_PROGRESS);
		if(!APC_UPLOAD_PROGRESS){
			cb2(null, null)
		}else{
			try{
				var j = request.jar()
				var headers = _.clone(headers);
				headers = _.extend(headers, {
					'content-type': 'multipart/form-data'
				})
				var stats = fs.statSync(filename);
				var totalSize = pretty(stats['size'], true, true);
				var readStream = fs.createReadStream(filename);
				//var options = _.clone(options);
				var options = {
					url: submitAction,
					headers: headers,
					method: 'POST',
					formData: {
						APC_UPLOAD_PROGRESS: APC_UPLOAD_PROGRESS,
						message: '',
						tags: tags,
						upload_file: readStream
					},
					jar: j
				}
				console.log(msg.Success('Begin upload...'));
				request(options, function (e, r, b) {
					if (e) {
						console.log(msg.Error(e),options);
					} else {
						console.log(b);
						var cookie = j.getCookieString('http://www.xvideos.com');
						var x = Xray();
						x(b, 'p.inlineOK a@href')(function (error, data) {
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
			}catch(ex){
				console.log(ex);
			}

		}

	},
	function (obj, cb3) {
		if(!obj) cb3(null, false);
		console.log(obj);
		var comitUrl = 'http://upload.xvideos.com' + obj.comit;
		var headers = _.clone(headers);
		headers = _.extend(headers, {
			'Cookie': obj.cookie
		});
		//var options = _.clone(options);
		var options = {
			url: comitUrl,
			method: 'GET',
			headers: headers
		}
		console.log(options);
		/*request(options, function (e, r, b) {
			if (e) {
				console.log(msg.Error(e));
			}else{
				cb3(null, b);
			}
		});*/
	}
], function (error, result) {
	if (error) console.log(msg.Error(error));
	if (result) {
		console.log(msg.Success(JSON.stringify(result)));
	}
})