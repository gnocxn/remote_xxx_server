var _ = require('lodash'),
    async = require('async'),
    request = require('request'),
    Xray = require('x-ray'),
    path = require('path'),
    fs = require('fs'),
    pretty = require('prettysize'),
    msg = require('./msg');

var cookie = "HEXAVID_LOGIN=4a0218be06d1826dMw7t0wA7W6_CBPnGwVVcmxPrCvyBX9aaRFhMBLbn0Pqv3PoxIRp1aI1Fr492FzyosnJKzRR1-tjSyf9utAUj-JJnt1u7RJQvSch_7vZk-FqXzsKWpKXMT8QqyG-YpsMzwKVOAUsNYL6bL5jyBUSFKEvWi3rTPFr3aZ-BTZad_pXxH4C8sSjqzZlLlhF6vQ-RCeekDC4stCyuARisGphnO7D7ZEnMDi6663GI75F7aBUDWETcLum1Mmx72hh1w6xQ";
var uploadUrl = 'http://upload.xvideos.com/account/uploads/new';
var filename = path.join(path.resolve('/tmp/'), 'indian-desi-woman-gets-drill-in-her-pussy-0ec606e43e481693fa394fe27e64d709_FINAL.mp4');
var tags = 'Arab Big-Cocks Bra Brunette Couples Cowgirl Hardcore Lingerie Shaved-Pussy Small-Tits Spreadeagle Stripping';
var submitAction = 'http://upload.xvideos.com/account/uploads/submit?video_type=other';
var headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.75 Safari/537.36 OPR/36.0.2130.32',
    'Cookie': cookie
}

const low = require('lowdb')
const storage = require('lowdb/file-sync')
const db = low('db.json', {storage});

var video = db('videos').find({id : '1924709'});
if(video){
    filename = video.filename;
    tags = video.xvideos_tags;
}

//console.log(video)


