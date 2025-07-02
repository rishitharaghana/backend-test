const express = require('express');
const { getLeadsByUser, insertLead, assignLeadToEmployee, updateLeadByEmployee, getLeadUpdatesByLeadId } = require('../controllers/leadsController');
const router = express.Router();

router.post('/insertLead',insertLead)
router.get('/getLeadsByUser',getLeadsByUser)
router.post('/leads/assignLeadToEmployee',assignLeadToEmployee);
router.post('/leads/updateLeadByEmployee',updateLeadByEmployee);
router.get('/leads/getLeadUpdatesByLeadId',getLeadUpdatesByLeadId)

module.exports = router;