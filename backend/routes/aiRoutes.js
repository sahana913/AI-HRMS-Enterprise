const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdf = require('pdf-parse');
const { analyzeResume } = require('../services/geminiService');
const upload = multer({ dest: 'uploads/' });

router.post('/screen', upload.single('resume'), async (req, res) => {
    try {
        const dataBuffer = require('fs').readFileSync(req.file.path);
        const pdfData = await pdf(dataBuffer);
        const analysis = await analyzeResume(pdfData.text, req.body.jd);
        res.json(analysis);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;