const moment = require("moment");
const util = require("util");
const fs = require("fs").promises;
const path = require("path");
const { createMulterInstance } = require("../config/multerConfig");
const pool = require("../config/db");

const uploadDir = "../uploads/";
const allowedTypes = {
  brochure: [".pdf"],
  price_sheet: [".pdf"],
  floor_plan: [".png", ".jpg", ".jpeg", ".pdf"],
  property_image: [".jpg", ".jpeg", ".png"],
};
const upload = createMulterInstance(uploadDir, allowedTypes, {
  fileSize: 20 * 1024 * 1024,
});

const queryAsync = util.promisify(pool.query).bind(pool);

const insertProperty = async (req, res) => {
  upload.fields([
    { name: "brochure", maxCount: 1 },
    { name: "price_sheet", maxCount: 1 },
    { name: "floor_plan", maxCount: 4 },
    { name: "property_image", maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      return res
        .status(400)
        .json({ error: "File upload error: " + err.message });
    }
    const {
      project_name,
      property_type,
      property_subtype,
      builder_name,
      state,
      city,
      locality,
      construction_status,
      upcoming_project,
      posted_by,
      user_id,
      rera_registered,
      rera_number,
      payment_mode,
      launch_type,
      launched_date,
      possession_end_date,
      sizes,
      around_this,
    } = req.body;
    if (
      !project_name ||
      !property_type ||
      !property_subtype ||
      !builder_name ||
      !state ||
      !city ||
      !locality ||
      !construction_status ||
      !upcoming_project ||
      !posted_by ||
      !user_id ||
      !rera_registered ||
      !payment_mode ||
      !launch_type ||
      !sizes
    ) {
      return res
        .status(400)
        .json({ error: "Missing required property fields" });
    }
    if (
      construction_status !== "Ready to Move" &&
      construction_status !== "Under Construction"
    ) {
      return res
        .status(400)
        .json({ error: "Invalid construction_status value" });
    }
    if (construction_status === "Under Construction" && !possession_end_date) {
      return res.status(400).json({
        error: "possession_end_date is required for Under Construction",
      });
    }
    if (
      possession_end_date &&
      !moment(possession_end_date, "YYYY-MM-DD", true).isValid()
    ) {
      return res
        .status(400)
        .json({ error: "possession_end_date must be in YYYY-MM-DD format" });
    }
    if (construction_status === "Ready to Move" && possession_end_date) {
      return res
        .status(400)
        .json({ error: "possession_end_date must be null for Ready to Move" });
    }
    if (rera_registered !== "Yes" && rera_registered !== "No") {
      return res.status(400).json({ error: "Invalid rera_registered value" });
    }
    if (rera_registered === "Yes" && !rera_number) {
      return res
        .status(400)
        .json({ error: "rera_number is required when rera_registered is Yes" });
    }
    if (rera_registered === "No" && rera_number) {
      return res
        .status(400)
        .json({ error: "rera_number must be null when rera_registered is No" });
    }
    let paymentModeArray;
    try {
      paymentModeArray = JSON.parse(payment_mode);
    } catch (error) {
      return res
        .status(400)
        .json({ error: "Invalid payment_mode JSON format" });
    }
    if (!Array.isArray(paymentModeArray) || paymentModeArray.length === 0) {
      return res
        .status(400)
        .json({ error: "payment_mode must be a non-empty array" });
    }
    const validPaymentModes = ["Regular", "OTP", "Offers", "EMI"];
    if (!paymentModeArray.every((mode) => validPaymentModes.includes(mode))) {
      return res.status(400).json({ error: "Invalid payment_mode values" });
    }
    if (!["Pre Launch", "Soft Launch", "Launched"].includes(launch_type)) {
      return res.status(400).json({ error: "Invalid launch_type value" });
    }
    if (launch_type === "Launched" && !launched_date) {
      return res.status(400).json({
        error: "launched_date is required when launch_type is Launched",
      });
    }
    if (launched_date && !moment(launched_date, "YYYY-MM-DD", true).isValid()) {
      return res
        .status(400)
        .json({ error: "launched_date must be in YYYY-MM-DD format" });
    }
    if (launch_type !== "Launched" && launched_date) {
      return res.status(400).json({
        error: "launched_date must be null when launch_type is not Launched",
      });
    }
    if (isNaN(parseInt(user_id)) || isNaN(parseInt(posted_by))) {
      return res
        .status(400)
        .json({ error: "user_id and posted_by must be valid integers" });
    }
    const validAreaUnits = ["sq.ft", "sq.yd", "acres"];
    let sizesArray;
    try {
      sizesArray = JSON.parse(sizes);
    } catch (error) {
      return res.status(400).json({ error: "Invalid sizes JSON format" });
    }
    if (!Array.isArray(sizesArray) || sizesArray.length === 0) {
      return res.status(400).json({ error: "sizes must be a non-empty array" });
    }
    for (const size of sizesArray) {
      if (!size.carpet_area || isNaN(parseFloat(size.carpet_area))) {
    return res
      .status(400)
      .json({ error: "Invalid or missing carpet_area in sizes" });
  }
      if (!size.sqft_price || isNaN(parseFloat(size.sqft_price))) {
        return res
          .status(400)
          .json({ error: "Invalid or missing sqft_price in sizes" });
      }
      if (property_subtype === "Plot") {
        if (!size.plot_area || isNaN(parseFloat(size.plot_area))) {
          return res
            .status(400)
            .json({ error: "Invalid or missing plot_area for Plot type" });
        }
        if (
          !size.plotAreaUnits ||
          !validAreaUnits.includes(size.plotAreaUnits)
        ) {
          return res.status(400).json({
            error: "Invalid or missing plot_area_units for Plot type",
          });
        }
        if (!size.lengthArea || isNaN(parseFloat(size.lengthArea))) {
          return res
            .status(400)
            .json({ error: "Invalid or missing length_area for Plot type" });
        }
        if (
          !size.lengthAreaUnits ||
          !validAreaUnits.includes(size.lengthAreaUnits)
        ) {
          return res.status(400).json({
            error: "Invalid or missing length_area_units for Plot type",
          });
        }
      } else if (property_subtype !== "Land") {
        if (!size.build_up_area || isNaN(parseFloat(size.build_up_area))) {
          return res
            .status(400)
            .json({ error: "Invalid or missing build_up_area in sizes" });
        }
        if (
          !size.builtupAreaUnits ||
          !validAreaUnits.includes(size.builtupAreaUnits)
        ) {
          return res
            .status(400)
            .json({ error: "Invalid or missing builtup_area_units in sizes" });
        }
      }
    }
    const baseDir = path.join(__dirname, "..");
    const brochure = req.files?.["brochure"]?.[0]
      ? path.basename(req.files["brochure"][0].path)
      : null;
    const price_sheet = req.files?.["price_sheet"]?.[0]
      ? path.basename(req.files["price_sheet"][0].path)
      : null;
    const floor_plans = req.files?.["floor_plan"]
      ? req.files["floor_plan"].map((file) => path.basename(file.path))
      : [];
    const property_image = req.files?.["property_image"]
      ? path.basename(req.files["property_image"][0].path)
      : null;
    try {
      await queryAsync("START TRANSACTION");
      const currentTimestamp = moment().format("YYYY-MM-DD HH:mm:ss");
      const formattedPossessionDate = possession_end_date
        ? moment(possession_end_date, "YYYY-MM-DD").format("YYYY-MM-DD")
        : null;
      const formattedLaunchedDate = launched_date
        ? moment(launched_date, "YYYY-MM-DD").format("YYYY-MM-DD")
        : null;
      const propertyResult = await queryAsync(
        `INSERT INTO property (
          project_name, property_type, property_subtype, builder_name,
          state, city, locality, brochure, price_sheet, property_image,
          construction_status, upcoming_project, posted_by,
          possession_end_date, rera_registered, rera_number,
          launch_type, launched_date, created_date, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project_name,
          property_type,
          property_subtype,
          builder_name,
          state,
          city,
          locality,
          brochure,
          price_sheet,
          property_image,
          construction_status,
          upcoming_project,
          parseInt(posted_by),
          formattedPossessionDate,
          rera_registered,
          rera_number,
          launch_type,
          formattedLaunchedDate,
          currentTimestamp,
          parseInt(user_id),
        ]
      );
      const property_id = propertyResult.insertId;

      for (let i = 0; i < sizesArray.length; i++) {
        const size = sizesArray[i];
        await queryAsync(
          `INSERT INTO sizes (
            property_id,
            plot_area,
            plotAreaUnits,
            build_up_area,
            builtupAreaUnits,
            carpet_area,
            lengthArea,
            lengthAreaUnits,
            floor_plan,
            sqft_price,
            create_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            property_id,
            size.plot_area ? parseFloat(size.plot_area).toString() : null,
            size.plotAreaUnits || null,
            size.build_up_area
              ? parseFloat(size.build_up_area).toString()
              : null,
            size.builtupAreaUnits || null,
            parseFloat(size.carpet_area).toString(),
            // size.carpetAreaUnits,
            size.length_area ? parseFloat(size.length_area).toString() : null,
            size.lengthAreaUnits || null,
            floor_plans[i] || null,
            parseFloat(size.sqft_price).toString(),
            currentTimestamp,
          ]
        );
      }
      let aroundThisArray;
      try {
        aroundThisArray = JSON.parse(around_this);
      } catch (error) {
        throw new Error("Invalid around_this JSON format");
      }
      if (Array.isArray(aroundThisArray) && aroundThisArray.length > 0) {
        for (const place of aroundThisArray) {
          if (
            place.title &&
            place.distance &&
            !isNaN(parseFloat(place.distance))
          ) {
            await queryAsync(
              `INSERT INTO around_this (property_id, title, distance, create_date)
               VALUES (?, ?, ?, ?)`,
              [property_id, place.title, place.distance, currentTimestamp]
            );
          } else {
            throw new Error("Invalid title or distance in around_this");
          }
        }
      }
      for (const mode of paymentModeArray) {
        await queryAsync(
          `INSERT INTO payment_modes (property_id, payment_mode, create_date)
           VALUES (?, ?, ?)`,
          [property_id, mode, currentTimestamp]
        );
      }
      await queryAsync("COMMIT");
      const baseUrl = `https://crmapi.mntechs.com/uploads/`;
      //  const baseUrl = `http://localhost:3002/uploads/`;

      res.status(201).json({
        message: "Property inserted successfully",
        property_id,
        image: property_image ?`${baseUrl}${property_image}` : null,
      });
    } catch (error) {
      await queryAsync("ROLLBACK");
      res
        .status(500)
        .json({ error: "Failed to insert property: " + error.message });
    }
  });
};

