const pool = require('../config/db');
const util = require('util');
const moment = require('moment');

const queryAsync = util.promisify(pool.query).bind(pool);


const getBuilderQueries = async (req, res) => {
  const { admin_user_id, admin_user_type } = req.query;

 
  if (
    !admin_user_id ||
    isNaN(parseInt(admin_user_id)) ||
    !admin_user_type ||
    isNaN(parseInt(admin_user_type))
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'Valid admin_user_id and admin_user_type are required',
      queries: [],
    });
  }

  // Validate admin_user_type is 1 (Admin)
  if (parseInt(admin_user_type) !== 1) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid admin_user_type. Must be 1 (Admin)',
      queries: [],
    });
  }

  try {
    const query = `
      SELECT 
        bq.id,
        bq.name,
        bq.number,
        bq.message,
        bq.created_date,
        bq.created_time,
        bq.admin_user_id,
        bq.admin_user_type,
        cu_admin.name AS admin_name,
        bq.added_user_id,
        bq.added_user_type,
        cu_added.name AS added_user_name
      FROM 
        builder_queries bq
        INNER JOIN crm_users cu_admin ON bq.admin_user_id = cu_admin.id
        INNER JOIN crm_users cu_added ON bq.added_user_id = cu_added.id
      WHERE 
        bq.admin_user_id = ?
        AND bq.admin_user_type = ?
        AND bq.added_user_type = 2
      ORDER BY 
        bq.created_time DESC
    `;
    const rows = await queryAsync(query, [parseInt(admin_user_id), parseInt(admin_user_type)]);
    const queries = rows.map((row) => ({
      id: row.id,
      name: row.name,
      number: row.number,
      message: row.message,
      created_date: row.created_date,
      created_time: row.created_time,
      admin_user_id: row.admin_user_id,
      admin_user_type: row.admin_user_type,
      admin_name: row.admin_name,
      added_user_id: row.added_user_id,
      added_user_type: row.added_user_type,
      added_user_name: row.added_user_name,
    }));

    res.status(200).json({
      status: 'success',
      message: 'Builder queries fetched successfully',
      queries,
    });
  } catch (error) {
   
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch builder queries: ' + error.message,
      queries: [],
    });
  }
};



const createBuilderQuery = async (req, res) => {
  const { name, number, message, admin_user_id,admin_user_type, added_user_id, added_user_type } = req.body;  
  if (
    !name ||
    !number ||
    !message ||
    !admin_user_id ||
    !admin_user_type ||
    !added_user_id ||
    !added_user_type ||
    typeof name !== 'string' ||
    typeof number !== 'string' ||
    typeof message !== 'string' ||
    isNaN(parseInt(admin_user_id)) ||
    isNaN(parseInt(admin_user_type)) ||
    isNaN(parseInt(added_user_id)) ||
    isNaN(parseInt(added_user_type))
  ) {
    return res.status(400).json({
      status: 'error',
      message:
        'All fields (name, number, message, admin_user_id, added_user_id, added_user_type) are required and must be valid',
    });
  }

 
  if (parseInt(admin_user_type) !== 1) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid admin_user_type Must be 1 (Admin)',
    });
  }

  
  if (parseInt(added_user_type) !== 2) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid added_user_type. Must be 2 (Builder)',
    });
  }

 
  if (!/^\d{10}$/.test(number)) {
    return res.status(400).json({
      status: 'error',
      message: 'Number must be a 10-digit phone number',
    });
  }

  try {
   
    const adminUserCheck = await queryAsync(
      'SELECT id, user_type FROM crm_users WHERE id = ? AND user_type = ?',
      [parseInt(admin_user_id), parseInt(admin_user_type)]
    );
    if (!adminUserCheck.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid admin_user_id: Admin user does not exist',
      });
    }

 
    const addedUserCheck = await queryAsync(
      'SELECT id, user_type FROM crm_users WHERE id = ? AND user_type = ?',
      [parseInt(added_user_id), parseInt(added_user_type)]
    );
    if (!addedUserCheck.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid added_user_id: Builder user does not exist',
      });
    }

    
    const created_date = moment().format('YYYY-MM-DD');
    const created_time = moment().format("HH:mm:ss")
    const query = `
      INSERT INTO builder_queries (
        name, number, message, created_date,created_time, admin_user_id, admin_user_type, added_user_id, added_user_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      name,
      number,
      message,
      created_date,
      created_time,
      parseInt(admin_user_id),
      parseInt(admin_user_type), 
      parseInt(added_user_id),
      parseInt(added_user_type),
    ];

    const result = await queryAsync(query, values);

    res.status(201).json({
      status: 'success',
      message: 'Builder query created successfully',
      query_id: result.insertId,
    });
  } catch (error) {
  
    res.status(500).json({
      status: 'error',
      message: 'Failed to create builder query: ' + error.message,
    });
  }
};


module.exports = { getBuilderQueries, createBuilderQuery };