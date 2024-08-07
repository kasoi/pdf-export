import express from 'express';
import multer from 'multer';

const router = express.Router();

router.post('/submittest', multer().single(), (req, res) =>
{
    console.log(req.body);
    res.status(200).send();
});

export default router;