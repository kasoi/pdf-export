import { fromPath } from "pdf2pic";
import fs from "fs";
import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import got, { setNonEnumerableProperties } from 'got';
import PDFParser from 'pdf2json';
import util from 'util';

const submitUrl = 'https://www.posterpresentations.com/developer/submit/submit.php';

var logFile = fs.createWriteStream('logs.txt', { flags: 'a' });
// Or 'w' to truncate the file every time the process starts.
var logStdout = process.stdout;

console.log = function () {
  logFile.write(timeNow() + ' | ' + util.format.apply(null, arguments) + '\n');
  logStdout.write(util.format.apply(null, arguments) + '\n');
}
console.error = console.log;

Date.prototype.today = function () {
  return ((this.getDate() < 10) ? "0" : "") + this.getDate() + "/" + (((this.getMonth() + 1) < 10) ? "0" : "") + (this.getMonth() + 1) + "/" + this.getFullYear();
}

Date.prototype.timeNow = function () {
  return ((this.getHours() < 10) ? "0" : "") + this.getHours() + ":" + ((this.getMinutes() < 10) ? "0" : "") + this.getMinutes() + ":" + ((this.getSeconds() < 10) ? "0" : "") + this.getSeconds();
}

const timeNow = () => {
  return new Date().today() + " @ " + new Date().timeNow();
}

const getSmallImageOptions = (width, height) => {
  const dpi = 120;
  const ratio = width / height;
  return getImageOptions(800, 800 / ratio, dpi);
};

// const getLargeImageOptions = (width, height) => {
//   const dpi = 150;
//   const ratio = width / height;
//   return getImageOptions(2160, ratio, dpi);
// };
const getLargeImageOptions = (width, height) => {
  const dpi = 200;
  const inchDivider = 4.5; // divide dimensions by this value to size in inches
  const ratio = width / height;
  
  if(width > height)
    return getImageOptions(2700, 2700 / ratio, dpi);
  else
    return getImageOptions(2700 * ratio, 2700, dpi);
};

const getXLargeImageOptions = (width, height) => {
  const dpi = 200;
  const inchDivider = 4.5; // divide dimensions by this value to size in inches
  const ratio = width / height;

  if(width > height)
    return getImageOptions(3840, 3840 / ratio, dpi);
  else
    return getImageOptions(3840 * ratio, 3840, dpi);
};

const getImageOptions = (width, heigth, dpi) => {
  const options = {
    width: Math.round(width),
    height: Math.round(heigth),
    density: dpi,
    format: 'jpg',
    quality: 95
  };

  return options;
};

