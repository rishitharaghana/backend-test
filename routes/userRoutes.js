
const express = require('express');
const { insertCrmUser, updateUserStatus, getUserTypesByBuilder, getUserTypesCount, getUserProfile } = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/authenticate');
const router = express.Router();


router.post('/insertuser',authenticateToken,insertCrmUser);
router.post('/updateuserstatus',authenticateToken,updateUserStatus);
router.get('/getUsersTypesByBuilder',authenticateToken,getUserTypesByBuilder);
router.get('/getTypesCount',authenticateToken,getUserTypesCount);
router.get('/getuserprofile',authenticateToken,getUserProfile);

module.exports = router;