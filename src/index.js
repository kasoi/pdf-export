import { fromPath } from "pdf2pic";
import fs from "fs";
import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import got from 'got';

import PDFParser from 'pdf2json';
let pdfParser = new PDFParser();

import util from 'util';
var logFile = fs.createWriteStream('log.txt', { flags: 'a' });
  // Or 'w' to truncate the file every time the process starts.
var logStdout = process.stdout;

console.log = function () {
  logFile.write(timeNow() + ' | ' + util.format.apply(null, arguments) + '\n');
  logStdout.write(util.format.apply(null, arguments) + '\n');
}
console.error = console.log;

Date.prototype.today = function () { 
  return ((this.getDate() < 10)?"0":"") + this.getDate() +"/"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"/"+ this.getFullYear();
}

Date.prototype.timeNow = function () {
   return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
}

const timeNow = () => {
  var currentdate = new Date(); 
  return new Date().today() + " @ " + new Date().timeNow();
}

// const getSmallImageOptions = (width, height) => {
//   const dpi = 72;
//   return getImageOptions(width, height, dpi);
// };

// const getLargeImageOptions = (width, height) => {
//   const dpi = 200;
//   return getImageOptions(width, height, dpi);
// };

// const getImageOptions = (width, height, dpi) => {
//   const options = {
//     width : Math.round(width / 4.5 * dpi),
//     height : Math.round(height / 4.5 * dpi),
//     density : dpi,
//   };

//   return options;
// };

const getSmallImageOptions = (width, height) => {
  const dpi = 72;
  const ratio = width / height;
  return getImageOptions(800, ratio, dpi);
};

const getLargeImageOptions = (width, height) => {
  const dpi = 300;
  const ratio = width / height;
  return getImageOptions(2160, ratio, dpi);
};

const getImageOptions = (width, ratio, dpi) => {
  const options = {
    //width : Math.round(width),
    //height : Math.round(width / ratio),
    density : dpi,
  };

  return options;
};

const submitUrl = 'https://www.posterpresentations.com/developer/submit/index.php';

const app = express();
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.post('/submit', multer().single(), async (req, res) => {

  console.log(req.body);

  const formTitle = req.body.formTitle;
  const submissionID = req.body.submissionID;
  const name = req.body.pretty.Name;
  const rawRequest = JSON.parse(req.body.rawRequest);
  const url = rawRequest.fileUpload[0];

  try {

    console.log(`submissionID = ${submissionID}, formTitle = ${formTitle}, url = ${url}, name = ${name}`);

    const path = process.cwd() + `/temp.pdf`; 
    console.log(path);
  
    got.stream(url)
    .pipe(fs.createWriteStream(path))
    .on('close', async () => {
      console.log('File written!');

      pdfParser.loadPDF(path);
      pdfParser.on("pdfParser_dataReady", async pdfData => {

        const width = pdfData.Pages[0].Width; // pdf width
        const height = pdfData.Pages[0].Height; // page height

        console.log(`width = ${width}, height = ${height}`);

        console.log(getSmallImageOptions(width, height));
        console.log(getLargeImageOptions(width, height));

        let storeAsImage = fromPath(path, getSmallImageOptions(width, height));
        const base64Small = await storeAsImage(1, true); 

        storeAsImage = fromPath(path, getLargeImageOptions(width, height));
        const base64Large = await storeAsImage(1, true); 

        const payload = {
          smallImage : base64Small.base64,
          largeImage : base64Large.base64,
          name : name,
        };

        console.log('sending to php');

        got.post(submitUrl, { json : payload }).then(response => {
          console.log(response.body);
          console.log('sent to php');
          res.status(200).send(response.body);
        }).catch(error => {
          throw error;
        });
      });
    });
  } catch (exception) {
    const errMessage = `ERR: submissionID = ${submissionID}, formTitle = ${formTitle}, url = ${url}, exception = ${exception.message}`;
    console.log(errMessage);
    res.status(401).send(`Error happened: ${exception.message}`);
  }
});

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

app.get('/post', (req, res) => {

  const payload = JSON.stringify({
    smallImage : "sdfdfdfdsfdsfdffd",
    largeImage : "base64Large.base64"
  });

  console.log(payload);

  got.post(submitUrl, { json : payload }).then(response => {
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
  const url = "https:\/\/www.jotform.com\/uploads\/nkzshinnik\/213137293217048\/5129401145011716443\/work.pdf";

  const path = process.cwd() + `\\temp.pdf`; 
  console.log(path);

  got.stream(url)
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

app.listen(3020);