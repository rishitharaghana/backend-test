const express = require('express');
const { getLeadsByUser, insertLead, assignLeadToEmployee, updateLeadByEmployee, getLeadUpdatesByLeadId, getBookedLeads, getAllLeadSource, getAllLeadStatus } = require('../controllers/leadsController');
const { authenticateToken } = require('../middlewares/authenticate');
const router = express.Router();

router.post('/insertLead',authenticateToken,insertLead)
router.get('/getLeadsByUser',authenticateToken,getLeadsByUser)
router.post('/leads/assignLeadToEmployee',authenticateToken,assignLeadToEmployee);
router.post('/leads/updateLeadByEmployee',authenticateToken,updateLeadByEmployee);
router.get('/leads/getLeadUpdatesByLeadId',authenticateToken,getLeadUpdatesByLeadId);
router.get('/leads/bookedleads',authenticateToken,getBookedLeads);
router.get('/leads/leadsource',authenticateToken,getAllLeadSource);
router.get('/leads/leadstatus',authenticateToken,getAllLeadStatus);

module.exports = router;