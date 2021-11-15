import { fromPath } from "pdf2pic";
import fs from "fs";
import express from 'express';

const options = {
  density: 100,
  saveFilename: "cert",
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

const app = express();

app.get('/', (req, res) => {
  res.status(200).send("Type /image to get file");
});
app.get('/image', async (req, res) => {
  try {
    //const image = await storeAsImage(pageToConvertAsImage);
    const image = await storeAsImage(1, true);
    console.log('ok');
    //console.log('image object:', image);
    //res.status(200).sendFile(rootPath + '/' + image.path);
    res.status(200).send(image);
  } catch (exception) {
    console.log('not ok:', exception.message);
    res.status(401).send(`Error happened: ${exception.message}`);
  }
});
app.get('/pdf', async (req, res) => {
  res.status(200).sendFile(rootPath + `/${pdfPath}`);
});

app.post('/submit', async (req, res) => {
  console.log(req.body);
  res.status(200).send('ok');
});

app.listen(3020);