const express = require('express');
const { insertProperty, getPropertyById, getAllProperties, getUpcomingProperties } = require('../controllers/propertyController');
const router = express.Router();



router.post('/insertproperty',insertProperty);
router.get('/properties', getAllProperties); 
router.get('/propertiesbyId', getPropertyById);
router.get('/upcomingproperties',getUpcomingProperties);


module.exports = router;