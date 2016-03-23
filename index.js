var vantage = require("vantage")();
var grab = require('./grab_bot');
var async = require('async');
var _ = require('lodash');
vantage
    .command("porncom [string]")
    .description("Grab link at porn.com")
    .option('-q --quality [nbr]', 'Choose <nbr> quality for download')
    .action(function (args, callback) {
        var href = args.string,
            quality = args.options.quality;
        async.waterfall([
            function (cb1) {
                grab.PORNCOM(href, cb1);
            },
            function (video, cb2) {
                grab.DOWNLOAD(video, quality, cb2);
            },
            function (video, cb34){
                async.parallel([
                    function(cb1){
                        grab.RESIZE_TO(video, '640x480', cb1);
                    },
                    function(cb2){
                        grab.CREATE_PROMOTION(video, cb2);
                    }
                ], function(error, result){
                    var _video = _.merge(result[0], result[1]);
                    cb34(null, _video);
                })
            },
            /*function (video, cb3) {
                grab.RESIZE_TO(video, '640x480', cb3);
            },
            function(video, cb4){
                grab.CREATE_PROMOTION(video, cb4);
            },*/
            function (video, cb5) {
                grab.ADD_PROMOTION(video, cb5);
            }
        ], function (error, result) {
            console.log(result);
            callback();
        });
    });

vantage
    .delimiter("websvr~$")
    .listen(9000)
    .show();