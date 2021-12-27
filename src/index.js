import { fromPath } from "pdf2pic";
import fs from "fs";
import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import got from 'got';
import util from 'util';
import { opendir } from 'fs/promises';
import QR from 'qrcode';
import { PDFDocument } from 'pdf-lib';

console.log('starting service');

const submissionsCacheFolder = './submissions-cache/';
const submissionsHistoryFolder = './submissions-history/';

let inProcess = [];

const app = express();
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.post('/submit', multer().single(), (req, res) => processSubmission(req, res));

app.listen(3020);

function processSubmission(req, res) {

  if(saveSubmissionToCache(req.body)) {

    res.status(200).send('ok');

    processSubmissionBody(req.body);

    return;
  } 
  res.status(401).send('not ok');
}

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
  const ratio = width / height;
  const maxSize = 800;
  const dpi = maxSize / width;
  return getImageOptions(maxSize, maxSize / ratio, dpi);
};

const getLargeImageOptions = (width, height) => {
  const ratio = width / height;
  const maxSize = 2160;
  const dpi = maxSize / width;
  
  if(width > height)
    return getImageOptions(maxSize, maxSize / ratio, dpi);
  else
    return getImageOptions(maxSize * ratio, maxSize, dpi);
};

const getXLargeImageOptions = (width, height) => {
  const ratio = width / height;
  const maxSize = 2700;
  const dpi = maxSize / width;

  if(width > height)
    return getImageOptions(maxSize, maxSize / ratio, dpi);
  else
    return getImageOptions(maxSize * ratio, maxSize, dpi);
};

const getImageOptions = (width, heigth, dpi) => {
  const options = {
    width: Math.round(width),
    height: Math.round(heigth),
    density: Math.round(dpi),
    format: 'jpg',
    quality: 95
  };

  return options;
};

