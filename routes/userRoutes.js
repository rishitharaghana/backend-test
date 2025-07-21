
const express = require('express');
const { insertCrmUser, updateUserStatus, getUserTypesByBuilder, getUserTypesCount, getUserProfile, editCrmUser, deleteCrmUser } = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/authenticate');
const router = express.Router();


router.post('/insertuser',authenticateToken,insertCrmUser);
router.put('/users/:id',authenticateToken ,editCrmUser);
router.delete('/users/:id',authenticateToken ,deleteCrmUser);
router.post('/updateuserstatus',authenticateToken,updateUserStatus);
router.get('/getUsersTypesByBuilder',authenticateToken,getUserTypesByBuilder);
router.get('/getTypesCount',authenticateToken,getUserTypesCount);
router.get('/getuserprofile',authenticateToken,getUserProfile);



module.exports = router;