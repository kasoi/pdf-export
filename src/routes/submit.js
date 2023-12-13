import express from 'express';
import multer from 'multer';
import { saveSubmissionToCache } from '../submission/save.js';

const router = express.Router();

router.post('/submit', multer().single(), (req, res) =>
{
    if (saveSubmissionToCache(req.body)) 
    {
        res.status(200).send('ok');
        return;
    }

    res.status(401).send('not ok');
});

export default router;