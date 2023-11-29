import { fromPath, fromBase64, fromBuffer } from "pdf2pic";
import fs from "fs";
import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import got from 'got';
import util from 'util';
import { opendir } from 'fs/promises';
import QR from 'qrcode';
import { PDFDocument } from 'pdf-lib';
import https from 'https';
import http from 'http';

console.log('starting script');

function getRawRequestField(rawRequest, propName, required, defaultValue = '') {

    for (const property in rawRequest) {
  
      const pattern = new RegExp("^q\\d+_" + propName + "$");
  
      if (property.match(pattern)) {
  
        if (rawRequest[property]) {
  
          return rawRequest[property];
        } else {
  
          if (required && !defaultValue) {
            throw new Error(`rawRequest property [${propName}] is required and empty`);
          }
  
          return defaultValue;
        }
      }
    }
  
    if (required && !defaultValue) {
      throw new Error(`rawRequest has no property [${propName}]`);
    }
  
    return defaultValue;
}


try {

    const submissionsHistoryFolder = './submissions-history/';
    const minSubmissionId = 5751778643528305330;

    if (!fs.existsSync(submissionsHistoryFolder)) {
        console.log('submissionsHistoryFolder does not exist');
        exit(0);
    }

    console.log('opening folder = ', submissionsHistoryFolder);
    const dir = await opendir(submissionsHistoryFolder);
    console.log('opened folder');

    const submissionsMap = new Map();

    for await(const dirent of dir)
      if (dirent && dirent.name.match(/^.*\.json$/g)) {

        //console.log('checking item ', dirent.name);

        const json = JSON.parse(fs.readFileSync(submissionsHistoryFolder + dirent.name));
        const submissionId = Number(json.submissionID);
        
        //console.log('checking submissionID = ', submissionId);

        if(submissionId < minSubmissionId) continue;

        submissionsMap.set(submissionId, dirent.name);
        console.log([...submissionsMap.entries()])

        //console.log(`${dirent.name} from cache needs to be processed`);
        //processSubmissionBody(json);

        //sleep(2000);
      }
} catch (err) {
    console.log(`ERR: redownload error, exception = ${err.message}`);
}