import express from 'express';

import getPDFSizeInInches from '../../convert/pdf_info.js';
import { generateSmallImage } from '../../convert/pdf2img.js';
import { promisify } from 'util';

import libre from 'libreoffice-convert';
libre.convertAsync = promisify(libre.convert);

const router = express.Router();
const ext = '.pdf';

router.post('/ppt_preview', async (req, res) => 
{
    try 
    {
        console.log('ppt_preview');

        const pptBuffer = Buffer.from(req.body);

        if(!pptBuffer) throw new Error("ppt buffer is empty");

        console.log('converting ppt to pdf...');

        const firstPageFilter = `draw_pdf_Export:{"PageRange":{"type":"string","value":"1"}}`;

        const pdfBuffer = await libre.convertAsync(pptBuffer, ext, firstPageFilter);
  
        const {width, height } = await getPDFSizeInInches(pdfBuffer);

        console.log(`width = ${width}, height = ${height}`);

        let base64Small = '';
    
        try 
        {
            base64Small = await generateSmallImage(pdfBuffer, width, height);
        }
        catch (err) 
        {
            if (err.code === 'ENOMEM') 
            {
              console.log('not enough memory');
            }

            throw new Error(`failed to generate smallImage, reason: ${err.message}`);
        }
    
        const payload = 
        {
            width,
            height,
            base64image : base64Small.base64,
        }
    
        console.log('sending response...')
    
        res.status(200).json(payload);
    
    } 
    catch (err) 
    {
        console.log(`ERR: ${err.message}`);
        res.status(500).json({ error : 'server error' });
    }
});

export default router;