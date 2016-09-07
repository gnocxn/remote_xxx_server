var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var hat = require('hat');
var path = require('path');
var _ = require('lodash');
var pretty = require('prettysize');
var gm = require('gm');

/*
var inputFile = path.join('/tmp/','134446_hq.mp4');
var outputFile = path.join('/tmp/', hat() + 'OOOO_RESIZED.mp4');
var stream = 'http://www.txxx.com/get_file/4/1df5e595b9c2b377a62397e5826b3bf8/134000/134173/134173_hq.mp4/?br=556';
var cmdTpl = _.template('axel <%=stream%> -o <%=output%>'),
    cmd = cmdTpl({stream : stream, output: outputFile});
var downloader = spawn('ffmpeg',['-i',inputFile,'-vf','scale=640:480',outputFile]);

downloader.stdout.on('data',function(data){
    process.stdout.clearLine();
    //process.stdout.cursorTo(0);
    process.stdout.write(data.toString('utf8'));
});

downloader.stderr.on('data',function(data){
    process.stdout.clearLine();
    //process.stdout.cursorTo(0);
    process.stdout.write(data.toString('utf8'));
});

downloader.stdout.on('end', function(data) {
    console.log('Downloaded : ', outputFile);
});


downloader.on('exit', function(code) {
    if (code != 0) {
        console.log('Failed: ' + code);
    }
});

*/

gm('/tmp/watermark000.png').size(function(err,value){
    console.log(value);
})