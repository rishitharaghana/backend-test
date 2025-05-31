
const util = require("util");
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const moment = require("moment");
const fs = require('fs');

const queryAsync = util.promisify(pool.query).bind(pool);

const uploadDir = path.join(__dirname, '../uploads', 'adAssets');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });


const getAllAds = async (req,res) => {
    try{
        const query = `SELECT * From ads_details`;
        const results = await queryAsync(query);
        if (results.length === 0){
            return res.status(404).json({message:'No Ads Found'});
        }
        res.status(200).json({results});
    }catch(error){
        console.error('Error fetching careers',error);
        res.status(500).json({message:'Internal server Error'});
    }

}

const getAds = async (req,res)=>{
     const ads_page = (req.query.ads_page || "").trim().toLowerCase();
    const city = (req.query.city || "").trim().toLowerCase();

    let query = "SELECT * FROM ads_details";
    let queryParams = [];
    let conditions = [];

    if (ads_page && ads_page !== "all_ads") {
      conditions.push("LOWER(ads_page) = ?");
      queryParams.push(ads_page);
    }

    if (city) {
      conditions.push("LOWER(city) = ?");
      queryParams.push(city);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    pool.query(query, queryParams, async (err, adsResults) => {
      if (err) {
        console.error("Error fetching ads:", err);
        return res.status(500).json({ message: "Error fetching ads" });
      }

      try {
        const enrichedAds = await Promise.all(
          adsResults.map((ad) => {
            return new Promise((resolve, reject) => {
              const propertyQuery = `
                SELECT * FROM properties 
                WHERE unique_property_id = ?
              `;
              pool.query(
                propertyQuery,
                [ad.unique_property_id],
                (propErr, propResults) => {
                  if (propErr) {
                    console.error(
                      `Error fetching property for ad_id ${ad.id}:`,
                      propErr
                    );
                    return reject(propErr);
                  }
                  ad.property_data = propResults[0] || null;
                  resolve(ad);
                }
              );
            });
          })
        );

        const shuffledAds = enrichedAds.sort(() => 0.5 - Math.random());
        res.status(200).json({
          message: "Ads with selected property data fetched successfully",
          ads: shuffledAds,
        });
      } catch (error) {
        console.error("Error enriching property data:", error);
        return res
          .status(500)
          .json({ message: "Error fetching related property data" });
      }
    });
}

const getAdsbyAdsPage = async (req, res) => {
    const ads_page = (req.query.ads_page || "").trim().toLowerCase();
    const city = (req.query.city || "").trim().toLowerCase();

    let query = `SELECT * FROM ads_details`;
    let queryParams = [];
    let conditions = [];

    if (ads_page) {
        conditions.push('LOWER(ads_page) = ?');
        queryParams.push(ads_page);
    }
    if (city) {
        conditions.push('LOWER(city) = ?');
        queryParams.push(city);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    try {
        const results = await queryAsync(query, queryParams);
        res.json({ success: true, data: results });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const uploadSliderImages = [
    upload.single('photo'),
    (req,res)=>{
        const {
            unique_property_id,
            property_name,
            ads_page,
            ads_order,
            start_date,
            end_date,
            city,
            display_cities,
            ads_title,
            ads_button_text,
            ads_button_link,
            ads_description,
            user_id,
            property_type,
            sub_type,
            property_for,
            property_cost,
            property_in,
            google_address,
    } = req.body;
    const created_date = moment().format('YYYY-MM-DD');
    const created_time = moment().format("HH:mm:ss");
    const status = 1;
    const imagePath = req.file ? `uploads/adAssets/${req.file.filename}` : null;
    const insertQuery = `
      INSERT INTO ads_details (
        unique_property_id, property_name, ads_page, ads_order, 
        start_date, end_date, created_date, created_time, 
        status, city, image, display_cities, ads_title, 
        ads_button_text, ads_button_link, ads_description, 
        user_id, property_type, sub_type, property_for, 
        property_cost, property_in, google_address
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        unique_property_id || null,
        property_name || null,
        ads_page || null,
        ads_order || null,
        start_date || null,
        end_date || null,
        created_date,
        created_time,
        status,
        city || null,
        imagePath,
        display_cities || null,
        ads_title || null,
        ads_button_text || null,
        ads_button_link || null,
        ads_description || null,
        user_id || null,
        property_type || null,
        sub_type || null,
        property_for || null,
        property_cost || null,
        property_in || null,
        google_address || null,
    ];
    pool.query(insertQuery,values,(err,results)=>{
        if (err){
            console.error("Error inserting ad details:", err);
            return res.status(500).json({ error: "Database error" });
        }
        return res
        .status(200)
        .json({ message: "Ad inserted successfully", id: results.insertId });
    });
    }
]

const deleteAdImage = async (req,res) =>{
  const ads_page = (req.query.ads_page || "").trim();
  const property_name = (req.query.property_name || "").trim();
  const unique_property_id = (req.query.unique_property_id || "").trim();
  if (!ads_page){
    return res.status(400).json({message:"ads_page query is required"});
  }
  if (ads_page === "main_slider"){
    if(!property_name){
        return res.status(400).json({message:'property_name is required for main_slider'});
    }
    const selectQuery = `SELECT image FROM ads_details WHERE ads_page = ? AND property_name = ? LIMIT 1`;
    pool.query(selectQuery,[ads_page,property_name], (selectErr,results)=>{
    if(selectErr){
      console.error('Error finding ad:',selectErr);
      return res.status(500).json({message:'Database error while finding ad'});
    }
    if (results.length === 0){
      return res.status(404).json({message:"Ad not found in database"});
    }
     const imagePathFromDB = results[0].image;
      const filename = imagePathFromDB.split("/").pop();
      const filePath = path.join(
            __dirname,
            "../uploads/adAssets",
            filename
      );
      fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr && unlinkErr.code !== "ENOENT") {
              console.error("File deletion error:", unlinkErr);
              return res
                .status(500)
                .json({ message: "Failed to delete image file" });
      }
      const deleteQuery = `DELETE FROM ads_details WHERE ads_page = ? AND property_name = ?`;
      pool.query(deleteQuery,[ads_page,property_name],(deleteErr)=>{
        if (deleteErr){
          console.error("DB delete error",deleteErr);
          return res.status(500).json({messag:'Failed to delete ad from database'});
        }
        return res.status(200).json({
          message:'Main slider ad and image deleted successfully'
        })
      })
    })
    
    });
  }
  
  else {
    if (!unique_property_id || !property_name){
      return res.status(400).json({
        message:"unique_property_id and property_name are required for non-main_slider ads"
      });
    }
    const deleteQuery = `DELETE FROM ads_details WHERE unique_property_id=? AND property_name = ? AND ads_page = ?`;
    pool.query(deleteQuery,[unique_property_id,property_name,ads_page],(err,result)=>{
      if (err){
        console.log('DB delete error',err);
        return res.status(500).json({message:"Failed to delete ad from database"});
      }
      if (result.affectedRows === 0){
        return res.status(500).json({message:'Ad not found with given identifiers'});
      }
      return res.status(200).json({message:"Ad deleted from database (no image involved)"});
    })
  }
  
  
    

}




module.exports = {
    getAllAds,
    getAds,
    getAdsbyAdsPage,
    uploadSliderImages,
    deleteAdImage
}