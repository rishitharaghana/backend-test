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
    const { user_type, created_user_id } = req.query;
    if (!user_type || isNaN(parseInt(user_type))) {
        return res.status(400).json({ error: 'Valid user_type is required' });
    }
    if (!created_user_id || isNaN(parseInt(created_user_id))) {
        return res.status(400).json({ error: 'Valid created_user_id is required' });
    }

    try {
        const usersResult = await queryAsync(
            `SELECT * FROM crm_users WHERE user_type = ? AND created_user_id = ?`,
            [parseInt(user_type), parseInt(created_user_id)]
        );
        if (usersResult.length === 0) {
            return res.status(200).json({ message: 'No users found', data: [] });
        }
        const users = usersResult.map(user => ({
            id: user.id,
            user_type: user.user_type,
            name: user.name,
            mobile: user.mobile,
            email: user.email,
            photo:user.photo,
            status: user.status,
            created_user_id: user.created_user_id,
            created_date: user.created_date,
            created_time: user.created_time,
            updated_date:user.updated_date,
            updated_time:user.updated_time,
            state:user.state,
            city:user.city,
            location:user.location,
            address:user.address,
            pincode:user.pincode,
            gst_number:user.gst_number,
            rera_number:user.rera_number,
            created_by:user.created_by,
            created_user_id:user.created_user_id,
            company_name:user.company_name,
            company_number:user.company_number,
            company_address:user.company_address,
            representative_name:user.representative_name,
            pan_card_number:user.pan_card_number,
            aadhar_number:user.aadhar_number,
            feedback:user.feedback
            
        }));

        res.status(200).json({ message: 'Users fetched successfully', data: users });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
    }
};

const getUserTypesCount = async (req, res) => {
  const { user_id, user_type, admin_user_id } = req.query;

  try {
    let result = [];

    
    if (!user_type || isNaN(parseInt(user_type))) {
      return res.status(400).json({ error: "user_type is required and must be a valid integer" });
    }

    const parsedUserType = parseInt(user_type);
    const today = moment().format("YYYY-MM-DD");

    if (parsedUserType === 2 && user_id && !isNaN(parseInt(user_id))) {
      const parsedUserId = parseInt(user_id);

      
      const usersResult = await queryAsync(
        `SELECT user_type, COUNT(*) as count 
         FROM crm_users 
         WHERE user_type NOT IN (1, 2) AND created_user_id = ? 
         GROUP BY user_type`,
        [parsedUserId]
      );

  
      const projectsResult = await queryAsync(
        `SELECT COUNT(*) as project_count 
         FROM property 
         WHERE posted_by = ? AND user_id = ?`,
        [parsedUserType, parsedUserId]
      );

      // Get lead counts for New Leads, Today Leads, Today Follow Ups, Site Visit Done, Booked
      const leadsResult = await queryAsync(
        `SELECT 
          SUM(CASE WHEN status_id = 1 AND booked = 'No' THEN 1 ELSE 0 END) as new_leads_count,
          SUM(CASE WHEN created_date = ? AND booked = 'No' THEN 1 ELSE 0 END) as today_leads_count,
          SUM(CASE WHEN next_action IS NOT NULL AND updated_date = ? AND booked = 'No' THEN 1 ELSE 0 END) as today_follow_ups_count,
          SUM(CASE WHEN status_id = 5 AND booked = 'No' THEN 1 ELSE 0 END) as site_visit_done_count,
          SUM(CASE WHEN booked = 'Yes' THEN 1 ELSE 0 END) as booked_count
         FROM leads 
         WHERE lead_added_user_type = ? AND lead_added_user_id = ?`,
        [today, today, parsedUserType, parsedUserId]
      );

      result = [
        ...usersResult.map((row) => ({ user_type: row.user_type, count: row.count })),
        { user_type: "projects", count: projectsResult[0].project_count },
        { user_type: "new_leads", count: leadsResult[0].new_leads_count || 0 },
        { user_type: "today_leads", count: leadsResult[0].today_leads_count || 0 },
        { user_type: "today_follow_ups", count: leadsResult[0].today_follow_ups_count || 0 },
        { user_type: "site_visit_done", count: leadsResult[0].site_visit_done_count || 0 },
        { user_type: "booked", count: leadsResult[0].booked_count || 0 },
      ];
    } else if ([3, 4, 5, 6, 7].includes(parsedUserType) && admin_user_id && !isNaN(parseInt(admin_user_id))) {
      const parsedAdminUserId = parseInt(admin_user_id);

      // Get project count
      const projectsResult = await queryAsync(
        `SELECT COUNT(*) as project_count 
         FROM property 
         WHERE user_id = ?`,
        [parsedAdminUserId]
      );

     
      const leadsResult = await queryAsync(
        `SELECT 
          SUM(CASE WHEN status_id = 1 AND booked = 'No' THEN 1 ELSE 0 END) as new_leads_count,
          SUM(CASE WHEN created_date = ? AND booked = 'No' THEN 1 ELSE 0 END) as today_leads_count,
          SUM(CASE WHEN next_action IS NOT NULL AND updated_date = ? AND booked = 'No' THEN 1 ELSE 0 END) as today_follow_ups_count,
          SUM(CASE WHEN status_id = 5 AND booked = 'No' THEN 1 ELSE 0 END) as site_visit_done_count,
          SUM(CASE WHEN booked = 'Yes' THEN 1 ELSE 0 END) as booked_count
         FROM leads 
         WHERE assigned_user_type = ? AND assigned_id = ?`,
        [today, today, parsedUserType, parsedAdminUserId]
      );

      result = [
        { user_type: "projects", count: projectsResult[0].project_count },
        { user_type: "new_leads", count: leadsResult[0].new_leads_count || 0 },
        { user_type: "today_leads", count: leadsResult[0].today_leads_count || 0 },
        { user_type: "today_follow_ups", count: leadsResult[0].today_follow_ups_count || 0 },
        { user_type: "site_visit_done", count: leadsResult[0].site_visit_done_count || 0 },
        { user_type: "booked", count: leadsResult[0].booked_count || 0 },
      ];
    } else {
      return res.status(400).json({ error: "Invalid user_type or missing required parameters" });
    }

    res.status(200).json({ message: "Data fetched successfully", data: result });
  } catch (error) {
    console.error("Error fetching user types count:", { error, queryParams: req.query });
    res.status(500).json({ error: "Failed to fetch data: " + error.message });
  }
};



module.exports = {insertCrmUser,updateUserStatus,getUserTypesByBuilder,getUserTypesCount}