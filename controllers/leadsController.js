const moment = require("moment");
const pool = require("../config/db");
const util = require("util");

const queryAsync = util.promisify(pool.query).bind(pool);

const insertLead = async (req, res) => {
  const {
    customer_name,
    customer_phone_number,
    customer_email,
    interested_project_id,
    interested_project_name,
    lead_source_id,
    channel_partner_id,
    channel_partner_name,
    channel_partner_mobile,
    assigned_user_type,
    assigned_id,
    assigned_name,
    assigned_emp_number,
    assigned_priority,
    lead_added_user_type,
    lead_added_user_id,
  } = req.body;

  
  if (!customer_name || !customer_phone_number || !customer_email || !interested_project_id ||
      !interested_project_name || !lead_source_id || lead_added_user_type === undefined ||
      lead_added_user_id === undefined) {
    return res.status(400).json({
      status: "error",
      message: "Missing required fields: customer_name, customer_phone_number, customer_email, interested_project_id, interested_project_name, lead_source_id, lead_added_user_type, lead_added_user_id",
    });
  }

  
  if (lead_source_id === 6 && (!channel_partner_id || !channel_partner_name || !channel_partner_mobile)) {
    return res.status(400).json({
      status: "error",
      message: "Channel partner details (channel_partner_id, channel_partner_name, channel_partner_mobile) are required when lead_source_id is 6",
    });
  }

  const created_date = moment().format("YYYY-MM-DD");
  const created_time = moment().format("HH:mm:ss");
  const updated_date = moment().format("YYYY-MM-DD");
  const updated_time = moment().format("HH:mm:ss");

  try {
    const insertQuery = `
      INSERT INTO leads (
        customer_name, customer_phone_number, customer_email, interested_project_id,
        interested_project_name, lead_source_id, channel_partner_id, channel_partner_name,
        channel_partner_mobile, created_date, created_time, updated_date, updated_time,
        assigned_id, assigned_name, assigned_emp_number, assigned_priority,
        lead_added_user_type, lead_added_user_id,assigned_user_type,
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    pool.query(
      insertQuery,
        [
        customer_name,
        customer_phone_number,
        customer_email,
        interested_project_id,
        interested_project_name,
        lead_source_id,
        channel_partner_id || null,
        channel_partner_name || null,
        channel_partner_mobile || null,
        created_date,
        created_time,
        updated_date,
        updated_time,
        assigned_id || null,
        assigned_name || null,
        assigned_emp_number || null,
        assigned_priority || null,
        lead_added_user_type,
        lead_added_user_id,
        assigned_user_type || null,
      ],
      (err, result) => {
        if (err) {
          console.error("Insert Error:", err);
          return res.status(500).json({
            status: "error",
            message: "Failed to insert lead",
          });
        }
        return res.status(201).json({
          status: "success",
          message: "Lead inserted successfully",
          lead_id: result.insertId,
        });
      }
    );
  } catch (error) {
    console.error("Insert Error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to insert lead",
    });
  }
};

const getLeadsByUser = async (req, res) => {
  const { lead_added_user_type, lead_added_user_id, assigned_user_type, assigned_id } = req.query;

  if (!lead_added_user_type || !lead_added_user_id) {
    return res.status(400).json({
      status: "error",
      message: "lead_added_user_type and lead_added_user_id are required",
    });
  }
  try {
    let query = `
      SELECT * FROM leads 
      WHERE lead_added_user_type = ? AND lead_added_user_id = ?
    `;
    const queryParams = [lead_added_user_type, lead_added_user_id];

    if (assigned_user_type && assigned_id) {
      query += ` AND assigned_user_type = ? AND assigned_id = ?`;
      queryParams.push(assigned_user_type, assigned_id);
    }

    query += ` ORDER BY created_date DESC, created_time DESC`;

    const results = await queryAsync(query, queryParams);

    if (results.length === 0) {
      return res.status(404).json({ status: "error", message: "No leads found for the given user" });
    }

    res.status(200).json({ status: "success", results });
  } catch (error) {
    console.error("Error fetching leads:", { error, queryParams: req.query });
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const assignLeadToEmployee = async (req, res) => {
  const { lead_id, assigned_user_type, assigned_id, assigned_name, assigned_emp_number, assigned_priority, followup_feedback, next_action } = req.body;

  
  if (!lead_id || !assigned_user_type || !assigned_id || !assigned_name || !assigned_emp_number || !assigned_priority || !followup_feedback || !next_action) {
    return res.status(400).json({
      status: "error",
      message: "lead_id, assigned_user_type, assigned_id, assigned_name, assigned_emp_number, assigned_priority, followup_feedback, and next_action are required",
    });
  }


  const parsedLeadId = parseInt(lead_id, 10);
  if (isNaN(parsedLeadId)) {
    return res.status(400).json({
      status: "error",
      message: "lead_id must be a valid integer",
    });
  }

  const assigned_date = moment().format("YYYY-MM-DD");
  const assigned_time = moment().format("HH:mm:ss");
  const updated_date = moment().format("YYYY-MM-DD");
  const updated_time = moment().format("HH:mm:ss");

  try {
    const updateQuery = `
      UPDATE leads 
      SET assigned_user_type = ?, assigned_id = ?, assigned_name = ?, assigned_emp_number = ?, 
          assigned_date = ?, assigned_time = ?, updated_date = ?, updated_time = ?, 
          assigned_priority = ?, follow_up_feedback = ?, next_action = ?
      WHERE lead_id = ?
    `;
    const result = await queryAsync(updateQuery, [
      assigned_user_type,
      assigned_id,
      assigned_name,
      assigned_emp_number,
      assigned_date,
      assigned_time,
      updated_date,
      updated_time,
      assigned_priority,
      followup_feedback,
      next_action,
      parsedLeadId, 
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: "error", message: "Lead not found" });
    }
    res.status(200).json({ status: "success", message: "Lead assigned successfully" });
  } catch (error) {
    console.error("Error assigning lead:", error);
    res.status(500).json({ status: "error", message: "Failed to assign lead" });
  }
};

const updateLeadByEmployee = async (req, res) => {
  const { lead_id, follow_up_feedback, next_action, status_change, updated_by_emp_type, updated_by_emp_id, updated_by_emp_name, updated_emp_phone } = req.body;

  if (!lead_id || !updated_by_emp_type || !updated_by_emp_id || !updated_by_emp_name || !updated_emp_phone) {
    return res.status(400).json({
      status: "error",
      message: "lead_id, updated_by_emp_type, updated_by_emp_id, updated_by_emp_name, and updated_emp_phone are required",
    });
  }

  const update_date = moment().format("YYYY-MM-DD");
  const update_time = moment().format("HH:mm:ss"); 

  try {
    await queryAsync("START TRANSACTION");
    const updateQuery = `
      INSERT INTO lead_updates (
        lead_id, update_date, update_time, feedback, next_action, status_change,
        updated_by_emp_type, updated_by_emp_id, updated_by_emp_name, updated_emp_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await queryAsync(updateQuery, [
      lead_id,
      update_date,
      update_time,
      follow_up_feedback || null,
      next_action || null,
      status_change || null,
      updated_by_emp_type,
      updated_by_emp_id,
      updated_by_emp_name,
      updated_emp_phone,
    ]);

  
    const updateLeadsQuery = `
      UPDATE leads 
      SET updated_date = ?, updated_time = ?, lead_status = ?
      WHERE lead_id = ?
    `;
    await queryAsync(updateLeadsQuery, [update_date, update_time, status_change, lead_id]);

    
    await queryAsync("COMMIT");

    res.status(200).json({ status: "success", message: "Lead updated successfully" });
  } catch (error) {
   
    await queryAsync("ROLLBACK");
    console.error("Error updating lead:", error);
    res.status(500).json({ status: "error", message: "Failed to update lead" });
  }
};

const getLeadUpdatesByLeadId = async (req, res) => {
  const { lead_id } = req.query;

  if (!lead_id) {
    return res.status(400).json({
      status: "error",
      message: "lead_id is required",
    });
  }

  const parsedLeadId = parseInt(lead_id, 10);
  if (isNaN(parsedLeadId)) {
    return res.status(400).json({
      status: "error",
      message: "lead_id must be a valid integer",
    });
  }

  try {
    const query = `
      SELECT * FROM lead_updates 
      WHERE lead_id = ?
      ORDER BY update_date DESC, update_time DESC
    `;
    const results = await queryAsync(query, [parsedLeadId]);

    if (results.length === 0) {
      return res.status(404).json({ message: "No updates found for the given lead_id" });
    }
    res.status(200).json({ results });
  } catch (error) {
    console.error("Error fetching lead updates:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



module.exports = {
  insertLead,
  getLeadsByUser,
  assignLeadToEmployee,
  updateLeadByEmployee,
  getLeadUpdatesByLeadId
};