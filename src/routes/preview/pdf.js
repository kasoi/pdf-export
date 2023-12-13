import express from 'express';

import getPDFSizeInInches from '../../convert/pdf_info.js';
import { generateSmallImage } from '../../convert/pdf2img.js';

const router = express.Router();

router.post('/pdf_preview', async (req, res) => 
{
    try 
    {
        console.log('pdf_preview');

        const pdfBuffer = req.body.pdf;

        if(!pdfBuffer) throw new Error("pdf buffer is empty");
  
        const {width, height } = await getPDFSizeInInches()

        console.log(`width = ${width}, height = ${height}`);
        console.log('generating smallImage...')

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