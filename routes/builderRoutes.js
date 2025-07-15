const express = require('express');
const { getBuilderQueries, createBuilderQuery } = require('../controllers/buildersController');
const { authenticateToken } = require('../middlewares/authenticate');
const router = express.Router();

router.get('/allqueries',authenticateToken,getBuilderQueries);
router.post('/postqueries',authenticateToken,createBuilderQuery);

module.exports = router;