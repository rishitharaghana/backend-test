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

  // Validate required fields
  if (
    !customer_name ||
    !customer_phone_number ||
    !customer_email ||
    !interested_project_id ||
    !interested_project_name ||
    !lead_source_id ||
    lead_added_user_type === undefined ||
    lead_added_user_id === undefined
  ) {
    return res.status(400).json({
      status: "error",
      message:
        "Missing required fields: customer_name, customer_phone_number, customer_email, interested_project_id, interested_project_name, lead_source_id, lead_added_user_type, lead_added_user_id",
    });
  }

  // Validate channel partner details for lead_source_id === 6
  if (lead_source_id === 6 && (!channel_partner_id || !channel_partner_name || !channel_partner_mobile)) {
    return res.status(400).json({
      status: "error",
      message:
        "Channel partner details (channel_partner_id, channel_partner_name, channel_partner_mobile) are required when lead_source_id is 6",
    });
  }

  // Validate numeric fields
  const parsedInterestedProjectId = parseInt(interested_project_id, 10);
  const parsedLeadSourceId = parseInt(lead_source_id, 10);
  const parsedChannelPartnerId = channel_partner_id ? parseInt(channel_partner_id, 10) : null;
  const parsedAssignedUserType = assigned_user_type ? parseInt(assigned_user_type, 10) : null;
  const parsedAssignedId = assigned_id ? parseInt(assigned_id, 10) : null;
  const parsedLeadAddedUserType = parseInt(lead_added_user_type, 10);
  const parsedLeadAddedUserId = parseInt(lead_added_user_id, 10);

  if (
    isNaN(parsedInterestedProjectId) ||
    isNaN(parsedLeadSourceId) ||
    (channel_partner_id && isNaN(parsedChannelPartnerId)) ||
    (assigned_user_type && isNaN(parsedAssignedUserType)) ||
    (assigned_id && isNaN(parsedAssignedId)) ||
    isNaN(parsedLeadAddedUserType) ||
    isNaN(parsedLeadAddedUserId)
  ) {
    return res.status(400).json({
      status: "error",
      message: "Numeric fields must be valid integers",
    });
  }

  // Validate foreign key constraints
  try {
    const projectCheck = await queryAsync("SELECT property_id FROM property WHERE property_id = ?", [parsedInterestedProjectId]);
    if (projectCheck.length === 0) {
      return res.status(400).json({ status: "error", message: "Invalid interested_project_id" });
    }
    const sourceCheck = await queryAsync("SELECT lead_source_id FROM lead_source WHERE lead_source_id = ?", [parsedLeadSourceId]);
    if (sourceCheck.length === 0) {
      return res.status(400).json({ status: "error", message: "Invalid lead_source_id" });
    }
    if (parsedChannelPartnerId) {
      const channelPartnerCheck = await queryAsync("SELECT id FROM crm_users WHERE id = ?", [parsedChannelPartnerId]);
      if (channelPartnerCheck.length === 0) {
        return res.status(400).json({ status: "error", message: "Invalid channel_partner_id" });
      }
    }
    if (parsedAssignedId) {
      const userCheck = await queryAsync("SELECT id FROM crm_users WHERE id = ?", [parsedAssignedId]);
      if (userCheck.length === 0) {
        return res.status(400).json({ status: "error", message: "Invalid assigned_id" });
      }
    }
    const leadAddedUserCheck = await queryAsync("SELECT id FROM crm_users WHERE id = ?", [parsedLeadAddedUserId]);
    if (leadAddedUserCheck.length === 0) {
      return res.status(400).json({ status: "error", message: "Invalid lead_added_user_id" });
    }

    // Fetch the default status_id for "Open"
    const defaultStatusCheck = await queryAsync("SELECT status_id FROM lead_statuses WHERE is_default = TRUE LIMIT 1");
    if (defaultStatusCheck.length === 0) {
      return res.status(500).json({ status: "error", message: "Default status not found in lead_statuses" });
    }
    const defaultStatusId = defaultStatusCheck[0].status_id;

    const created_date = moment().format("YYYY-MM-DD");
    const created_time = moment().format("HH:mm:ss");
    const updated_date = moment().format("YYYY-MM-DD");
    const updated_time = moment().format("HH:mm:ss");

    const insertQuery = `
      INSERT INTO leads (
        customer_name, customer_phone_number, customer_email, interested_project_id,
        interested_project_name, lead_source_id, channel_partner_id, channel_partner_name,
        channel_partner_mobile, created_date, created_time, updated_date, updated_time,
        assigned_user_type, assigned_id, assigned_name, assigned_emp_number, assigned_priority,
        lead_added_user_type, lead_added_user_id, status_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      customer_name,
      customer_phone_number,
      customer_email,
      parsedInterestedProjectId,
      interested_project_name,
      parsedLeadSourceId,
      parsedChannelPartnerId,
      channel_partner_name || null,
      channel_partner_mobile || null,
      created_date,
      created_time,
      updated_date,
      updated_time,
      parsedAssignedUserType,
      parsedAssignedId,
      assigned_name || null,
      assigned_emp_number || null,
      assigned_priority || null,
      parsedLeadAddedUserType,
      parsedLeadAddedUserId,
      defaultStatusId,
    ];

    console.log("Values array:", values, "Length:", values.length);
    const result = await queryAsync(insertQuery, values);

    return res.status(201).json({
      status: "success",
      message: "Lead inserted successfully",
      lead_id: result.insertId,
    });
  } catch (error) {
    console.error("Insert Error:", {
      error,
      input: req.body,
      values,
      sql: insertQuery,
    });
    return res.status(500).json({
      status: "error",
      message: "Failed to insert lead",
      error: error.message,
    });
  }
};

const getLeadsByUser = async (req, res) => {
  const { lead_added_user_type, lead_added_user_id, assigned_user_type, assigned_id,status_id} = req.query;

  if (!lead_added_user_type || !lead_added_user_id) {
    return res.status(400).json({
      status: "error",
      message: "lead_added_user_type and lead_added_user_id are required",
    });
  }
  let parsedStatusId;
  if (status_id){
    parsedStatusId = parseInt(status_id,10);
    if (isNaN(parsedStatusId)){
        return res.status(400).json({
          status: "error",
          message: "status_id must be a valid integer",
        });
    }
    const statusCheck = await queryAsync('SELECT status_id FROM lead_statuses WHERE status_id = ?',[parsedStatusId]);
    if (statusCheck.length === 0 && parsedStatusId !== 0){
      return res.status(400).json({ status: "error", message: "Invalid status_id" });
    }
  }
  try {
    let query = `
      SELECT l.*, ls.status_name 
      FROM leads l 
      JOIN lead_statuses ls ON l.status_id = ls.status_id 
      WHERE l.lead_added_user_type = ? AND l.lead_added_user_id = ? AND l.booked = 'No'
    `;
    const queryParams = [lead_added_user_type, lead_added_user_id];

    if (status_id){
      if (parsedStatusId === 0){
        //today leads : leads created today
        query+= 'AND l.created_date = ?';
        queryParams.push(moment().format('YYYY-MM-DD'));
      }
      else if (parsedStatusId === 2){
        //today follow ups
        query += `AND l.next_action IS NOT NULL AND l.updated_date = ?`;
        queryParams.push(moment().format('YYYY-MM-DD'));
      }
      else {
        //other statys (NEW Leads,Won,Lost,Site Visit scheduled,site vist lost)
        query += `AND l.status_id = ?`;
        queryParams.push(parsedStatusId);
      }
    }

    if (assigned_user_type && assigned_id) {
      query += ` AND l.assigned_user_type = ? AND l.assigned_id = ?`;
      queryParams.push(assigned_user_type, assigned_id);
    }

    query += ` ORDER BY l.created_date DESC, l.created_time DESC`;

    const results = await queryAsync(query, queryParams);

    if (results.length === 0) {
      return res.status(404).json({ status: "error", message: "No leads found for the given user" });
    }
      const formattedResults = results.map((lead) => ({
      ...lead,
      created_date: moment(lead.created_date).format("YYYY-MM-DD"),
      updated_date: moment(lead.updated_date).format("YYYY-MM-DD"),
      assigned_date: lead.assigned_date ? moment(lead.assigned_date).format("YYYY-MM-DD") : null,
    }));
    res.status(200).json({ status: "success", results:formattedResults });
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
  const { lead_id, follow_up_feedback, next_action, status_id, updated_by_emp_type, updated_by_emp_id, updated_by_emp_name, updated_emp_phone } = req.body;

  if (!lead_id || !updated_by_emp_type || !updated_by_emp_id || !updated_by_emp_name || !updated_emp_phone) {
    return res.status(400).json({
      status: "error",
      message: "lead_id, updated_by_emp_type, updated_by_emp_id, updated_by_emp_name, and updated_emp_phone are required",
    });
  }

  // Validate status_id if provided
  if (status_id) {
    const parsedStatusId = parseInt(status_id, 10);
    if (isNaN(parsedStatusId)) {
      return res.status(400).json({
        status: "error",
        message: "status_id must be a valid integer",
      });
    }
    const statusCheck = await queryAsync("SELECT status_id FROM lead_statuses WHERE status_id = ?", [parsedStatusId]);
    if (statusCheck.length === 0) {
      return res.status(400).json({ status: "error", message: "Invalid status_id" });
    }
  }

  const update_date = moment().format("YYYY-MM-DD");
  const update_time = moment().format("HH:mm:ss");

  try {
    await queryAsync("START TRANSACTION");
    const updateQuery = `
      INSERT INTO lead_updates (
        lead_id, update_date, update_time, feedback, next_action, status_id,
        updated_by_emp_type, updated_by_emp_id, updated_by_emp_name, updated_emp_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await queryAsync(updateQuery, [
      lead_id,
      update_date,
      update_time,
      follow_up_feedback || null,
      next_action || null,
      status_id || null,
      updated_by_emp_type,
      updated_by_emp_id,
      updated_by_emp_name,
      updated_emp_phone,
    ]);

    // Update the leads table with the new status_id if provided
    if (status_id) {
      const updateLeadsQuery = `
        UPDATE leads 
        SET updated_date = ?, updated_time = ?, status_id = ?
        WHERE lead_id = ?
      `;
      await queryAsync(updateLeadsQuery, [update_date, update_time, status_id, lead_id]);
    } else {
      // Update only the timestamps if no status_id is provided
      const updateLeadsQuery = `
        UPDATE leads 
        SET updated_date = ?, updated_time = ?
        WHERE lead_id = ?
      `;
      await queryAsync(updateLeadsQuery, [update_date, update_time, lead_id]);
    }

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
      SELECT lu.*, ls.status_name 
      FROM lead_updates lu 
      LEFT JOIN lead_statuses ls ON lu.status_id = ls.status_id 
      WHERE lu.lead_id = ?
      ORDER BY lu.update_date DESC, lu.update_time DESC
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
  getLeadUpdatesByLeadId,
};