const editProperty = async (req, res) => {
  upload.fields([
    { name: "brochure", maxCount: 1 },
    { name: "price_sheet", maxCount: 1 },
    { name: "floor_plan", maxCount: 4 },
    { name: "property_image", maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      return res
        .status(400)
        .json({ error: "File upload error: " + err.message });
    }

    const {
      property_id,
      project_name,
      property_type,
      property_subtype,
      builder_name,
      state,
      city,
      locality,
      construction_status,
      upcoming_project,
      posted_by,
      user_id,
      rera_registered,
      rera_number,
      payment_mode,
      launch_type,
      launched_date,
      sizes,
      around_this,
      possession_end_date,
    } = req.body;

    if (
      !property_id ||
      !project_name ||
      !property_type ||
      !property_subtype ||
      !builder_name ||
      !state ||
      !city ||
      !locality ||
      !construction_status ||
      !upcoming_project ||
      !posted_by ||
      !user_id ||
      !rera_registered ||
      !payment_mode ||
      !launch_type
    ) {
      return res
        .status(400)
        .json({ error: "Missing required property fields" });
    }

    if (isNaN(parseInt(property_id))) {
      return res.status(400).json({ error: "Invalid property_id" });
    }

    if (
      construction_status !== "Ready to Move" &&
      construction_status !== "Under Construction"
    ) {
      return res
        .status(400)
        .json({ error: "Invalid construction_status value" });
    }

    if (construction_status === "Under Construction" && !possession_end_date) {
      return res
        .status(400)
        .json({
          error: "possession_end_date is required for Under Construction",
        });
    }
    if (
      possession_end_date &&
      !moment(possession_end_date, "YYYY-MM-DD", true).isValid()
    ) {
      return res
        .status(400)
        .json({ error: "possession_end_date must be in YYYY-MM-DD format" });
    }
    if (construction_status === "Ready to Move" && possession_end_date) {
      return res
        .status(400)
        .json({ error: "possession_end_date must be null for Ready to Move" });
    }

    if (rera_registered !== "Yes" && rera_registered !== "No") {
      return res.status(400).json({ error: "Invalid rera_registered value" });
    }
    if (rera_registered === "Yes" && !rera_number) {
      return res
        .status(400)
        .json({ error: "rera_number is required when rera_registered is Yes" });
    }
    if (rera_registered === "No" && rera_number) {
      return res
        .status(400)
        .json({ error: "rera_number must be null when rera_registered is No" });
    }

    let paymentModeArray;
    try {
      paymentModeArray = JSON.parse(payment_mode);
    } catch (error) {
      return res
        .status(400)
        .json({ error: "Invalid payment_mode JSON format" });
    }
    if (!Array.isArray(paymentModeArray) || paymentModeArray.length === 0) {
      return res
        .status(400)
        .json({ error: "payment_mode must be a non-empty array" });
    }
    const validPaymentModes = ["Regular", "OTP", "Offers", "EMI"];
    if (!paymentModeArray.every((mode) => validPaymentModes.includes(mode))) {
      return res.status(400).json({ error: "Invalid payment_mode values" });
    }

    if (!["Pre Launch", "Soft Launch", "Launched"].includes(launch_type)) {
      return res.status(400).json({ error: "Invalid launch_type value" });
    }
    if (launch_type === "Launched" && !launched_date) {
      return res
        .status(400)
        .json({
          error: "launched_date is required when launch_type is Launched",
        });
    }
    if (launched_date && !moment(launched_date, "YYYY-MM-DD", true).isValid()) {
      return res
        .status(400)
        .json({ error: "launched_date must be in YYYY-MM-DD format" });
    }
    if (launch_type !== "Launched" && launched_date) {
      return res
        .status(400)
        .json({
          error: "launched_date must be null when launch_type is not Launched",
        });
    }

    if (isNaN(parseInt(user_id)) || isNaN(parseInt(posted_by))) {
      return res
        .status(400)
        .json({ error: "user_id and posted_by must be valid integers" });
    }

    const baseDir = path.resolve(__dirname, "..", "uploads");

    try {
      await queryAsync("START TRANSACTION");

      const existingProperty = await queryAsync(
        "SELECT brochure, price_sheet, property_image FROM property WHERE property_id = ?",
        [parseInt(property_id)]
      );
      if (!existingProperty.length) {
        await queryAsync("ROLLBACK");
        return res.status(404).json({ error: "Property not found" });
      }

      const existingFloorPlans = await queryAsync(
        "SELECT floor_plan FROM sizes WHERE property_id = ? AND floor_plan IS NOT NULL",
        [parseInt(property_id)]
      );

      // Delete old files unconditionally
      if (existingProperty[0].brochure) {
        try {
          await fs.unlink(path.join(baseDir, existingProperty[0].brochure));
        } catch (error) {
          console.warn(`Failed to delete old brochure: ${error.message}`);
        }
      }
      if (existingProperty[0].price_sheet) {
        try {
          await fs.unlink(path.join(baseDir, existingProperty[0].price_sheet));
        } catch (error) {
          console.warn(`Failed to delete old price sheet: ${error.message}`);
        }
      }
      
      for (let floorPlan of existingFloorPlans) {
        if (floorPlan.floor_plan) {
          try {
            await fs.unlink(path.join(baseDir, floorPlan.floor_plan));
          } catch (error) {
            console.warn(`Failed to delete old floor plan: ${error.message}`);
          }
        }
      }
      if(existingProperty[0].property_image){
        try{
            await fs.unlink(path.join(baseDir, existingProperty[0].property_image));
        } catch(error){
            console.warn(`Failed to delete old Property Image: ${error.message}` )
        }
      }

      // Prepare new file paths or retain existing ones
      const brochure = req.files["brochure"]
        ? path.basename(req.files["brochure"][0].path)
        : existingProperty[0].brochure || null;
      const price_sheet = req.files["price_sheet"]
        ? path.basename(req.files["price_sheet"][0].path)
        : existingProperty[0].price_sheet || null;
      const floor_plans = req.files["floor_plan"]
        ? req.files["floor_plan"].map((file) => path.basename(file.path))
        : [];
        const property_image = req.files["property_image"]
        ? path.basename(req.files["property_image"][0].path)
        :existingProperty[0].property_image || null;


      const formattedPossessionDate = possession_end_date
        ? moment(possession_end_date, "YYYY-MM-DD").format("YYYY-MM-DD")
        : null;
      const formattedLaunchedDate = launched_date
        ? moment(launched_date, "YYYY-MM-DD").format("YYYY-MM-DD")
        : null;
      const currentTimestamp = moment().format("YYYY-MM-DD HH:mm:ss");

      await queryAsync(
        `UPDATE property SET
                    project_name = ?,
                    property_type = ?,
                    property_subtype = ?,
                    builder_name = ?,
                    state = ?,
                    city = ?,
                    locality = ?,
                    brochure = ?,
                    price_sheet = ?,
                     property_image = ?,
                    construction_status = ?,
                    upcoming_project = ?,
                    posted_by = ?,
                    possession_end_date = ?,
                    rera_registered = ?,
                    rera_number = ?,
                    launch_type = ?,
                    launched_date = ?,
                    user_id = ?
                WHERE property_id = ?`,
        [
          project_name,
          property_type,
          property_subtype,
          builder_name,
          state,
          city,
          locality,
          brochure,
          price_sheet,
          property_image,
          construction_status,
          upcoming_project,
          parseInt(posted_by),
          formattedPossessionDate,
          rera_registered,
          rera_number,
          launch_type,
          formattedLaunchedDate,
          parseInt(user_id),
          parseInt(property_id),
        ]
      );

      let sizesArray;
      try {
        sizesArray = JSON.parse(sizes);
      } catch (error) {
        throw new Error("Invalid sizes JSON format");
      }
      if (Array.isArray(sizesArray) && sizesArray.length > 0) {
        if (
          floor_plans.length > 0 &&
          sizesArray.length !== floor_plans.length
        ) {
          throw new Error(
            `Number of floor_plan files (${floor_plans.length}) must match number of sizes entries (${sizesArray.length})`
          );
        }
        await queryAsync("DELETE FROM sizes WHERE property_id = ?", [
          parseInt(property_id),
        ]);
        for (let i = 0; i < sizesArray.length; i++) {
          const size = sizesArray[i];
          if (
            size.build_up_area &&
            size.carpet_area &&
            !isNaN(parseFloat(size.build_up_area)) &&
            !isNaN(parseFloat(size.carpet_area)) &&
            size.sqftprice &&
            !isNaN(parseFloat(size.sqftprice))
          ) {
            await queryAsync(
              `INSERT INTO sizes (property_id, build_up_area, carpet_area, floor_plan, sqft_price, create_date)
                             VALUES (?, ?, ?, ?, ?, ?)`,
              [
                parseInt(property_id),
                parseFloat(size.build_up_area).toString(),
                parseFloat(size.carpet_area).toString(),
                floor_plans[i] || null,
                parseFloat(size.sqftprice).toString(),
                currentTimestamp,
              ]
            );
          } else {
            throw new Error(
              "Invalid build_up_area, carpet_area, or sqftprice in sizes"
            );
          }
        }
      }

      let aroundThisArray;
      try {
        aroundThisArray = JSON.parse(around_this);
      } catch (error) {
        throw new Error("Invalid around_this JSON format");
      }
      if (Array.isArray(aroundThisArray) && aroundThisArray.length > 0) {
        await queryAsync("DELETE FROM around_this WHERE property_id = ?", [
          parseInt(property_id),
        ]);
        for (let place of aroundThisArray) {
          if (
            place.title &&
            place.distance &&
            !isNaN(parseFloat(place.distance))
          ) {
            await queryAsync(
              `INSERT INTO around_this (property_id, title, distance, create_date)
                             VALUES (?, ?, ?, ?)`,
              [
                parseInt(property_id),
                place.title,
                place.distance,
                currentTimestamp,
              ]
            );
          } else {
            throw new Error("Invalid title or distance in around_this");
          }
        }
      }

      await queryAsync("DELETE FROM payment_modes WHERE property_id = ?", [
        parseInt(property_id),
      ]);
      for (let mode of paymentModeArray) {
        await queryAsync(
          `INSERT INTO payment_modes (property_id, payment_mode, create_date)
                     VALUES (?, ?, ?)`,
          [parseInt(property_id), mode, currentTimestamp]
        );
      }

      await queryAsync("COMMIT");
      const baseUrl = `https://crmapi.mntechs.com/uploads/`
      //  const baseUrl = `http://localhost:3002/uploads/`;

      res.status(200).json({
        message: "Property updated successfully",
        property_id,
        image: property_image ? `${baseUrl}${property_image}` : null,
      });
    } catch (error) {
      await queryAsync("ROLLBACK");
      res
        .status(500)
        .json({ error: "Failed to update property: " + error.message });
    }
  });
};

