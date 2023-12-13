import express from 'express';

const router = express.Router();

router.get('/', (req, res) => 
{
    res.status(200).send("server is running");
});

export default router;