var async = require('async'),
	Xray = require('x-ray'),
	fs = require('fs'),
	path = require('path'),
	request = require('request'),
	requestProgress = require('request-progress'),
	hat = require('hat'),
	ffmpeg = require('fluent-ffmpeg'),
	gm = require('gm'),
	_ = require('lodash');

var defautlDIR = '/tmp';

var promotionVideo = path.join(path.resolve('./'), 'promotion.mp4');
var promotionImage = path.join(path.resolve('./'), 'promotion.png');
var promotionSound = path.join(path.resolve('./'), 'promotion.mp3');
var watermarkFile = path.join(path.resolve('./'), 'watermark00.png');

var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var spawnargs = require('spawn-args');

module.exports = {
	PORNCOM: function (link, cb) {
		async.waterfall([
			function (cb1) {
				var x = Xray();
				x(link, {
					id: 'div.rStatic.player@data-id',
					title: '.main h1@text',
					description: 'meta[name="description"]@content',
					script: 'head',
					categories: ['p.categories > a@text'],
					tags: ['p.tags > a@text']
				})
				(function (err, data) {
					if (err) {
						cb1(err);
					}
					if (data) {
						cb1(null, _.extend(data, {source: 'porn.com', originalLink: link}));
					}
				})
			},
			function (video, cb2) {
				if (video) {
					var streams = video.script.match(/streams\:(.*)\,length/)[1] || '{}';
					streams = _.map(eval(streams), function (s) {
						return {
							id: _.parseInt(s.id),
							url: s.url
						}
					});

					var maxID = _.maxBy(streams, 'id').id;
					var stream = _.find(streams, function (s) {
						return s.id === maxID
					});
					var _categories = _.chain(video.categories).map(function (t) {
						return _.words(t.toLowerCase()).join('-')
					}).value();
					var _tags = _.chain(video.tags).map(function (t) {
						return _.words(t.toLowerCase()).join('-')
					}).value();
					var xvideos_tags = _.uniq(_.union(_categories, _tags)).join(' ');

					video = _.omit(video, 'script');
					video = _.extend(video, {stream: stream.url, xvideos_tags: xvideos_tags});
					console.log('Get Info Successfully');
					cb2(null, video);
				} else {
					throw 'NOT FOUND!';
					cb2(null);
				}
			}
		], function (error, result) {
			cb(error, result);
		})

	},
	XHAMSTER: function (link, cb) {
		var x = Xray();
		x(link, {
			title: 'h1[itemprop=name]@text',
			description: 'meta[name="description"]@content',
			id: 'input[name="vid"]@value',
			tags: ['#videoInfo table.w100 a@text'],
			script: '#playerSwf script@html'
		})
		(function (err, data) {
			if (err) {
				cb(err, null);
			}
			if (data) {
				var stream = data.script.match(/file: \'(.*)\'\,/)[1];
				var xvideos_tags = _.chain(data.tags).map(function (t) {
					return _.words(t.toLowerCase()).join('-')
				}).value().join(' ');
				console.log('Get Info Successfully');
				var video = _.extend(data, {
					source: 'xhamster',
					stream: stream,
					xvideos_tags: xvideos_tags,
					originalLink: link
				})
				video = _.omit(video, 'script');
				cb(null, video);
			}
		})
	},
	TUBECUP: function (link, cb) {
		async.waterfall([
				function (cb1) {
					var x = Xray();
					x(link, {
						title: '.video-info__title h1@text',
						description: 'meta[name="description"]@content',
						id: 'input[name="video_id"]@value',
						tags: 'meta[name="keywords"]@content',
						script: '.player script@html'
					})(function (err, data) {
						if (err) {
							cb(err, null);
						}
						if (data) {
							var stream = data.script.match(/\'file\' \: \'(.*)\'/)[1];
							var xvideos_tags = _.chain(data.tags).split(',').map(function (t) {
								return _.words(t.toLowerCase()).join('-')
							}).uniq().value().join(' ')
							var description = data.description.replace('Porn Tube Cup video.', '');
							console.log('Get Info Successfully');
							var video = _.extend(data, {
								originalLink: link,
								source: 'tubecup',
								stream: stream,
								xvideos_tags: xvideos_tags,
								description: description
							});
							video = _.omit(video, ['script', 'tags']);
							cb1(null, video)
						}
					})
				},
				function (video, cb2) {
					var isGetMoreTags = false;
					if (video.xvideos_tags.indexOf('tube-cup') !== -1) isGetMoreTags = true;
					if (video.xvideos_tags.split(' ').length <= 1) isGetMoreTags = true;

					if (isGetMoreTags) {
						var relatedTagsApi = 'http://st.tubecup.org/releted_tc/json.php?page=1&id=' + video.id;
						request(relatedTagsApi, function (error, response, body) {
							if (!error && response.statusCode == 200) {
								var info = JSON.parse(body);
								var tags = _.chain(info).map(function (i) {
									return i.cats_str.split(',')
								}).flatten().uniq().map(function (t) {
									return _.words(t.trim()).join('-')
								}).flatten().value().join(' ');
								cb2(null, _.extend(video, {xvideos_tags: tags}))
							}
						})
					} else {
						cb2(null, video);
					}
				}
			],
			function (error, result) {
				cb(error, result);
			}
		)
	},

	DOWNLOAD: function (video, cb) {
		if (!video) return;
		try {
			var filename = path.join(path.resolve(defautlDIR), getFilename(video.title, 'downloaded'));

			var writeStream = fs.createWriteStream(filename);
			writeStream.on('close', function () {
				//console.log('++ SAVED FILE : ', filename);
				console.log('\nDownload successfully');
				video = _.omit(video, 'stream');
				video = _.extend(video, {filename: filename});
				cb(null, video);
			});
			requestProgress(request(video.stream, {encoding: null}), {
				delay: 500
			}).on('progress', function (state) {
				process.stdout.clearLine();
				process.stdout.cursorTo(0);
				process.stdout.write('Download : ' + Math.round((state.percentage * 100) + 1) + '%');
			}).pipe(writeStream);
		} catch (ex) {
			console.log(ex);
			throw new ex;
		}
	},
	DOWNLOAD_AXEL: function (video, cb) {
		if (!video) return;
		var filename = path.join(path.resolve(defautlDIR), getFilename(video.title, 'downloaded'));
		var downloader = spawn('axel', [video.stream, '-o', filename]);
		downloader.stdout.on('data', function (data) {
			process.stdout.clearLine();
			process.stdout.write(data.toString('utf8'));
		});

		downloader.stdout.on('end', function () {
			console.log('Download successfully');
			video = _.omit(video, 'stream');
			video = _.extend(video, {filename: filename});
			cb(null, video);
		});


		downloader.on('exit', function (code) {
			if (code != 0) {
				console.log('Failed: ' + code);
			}
		});
	},
	GET_METADATA: function (video, cb) {
		console.log('Get metadata...')
		new ffmpeg.ffprobe(video.filename, function (error, data) {
			if (error) cb(error, null);
			if (data) {
				var meta = _.get(data, 'streams[0]');
				var obj = _.pick(meta, ['width', 'height', 'coded_width', 'coded_height', 'duration']);
				cb(null, _.extend(video, {meta: obj}));
			}
		})
	},
	CREATE_THUMBNAIL: function (video, cb){

	},
	CREATE_WATERMARK: function (video, cb) {
		var outputPromotionFile = path.join(path.resolve('/tmp/'), hat() + '_WATERMARK.png');
		if (video.meta) {
			var cmdTpl = _.template('convert <%=input%> -resize <%=width%> <%=output%>'),
				cmd = cmdTpl({input: watermarkFile, width: video.meta.coded_width || video.meta.width, output: outputPromotionFile});
			exec(cmd, {maxBuffer: 1024 * 500}, function (error, stdout, stderr) {
				console.log('Create watermark successfully.');
				gm(outputPromotionFile).size(function(err, value){
					console.log(err, value);
					cb(err, _.extend(video, {promotion: {
						file : outputPromotionFile,
						width : value.width,
						height : value.height
					}}));
				})
			});
		}
	},
	ADD_WATERMARK: function (video, cb) {
		var outputFile = path.join(path.resolve(defautlDIR), getFilename(video.title, 'final'));
		var args = ['-i', video.filename, '-i', video.promotion.file, '-filter_complex', 'pad=height=ih+'+ video.promotion.height+':color=#000000,overlay=(main_w-overlay_w)/2:main_h-overlay_h', outputFile];
		var _watermark = spawn('ffmpeg', args);
		_watermark.stderr.on('data', function (data) {
			process.stdout.clearLine();
			process.stdout.write(data.toString('utf8'));
		});

		_watermark.stdout.on('end', function () {
			console.log('Add watermark successfully');
			fs.unlinkSync(video.filename);
			fs.unlinkSync(video.promotion.file);
			video = _.omit(video, ['promotion', 'meta']);
			video = _.extend(video, {filename: outputFile, isReadyToUpload: 1});
			cb(null, video);
		});

		_watermark.on('exit', function (code) {
			if (code != 0) {
				console.log('Failed: ' + code);
			}
		});
	},
	CREATE_PROMOTION: function (video, cb) {
		var outputPromotionFile = path.join(path.resolve('/tmp/'), hat() + '_PROMOTION.mp4');
		var loopSecond = 15;
		if (video.meta && video.meta.duration) {
			var duration = _.parseInt(video.meta.duration);
			var minute = duration / 60;
			if (minute <= 5) loopSecond = 5;
			if (minute > 5 && minute <= 10) loopSecond = 10;
			if (minute > 10) loopSecond = 15;
			video = _.extend(video.meta, {promotionDuration: loopSecond * 2});
		}
		new ffmpeg(promotionImage)
			.loop(loopSecond)
			.size('640x480')
			.input(promotionSound)
			.output(outputPromotionFile)
			.on('end', function () {
				console.log('\nCreate promotion succesfully');
				cb(null, _.extend(video, {promotion: outputPromotionFile}));
			})
			.on('progress', function (progress) {
				process.stdout.clearLine();
				process.stdout.cursorTo(0);
				var prgr = simulatorProgress();
				process.stdout.write('Processing promotion: ' + prgr);
			})
			.on('error', function (err) {
				console.log('\nan error happened: ' + err.message);
			})
			.run()
	},
	RESIZE_TO: function (video, cb) {
		if (video && video.filename) {
			var size = '640x480';
			var outputFile = path.join(path.resolve(defautlDIR), getFilename(video.title, 'resized'));
			new ffmpeg(video.filename)
				.size(size)
				.autopad(true)
				.output(outputFile)
				.on('end', function () {
					console.log('\nResize succesfully');
					fs.unlinkSync(video.filename);
					cb(null, _.extend(video, {filename: outputFile}));
				})
				.on('progress', function (progress) {
					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					process.stdout.write('Processing resize: ' + Math.round(progress.percent) + '%');
				})
				.on('error', function (err) {
					console.log('an error happened: ' + err.message);
				})
				.run()
		}
	},
	SIMPLE_RESIZE: function (video, cb) {
		if (video && video.filename) {
			var size = '640:480';
			var outputFile = path.join(path.resolve(defautlDIR), getFilename(video.title, 'resized'));
			var cmdTlp = _.template('ffmpeg -i <%=input%> -vf scale=<%=size%> <%=output%>'),
				cmd = cmdTlp({input: video.filename, size: size, output: outputFile});
			exec(cmd, {maxBuffer: 1024 * 500}, function (error, stdout, stderr) {
				if (stderr || stdout) {
					console.log('\nResize succesfully');
					fs.unlinkSync(video.filename);
					cb(null, _.extend(video, {filename: outputFile}));
				}
			})
		}
	},
	ADD_PROMOTION: function (video, cb) {
		if (video && video.filename && video.promotion) {
			var outputFile = path.join(path.resolve(defautlDIR), getFilename(video.title, 'final'));
			new ffmpeg(video.promotion)
				.input(video.filename)
				.on('end', function () {
					console.log('files have been merged succesfully');
					fs.unlinkSync(video.filename);
					fs.unlinkSync(video.promotion);
					video = _.omit(video, 'promotion');
					video = _.extend(video, {filename: outputFile});
					cb(null, video);
				})
				.on('progress', function (progress) {
					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					var prgr = simulatorProgress();
					process.stdout.write('Processing merged: ' + prgr);
				})
				.on('error', function (err) {
					console.log('an error happened: ' + err.message);
				})
				.mergeToFile(outputFile, path.resolve('/tmp/'))
		}
	},
	SIMPLE_MERGE: function (video, cb) {
		var inputFile = path.join(path.resolve(defautlDIR), hat() + '_INPUT.txt');
		var outputFile = path.join(path.resolve(defautlDIR), getFilename(video.title, 'final'));
		var fileTpl = _.template("file '<%=filename%>'\n");
		var cmdTpl = _.template("ffmpeg -f concat -i <%=input%> -c copy <%=output%>");
		var files = [video.promotion, video.filename];

		_.each(files, function (file) {
			var str = fileTpl({filename: file});
			fs.appendFileSync(inputFile, str);
		});
		var cmd = cmdTpl({input: inputFile, output: outputFile});
		exec(cmd, {maxBuffer: 1024 * 500}, function (error, stdout, stderr) {
			if (stderr || stdout) {
				console.log('files have been merged succesfully');
				fs.unlinkSync(video.filename);
				fs.unlinkSync(video.promotion);
				fs.unlinkSync(inputFile);
				video = _.omit(video, ['promotion', 'meta']);
				video = _.extend(video, {filename: outputFile, isReadyToUpload: 1});
				cb(null, video);
			}
		});
	}
}

function getFilename(title, prefix, joinStr) {
	var prefix = (prefix) ? '_' + prefix.toUpperCase() : '';
	var filename = _.chain(title).lowerCase().words().join(joinStr || '-').value();
	filename += '-' + hat() + prefix + '.mp4';
	return filename;
}
function simulatorProgress() {
	return _.repeat('.', _.random(1, 10));
}