const getPropertyById = async (req, res) => {
  const { property_id, admin_user_id, admin_user_type } = req.query;

  if (!property_id || isNaN(parseInt(property_id))) {
    return res.status(400).json({ error: "Valid property_id is required" });
  }
  if (!admin_user_id || isNaN(parseInt(admin_user_id))) {
    return res.status(400).json({ error: "Valid admin_user_id is required" });
  }
  if (!admin_user_type || isNaN(parseInt(admin_user_type))) {
    return res.status(400).json({ error: "Valid admin_user_type is required" });
  }

  try {
    const parsedPropertyId = parseInt(property_id);
    const parsedAdminUserId = parseInt(admin_user_id);
    const parsedAdminUserType = parseInt(admin_user_type);

    const propertyResult = await queryAsync(
      `SELECT * FROM property WHERE property_id = ? AND posted_by = ? AND user_id = ?`,
      [parsedPropertyId, parsedAdminUserType, parsedAdminUserId]
    );

    if (propertyResult.length === 0) {
      return res.status(404).json({ error: "Property not found" });
    }

    const sizesResult = await queryAsync(
      `SELECT * FROM sizes WHERE property_id = ?`,
      [parsedPropertyId]
    );

    const aroundThisResult = await queryAsync(
      `SELECT * FROM around_this WHERE property_id = ?`,
      [parsedPropertyId]
    );

    const paymentModesResult = await queryAsync(
      `SELECT payment_mode FROM payment_modes WHERE property_id = ?`,
      [parsedPropertyId]
    );
    const baseUrl = `https://crmapi.mntechs.com/uploads/`; // Adjust for production
    //  const baseUrl = `http://localhost:3002/uploads/`;

    const property = {
      ...propertyResult[0],
      brochure: propertyResult[0].brochure
        ? `${baseUrl}${propertyResult[0].brochure}`
        : null,
      price_sheet: propertyResult[0].price_sheet
        ? `${baseUrl}${propertyResult[0].price_sheet}`
        : null,
        property_image: propertyResult[0].property_image
        ? `${baseUrl}${propertyResult[0].property_image}`
        : null,
      sizes: sizesResult.map((row) => ({
        build_up_area: row.build_up_area,
        carpet_area: row.carpet_area,
        floor_plan: row.floor_plan ? `${baseUrl}${row.floor_plan}` : null,
        create_date: row.create_date,
      })),
      around_this: aroundThisResult.map((row) => ({
        title: row.title,
        distance: row.distance,
        create_date: row.create_date,
      })),
      payment_modes: paymentModesResult.map((row) => row.payment_mode),
    };


    res.status(200).json(property);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch property: " + error.message });
  }
};

