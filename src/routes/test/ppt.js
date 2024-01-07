import express from 'express';
import fs from "fs";

import { PDFDocument } from 'pdf-lib';
import { promisify } from 'util';

import libre from 'libreoffice-convert';
libre.convertAsync = promisify(libre.convert);

const router = express.Router();
const ext = 'pdf';

router.get('/convert_ppt', async (req, res) => 
{
    try 
    {
        console.log('convert_ppt');
        
        const pptBuffer = fs.readFileSync('assets/test.pptx');

        if(!pptBuffer) throw new Error("ppt buffer is empty");

        console.log('converting ppt to pdf...');

        const firstPageFilter = `impress_pdf_Export:{\"PageRange\":{\"type\":\"string\",\"value\":\"1\"}}`;
        const pdfBuffer = await libre.convertAsync(pptBuffer, ext, firstPageFilter);

        let pdfDoc;

        try
        {
            // Load a PDFDocument without updating its existing metadata
            pdfDoc = await PDFDocument.load(pdfBuffer, 
            {
                updateMetadata: false
            });
        }
        catch(err) 
        {
            throw new Error(`couldnt parse PDF file, reason ${err.message}`);
        }
    
        if (pdfDoc.getPageCount() < 0) throw new Error(`pdf file has no pages`);
    
        console.log(`pdf page count = ${pdfDoc.getPageCount()}`);
      
        res.status(200).send(`pdf page count = ${pdfDoc.getPageCount()}`);
    
    } 
    catch (err) 
    {
        console.log(`ERR: ${err.message}`);
        res.status(500).json({ error : 'server error' });
    }
});

export default router;