const app = express();
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.post('/submit', multer().single(), async (req, res) => {

  console.log(req.body);

  const formTitle = req.body.formTitle;
  const submissionID = req.body.submissionID;
  const rawRequest = JSON.parse(req.body.rawRequest);

  const name = rawRequest.q1_yourName.first + ' ' + rawRequest.q1_yourName.last;
  const posterid = rawRequest.q10_posterid;
  const email = rawRequest.q2_yourEmail;
  const abstract = rawRequest.q7_posterAbstract;
  const title = rawRequest.q22_theTitle;
  const authors = rawRequest.q23_thePoster;
  const affiliates = rawRequest.q24_thePoster24;
  const keywords = rawRequest.q5_keywords;

  const narrationWavUrl = rawRequest.q20_addA ? "https\:\/\/jotform.com" + rawRequest.q20_addA : "";
  const pdfUrl = rawRequest.uploadYour3[0];

  try {

    console.log(`submissionID = ${submissionID}, formTitle = ${formTitle}, name = ${name}`);

    const path = process.cwd() + `/temp.pdf`;
    console.log(path);

    got.stream(pdfUrl)
      .pipe(fs.createWriteStream(path))
      .on('close', async () => {
        console.log('File written!');

        let pdfParser = new PDFParser();
        pdfParser.loadPDF(path);
        pdfParser.on("pdfParser_dataReady", async pdfData => {

          const width = pdfData.Pages[0].Width; // pdf width
          const height = pdfData.Pages[0].Height; // page height

          console.log(`width = ${width}, height = ${height}`);

          console.log(getSmallImageOptions(width, height));
          console.log(getLargeImageOptions(width, height));
          console.log(getXLargeImageOptions(width, height));

          console.log('generating base64Small...')

          let storeAsImage = fromPath(path, getSmallImageOptions(width, height));
          const base64Small = await storeAsImage(1, true);

          console.log('generating base64Large...')

          storeAsImage = fromPath(path, getLargeImageOptions(width, height));
          const base64Large = await storeAsImage(1, true);

          console.log('generating base64XLarge...')

          storeAsImage = fromPath(path, getXLargeImageOptions(width, height));
          const base64XLarge = await storeAsImage(1, true);

          const payload = {
            smallImage: base64Small.base64,
            largeImage: base64Large.base64,
            xlargeImage: base64XLarge.base64,

            posterid : posterid,
            eventid : posterid.replace(/([A-Z]+)\d+/g, "$1"),
            email : email,
            abstract : abstract,
            title : title,
            authors : authors,
            affiliates : affiliates,
            keywords : keywords,
          
            narrationWavUrl : narrationWavUrl,
            pdfUrl : pdfUrl,
          };

          console.log('writing last payload to file');

          fs.writeFile("./last-payload.txt", JSON.stringify(payload), function(err) {
            if (err) {
                console.log(err);
            }
          });

          let loop = true;
          let timeout = 60 * 1000;
          let started = new Date().getTime();

          console.log(`submit to php loop`);

          while(loop && ((new Date().getTime() - started) < timeout)) {

            console.log(`sending to php... (now = ${new Date().getTime()}, started = ${started})`);

            await got.post(submitUrl, { json: payload }).then(response => {
              console.log(response.body);

              if(response.body === 'ok') {
                loop = false;
              }

              console.log('sent to php');
              res.status(200).send(response.body);
            }).catch(error => {
              console.log(`failed to send to php, error: ${error}`);
            });

            await sleep(2000);
          }

          if(loop) {
            console.log(`timed out sending to php data of [${posterid}]`);
          }          
        });
      });
  } catch (exception) {
    const errMessage = `ERR: submissionID = ${submissionID}, formTitle = ${formTitle}, exception = ${exception.message}`;
    console.log(errMessage);
    res.status(401).send(`Error happened: ${exception.message}`);
  }
});

app.listen(3020);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

////////////// test routes ////////////////////////////////

const options = {
  //density: 100,
  saveFilename: "temp",
  savePath: "./images",
  format: "png",
  //width: 600,
  //height: 600
};

const rootPath = process.cwd();
const pdfPath = './assets/cert.pdf';


const storeAsImage = fromPath(pdfPath, options);
const pageToConvertAsImage = 1;

const imagesFolder = "./images";
if (!fs.existsSync(imagesFolder)) fs.mkdirSync(imagesFolder);

app.get('/', (req, res) => {
  res.status(200).send("Type /image to get file");
});

app.get('/regex', (req, res) => {
  const str = "STPE20"
  res.status(200).send(str.replace(/([A-Z]+)\d+/g, "$1"));
});

app.get('/testsubmit', (req, res) => {
  const submitUrl = "http://localhost:3000/";

  let rawdata = fs.readFileSync('test-payload.txt');
  let payload = JSON.parse(rawdata);

  got.post(submitUrl, { json: payload }).then(response => {
    console.log(response.body);
    console.log('sent to php');
    res.status(200).send(response.body);
  }).catch(error => {
    throw error;
  });
});

