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
    sqft,
    budget,
    assigned_user_type,
    assigned_id,
    assigned_name,
    assigned_emp_number,
    assigned_priority,
    lead_added_user_type,
    lead_added_user_id,
  } = req.body;

  
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
  if (lead_source_id === 6 && (!assigned_id || !assigned_name || !assigned_emp_number)) {
    return res.status(400).json({
      status: "error",
      message:
        "Channel partner details (assigned_id, assigned_name, assigned_emp_number) are required when lead_source_id is 6",
    });
  }

  // Validate numeric fields
 const parsedInterestedProjectId = parseInt(interested_project_id, 10);
  const parsedLeadSourceId = parseInt(lead_source_id, 10);
  const parsedAssignedUserType = assigned_user_type ? parseInt(assigned_user_type, 10) : null;
  const parsedAssignedId = assigned_id ? parseInt(assigned_id, 10) : null;
  const parsedLeadAddedUserType = parseInt(lead_added_user_type, 10);
  const parsedLeadAddedUserId = parseInt(lead_added_user_id, 10);

  if (
    isNaN(parsedInterestedProjectId) ||
    isNaN(parsedLeadSourceId) ||
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

 try {
    const projectCheck = await queryAsync("SELECT property_id FROM property WHERE property_id = ?", [parsedInterestedProjectId]);
    if (projectCheck.length === 0) {
      return res.status(400).json({ status: "error", message: "Invalid interested_project_id" });
    }
    const sourceCheck = await queryAsync("SELECT lead_source_id FROM lead_source WHERE lead_source_id = ?", [parsedLeadSourceId]);
    if (sourceCheck.length === 0) {
      return res.status(400).json({ status: "error", message: "Invalid lead_source_id" });
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
        interested_project_name, lead_source_id, created_date, created_time, updated_date,
        updated_time, assigned_user_type, assigned_id, assigned_name, assigned_emp_number,
        assigned_priority, lead_added_user_type, lead_added_user_id, status_id, sqft, budget
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      customer_name,
      customer_phone_number,
      customer_email,
      parsedInterestedProjectId,
      interested_project_name,
      parsedLeadSourceId,
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
      sqft || null, 
      budget || null, 
    ];


 
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
  const { lead_id, assigned_user_type, assigned_id, assigned_name, assigned_emp_number, assigned_priority, followup_feedback, next_action,lead_added_user_type, lead_added_user_id } = req.body;

  // Validate required fields
  if (!lead_id || !assigned_user_type || !assigned_id || !assigned_name || !assigned_emp_number || !assigned_priority || !followup_feedback || !next_action || !lead_added_user_type || !lead_added_user_id) {
    return res.status(400).json({
      status: "error",
      message: "lead_id, assigned_user_type, assigned_id, assigned_name, assigned_emp_number, assigned_priority, followup_feedback, and next_action ,lead_added_user_type, and lead_added_user_id are required",
    });
  }

  const parsedLeadId = parseInt(lead_id, 10);
  const parsedLeadAddedUserType = parseInt(lead_added_user_type, 10);
  const parsedLeadAddedUserId = parseInt(lead_added_user_id, 10);
  if (isNaN(parsedLeadId) || isNaN(parsedLeadAddedUserType) || isNaN(parsedLeadAddedUserId)) {
    return res.status(400).json({
      status: "error",
      message: "lead_id, lead_added_user_type, and lead_added_user_id must be valid integers",
    });
  }

  const assigned_date = moment().format("YYYY-MM-DD");
  const assigned_time = moment().format("HH:mm:ss");
  const updated_date = moment().format("YYYY-MM-DD");
  const updated_time = moment().format("HH:mm:ss");

  try {
    await queryAsync("START TRANSACTION");

    // Update the leads table
    const updateQuery = `
      UPDATE leads 
      SET assigned_user_type = ?, assigned_id = ?, assigned_name = ?, assigned_emp_number = ?, 
          assigned_date = ?, assigned_time = ?, updated_date = ?, updated_time = ?, 
          assigned_priority = ?, follow_up_feedback = ?, next_action = ?
      WHERE lead_id = ?
    `;
    const updateResult = await queryAsync(updateQuery, [
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

    if (updateResult.affectedRows === 0) {
      await queryAsync("ROLLBACK");
      return res.status(404).json({ status: "error", message: "Lead not found" });
    }

   
    const insertUpdateQuery = `
      INSERT INTO lead_updates (
        lead_id, update_date, update_time, feedback, next_action, 
        updated_by_emp_type, updated_by_emp_id, updated_by_emp_name, updated_emp_phone,
        lead_added_user_type, lead_added_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await queryAsync(insertUpdateQuery, [
      parsedLeadId,
      assigned_date,
      assigned_time,
      followup_feedback,
      next_action,
      assigned_user_type,
      assigned_id,
      assigned_name,
      assigned_emp_number,
      parsedLeadAddedUserType,
      parsedLeadAddedUserId,
    ]);

    await queryAsync("COMMIT");

    
    const leadQuery = `
      SELECT * FROM leads WHERE lead_id = ?
    `;
    const leadResult = await queryAsync(leadQuery, [parsedLeadId]);
    const updatedLead = leadResult[0];

    res.status(200).json({
      status: "success",
      message: "Lead assigned successfully",
      data: updatedLead,
    });
  } catch (error) {
    await queryAsync("ROLLBACK");
    console.error("Error assigning lead:", error);
    res.status(500).json({ status: "error", message: "Failed to assign lead" });
  }

 
};

const updateLeadByEmployee = async (req, res) => {
  const { lead_id, follow_up_feedback, next_action, status_id, updated_by_emp_type, updated_by_emp_id, updated_by_emp_name, updated_emp_phone, lead_added_user_type, lead_added_user_id } = req.body;

 
  if (!lead_id || !updated_by_emp_type || !updated_by_emp_id || !updated_by_emp_name || !updated_emp_phone || !lead_added_user_type || !lead_added_user_id) {
    return res.status(400).json({
      status: "error",
      message: "lead_id, updated_by_emp_type, updated_by_emp_id, updated_by_emp_name, updated_emp_phone, lead_added_user_type, and lead_added_user_id are required",
    });
  }


  const parsedLeadId = parseInt(lead_id, 10);
  const parsedStatusId = status_id ? parseInt(status_id, 10) : null;
  const parsedUpdatedByEmpType = parseInt(updated_by_emp_type, 10);
  const parsedUpdatedByEmpId = parseInt(updated_by_emp_id, 10);
  const parsedLeadAddedUserType = parseInt(lead_added_user_type, 10);
  const parsedLeadAddedUserId = parseInt(lead_added_user_id, 10);

  if (isNaN(parsedLeadId) || (status_id && isNaN(parsedStatusId)) || isNaN(parsedUpdatedByEmpType) || isNaN(parsedUpdatedByEmpId) || isNaN(parsedLeadAddedUserType) || isNaN(parsedLeadAddedUserId)) {
    return res.status(400).json({
      status: "error",
      message: "lead_id, updated_by_emp_type, updated_by_emp_id, lead_added_user_type, and lead_added_user_id must be valid integers; status_id must be a valid integer if provided",
    });
  }


  if (status_id) {
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
        updated_by_emp_type, updated_by_emp_id, updated_by_emp_name, updated_emp_phone,
        lead_added_user_type, lead_added_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await queryAsync(updateQuery, [
      parsedLeadId,
      update_date,
      update_time,
      follow_up_feedback || null,
      next_action || null,
      parsedStatusId || null,
      parsedUpdatedByEmpType,
      parsedUpdatedByEmpId,
      updated_by_emp_name,
      updated_emp_phone,
      parsedLeadAddedUserType,
      parsedLeadAddedUserId,
    ]);

   
    if (status_id) {
      const updateLeadsQuery = `
        UPDATE leads 
        SET updated_date = ?, updated_time = ?, status_id = ?
        WHERE lead_id = ?
      `;
      await queryAsync(updateLeadsQuery, [update_date, update_time, parsedStatusId, parsedLeadId]);
    } else {
      
      const updateLeadsQuery = `
        UPDATE leads 
        SET updated_date = ?, updated_time = ?
        WHERE lead_id = ?
      `;
      await queryAsync(updateLeadsQuery, [update_date, update_time, parsedLeadId]);
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
  const { lead_id, lead_added_user_type, lead_added_user_id } = req.query;

  
  if (!lead_id || !lead_added_user_type || !lead_added_user_id) {
    return res.status(400).json({
      status: "error",
      message: "lead_id, lead_added_user_type, and lead_added_user_id are required",
    });
  }

  const parsedLeadId = parseInt(lead_id, 10);
  const parsedLeadAddedUserType = parseInt(lead_added_user_type, 10);
  const parsedLeadAddedUserId = parseInt(lead_added_user_id, 10);

  if (isNaN(parsedLeadId) || isNaN(parsedLeadAddedUserType) || isNaN(parsedLeadAddedUserId)) {
    return res.status(400).json({
      status: "error",
      message: "lead_id, lead_added_user_type, and lead_added_user_id must be valid integers",
    });
  }

  try {
    const query = `
      SELECT lu.*, ls.status_name, lu.lead_added_user_id, lu.lead_added_user_type
      FROM lead_updates lu 
      LEFT JOIN lead_statuses ls ON lu.status_id = ls.status_id 
      WHERE lu.lead_id = ?
        AND lu.lead_added_user_type = ?
        AND lu.lead_added_user_id = ?
      ORDER BY lu.update_date DESC, lu.update_time DESC
    `;
    const params = [parsedLeadId, parsedLeadAddedUserType, parsedLeadAddedUserId];

    const results = await queryAsync(query, params);

    if (results.length === 0) {
      return res.status(404).json({ message: "No updates found for the given lead_id, lead_added_user_type, and lead_added_user_id" });
    }
    res.status(200).json({ results });
  } catch (error) {
    console.error("Error fetching lead updates:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getBookedLeads = async (req, res) => {
  const { lead_id, lead_added_user_type, lead_added_user_id, assigned_user_type, assigned_id, } = req.query;

  if (!lead_added_user_type || !lead_added_user_id) {
    return res.status(400).json({
      status: "error",
      message: "lead_added_user_type and lead_added_user_id are required",
    });
  }
  let parsedLeadId;
  if (lead_id) {
    parsedLeadId = parseInt(lead_id, 10);
    if (isNaN(parsedLeadId)) {
      return res.status(400).json({
        status: "error",
        message: "lead_id must be a valid integer",
      });
    }
  }
  try {
    let query = `
      SELECT l.*
      FROM leads l 
      WHERE l.lead_added_user_type = ? AND l.lead_added_user_id = ? AND l.booked = 'Yes'
    `;
    const queryParams = [lead_added_user_type, lead_added_user_id];
    if (parsedLeadId) {
      query += ` AND l.lead_id = ?`;
      queryParams.push(parsedLeadId);
    }  
    if (assigned_user_type && assigned_id) {
      query += ` AND l.assigned_user_type = ? AND l.assigned_id = ?`;
      queryParams.push(assigned_user_type, assigned_id);
    }

    query += ` ORDER BY l.created_date DESC, l.created_time DESC`;

    const results = await queryAsync(query, queryParams);

    if (results.length === 0) {
      return res.status(404).json({ status: "error", message: "No booked leads found for the given criteria" });
    }

    const formattedResults = results.map((lead) => ({
      ...lead,
      created_date: moment(lead.created_date).format("YYYY-MM-DD"),
      updated_date: moment(lead.updated_date).format("YYYY-MM-DD"),
      assigned_date: lead.assigned_date ? moment(lead.assigned_date).format("YYYY-MM-DD") : null,
    }));

    res.status(200).json({ status: "success", results: formattedResults });
  } catch (error) {
    console.error("Error fetching booked leads:", { error, queryParams: req.query });
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const getAllLeadSource = async (req, res) => {
  try {
    const results = await queryAsync("SELECT * FROM lead_source");
    if (results.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No lead sources found",
      });
    }

    res.status(200).json({
      status: "success",
      results: results,
    });
  } catch (error) {
    console.error("Error fetching lead sources:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch lead sources",
    });
  }
};

const getAllLeadStatus = async (req, res) => {
  try {
    
    const results = await queryAsync("SELECT * FROM lead_statuses");

  
    if (results.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No lead sources found",
      });
    }

   
    res.status(200).json({
      status: "success",
      results: results,
    });
  } catch (error) {
    console.error("Error fetching lead sources:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch lead sources",
    });
  }
};

module.exports = {
  insertLead,
  getLeadsByUser,
  assignLeadToEmployee,
  updateLeadByEmployee,
  getLeadUpdatesByLeadId,
  getBookedLeads,
  getAllLeadSource,
  getAllLeadStatus

};