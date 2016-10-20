const express = require('express');
const bodyParser= require('body-parser')
const app = express();
const MongoClient = require('mongodb').MongoClient
const SummaryTool = require('node-summary');
const extractor = require('unfluff');
var fs = require('fs')
var path = require('path')
var Canvas = require('canvas')
var request = require('request');
var validUrl = require('valid-url');
var easyimg = require('easyimage');
var randomstring = require("randomstring");
var imgur = require('imgur');
var qr = require('qr-image');
var lwip = require('lwip')

imgur.setClientId('991d2e1d5074047');
imgur.setCredentials('bob.zheng1998@icloud.com', 'passengerbasically98', '991d2e1d5074047');
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(__dirname + '/public'));
var db

MongoClient.connect('mongodb://bwzheng:Happy-day98@ds061506.mlab.com:61506/basically', (err, database) => {
  db = database
  var port = process.env.PORT || 8080;

  app.listen(port, () => {
    console.log("Server is running.");
  })
})

app.get('/', (req, res) => {
  db.collection('links').find().toArray((err, result) => {
    res.sendFile(__dirname + '/public/index.html')
  })
})

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  var height = y;
  var words = text.split(' ');
  var line = '';

  for(var n = 0; n < words.length; n++) {
    var testLine = line + words[n] + ' ';
    var metrics = context.measureText(testLine);
    var testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
      height += lineHeight;
    }
    else {
      line = testLine;
    }
  }
  context.fillText(line, x, y);
  height += lineHeight;
  height += 100;
  return height;

}

app.post('/links', (req, res) => {
  if (validUrl.isUri(req.body.link)) {
    request(req.body.link, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        data = extractor(body);
        SummaryTool.summarize(data.title, data.text, function(err, summary) {

            var Canvas = require('canvas')
              , Image = Canvas.Image
              , canvas = new Canvas(1080, 10000)
              , ctx = canvas.getContext('2d');

            ctx.beginPath();
            ctx.rect(0, 0, 1080, canvas.height);
            ctx.fillStyle = "white";
            ctx.fill();

            ctx.beginPath();
            ctx.fillStyle = "black";
            ctx.font = '42px Verdana, Geneva, sans-serif';
            var height = wrapText(ctx, summary, 50, 100, 1000, 42)

            ctx.beginPath();
            ctx.fillStyle = "grey";
            ctx.font = 'bold 42px "Avant Garde", Avantgarde, "Century Gothic", CenturyGothic, "AppleGothic", sans-serif';
            ctx.fillText("By Basically.ml", 50, height-92);
            var filename = randomstring.generate() + '.png'
            var qrfilename = randomstring.generate() + '.png'

            var code = qr.image(req.body.link, { type: 'png' });
            var output = fs.createWriteStream(qrfilename)

            code.pipe(output);

            canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, filename)))
            easyimg.crop({
                 src: path.join(__dirname, filename), dst: path.join(__dirname, filename),
                 width:1080, height:10000, cropwidth:1080, cropheight:height, gravity:"North"
              }).then(
              function(image) {
                lwip.open(filename, function(err, image){

                  lwip.open(qrfilename, function(err, imgOverlay){
                      imgOverlay.cover(100, 100, function(err, imgOverlay){
                        image.paste(930,height-120, imgOverlay, function(err, image){
                            image.writeFile(filename, function(err){
                                if(err){ console.log('error writing file'); }
                                var saveData = {"link": req.body.link, "summary": summary, "image": image.path}
                                db.collection('links').save(saveData, (err, result) => {
                                  if (err) return console.log(err)

                                  imgur.uploadFile(path.join(__dirname, filename))
                                    .then(function (json) {
                                        fs.unlink(path.join(__dirname, filename))
                                        fs.unlink(path.join(__dirname, qrfilename))
                                        res.redirect(json.data.link)
                                    })
                                    .catch(function (err) {
                                        console.error(err.message);
                                    });

                                })
                            });
                        });
                      })


                  });


                });

              },
              function (err) {
                console.log(err);
              }
            );




        });
      }
    })

  } else {
    console.log("Long Tweet");
    var Canvas = require('canvas')
      , Image = Canvas.Image
      , canvas = new Canvas(1080, 10000)
      , ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.rect(0, 0, 1080, canvas.height);
    ctx.fillStyle = "white";
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.font = '42px Verdana, Geneva, sans-serif';
    var height = wrapText(ctx, req.body.link, 50, 100, 1000, 42)

    ctx.beginPath();
    ctx.fillStyle = "grey";
    ctx.font = 'bold 42px "Avant Garde", Avantgarde, "Century Gothic", CenturyGothic, "AppleGothic", sans-serif';
    ctx.fillText("By Basically.ml", 50, height-92);

    var filename = randomstring.generate() + '.png'

    canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, filename)))
    easyimg.crop({
         src: path.join(__dirname, filename), dst: path.join(__dirname, filename),
         width:1080, height:10000, cropwidth:1080, cropheight:height, gravity:"North"
      }).then(
      function(image) {
        var saveData = {"link": '', "summary": req.body.link, "image": image.path}
        db.collection('links').save(saveData, (err, result) => {
          if (err) return console.log(err)

          imgur.uploadFile(path.join(__dirname, filename))
            .then(function (json) {
                fs.unlink(path.join(__dirname, filename))
                res.redirect(json.data.link)
            })
            .catch(function (err) {
                console.error(err.message);
            });

        })
      },
      function (err) {
        console.log(err);
      }
    );
  }

})
