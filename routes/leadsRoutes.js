const express = require('express');
const { getLeadsByUser, insertLead, assignLeadToEmployee, updateLeadByEmployee, getLeadUpdatesByLeadId, getBookedLeads } = require('../controllers/leadsController');
const { authenticateToken } = require('../middlewares/authenticate');
const router = express.Router();

router.post('/insertLead',authenticateToken,insertLead)
router.get('/getLeadsByUser',authenticateToken,getLeadsByUser)
router.post('/leads/assignLeadToEmployee',authenticateToken,assignLeadToEmployee);
router.post('/leads/updateLeadByEmployee',authenticateToken,updateLeadByEmployee);
router.get('/leads/getLeadUpdatesByLeadId',authenticateToken,getLeadUpdatesByLeadId);
router.get('/leads/bookedleads',authenticateToken,getBookedLeads);

module.exports = router;