const getAllProperties = async (req, res) => {
  const { admin_user_id, admin_user_type } = req.query;

  // Validate all required fields
  if (!admin_user_id || isNaN(parseInt(admin_user_id))) {
    return res.status(400).json({ error: "Valid admin_user_id is required" });
  }
  if (!admin_user_type || isNaN(parseInt(admin_user_type))) {
    return res.status(400).json({ error: "Valid admin_user_type is required" });
  }

  try {
    const parsedAdminUserId = parseInt(admin_user_id);
    const parsedAdminUserType = parseInt(admin_user_type);

    const propertiesResult = await queryAsync(
      `SELECT * FROM property WHERE posted_by = ? AND user_id = ?`,
      [parsedAdminUserType, parsedAdminUserId]
    );

    if (propertiesResult.length === 0) {
      return res.status(200).json({ message: "No properties found", data: [] });
    }

    const sizesResult = await queryAsync(`SELECT * FROM sizes`);
    const aroundThisResult = await queryAsync(`SELECT * FROM around_this`);

    const sizesMap = new Map();
    sizesResult.forEach((row) => {
      if (!sizesMap.has(row.property_id)) {
        sizesMap.set(row.property_id, []);
      }
      sizesMap.get(row.property_id).push({
        build_up_area: row.build_up_area,
        carpet_area: row.carpet_area,
        floor_plan: row.floor_plan,
        create_date: row.create_date,
      });
    });

    const aroundThisMap = new Map();
    aroundThisResult.forEach((row) => {
      if (!aroundThisMap.has(row.property_id)) {
        aroundThisMap.set(row.property_id, []);
      }
      aroundThisMap.get(row.property_id).push({
        title: row.title,
        distance: row.distance,
        create_date: row.create_date,
      });
    });

    const baseUrl = `https://crmapi.mntechs.com/uploads/`;
    //  const baseUrl = `http://localhost:3002/uploads/`;


    const properties = propertiesResult.map((property) => ({
      ...property,
       property_image: property.property_image ? `${baseUrl}${property.property_image}` : null, 
      sizes: sizesMap.get(property.property_id) || [],
      around_this: aroundThisMap.get(property.property_id) || [],
    }));

    res
      .status(200)
      .json({ message: "Properties fetched successfully", data: properties });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch properties: " + error.message });
  }
};

