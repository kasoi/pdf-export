import { fromPath } from "pdf2pic";
import fs from "fs";
import express from 'express';

const options = {
  density: 100,
  saveFilename: "cert",
  savePath: "./images",
  format: "png",
  width: 600,
  height: 600
};

const path = './assets/cert.pdf';

const storeAsImage = fromPath(path, options);
const pageToConvertAsImage = 1;

const imagesFolder = "./images";
if (!fs.existsSync(imagesFolder)) fs.mkdirSync(imagesFolder);

const app = express();

app.get('/', (req, res) => {
  res.status(200).send("Type /image to get file");
});
app.get('/image', async (req, res) => {
  try {
    const image = await storeAsImage(pageToConvertAsImage);
    console.log('ok');
    res.status(200).sendFile(image);
  } catch (exception) {
    console.log('not ok:', exception.message);
    res.status(401).send(`Error happened: ${exception.message}`);
  }
});

app.listen(3020);