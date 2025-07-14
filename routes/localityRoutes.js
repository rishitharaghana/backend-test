const express = require('express');
const { getStates, getCitiesByState } = require('../controllers/localityController');
const router = express.Router();


router.get('/states', getStates);
router.get('/city/:stateId', getCitiesByState);

module.exports = router;