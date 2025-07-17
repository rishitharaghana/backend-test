const express = require('express');
const path = require('path');
const fs = require('fs'); 
const fsPromises = require('fs').promises; 
const router = express.Router();

const uploadsDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

router.use('/uploads', express.static(uploadsDir));

router.get('/uploads/:filename', async (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);

    try {
        await fsPromises.access(filePath, fs.constants.F_OK);
        res.sendFile(filePath);
    } catch (error) {
        res.status(404).json({ error: 'File not found' });
    }
});

module.exports = router;