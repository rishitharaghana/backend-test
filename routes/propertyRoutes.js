const express = require('express');
const { insertProperty, getPropertyById, getAllProperties, getUpcomingProperties, ongoingProject } = require('../controllers/propertyController');
const { authenticateToken } = require('../middlewares/authenticate');
const router = express.Router();



router.post('/insertproperty',authenticateToken,insertProperty);
router.get('/properties', authenticateToken,getAllProperties); 
router.get('/propertiesbyId',authenticateToken, getPropertyById);
router.get('/ongoingprojects',authenticateToken,ongoingProject)
router.get('/upcomingproperties',authenticateToken,getUpcomingProperties);


module.exports = router;