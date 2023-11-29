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

async function processSubmissionBody(body) {

    const formTitle = body.formTitle;
    const submissionID = body.submissionID;
    const rawRequest = JSON.parse(body.rawRequest);
  
    try {
  
      const posterid = getRawRequestField(rawRequest, 'posterid', true);
      const folder = getRawRequestField(rawRequest, 'folderName', true, 'review');
      const useGroupName = getRawRequestField(rawRequest, 'useGroupName', false, '0') === '0' ? false : true;
      const endpoint = getRawRequestField(rawRequest, 'endpoint', true).replace('submit.php', 'redownload.php');
  
      const eventid = useGroupName ? posterid.replace(/([A-Za-z]+).*[0-9]+/g, "$1") : '';
  
      let narrationWavUrl = getRawRequestField(rawRequest, 'addA', false);
      narrationWavUrl = narrationWavUrl ? "https\:\/\/jotform.com" + narrationWavUrl : narrationWavUrl;
  
      const pdfUrl = rawRequest.uploadYour3[0];
  
      console.log(`submissionID = ${submissionID}, formTitle = ${formTitle}, posterid = ${posterid}`);
  
      const payload = {

        folder: folder,
        posterid: posterid,
        eventid: eventid,
        pdfUrl: pdfUrl,
      };

        let loop = true;
        let timeout = 60 * 1000;
        let started = new Date().getTime();

        console.log(`submit to php loop`);

        while (loop && ((new Date().getTime() - started) < timeout)) {

            console.log(`sending to ${endpoint} (now = ${new Date().getTime()}, started = ${started})`);

            await got.post(endpoint, { json: payload }).then(response => {
            console.log(response.body);

            if (response.body === 'ok') {
                loop = false;
                console.log('sent to php');
            }
            }).catch(error => {
            console.log(`failed to send to php, error: ${error}`);
            });
        }

        if (loop) {
            console.log(`timed out sending to php data of [${posterid}]`);
        }

    } catch (exception) {
        const errMessage = `ERR: submissionID = ${submissionID}, formTitle = ${formTitle}, exception = ${exception.message}`;
        console.log(errMessage);
      }
}


try {

    const submissionsHistoryFolder = './submissions-history/';
    const minSubmissionId = 5751778643528305330;
    //const minSubmissionId = 5770138744121654408;

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

        await processSubmissionBody(json);
      }

    const sortedSubmissionsMap = new Map([...submissionsMap].sort()); 
    //console.log([...sortedSubmissionsMap.entries()])
} catch (err) {
    console.log(`ERR: redownload error, exception = ${err.message}`);
}