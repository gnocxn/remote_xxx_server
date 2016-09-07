var vantage = require("vantage")();
var grab = require('./grab_bot');
var xvideos = require('./xvideos');
var async = require('async');
var _ = require('lodash');
var msg = require('./msg');
var LineByLineReader = require('line-by-line');
var async = require('async');

const download = async.queue(function(t, cb){
    var cmd = 'download ' + t.link;
     vantage.exec(cmd).then(function(data){
         cb();
     })
},2);

const upload = async.queue(function(t, cb){
    var cmd = 'xvideos -u ' + t.videoId;
    vantage.exec(cmd).then(function(data){
        cb();
    })
},1);

const low = require('lowdb')
const storage = require('lowdb/file-sync')
const db = low('db1.json', {storage: storage});

vantage
    .command("downloads <file>")
    .description("Grab link at porn.com, xhamster.com...")
    .action(function (args, callback) {
        var lr = new LineByLineReader(args.file);
        var links = [];
        lr.on('line', function (link) {
            console.log('Process...', link);
            links.push(link);
        });
        lr.on('end', function () {
            _.each(links, function(link){
                download.push({link : link}, function(err){
                    if(err === undefined){
                        console.log('Finished', link);
                    }
                })
            })
            callback();
        });
    })

vantage
    .command("uploads <status>")
    .description("Multi upload to xvideos...")
    .action(function (args, callback) {
        var param = {isReadyToUpload : args.status};
        var videoIds = db('videos').chain().filter(param).map(function(v){return v.id}).value();
        _.each(videoIds, function(id){
            upload.push({videoId : id}, function(err){
                if(err === undefined){
                    db('videos').chain().find({id : id}).assign({isReadyToUpload: 2}).value();
                    console.log('Finished', id);
                }
            });
            callback()
        })
    })

vantage
    .command("download <link>")
    .description("Grab link at porn.com, xhamster.com...")
    .action(function (args, callback) {
        console.log(args)
        try {
            var link = args.link;

            function chooseGrabSite(link, cb) {
                var sites = [
                    {
                        reg: /porn.com/,
                        index: 0
                    },
                    {
                        reg: /xhamster.com/,
                        index: 1
                    },
	                {
		                reg: /txxx.com/,
		                index: 2
	                }
                ]
                var site = _.find(sites, function (site) {
                    return site.reg.test(link)
                });
                switch (site.index) {
                    case 0:
                        grab.PORNCOM(link, cb);
                        break;
                    case 1:
                        grab.XHAMSTER(link, cb);
                        break;
                    case 2:
		                grab.TUBECUP(link,cb);
		                break;
                }
            }

            async.waterfall([
                function (cb1) {
                    //grab.PORNCOM(href, cb1);
                    chooseGrabSite(link, cb1);
                },
                function (video, cb2) {
                    grab.DOWNLOAD_AXEL(video, cb2);
                },
	            //function (video, cb2_1) {
		         //   grab.GET_METADATA(video, cb2_1);
	            //},
	            //function (video, cb2_2) {
		         //   grab.CREATE_WATERMARK(video, cb2_2);
	            //},
	            //function (video, cb3) {
		         //   grab.ADD_WATERMARK(video, cb3);
	            //}
/*                function (video, cb2_1) {
                    grab.GET_METADATA(video, cb2_1);
                },
                function (video, cb34) {
                    //if (!video.codedSize) callback();
                    //grab.CREATE_PROMOTION(video, cb34);
                    async.parallel([
                        function (cb3) {
                            grab.RESIZE_TO(video, cb3);
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
                    //grab.ADD_PROMOTION(video, cb5);
                    grab.SIMPLE_MERGE(video, cb5);
                }*/
            ], function (error, result) {
                //console.log(result);
                var video = db('videos').find({id: result.id});
                if (!video) {
                    db('videos').push(_.extend(result, {updatedAt: new Date()}));
                } else {
                    video = _.extend(result, {updatedAt: new Date()});
                }
                var str = result.id + ' | ' + result.title;
                console.log(msg.Success(str));
                callback();
            });
        } catch (ex) {
            callback()
        }
    });

vantage
    .command("info <link>")
    .description('Info of video...')
    .action(function (args, callback) {
        try{
            var link = args.link;
            function chooseGrabSite(link, cb) {
                var sites = [
                    {
                        reg: /porn.com/,
                        index: 0
                    },
                    {
                        reg: /xhamster.com/,
                        index: 1
                    },
                    {
                        reg: /txxx.com/,
                        index: 2
                    }
                ]
                var site = _.find(sites, function (site) {
                    return site.reg.test(link)
                });
                switch (site.index) {
                    case 0:
                        grab.PORNCOM(link, cb);
                        break;
                    case 1:
                        grab.XHAMSTER(link, cb);
                        break;
                    case 2:
                        grab.TUBECUP(link,cb);
                        break;
                }
            }
            chooseGrabSite(link, function(e, video){
                var appendTitle = ' - cheaptoys4.xyz';
                //console.log(video)
                console.log(_.extend(video,{title : video.title + appendTitle}));
                callback();
            })
        }catch(ex){
            console.log('ex', ex);
        }
    })

vantage
    .command('xvideos')
    .description('XVIDEOS tools...')
    .option('-l,--login <authenticate>', 'Login before upload....')
    .option('-u,--upload <videoId>', 'Upload by video Id....')
    .action(function (args, callback) {
        try {
            if (args.options.login) {
                var authenticate = args.options.login.split(','),
                    username = authenticate[0],
                    password = authenticate[1]

                xvideos.LOGIN2(username, password, function (error,cookie) {
                    if (cookie) {
                        var user = db('users').find({username: username});
                        if (!user) {
                            db('users').push({
                                username: username,
                                password: password,
                                cookie: JSON.stringify(cookie)
                            });
                        } else {
                            user.cookie = JSON.stringify(cookie);
                        }
                    }
                    callback()
                })
            } else if (args.options.upload) {
                var videoId = args.options.upload;
                var defaultUser = 'nhung.pth@sunrise.edu.vn';
                var user = db('users').find({username: defaultUser});
                var cookie = JSON.parse(user.cookie);
                var video = db('videos').find({id: videoId.toString()});
                if (video) {
                    xvideos.UPLOAD2(video, cookie, function (err, data) {
                        //console.log(err, data);
                        video = _.extend(video, {editLink: data});
	                    callback();
                    });
                } else {
                    console.log(msg.Error('Video not found!'))
                    callback()
                }
            }
        } catch (ex) {
            callback();
        }
    })

vantage
    .delimiter("websvr~$")
    .listen(9000)
    .show();
