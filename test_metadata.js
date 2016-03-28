var _ = require('lodash'),
    ffmpeg = require('fluent-ffmpeg'),
    hat = require('hat'),
    fs = require('fs'),
    path = require('path');

var exec = require('child_process').exec;

var inputFile = path.join(path.resolve('/tmp/'), hat()+'_INPUT.txt');
var outputFile = path.join(path.resolve('/tmp/'), hat()+'_OUTPUT.mp4');
var files = ['a723005216ca22fba69bff415860af79_PROMOTION.mp4','funk-novinha-d0bc85d3d996b0a0b80167b6d9184691_DOWNLOADED.mp4'];
var fileTpl = _.template("file '<%=filename%>'\n");
_.each(files, function(file){
    var filename = path.join(path.resolve('/tmp/'),file);
    var str = fileTpl({filename : filename});
    fs.appendFileSync(inputFile,str);
});

var cmdTpl = _.template("ffmpeg -f concat -i <%=input%> -c copy <%=output%>");
var cmd = cmdTpl({input : inputFile, output : outputFile});

exec(cmd, function(error, stdout, stderr) {
    //console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
        console.log('exec error: ' + error);
    }
});