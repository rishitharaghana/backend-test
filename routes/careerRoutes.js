

const express = require('express');
const { getAllCareers, insertCareers, deleteCarrers, updateCareers } = require('../controllers/careerController');
const router = express.Router();

router.get('/getAllCareers',getAllCareers);
router.post('/insertCareers',insertCareers);
router.delete('/deleteCareer',deleteCarrers);
router.put('/updatCareer',updateCareers);

module.exports = router;