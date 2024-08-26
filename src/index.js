import fs from "fs";
import express from 'express';
import bodyParser from 'body-parser';

import http from 'http';
import https from 'https';

import 'dotenv/config';
import './utility/console.js'
import './submission/mailer.js'

import rootRoute from './routes/root.js'
import submitRoute from './routes/submit.js'
import previewPdfRoute from './routes/preview/pdf.js'
import previewPptRoute from './routes/preview/ppt.js'

import testQRRoute from './routes/test/qr.js'
import testPPTRoute from './routes/test/ppt.js'

import { processCacheLoop } from "./submission/cache.js";

console.log('starting service');

const app = express();

app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));
app.use(bodyParser.json({limit: '20mb'}));
app.use(bodyParser.raw({limit: '250mb'}));

app.use(function(req, res, next) {

  const origin = (req.headers.origin || "*");

  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Content-type", "application/json");

  next();
});

app.use(rootRoute);
app.use(submitRoute);
app.use(previewPdfRoute);
app.use(previewPptRoute);

app.use(testQRRoute);
app.use(testPPTRoute);

http.createServer(app).listen(process.env.HTTP_PORT, () => 
{
  console.log('http is listening at ', process.env.HTTP_PORT);
});


if(fs.existsSync(process.env.SSL_KEY_PATH) && fs.existsSync(process.env.SSL_CERTIFICATE_PATH)) 
{
  var options = 
  {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERTIFICATE_PATH),
  };
  
  https.createServer(options, app).listen(process.env.HTTPS_PORT, () => 
  {
    console.log('https is listening at ', process.env.HTTPS_PORT);
  });
}

await processCacheLoop();