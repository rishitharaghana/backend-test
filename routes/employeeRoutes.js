const express = require('express');
const { getAllEmployeeCount, getAllEMployeesByTypeSearch } = require('../controllers/employeesController');
const router = express.Router();


router.get('/allEmployeesCount',getAllEmployeeCount);
router.get('/getAllEMployeesByTypeSearch',getAllEMployeesByTypeSearch);

module.exports = router;