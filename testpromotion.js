var hat = require('hat'),
	path = require('path'),
	async = require('async'),
	_ = require('lodash'),
	ffmpeg = require('fluent-ffmpeg');

var movie = path.join(path.resolve('/tmp/'), 'india-solo-public-hairy-masturbation-video-a4895de1c3aa2a9faee25c76ee2c0888.mp4');
var movieResizeFile = path.join(path.resolve('/tmp/'), hat() + '_resized.mp4');
var promotionMovie = path.join(path.resolve('./'), 'promotion.mp4');
var mergedOutputFile = path.join(path.resolve('/tmp/'), hat() + '_merged_.mp4');
try {
	async.waterfall([
		function (cb) {
			new ffmpeg(movie)
				.size('640x480')
				.output(movieResizeFile)
				.on('end', function () {
					console.log('resize succesfully');
					cb(null, movieResizeFile);
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
		},
		function (movieResizedFile, cb) {
			new ffmpeg(promotionMovie)
				.input(movieResizedFile)
				.on('end', function () {
					console.log('merged succesfully');
					cb(null, mergedOutputFile);
				})
				.on('progress', function (progress) {
					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					var prgr = _.repeat('.', _.random(1,5));
					process.stdout.write('Processing merged: ' + prgr);
				})
				.on('error', function (err) {
					console.log('an error happened: ' + err.message);
				})
				.mergeToFile(mergedOutputFile, '/tmp/')
		}
	], function (error, result) {
		console.log(error, result);
	})


} catch (ex) {
	console.log(ex);
}