const express = require('express');
const { insertProperty, getPropertyById, getAllProperties, getUpcomingProperties, ongoingProject, getStoppedProperties, stopPropertyLeads } = require('../controllers/propertyController');
const { authenticateToken } = require('../middlewares/authenticate');
const router = express.Router();



router.post('/insertproperty',authenticateToken,insertProperty);
router.get('/properties', authenticateToken,getAllProperties); 
router.get('/propertiesbyId',authenticateToken, getPropertyById);
router.get('/ongoingprojects',authenticateToken,ongoingProject)
router.get('/upcomingproperties',authenticateToken,getUpcomingProperties);
router.get('/properties/stopped',authenticateToken,getStoppedProperties);
router.post('/properties/stop_leads',authenticateToken,stopPropertyLeads)


module.exports = router;