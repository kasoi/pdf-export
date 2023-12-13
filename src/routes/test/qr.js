import express from 'express';
import QR from 'qrcode';

const router = express.Router();

router.get('/qr', async (req, res) => 
{
    const url = 'https://www.posterpresentations.com/research/groups/TAFP/TAFP12/TAFP12.html';
  
    try 
    {
      console.log((await QR.toDataURL(url)).replace('data:image/png;base64,', ''));
    } 
    catch (err) 
    {
      console.error(err)
    }
    
    res.status(200);
});

export default router;