const express = require('express');
const { insertProperty, getPropertyById, getAllProperties,getImage } = require('../controllers/propertyController');
const router = express.Router();



router.post('/insertproperty',insertProperty);
router.get('/properties/:id',getPropertyById);
router.get('/properties',getAllProperties);
router.get('/image/:filePath', getImage);

module.exports = router;