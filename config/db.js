
const mysql = require('mysql2');

const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'meetownermaindb',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

});

pool.getConnection((err,connection)=>{
    if (err){
        console.error("Database connection");
    }
    else {
        console.log('connected to mysql database');
        connection.release();
    }
})

module.exports = pool;