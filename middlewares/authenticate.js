const jwt = require('jsonwebtoken');
require('dotenv').config();


const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req,res,next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')? authHeader.split(' ')[1] : null;

    if (!token){
        return res.status(401).json({error:'Access token is required'});
    }

    try {
        const decoded = jwt.verify(token,JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({error:'Invalid or exprired token'});
    }
}


module.exports = {authenticateToken};