const ongoingProject = async (req, res) => {
  const { admin_user_id, admin_user_type } = req.query;

  if (!admin_user_id || isNaN(parseInt(admin_user_id))) {
    return res.status(400).json({ error: "Valid admin_user_id is required" });
  }
  if (!admin_user_type || isNaN(parseInt(admin_user_type))) {
    return res.status(400).json({ error: "Valid admin_user_type is required" });
  }

  try {
    const parsedAdminUserId = parseInt(admin_user_id);
    const parsedAdminUserType = parseInt(admin_user_type);

    const propertiesResult = await queryAsync(
      `SELECT * FROM property 
       WHERE upcoming_project = ? 
       AND posted_by = ? 
       AND user_id = ?
       AND (stop_leads IS NULL OR stop_leads = 'No')`,
      ["No", parsedAdminUserType, parsedAdminUserId]
    );

    if (propertiesResult.length === 0) {
      return res
        .status(200)
        .json({ message: "No ongoing properties found", data: [] });
    }

    const sizesResult = await queryAsync(`SELECT * FROM sizes`);
    const aroundThisResult = await queryAsync(`SELECT * FROM around_this`);

    const sizesMap = new Map();
    sizesResult.forEach((row) => {
      if (!sizesMap.has(row.property_id)) {
        sizesMap.set(row.property_id, []);
      }
      sizesMap.get(row.property_id).push({
        build_up_area: row.build_up_area,
        carpet_area: row.carpet_area,
        floor_plan: row.floor_plan,
        create_date: row.create_date,
      });
    });

    const aroundThisMap = new Map();
    aroundThisResult.forEach((row) => {
      if (!aroundThisMap.has(row.property_id)) {
        aroundThisMap.set(row.property_id, []);
      }
      aroundThisMap.get(row.property_id).push({
        title: row.title,
        distance: row.distance,
        create_date: row.create_date,
      });
    });
    const baseUrl = `https://crmapi.mntechs.com/uploads/`; 
    //  const baseUrl = `http://localhost:3002/uploads/`;


    const properties = propertiesResult.map((property) => ({
      ...property,
       property_image: property.property_image
        ? `${baseUrl}${property.property_image}`
        : null,
      sizes: sizesMap.get(property.property_id) || [],
      around_this: aroundThisMap.get(property.property_id) || [],
    }));

    res
      .status(200)
      .json({
        message: "Ongoing properties fetched successfully",
        data: properties,
      });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch ongoing properties: " + error.message });
  }
};

