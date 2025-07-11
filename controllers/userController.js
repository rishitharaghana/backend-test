const bcrypt = require('bcrypt');
const moment = require('moment');
const path = require('path');
const pool = require('../config/db');
const util = require('util');
const { createMulterInstance } = require('../config/multerConfig');


const allowedTypes = { photo: ['.jpg', '.jpeg', '.png'] };
const uploadDir = '../uploads/';
const upload = createMulterInstance(uploadDir, allowedTypes);
const queryAsync = util.promisify(pool.query).bind(pool);

const insertCrmUser = async (req,res) => {
    upload.fields([{name:'photo',maxCount:1}])(req,res,async (err)=>{
        if (err){
            return res.status(400).json({error:'File Upload error'+err.message});
        }
        const {
            user_type,
            name,
            mobile,
            email,
            password,
            status,
            state,
            city,
            location,
            address,
            pincode,
            gst_number,
            rera_number,
            created_by,
            created_user_id,
            company_name,
            company_number,
            company_address,
            representative_name,
            pan_card_number,
            aadhar_number,
            feedback
        } = req.body;
        if (
            !user_type ||
            !name ||
            !mobile ||
            !email ||
            !password ||
            !status ||
            !state ||
            !city ||
            !location ||
            !pincode ||
            !created_by ||
            !created_user_id
        ) {
            return res.status(400).json({ error: 'Missing required user fields' });
        }
        const validUserTypes = [1,2,3,4,5,6,7];
        if (!validUserTypes.includes(parseInt(user_type))){
            return res.status(400).json({ error: 'Invalid user_type. Must be 1, 2, 3, 4, 5, 6, or 7' });
        }
        if (![0,1,2].includes(parseInt(status))){
            return res.status(400).json({ error: 'Invalid status. Must be 0, 1, or 2' });
        }
        if (status == 2 && !feedback) {
            return res.status(400).json({ error: 'Feedback is required when status is Rejected (2)' });
        }
        if ([0, 1].includes(parseInt(status)) && feedback) {
            return res.status(400).json({ error: 'Feedback must be null when status is Pending (0) or Approved (1)' });
        }
        if (isNaN(parseInt(created_user_id))) {
            return res.status(400).json({ error: 'created_user_id must be a valid integer' });
        }
        try {
             const creatorResult = await queryAsync('SELECT user_type FROM crm_users WHERE id = ?', [parseInt(created_user_id)]);
             if (!creatorResult.length) {
                return res.status(400).json({ error: 'Invalid created_user_id: User does not exist' });
            }
            const creatorUserType = creatorResult[0].user_type;
            if (creatorUserType === 1) {
                if (!validUserTypes.includes(parseInt(user_type))) {
                    return res.status(400).json({ error: 'Invalid user_type for Admin' });
                }
            }
            else if (creatorUserType === 2){
                if (![3, 4, 5, 6, 7].includes(parseInt(user_type))) {
                    return res.status(400).json({ error: 'Builder can only create user types 3, 4, 5, 6, or 7' });
                }
            }
            else {
                return res.status(403).json({ error: 'Only Admin (1) or Builder (2) can create users' });
            }

            const baseDir = path.join(__dirname, '..');
            const photo = req.files['photo'] ? path.relative(baseDir, req.files['photo'][0].path) : null;
            const hashedPassword = await bcrypt.hash(password, 10);
            await queryAsync('START TRANSACTION');
            const currentDate = moment().format('YYYY-MM-DD');
            const currentTime = moment().format('HH:mm:ss');
            const userResult = await queryAsync(
                `INSERT INTO crm_users (
                    user_type, name, mobile, email, password, photo, status,
                    created_date, created_time, updated_date, updated_time,
                    state, city, location, address, pincode, gst_number, rera_number,
                    created_by, created_user_id, company_name, company_number,
                    company_address, representative_name, pan_card_number, aadhar_number, feedback
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    parseInt(user_type),
                    name,
                    mobile,
                    email,
                    hashedPassword,
                    photo,
                    parseInt(status),
                    currentDate,
                    currentTime,
                    currentDate,
                    currentTime,
                    state,
                    city,
                    location,
                    address || null,
                    pincode,
                    gst_number || null,
                    rera_number || null,
                    created_by,
                    parseInt(created_user_id),
                    company_name || null,
                    company_number || null,
                    company_address || null,
                    representative_name || null,
                    pan_card_number || null,
                    aadhar_number || null,
                    feedback || null
                ]
            );

            await queryAsync('COMMIT');
            res.status(201).json({
                message: 'User inserted successfully',
                user_id: userResult.insertId
            });

        } catch (error) {
            await queryAsync('ROLLBACK');
            res.status(500).json({ error: 'Failed to insert user: ' + error.message });
        }


    })
}

const updateUserStatus = async (req,res)=>{
    const {user_id,status,feedback,updated_by_user_id} = req.body;
    if (!user_id || !status || !updated_by_user_id){
        return res.status(400).json({error:'user_id, status and updated_by_user_id are required'});
    }
    if (isNaN(parseInt(user_id)) || isNaN(parseInt(updated_by_user_id))){
         return res.status(400).json({ error: 'user_id and updated_by_user_id must be valid integers' });
    }
    if (![1, 2].includes(parseInt(status))) {
        return res.status(400).json({ error: 'Status must be  Approved or  Rejected' });
    }
    if (status == 2 && !feedback) {
        return res.status(400).json({ error: 'Feedback is required when status is Rejected ' });
    }
    if (status == 1 && feedback){
         return res.status(400).json({ error: 'Feedback must be null when status is Approved ' });
    }
    try {
        const userResult = await queryAsync('SELECT user_type FROM crm_users WHERE id = ?',[parseInt(user_id)]);
         if (!userResult.length) {
            return res.status(404).json({ error: 'User not found' });
        }
       const targetUserType = userResult[0].user_type;
       const updaterResult = await queryAsync('SELECT user_type FROM crm_users WHERE id = ?',[parseInt(updated_by_user_id)]);
        if (!updaterResult.length) {
            return res.status(400).json({ error: 'Invalid updated_by_user_id: User does not exist' });
        }
        const updaterUserType = updaterResult[0].user_type;
        if (updaterUserType === 1){
            if (![1, 2, 3, 4, 5, 6, 7].includes(targetUserType)) {
                return res.status(400).json({ error: 'Invalid user_type for target user' });
            }
        }
        else if (updaterUserType === 2 ){
            if (![3, 4, 5, 6, 7].includes(targetUserType)) {
                return res.status(403).json({ error: 'Builder can only update user types 3, 4, 5, 6, or 7' });
            }
        }
        else {
            return res.status(403).json({ error: 'Only Admin  or Builder  can update user status' });
        }
        const currentDate = moment().format('YYYY-MM-DD');
        const currentTime = moment().format('HH:mm:ss');
        await queryAsync('START TRANSACTION');
        const updateResult = await queryAsync(
            `UPDATE crm_users SET status = ?,feedback = ?,updated_date = ?,updated_time = ? WHERE id = ?`,
            [
                parseInt(status),
                feedback || null,
                currentDate,
                currentTime,
                parseInt(user_id)
            ]
        );
        if (updateResult.affectedRows === 0) {
            await queryAsync('ROLLBACK');
            return res.status(404).json({ error: 'User not found or no changes made' });
        }
        await queryAsync('COMMIT');
        res.status(200).json({
            message:'User status updated successfully',
            user_id: parseInt(user_id)
        });
    } catch (error) {
        await queryAsync('ROLLBACK');
        res.status(500).json({ error: 'Failed to update user status: ' + error.message });
    }

}

const getUserTypesByBuilder = async (req, res) => {
    let { admin_user_id, emp_user_id, emp_user_type } = req.query;

    // Validate admin_user_id
    if (!admin_user_id || isNaN(parseInt(admin_user_id))) {
        return res.status(400).json({ error: 'Valid admin_user_id is required' });
    }

    try {
        let query = `SELECT * FROM crm_users WHERE created_user_id = ?`;
        let params = [parseInt(admin_user_id)];

        // Handle emp_user_type filter
        if (emp_user_type) {
            const parsedEmpUserType = parseInt(emp_user_type.trim());
            if (!isNaN(parsedEmpUserType)) {
                query += ` AND user_type = ?`;
                params.push(parsedEmpUserType);
            }
        }

        // Handle emp_user_id filter
        if (emp_user_id) {
            const empUserIdArray = emp_user_id.split(',').map(i => parseInt(i.trim())).filter(n => !isNaN(n));
            if (empUserIdArray.length > 0) {
                const placeholders = empUserIdArray.map(() => '?').join(',');
                query += ` AND id IN (${placeholders})`;
                params.push(...empUserIdArray);
            }
        }

        const usersResult = await queryAsync(query, params);

        const users = usersResult.map(user => ({
            id: user.id,
            user_type: user.user_type,
            name: user.name,
            mobile: user.mobile,
            email: user.email,
            photo: user.photo,
            status: user.status,
            created_user_id: user.created_user_id,
            created_date: user.created_date,
            created_time: user.created_time,
            updated_date: user.updated_date,
            updated_time: user.updated_time,
            state: user.state,
            city: user.city,
            location: user.location,
            address: user.address,
            pincode: user.pincode,
            gst_number: user.gst_number,
            rera_number: user.rera_number,
            created_by: user.created_by,
            company_name: user.company_name,
            company_number: user.company_number,
            company_address: user.company_address,
            representative_name: user.representative_name,
            pan_card_number: user.pan_card_number,
            aadhar_number: user.aadhar_number,
            feedback: user.feedback
        }));

        res.status(200).json({ message: 'Users fetched successfully', data: users });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
    }
};

const getUserTypesCount = async (req, res) => {
  const { admin_user_type, admin_user_id,emp_id,emp_user_type } = req.query;

  try {
    let result = [];

    if (!admin_user_type || isNaN(parseInt(admin_user_type))){
        return res.status(400).json({ error: "admin_user_type is required and must be a valid integer" });
    }
    if (!admin_user_id || isNaN(parseInt(admin_user_id))) {
      return res.status(400).json({ error: "admin_user_id is required and must be a valid integer" });
    }
    const parsedAdminUserType = parseInt(admin_user_type);
    const parsedAdminUserId  = parseInt(admin_user_id);

    const today = moment().format("YYYY-MM-DD");

    if (parsedAdminUserType === 2  && parsedAdminUserId) {
        const leadsResult = await queryAsync(
        `SELECT 
          SUM(CASE WHEN status_id = 1 AND booked = 'No' THEN 1 ELSE 0 END) as new_leads_count,
          SUM(CASE WHEN created_date = ? AND booked = 'No' THEN 1 ELSE 0 END) as today_leads_count,
          SUM(CASE WHEN next_action IS NOT NULL AND updated_date = ? AND booked = 'No' THEN 1 ELSE 0 END) as today_follow_ups_count,
          SUM(CASE WHEN status_id = 5 AND booked = 'No' THEN 1 ELSE 0 END) as site_visit_done_count,
          SUM(CASE WHEN booked = 'Yes' THEN 1 ELSE 0 END) as booked_count
         FROM leads 
         WHERE (lead_added_user_id = ? OR assigned_id IS NOT NULL)`,
        [today, today, parsedAdminUserId]
      );

      result = [
        { user_type: "new_leads", count: leadsResult[0].new_leads_count || 0 },
        { user_type: "today_leads", count: leadsResult[0].today_leads_count || 0 },
        { user_type: "today_follow_ups", count: leadsResult[0].today_follow_ups_count || 0 },
        { user_type: "site_visit_done", count: leadsResult[0].site_visit_done_count || 0 },
        { user_type: "booked", count: leadsResult[0].booked_count || 0 },
      ];

      // Add project count for builder
      const projectsResult = await queryAsync(
        `SELECT COUNT(*) as project_count 
         FROM property 
         WHERE posted_by = ? AND user_id = ?`,
        [parsedAdminUserType, parsedAdminUserId]
      );
      result.push({ user_type: "projects", count: projectsResult[0].project_count });

      // Add user type counts for employees under builder
      const usersResult = await queryAsync(
        `SELECT user_type, COUNT(*) as count 
         FROM crm_users 
         WHERE user_type NOT IN (1, 2) AND created_user_id = ? 
         GROUP BY user_type`,
        [parsedAdminUserId]
      );
      result.push(...usersResult.map((row) => ({ user_type: row.user_type, count: row.count })));
    } 
    if ((emp_id && emp_user_type && !isNaN(parseInt(emp_id)) && !isNaN(parseInt(emp_user_type))) && (parsedAdminUserType === 2  && parsedAdminUserId)) {
      const parsedEmpId = parseInt(emp_id);
      const parsedEmpUserType = parseInt(emp_user_type);

      
      const projectsResult = await queryAsync(
        `SELECT COUNT(*) as project_count 
         FROM property 
         WHERE posted_by = ? AND user_id = ?`,
        [parsedAdminUserType, parsedAdminUserId]
      );

     
      const leadsResult = await queryAsync(
        `SELECT 
            COUNT(*) as all_projects_count, -- Note: This might be a misnomer; consider renaming if not intended for projects
            SUM(CASE WHEN status_id = 1 AND booked = 'No' THEN 1 ELSE 0 END) as new_leads_count,
            SUM(CASE WHEN created_date = ? AND booked = 'No' THEN 1 ELSE 0 END) as today_leads_count,
            SUM(CASE WHEN next_action IS NOT NULL AND updated_date = ? AND booked = 'No' THEN 1 ELSE 0 END) as today_follow_ups_count,
            SUM(CASE WHEN status_id = 5 AND booked = 'No' THEN 1 ELSE 0 END) as site_visit_done_count,
            SUM(CASE WHEN booked = 'Yes' THEN 1 ELSE 0 END) as booked_count
        FROM leads 
        WHERE assigned_id = ? 
            AND assigned_user_type = ? 
            AND lead_added_user_type = ? 
            AND lead_added_user_id = ?`,
        [today, today, parsedEmpId, parsedEmpUserType, parsedAdminUserType, parsedAdminUserId]
        );

      result = [
        { user_type: "all_projects", count: projectsResult[0].project_count || 0 },
        { user_type: "new_leads", count: leadsResult[0].new_leads_count || 0 },
        { user_type: "today_leads", count: leadsResult[0].today_leads_count || 0 },
        { user_type: "today_follow_ups", count: leadsResult[0].today_follow_ups_count || 0 },
        { user_type: "site_visit_done", count: leadsResult[0].site_visit_done_count || 0 },
        { user_type: "booked", count: leadsResult[0].booked_count || 0 },
      ];
    } else if (parsedAdminUserType !== 2) {
      return res.status(400).json({ error: "Invalid admin_user_type or missing emp_id and emp_user_type for non-builder" });
    }
    res.status(200).json({ message: "Data fetched successfully", data: result });
  } catch (error) {
    console.error("Error fetching user types count:", { error, queryParams: req.query });
    res.status(500).json({ error: "Failed to fetch data: " + error.message });
  }
};

const getUserProfile = async (req, res) => {
  const { admin_user_type, admin_user_id, emp_id, emp_user_type } = req.query;

  try {
   
    if (!admin_user_type || isNaN(parseInt(admin_user_type))) {
      return res.status(400).json({ error: "admin_user_type is required and must be a valid integer" });
    }
    if (!admin_user_id || isNaN(parseInt(admin_user_id))) {
      return res.status(400).json({ error: "admin_user_id is required and must be a valid integer" });
    }

    const parsedAdminUserType = parseInt(admin_user_type);
    const parsedAdminUserId = parseInt(admin_user_id);

    let query = `
      SELECT id, user_type, name, mobile, email, photo, status, created_date, created_time, 
             updated_date, updated_time, state, city, location, address, pincode, gst_number, 
             rera_number, created_by, created_user_id, created_user_type, company_name, 
             company_number, company_address, representative_name, pan_card_number, 
             aadhar_number, feedback 
      FROM crm_users 
    `;
    let params = [];

  
    if (!emp_id && !emp_user_type) {
      query += ` WHERE id = ? AND user_type = ?`;
      params = [parsedAdminUserId, parsedAdminUserType];
    } 
   
    else {
      if (!emp_id || isNaN(parseInt(emp_id))) {
        return res.status(400).json({ error: "emp_id is required and must be a valid integer" });
      }
      if (!emp_user_type || isNaN(parseInt(emp_user_type))) {
        return res.status(400).json({ error: "emp_user_type is required and must be a valid integer" });
      }

      const parsedEmpId = parseInt(emp_id);
      const parsedEmpUserType = parseInt(emp_user_type);

    
      query += ` WHERE created_user_id = ? AND created_user_type = ? AND id = ? AND user_type = ?`;
      params = [parsedAdminUserId, parsedAdminUserType, parsedEmpId, parsedEmpUserType];
    }

    const usersResult = await queryAsync(query, params);

    if (usersResult.length === 0) {
      return res.status(404).json({
        error: !emp_id && !emp_user_type ? "Builder not found" : "No employees found for the given admin and employee details",
      });
    }

    const users = usersResult.map((user) => ({
      id: user.id,
      user_type: user.user_type,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      photo: user.photo,
      status: user.status,
      created_date: user.created_date,
      created_time: user.created_time,
      updated_date: user.updated_date,
      updated_time: user.updated_time,
      state: user.state,
      city: user.city,
      location: user.location,
      address: user.address,
      pincode: user.pincode,
      gst_number: user.gst_number,
      rera_number: user.rera_number,
      created_by: user.created_by,
      created_user_id: user.created_user_id,
      created_user_type: user.created_user_type,
      company_name: user.company_name,
      company_number: user.company_number,
      company_address: user.company_address,
      representative_name: user.representative_name,
      pan_card_number: user.pan_card_number,
      aadhar_number: user.aadhar_number,
      feedback: user.feedback,
    }));

    res.status(200).json({
      message: "User profile fetched successfully",
      data: users,
    });
  } catch (error) {
    console.error("Error fetching user profile:", { error, queryParams: req.query });
    res.status(500).json({ error: "Failed to fetch data: " + error.message });
  }
};


module.exports = {insertCrmUser,updateUserStatus,getUserTypesByBuilder,getUserTypesCount,getUserProfile}