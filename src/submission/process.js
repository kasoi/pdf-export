import QR from 'qrcode';

import { downloadPdf } from "../utility/download.js";
import getPDFSizeInInches from "../convert/pdf_info.js";
import * as ImageGenerator from "../convert/pdf2img.js"
import * as Parser from "./parsing.js"
import { sendDataToFTP } from "./send.js";
import { moveSubmissionToHistory } from "./save.js"
import { notifySubmissionFailResolve, notifySubmissionSuccess, notifySubmissionFailed } from './mailer.js';

const failedSubmissions = new Set();

export async function processSubmissionBody(body) 
{
    const formTitle = body.formTitle;
    const submissionID = body.submissionID;

    try 
    {      
        const rawRequest = JSON.parse(body.rawRequest);

        const posterid = Parser.getRawRequestField(rawRequest, 'posterid', true);
        const email = Parser.getRawRequestField(rawRequest, 'yourEmail', true);
        const abstract = Parser.getRawRequestField(rawRequest, 'posterAbstract', true);
        const title = Parser.getRawRequestField(rawRequest, 'theTitle', true);
        const authors = Parser.getRawRequestField(rawRequest, 'thePoster', true);
        const affiliates = Parser.getRawRequestField(rawRequest, 'thePoster24', true);
        const keywords = Parser.getRawRequestField(rawRequest, 'keywords', false);
        const template = Parser.getRawRequestField(rawRequest, 'templateName', true, 'default');
        const endpoint = Parser.getRawRequestField(rawRequest, 'endpoint', true);
        const folder = Parser.getRawRequestField(rawRequest, 'folderName', true, 'review');
        const generateQR = Parser.getRawRequestField(rawRequest, 'generateQrcode', false, '0') === '0' ? false : true;
        const generateImages = Parser.getRawRequestField(rawRequest, 'generateImages', false, '1') === '0' ? false : true;
        const useGroupName = Parser.getRawRequestField(rawRequest, 'useGroupName', false, '0') === '0' ? false : true;
        const adminPassword = Parser.getRawRequestField(rawRequest, 'adminPassword', false);
        const youtubeLink = Parser.getRawRequestField(rawRequest, 'youtubeLink', false);

        const videoid = Parser.getVideoIDFromLink(youtubeLink);
        const eventid = useGroupName ? posterid.replace(/([A-Za-z]+).*[0-9]+/g, "$1") : '';

        let narrationWavUrl = Parser.getRawRequestField(rawRequest, 'addA', false);
        narrationWavUrl = narrationWavUrl ? "https\:\/\/jotform.com" + narrationWavUrl : narrationWavUrl;

        const pdfUrl = rawRequest.uploadYour3[0];

        console.log(`submissionID = ${submissionID}, formTitle = ${formTitle}, posterid = ${posterid}`);
        console.log('attempt to download pdf...');


        const buffer = await downloadPdf(pdfUrl);
        console.log('pdf was downloaded');

        let base64Small, base64Large, base64XLarge, base64Thumbnail, base64qrcode = "";

        if (generateImages) 
        {
            try 
            {
                const { width, height } = await getPDFSizeInInches(buffer);
                console.log(`width = ${width}, height = ${height}`);

                // console.log(ImageOptions.getThumbnailOptions(width, height));
                // console.log(ImageOptions.getSmallImageOptions(width, height));
                // console.log(ImageOptions.getLargeImageOptions(width, height));
                // console.log(ImageOptions.getXLargeImageOptions(width, height));

                if(useGroupName)
                {
                base64Thumbnail = await ImageGenerator.generateThumbnail(buffer, width, height);
                }

                base64Small = await ImageGenerator.generateSmallImage(buffer, width, height);
                base64Large = await ImageGenerator.generateLargeImage(buffer, width, height);
                base64XLarge = await ImageGenerator.generateXLargeImage(buffer, width, height);

                console.log('done');
            }
            catch (err) 
            {
                if (err.code === 'ENOMEM') 
                {
                console.log('not enough memory');
                }

                throw new Error(`failed to generate images, reason: ${err.message}`);
            }
        }

        const posterUrl = Parser.getPosterURL(endpoint, folder, useGroupName, eventid, posterid);

        if (generateQR) 
        {
            console.log('generating base64qrcode...')
            base64qrcode = await QR.toDataURL(posterUrl, { scale: 8 });
            base64qrcode = base64qrcode.replace('data:image/png;base64,', '');
        }

        const payload = 
        {
            smallImage: base64Small ? base64Small.base64 : '',
            largeImage: base64Large ? base64Large.base64 : '',
            xlargeImage: base64XLarge ? base64XLarge.base64 : '',
            base64qrcode: base64qrcode,
            thumbnail: base64Thumbnail? base64Thumbnail.base64 : '',

            template: template,
            folder: folder,
            posterid: posterid,
            eventid: eventid,
            email: email,
            abstract: abstract,
            title: title,
            authors: authors,
            affiliates: affiliates,
            keywords: keywords,
            adminPassword: adminPassword,
            posterUrl: posterUrl,
            videoid: videoid,

            narrationWavUrl: narrationWavUrl,
            pdfUrl: pdfUrl,
        };

        if(await sendDataToFTP(endpoint, payload)) {
            moveSubmissionToHistory(submissionID, eventid, posterid);

            if(failedSubmissions.has(submissionID)) {
                failedSubmissions.delete(submissionID);
                notifySubmissionFailResolve(posterid);
            } else {
                notifySubmissionSuccess(posterid);
            }
        }
  } 
  catch (exception) 
  {
    const errMessage = `ERR: submissionID = ${submissionID}, formTitle = ${formTitle}, exception = ${exception.message}`;
    console.log(errMessage);
    
    if(!failedSubmissions.has(submissionID)) {
        failedSubmissions.add(submissionID);
        notifySubmissionFailed(posterid, submissionID, email, exception.message);
    }
  }
}