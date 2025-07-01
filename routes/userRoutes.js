
const express = require('express');
const { insertCrmUser, updateUserStatus, getUserTypesByBuilder, getUserTypesCount } = require('../controllers/userController');
const router = express.Router();


router.post('/insertuser',insertCrmUser);
router.post('/updateuserstatus',updateUserStatus);
router.get('/getUsersTypesByBuilder',getUserTypesByBuilder);
router.get('/getTypesCount',getUserTypesCount)

module.exports = router;