app.get('/post', (req, res) => {

  const payload = JSON.stringify({
    smallImage: "sdfdfdfdsfdsfdffd",
    largeImage: "base64Large.base64"
  });

  console.log(payload);

  got.post(submitUrl, { json: payload }).then(response => {
    console.log(response.body);
    console.log('sent to php');
    res.status(200).send(response.body);
  }).catch(error => {
    throw error;
  });
});
app.get('/image', async (req, res) => {
  try {
    const image = await storeAsImage(pageToConvertAsImage);
    //const image = await storeAsImage(1, true);
    console.log('ok');
    //console.log('image object:', image);
    res.status(200).sendFile(rootPath + '/' + image.path);
    //res.status(200).send(image);
  } catch (exception) {
    console.log('not ok:', exception.message);
    res.status(401).send(`Error happened: ${exception.message}`);
  }
});
app.get('/pdf', async (req, res) => {
  const pdfUrl = "https:\/\/www.jotform.com\/uploads\/nkzshinnik\/213137293217048\/5129401145011716443\/work.pdf";

  const path = process.cwd() + `\\temp.pdf`;
  console.log(path);

  got.stream(pdfUrl)
    .pipe(fs.createWriteStream(path))
    .on('close', function () {
      console.log('File written!');
      res.status(200).sendFile(path);
    });
});

app.get('/size', async (req, res) => {
  pdfParser.loadPDF(pdfPath); // ex: ./abc.pdf

  pdfParser.on("pdfParser_dataReady", pdfData => {

    const width = Math.round(pdfData.Pages[0].Width / 4.5 * 72); // pdf width
    const height = Math.round(pdfData.Pages[0].Height / 4.5 * 72); // page height

    console.log(`Height : ${height}`)
    console.log(`Width : ${width}`)
    console.log(timeNow());

    //res.status(200).send(`Height : ${pdfData.formImage.Height}, Width : ${pdfData.formImage.Width}`);
    res.status(200).send(pdfData);
  });
});
app.get('/convert', async (req, res) => {

  //const path = `./assets/STPE20.pdf`;
  const path = `./assets/work.pdf`;
  console.log(path);

  let pdfParser = new PDFParser();
  pdfParser.loadPDF(path);
  pdfParser.on("pdfParser_dataReady", async pdfData => {

    const width = pdfData.Pages[0].Width; // pdf width
    const height = pdfData.Pages[0].Height; // page height

    console.log(`width = ${width}, height = ${height}`);

    console.log(getSmallImageOptions(width, height));
    console.log(getLargeImageOptions(width, height));
    console.log(getXLargeImageOptions(width, height));

    console.log('generating base64Small...')

    let storeAsImage = fromPath(path, getSmallImageOptions(width, height));
    const base64Small = await storeAsImage(1, true);

    console.log('generating base64Large...')

    storeAsImage = fromPath(path, getLargeImageOptions(width, height));
    const base64Large = await storeAsImage(1, true);

    console.log('generating base64XLarge...')

    storeAsImage = fromPath(path, getXLargeImageOptions(width, height));
    const base64XLarge = await storeAsImage(1, true);

    console.log('done');

    const payload = {
      smallImage: base64Small.base64,
      largeImage: base64Large.base64,
      xlargeImage: base64XLarge.base64,
    };

    // fs.writeFile("./last-images.txt", JSON.stringify(payload), function(err) {
    //   if (err) {
    //       console.log(err);
    //   }
    // });

    let loop = true;
    let timeout = 60 * 1000;
    let started = new Date().getTime();

    console.log(`submit to php loop`);
    const submitUrl = 'https://skatilsya.com/test/dwg/submit/image.php';

    while(loop && ((new Date().getTime() - started) < timeout)) {

      console.log(`sending to php... (now = ${new Date().getTime()}, started = ${started})`);

      await got.post(submitUrl, { json: payload }).then(response => {
        console.log(response.body);

        if(response.body === 'ok') {
          loop = false;
        }

        console.log('sent to php');
        //res.status(200).send(response.body);
      }).catch(error => {
        console.log(`failed to send to php, error: ${error}`);
      });

      await sleep(2000);
    }

    if(loop) {
      console.log(`timed out sending to php data of [${posterid}]`);
    }          

    res.status(200).send('ok');
  });
});