const getUpcomingProperties = async (req, res) => {
  const { admin_user_id, admin_user_type } = req.query;

  // Validate all required fields
  if (!admin_user_id || isNaN(parseInt(admin_user_id))) {
    return res.status(400).json({ error: "Valid admin_user_id is required" });
  }
  if (!admin_user_type || isNaN(parseInt(admin_user_type))) {
    return res.status(400).json({ error: "Valid admin_user_type is required" });
  }

  try {
    const parsedAdminUserId = parseInt(admin_user_id);
    const parsedAdminUserType = parseInt(admin_user_type);

    const propertiesResult = await queryAsync(
      `SELECT * FROM property WHERE upcoming_project = ? AND posted_by = ? AND user_id = ?`,
      ["Yes", parsedAdminUserType, parsedAdminUserId]
    );

    if (propertiesResult.length === 0) {
      return res
        .status(200)
        .json({ message: "No upcoming properties found", data: [] });
    }

    const sizesResult = await queryAsync(`SELECT * FROM sizes`);
    const aroundThisResult = await queryAsync(`SELECT * FROM around_this`);

    const sizesMap = new Map();
    sizesResult.forEach((row) => {
      if (!sizesMap.has(row.property_id)) {
        sizesMap.set(row.property_id, []);
      }
      sizesMap.get(row.property_id).push({
        build_up_area: row.build_up_area,
        carpet_area: row.carpet_area,
        floor_plan: row.floor_plan,
        create_date: row.create_date,
      });
    });

    const aroundThisMap = new Map();
    aroundThisResult.forEach((row) => {
      if (!aroundThisMap.has(row.property_id)) {
        aroundThisMap.set(row.property_id, []);
      }
      aroundThisMap.get(row.property_id).push({
        title: row.title,
        distance: row.distance,
        create_date: row.create_date,
      });
    });

        const baseUrl = `https://crmapi.mntechs.com/uploads/`; 
        //  const baseUrl = `http://localhost:3002/uploads/`;

    const properties = propertiesResult.map((property) => ({
      ...property,
       property_image: property.property_image
        ? `${baseUrl}${property.property_image}`
        : null,
      sizes: sizesMap.get(property.property_id) || [],
      around_this: aroundThisMap.get(property.property_id) || [],
    }));

    res
      .status(200)
      .json({
        message: "Upcoming properties fetched successfully",
        data: properties,
      });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch upcoming properties: " + error.message });
  }
};