const saveSubmissionToCache = (body) => {
  let res = false;

  try {

    const folder = submissionsCacheFolder;

    if(!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
    fs.writeFileSync(folder + `${body.submissionID}.json`, JSON.stringify(body));
    res = true;
  } catch (exception) {
    const errMessage = `ERR: failed saving submission data to cache [id = ${body.submissionID}], exception = ${exception.message}`;
    console.log(errMessage);
  }
  return res;
};

function getRawRequestField(rawRequest, propName, required, defaultValue = '') {

  for (const property in rawRequest) {

    const pattern = new RegExp("^q\\d+_" + propName + "$");

    if(property.match(pattern)) {

      if(rawRequest[property]) {

        return rawRequest[property];
      } else {

        if(required && !defaultValue) {
          throw new Error(`rawRequest property [${propName}] is required and empty`);
        }
        
        return defaultValue;
      }
    }
  }

  if(required && !defaultValue) {
    throw new Error(`rawRequest has no property [${propName}]`);
  }

  return defaultValue;
}

function getPosterURL(endpoint, folder, useGroupName, eventid, posterid) {

  let posterUrl = endpoint.replace('submit.php', '') + `${folder}/`;
        
  if(useGroupName) {
    posterUrl += `${eventid}/`;
  }

  posterUrl += `${posterid}/`;

  return posterUrl;
}

function processSubmissionBody(body) {

  const formTitle = body.formTitle;
  const submissionID = body.submissionID;

  if(inProcess.includes(submissionID)) {
    console.log(`submission [${submissionID}] is already being processed. inProcess = ${inProcess}`);
    return;
  } else {
    inProcess.push(submissionID);
  }

  const rawRequest = JSON.parse(body.rawRequest);

  try {

    const posterid = getRawRequestField(rawRequest, 'posterid', true);
    const email = getRawRequestField(rawRequest, 'yourEmail', true);
    const abstract = getRawRequestField(rawRequest, 'posterAbstract', true);
    const title = getRawRequestField(rawRequest, 'theTitle', true);
    const authors = getRawRequestField(rawRequest, 'thePoster', true);
    const affiliates = getRawRequestField(rawRequest, 'thePoster24', true);
    const keywords = getRawRequestField(rawRequest, 'keywords', false);
    const template = getRawRequestField(rawRequest, 'templateName', true, 'default');
    const endpoint = getRawRequestField(rawRequest, 'endpoint', true);
    const folder = getRawRequestField(rawRequest, 'folderName', true, 'review');
    const generateQR = getRawRequestField(rawRequest, 'generateQrcode', false, '0') === '0' ? false : true;
    const generateImages = getRawRequestField(rawRequest, 'generateImages', false, '1') === '0' ? false : true;
    const useGroupName = getRawRequestField(rawRequest, 'useGroupName', false, '0') === '0' ? false : true;
    const adminPassword = getRawRequestField(rawRequest, 'adminPassword', false);
    const eventid = useGroupName ? posterid.replace(/([A-Za-z]+)\d+/g, "$1") : '';

    let narrationWavUrl = getRawRequestField(rawRequest, 'addA', false);
    narrationWavUrl = narrationWavUrl ? "https\:\/\/jotform.com" + narrationWavUrl : narrationWavUrl;

    const pdfUrl = rawRequest.uploadYour3[0];

    console.log(`submissionID = ${submissionID}, formTitle = ${formTitle}, posterid = ${posterid}`);

    const path = process.cwd() + `/temp.pdf`;

    console.log('attemp to download pdf...');


    got.stream(pdfUrl)
    .pipe(fs.createWriteStream(path))
    .on('close', async () => {
      console.log('pdf was downloaded and written to a local file');

      let base64Small, base64Large, base64XLarge, base64qrcode = "";

      if(generateImages) {

        try {

          const existingPdfBytes = fs.readFileSync(path);

          // Load a PDFDocument without updating its existing metadata
          const pdfDoc = await PDFDocument.load(existingPdfBytes, {
            updateMetadata: false
          })

          if(pdfDoc.getPageCount() < 0) 
            throw new Error(`pdf file has no pages`);

          const page = pdfDoc.getPage(0);

          const width = page.getWidth() / 72; // pdf width in inches
          const height = page.getHeight() / 72; // page height in inches


          console.log(`width = ${width}, height = ${height}`);

          console.log(getSmallImageOptions(width, height));
          console.log(getLargeImageOptions(width, height));
          console.log(getXLargeImageOptions(width, height));
  
          console.log('generating base64Small...')

          let storeAsImage = fromPath(path, getSmallImageOptions(width, height));
          base64Small = await storeAsImage(1, true);
  
          console.log('generating base64Large...')
    
          storeAsImage = fromPath(path, getLargeImageOptions(width, height));
          base64Large = await storeAsImage(1, true);
    
          console.log('generating base64XLarge...')
    
          storeAsImage = fromPath(path, getXLargeImageOptions(width, height));
          base64XLarge = await storeAsImage(1, true);
    
          console.log('done');
        }
        catch(err) {
          console.log('failed to generate images');
          console.log(err);
          if(err.code === 'ENOMEM') {
            console.log('not enough memory, restarting...');
          }
          process.exit(1);
        }
      }

      const posterUrl = getPosterURL(endpoint, folder, useGroupName, eventid, posterid);

      if(generateQR) {

        console.log('generating base64qrcode...')

        base64qrcode = (await QR.toDataURL(posterUrl, { scale: 8 })).replace('data:image/png;base64,', '');
      }

      const payload = {
        smallImage: base64Small ? base64Small.base64 : '',
        largeImage: base64Large ? base64Large.base64 : '',
        xlargeImage: base64XLarge ? base64XLarge.base64 : '',
        base64qrcode : base64qrcode,

        template : template,
        folder : folder,
        posterid : posterid,
        eventid : eventid,
        email : email,
        abstract : abstract,
        title : title,
        authors : authors,
        affiliates : affiliates,
        keywords : keywords,
        adminPassword : adminPassword,
        posterUrl : posterUrl,
      
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

        console.log(`sending to ${endpoint} (now = ${new Date().getTime()}, started = ${started})`);

        await got.post(endpoint, { json: payload }).then(response => {
          console.log(response.body);

          if(response.body === 'ok') {
            loop = false;
            console.log('sent to php');

            moveSubmissionToHistory(submissionID, eventid, posterid);
            inProcess.splice(inProcess.indexOf(submissionID));
          }
        }).catch(error => {
          console.log(`failed to send to php, error: ${error}`);
        });

        await sleep(2000);
      }

      if(loop) {
        console.log(`timed out sending to php data of [${posterid}]`);
        inProcess.splice(inProcess.indexOf(submissionID));
      }        
    });
  } catch (exception) {
    const errMessage = `ERR: submissionID = ${submissionID}, formTitle = ${formTitle}, exception = ${exception.message}`;
    inProcess.splice(inProcess.indexOf(submissionID));
    console.log(errMessage);
  }
}

function moveSubmissionToHistory(submissionID, eventid, posterid) {
  try {

    const folder = submissionsHistoryFolder + eventid + '/';

    if(!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    fs.renameSync(submissionsCacheFolder + submissionID + '.json', folder + posterid + '.json');
    console.log(`moved submission [${posterid}] to history`);
  } catch (exception) {
    const errMessage = `ERR: failed to move submission json (submissionID = ${submissionID}, posterid = ${posterid}), exception = ${exception.message}`;
    console.log(errMessage);
  }
}

async function processCache() {

  try {

    const folder = submissionsCacheFolder;

    if(!fs.existsSync(folder)) {
      return;
    }

    const dir = await opendir(folder);

    for await (const dirent of dir) 
      if(dirent && dirent.name.match(/^(\d+)\.json$/g)) {
        
        //console.log(dirent.name);

        const json = JSON.parse(fs.readFileSync(folder + dirent.name));

        processSubmissionBody(json);
        sleep(2000);
      }
  } catch (err) {
    console.log(`ERR: processCache, exception = ${err.message}`);
  }
}

setInterval(processCache, 30 * 1000);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

////////////// test routes ////////////////////////////////

app.get('/qr', async (req, res) => {

  const url = 'https://www.posterpresentations.com/research/groups/TAFP/TAFP12/TAFP12.html';

  try {
    console.log((await QR.toDataURL(url)).replace('data:image/png;base64,', ''));
  } catch (err) {
    console.error(err)
  }
  res.status(200);//.send("server is running");
});

app.get('/', (req, res) => {
  res.status(200).send("server is running");
});

app.get('/convert', async (req, res) => {

  //const path = `./assets/STPE20.pdf`;
  const path = `./assets/Kaiser-Permanente-Advance-Health-Care-Directive.pdf`;
  console.log(path);

  const existingPdfBytes = fs.readFileSync(path);

  // Load a PDFDocument without updating its existing metadata
  const pdfDoc = await PDFDocument.load(existingPdfBytes, {
    updateMetadata: false
  })

  if(pdfDoc.getPageCount() < 0) 
    throw new Error(`pdf file has no pages`);

  const page = pdfDoc.getPage(0);

  const width = page.getWidth() / 72; // pdf width in inches
  const height = page.getHeight() / 72; // page height in inches


  console.log(`width = ${width}, height = ${height}`);


  console.log(`width = ${width}, height = ${height}`);

  console.log(getSmallImageOptions(width, height));
  console.log(getLargeImageOptions(width, height));
  console.log(getXLargeImageOptions(width, height));

  console.log('generating base64Small...')

  let base64Small, base64Large, base64XLarge;

  try {
    let storeAsImage = fromPath(path, getSmallImageOptions(width, height));
    base64Small = await storeAsImage(1, true);

    console.log('generating base64Large...')

    storeAsImage = fromPath(path, getLargeImageOptions(width, height));
    base64Large = await storeAsImage(1, true);

    console.log('generating base64XLarge...')

    storeAsImage = fromPath(path, getXLargeImageOptions(width, height));
    base64XLarge = await storeAsImage(1, true);

    console.log('done');
  }
  catch(err) {
    console.log(err);
    if(err.code === 'ENOMEM') {
      console.log('not enough memory, restarting...');
      process.exit(1);
    }
  }

  const payload = {
    smallImage: base64Small.base64,
    largeImage: base64Large.base64,
    xlargeImage: base64XLarge.base64,
  };

  let loop = true;
  let timeout = 60 * 1000;
  let started = new Date().getTime();

  console.log(`submit to php loop`);
  const submitUrl = 'https://www.posterpresentations.com/developer/submit/image.php';
  //const submitUrl = 'https://skatilsya.com/test/dwg/submit/image.php';

  while(loop && ((new Date().getTime() - started) < timeout)) {

    console.log(`sending to php... (now = ${new Date().getTime()}, started = ${started})`);

    await got.post(submitUrl, { json: payload }).then(response => {
      console.log(response.body);

      if(response.body === 'ok') {
        loop = false;
        console.log('sent to php');
      }

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