var vantage = require("vantage")();
var grab = require('./grab_bot');
var async = require('async');

vantage
	.command("porncom [string]")
	.description("Grab link at porn.com")
	.option('-q --quality [nbr]', 'Choose <nbr> quality for download')
	.action(function(args, callback) {
		var href = args.string,
			quality = args.options.quality;
		async.waterfall([
			function(cb1){
				grab.PORNCOM(href, cb1);
			},
			function(video, cb2){
				grab.DOWNLOAD(video, quality, cb2);
			},
			function(video, cb3){
				grab.ADD_PROMOTION(video, function(result){
					cb3(result);
				})
			}
		],function(error, result){
			console.log(result);
			callback();
		});
	});

vantage
	.delimiter("websvr~$")
	.listen(9000)
	.show();