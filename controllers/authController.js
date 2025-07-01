const bcrypt = require('bcrypt');
const pool = require('../config/db');
const util = require('util');

const queryAsync = util.promisify(pool.query).bind(pool);


const loginUser = async (req,res) => {
    const {mobile,password} = req.body;
    if (!mobile || !password){
        return res.status(400).json({ error: 'Mobile number and password are required' });
    }
    try {
        const userResult = await queryAsync('SELECT * FROM crm_users WHERE mobile = ?',[mobile]);
        
        if (!userResult.length){
            return res.status(401).json({error:'Invalid mobile number or password'});
        }
        
        const user = userResult[0];
        if (user.status !== 1){
            return res.status(403).json({ error: 'Account is not approved' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid mobile number or password' });
        }
        const {password:_,...userDetails} = user;
        res.status(200).json({
            message: 'Login successful',
            user: userDetails
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process login: ' + error.message });
    }
}

module.exports = {loginUser}