const stopPropertyLeads = async (req, res) => {
  const { property_id, admin_user_id, admin_user_type } = req.body;

  if (!property_id || isNaN(parseInt(property_id))) {
    return res.status(400).json({ error: "Valid property_id is required" });
  }
  if (!admin_user_id || isNaN(parseInt(admin_user_id))) {
    return res.status(400).json({ error: "Valid admin_user_id is required" });
  }
  if (!admin_user_type || isNaN(parseInt(admin_user_type))) {
    return res.status(400).json({ error: "Valid admin_user_type is required" });
  }

  try {
    const parsedPropertyId = parseInt(property_id);
    const parsedAdminUserId = parseInt(admin_user_id);
    const parsedAdminUserType = parseInt(admin_user_type);

    const propertyCheck = await queryAsync(
      `SELECT property_id FROM property WHERE property_id = ? AND user_id = ? AND posted_by = ?`,
      [parsedPropertyId, parsedAdminUserId, parsedAdminUserType]
    );

    if (propertyCheck.length === 0) {
      return res
        .status(404)
        .json({ error: "Property not found or user not authorized" });
    }

    const updateResult = await queryAsync(
      `UPDATE property SET stop_leads = 'Yes' WHERE property_id = ?`,
      [parsedPropertyId]
    );

    if (updateResult.affectedRows === 0) {
      return res
        .status(500)
        .json({ error: "Failed to stop leads for the property" });
    }

    res.status(200).json({
      status: "success",
      message: `Leads stopped successfully for property ID ${parsedPropertyId}`,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to stop property leads: " + error.message });
  }
};

const getStoppedProperties = async (req, res) => {
  const { admin_user_id, admin_user_type } = req.query;

  if (!admin_user_id || isNaN(parseInt(admin_user_id))) {
    return res.status(400).json({ error: "Valid admin_user_id is required" });
  }
  if (!admin_user_type || isNaN(parseInt(admin_user_type))) {
    return res.status(400).json({ error: "Valid admin_user_type is required" });
  }

  try {
    const parsedAdminUserId = parseInt(admin_user_id);
    const parsedAdminUserType = parseInt(admin_user_type);

    const propertiesResult = await queryAsync(
      `SELECT * FROM property 
       WHERE stop_leads = 'Yes'
       AND posted_by = ? 
       AND user_id = ?`,
      [parsedAdminUserType, parsedAdminUserId]
    );

    if (propertiesResult.length === 0) {
      return res
        .status(200)
        .json({ message: "No stopped properties found", data: [] });
    }

    const sizesResult = await queryAsync(`SELECT * FROM sizes`);
    const aroundThisResult = await queryAsync(`SELECT * FROM around_this`);

    const sizesMap = new Map();
    sizesResult.forEach((row) => {
      if (!sizesMap.has(row.property_id)) {
        sizesMap.set(row.property_id, []);
      }
      sizesMap.get(row.property_id).push({
        build_up_area: row.build_up_area,
        carpet_area: row.carpet_area,
        floor_plan: row.floor_plan,
        create_date: row.create_date,
      });
    });

    const aroundThisMap = new Map();
    aroundThisResult.forEach((row) => {
      if (!aroundThisMap.has(row.property_id)) {
        aroundThisMap.set(row.property_id, []);
      }
      aroundThisMap.get(row.property_id).push({
        title: row.title,
        distance: row.distance,
        create_date: row.create_date,
      });
    });
    const baseUrl = `https://crmapi.mntechs.com/uploads/`;
    //  const baseUrl = `http://localhost:3002/uploads/`;
 
    const properties = propertiesResult.map((property) => ({
      ...property,
       property_image: property.property_image
        ? `${baseUrl}${property.property_image}`
        : null,
      sizes: sizesMap.get(property.property_id) || [],
      around_this: aroundThisMap.get(property.property_id) || [],
    }));

    res
      .status(200)
      .json({
        message: "Stopped properties fetched successfully",
        data: properties,
      });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch stopped properties: " + error.message });
  }
};

module.exports = {
  insertProperty,
  getPropertyById,
  getAllProperties,
  getUpcomingProperties,
  ongoingProject,
  stopPropertyLeads,
  getStoppedProperties,
  editProperty,
};
