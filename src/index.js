import { fromPath } from "pdf2pic";
import fs from "fs";

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

storeAsImage(pageToConvertAsImage).then((resolve) => {
  console.log("Page 1 is now converted as image");

  return resolve;
});