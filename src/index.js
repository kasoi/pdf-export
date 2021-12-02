import { fromPath } from "pdf2pic";
import fs from "fs";
import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import got from 'got';
import PDFParser from 'pdf2json';
import util from 'util';
import { opendir } from 'fs/promises';

//const submitUrl = 'https://www.posterpresentations.com/developer/submit/submit.php';
const submitUrl = 'https://skatilsya.com/test/dwg/submit/submit.php';

const submissionsCacheFolder = './submissions-cache/';
const submissionsHistoryFolder = './submissions-history/';

var logFile = fs.createWriteStream('logs.txt', { flags: 'a' });
// Or 'w' to truncate the file every time the process starts.
var logStdout = process.stdout;

let inProcess = [];

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
  const dpi = maxSize / (width / 4.5);
  return getImageOptions(maxSize, maxSize / ratio, dpi);
};

const getLargeImageOptions = (width, height) => {
  const ratio = width / height;
  const maxSize = 2160;
  const dpi = maxSize / (width / 4.5);
  
  if(width > height)
    return getImageOptions(maxSize, maxSize / ratio, dpi);
  else
    return getImageOptions(maxSize * ratio, maxSize, dpi);
};

const getXLargeImageOptions = (width, height) => {
  const ratio = width / height;
  const maxSize = 2700;
  const dpi = maxSize / (width / 4.5);

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

const saveSubmissionToCache = (body, folder) => {
  let res = false;

  try {

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

function processSubmissionBody(body) {

  const formTitle = body.formTitle;
  const submissionID = body.submissionID;

  if(inProcess.includes(submissionID)) {
    return;
  } else {
    inProcess.push(submissionID);
  }

  const rawRequest = JSON.parse(body.rawRequest);

  try {

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

    console.log(`submissionID = ${submissionID}, formTitle = ${formTitle}, name = ${name}`);

    const path = process.cwd() + `/temp.pdf`;

    console.log('attemp to download pdf...');


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
              console.log('sent to php');

              moveSubmissionToHistory(submissionID, posterid);
              inProcess.splice(inProcess.indexOf(submissionID));
            }
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
  }
}

function moveSubmissionToHistory(submissionID, posterid) {
  try {

    if(!fs.existsSync(submissionsHistoryFolder)) {
      fs.mkdirSync(submissionsHistoryFolder);
    }

    fs.renameSync(submissionsCacheFolder + submissionID + '.json', submissionsHistoryFolder + posterid + '.json');
    console.log(`moved submission [${posterid}] to history`);
  } catch (exception) {
    const errMessage = `ERR: failed to move submission json (submissionID = ${submissionID}, posterid = ${posterid}), exception = ${exception.message}`;
    console.log(errMessage);
  }
}

async function processCache() {

  try {

    const dir = await opendir(submissionsCacheFolder);
    //const dir = await opendir("./");
    for await (const dirent of dir) 
      if(dirent && dirent.name.match(/^(\d+)\.json$/g)) {
        
        console.log(dirent.name);

        const json = JSON.parse(fs.readFileSync(submissionsCacheFolder + dirent.name));

        processSubmissionBody(json);
        sleep(2000);
      }

  } catch (err) {
    console.log(`ERR: processCache, exception = ${err.message}`);
  }
}

//setInterval(processCache, 3 * 1000);

const app = express();
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.post('/submit', multer().single(), (req, res) => {

  if(saveSubmissionToCache(req.body, submissionsCacheFolder)) {

    res.status(200).send('ok');
    processSubmissionBody(req.body);

    return;
  } 
  res.status(401).send('not ok');
});

app.listen(3020);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

////////////// test routes ////////////////////////////////

app.get('/', (req, res) => {
  res.status(200).send("server is running");
});

app.get('/testsubmit', (req, res) => {

  let rawdata = fs.readFileSync('test-payload.txt');
  let payload = JSON.parse(rawdata);

  processSubmissionBody(payload);
});

app.post('/submit2', multer().single(), async (req, res) => {

  //console.log(req.body);

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
        });
      });
  } catch (exception) {
    const errMessage = `ERR: submissionID = ${submissionID}, formTitle = ${formTitle}, exception = ${exception.message}`;
    console.log(errMessage);
    res.status(401).send(`Error happened: ${exception.message}`);
  }
});

app.get('/convert', async (req, res) => {

  //const path = `./assets/STPE20.pdf`;
  const path = `./assets/2017 finalposterCAPC2 (2).pdf`;
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

    try {
    let storeAsImage = fromPath(path, getSmallImageOptions(width, height));
    const base64Small = await storeAsImage(1, true);

    console.log('generating base64Large...')

    storeAsImage = fromPath(path, getLargeImageOptions(width, height));
    const base64Large = await storeAsImage(1, true);

    console.log('generating base64XLarge...')

    storeAsImage = fromPath(path, getXLargeImageOptions(width, height));
    const base64XLarge = await storeAsImage(1, true);
    } catch (exc) {
      console.log('conversion failed');
    }

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
    //const submitUrl = 'https://www.posterpresentations.com/developer/submit/image.php';
    const submitUrl = 'https://skatilsya.com/test/dwg/submit/image.php';

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
});