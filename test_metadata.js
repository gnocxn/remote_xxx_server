var _ = require('lodash'),
    ffmpeg = require('fluent-ffmpeg'),
    hat = require('hat'),
    fs = require('fs'),
    path = require('path');

var exec = require('child_process').exec;

var inputFile = path.join(path.resolve('/tmp/'), hat()+'_INPUT.txt');
var outputFile = path.join(path.resolve('/tmp/'), hat()+'_OUTPUT.mp4');
var files = ['e6dcecf155f8b744444f637ff507a00e_PROMOTION.mp4','small-tit-teen-cutie-takes-it-in-the-ass-57b7a74aad0128ba04b549b60656e330_DOWNLOADED.mp4'];
var fileTpl = _.template("file '<%=filename%>'\n");
_.each(files, function(file){
    var filename = path.join(path.resolve('/tmp/'),file);
    var str = fileTpl({filename : filename});
    fs.appendFileSync(inputFile,str);
});

var cmdTpl = _.template("ffmpeg -f concat -i <%=input%> -c copy <%=output%>");
var cmd = cmdTpl({input : inputFile, output : outputFile});

exec(cmd, function(error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
        console.log('exec error: ' + error);
    }
});