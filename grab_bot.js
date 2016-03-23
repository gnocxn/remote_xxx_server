var async = require('async'),
    Xray = require('x-ray'),
    fs = require('fs'),
    path = require('path'),
    request = require('request'),
    requestProgress = require('request-progress'),
    hat = require('hat'),
    progress = require('progress-stream'),
    ffmpeg = require('fluent-ffmpeg'),
    _ = require('lodash');

var defautlDIR = '/tmp';

var promotionVideo = path.join(path.resolve('./'), 'promotion.mp4');
var promotionImage = path.join(path.resolve('./'), 'promotion.png');
var promotionSound = path.join(path.resolve('./'), 'promotion.mp3');
module.exports = {
    PORNCOM: function (link, cb) {
        async.waterfall([
            function (cb1) {
                var x = Xray();
                x(link, {
                    id : 'div.rStatic.player@data-id',
                    title: 'title',
                    description: 'meta[name="description"]@content',
                    script: 'head',
                    tags: ['p.categories > a@text']
                })
                (function (err, data) {
                    if (err) {
                        cb1(err);
                    }
                    if (data) {
                        cb1(null, _.extend(data,{source : 'porn.com'}));
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
                    video = _.omit(video, 'script');
                    video = _.extend(video, {streams: streams});
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
    DOWNLOAD: function (video, quality, cb) {
        try {
            var maxID = (quality) ? quality : _.maxBy(video.streams, 'id').id;
            var stream = _.find(video.streams, function (s) {
                return s.id === maxID
            });

            var filename = path.join(path.resolve(defautlDIR), getFilename(video.title, 'downloaded'));

            var writeStream = fs.createWriteStream(filename);
            writeStream.on('close', function () {
                //console.log('++ SAVED FILE : ', filename);
                console.log('\nDownload successfully');
                cb(null, _.extend(video, {filename: filename}));
            });
            requestProgress(request(stream.url, {encoding: null}), {
                delay: 500
            }).on('progress', function (state) {
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write('Download : ' + Math.round((state.percentage * 100)+1) + '%');
            }).pipe(writeStream);
        } catch (ex) {
            console.log(ex);
            throw new ex;
        }
    },
    CREATE_PROMOTION : function(video, cb){
        var outputPromotionFile = path.join(path.resolve('/tmp/'), hat() + '_PROMOTION.mp4');
        new ffmpeg(promotionImage)
            .loop(15)
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
    RESIZE_TO: function (video, size, cb) {
        if (video && video.filename) {
            var size = size || '640x480';
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
                    video = _.extend(video, {filename : outputFile});
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
                .mergeToFile(outputFile)
        }
    }
}

function getFilename(title, prefix) {
    var prefix = (prefix) ? '_' + prefix.toUpperCase() : '';
    var filename = _.chain(title).lowerCase().words().join('-').value();
    filename += '-' + hat() + prefix + '.mp4';
    return filename;
}

function simulatorProgress(){
    return _.repeat('.', _.random(1,10));
}