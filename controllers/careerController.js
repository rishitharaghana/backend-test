const moment = require("moment");
const pool = require("../config/db");
const util = require("util");



const queryAsync = util.promisify(pool.query).bind(pool);

const getAllCareers = async (req, res) => {
  try {
    const query = `SELECT * FROM company_careers`; 
    const results = await queryAsync(query);

    if (results.length === 0) {
      return res.status(404).json({ message: "No careers found" });
    }
    res.status(200).json({ results });
  } catch (error) {
    console.error("Error fetching careers:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const insertCareers = async (req, res) => {
   const { description, job_title, preferred_location, salary, experience } =
      req.body;
    const upload_date = moment().format("YYYY-MM-DD");
    try {
      const insertQuery = `
        INSERT INTO company_careers 
        (description, job_title, upload_date, preferred_location, salary, experience) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      pool.query(
        insertQuery,
        [
          description,
          job_title || null,
          upload_date,
          preferred_location || null,
          salary || null,
          experience || null,
        ],
        (err, result) => {
          if (err) {
            console.error("Insert Error:", err);
            return res.status(500).json({
              status: "error",
              message: "Failed to insert career entry",
            });
          }
          return res.status(201).json({
            status: "success",
            message: "Career entry inserted successfully",
          });
        }
      );
    } catch (error) {
      console.error("Insert Error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to insert career entry",
      });
    }
};


const deleteCarrers = async (req,res) => {
  const {id} = req.body;
  if (!id){
    return res.status(400).json({status:"error",message:"Id is required"});
  }
  try {
    const deleteQuery = `DELETE FROM company_careers WHERE id = ?`;
    const result = await queryAsync(deleteQuery,[id]);
    if(result.affectedRows === 0){
      return res.status(404).json({status:"error",message:"carrer not found"});
    }
    return res.status(200).json({status:'success',message:'Career deleted successfully'});
  }
  catch(error){
    console.log('Delete Error',error);
    res.status(500).json({status:"error",message:"Failed to delete carrerr"})
  }
}

const updateCareers = async (req, res) => {
  const { id, description, job_title, preferred_location, salary, experience } = req.body;

  if (!id) {
    return res.status(400).json({ status: 'error', message: 'Career ID is required' });
  }

  try {
    const updateQuery = `
      UPDATE company_careers 
      SET description = ?, job_title = ?, preferred_location = ?, salary = ?, experience = ? 
      WHERE id = ?
    `;

    const result = await queryAsync(updateQuery, [
      description || null,
      job_title || null,
      preferred_location || null,
      salary || null,
      experience || null,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Career not found' });
    }

    return res.status(200).json({ status: 'success', message: 'Career updated successfully' });
  } catch (error) {
    console.log("Update Error:", error);
    res.status(500).json({ status: 'error', message: 'Failed to update career' });
  }
};


module.exports = {
  getAllCareers,
  insertCareers,
  deleteCarrers,
  updateCareers
};