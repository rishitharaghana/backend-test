const moment = require('moment');
const pool = require('../config/db');
const util = require('util');
const { createMulterInstance } = require('../config/multerConfig');
const path = require('path');

const uploadDir = 'uploads/';
const allowedTypes = {
    'brochure': ['.pdf'],
    'price_sheet': ['.pdf'],
    'floor_plan': ['.png', '.jpg', '.jpeg', '.pdf']
};
const upload = createMulterInstance(uploadDir, allowedTypes, { fileSize: 20 * 1024 * 1024 });

const queryAsync = util.promisify(pool.query).bind(pool);

const insertProperty = async (req, res) => {
    upload.fields([
        { name: 'brochure', maxCount: 1 },
        { name: 'price_sheet', maxCount: 1 },
        { name: 'floor_plan', maxCount: 4 }
    ])(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: 'File upload error: ' + err.message });
        }

        const { project_name, property_type, property_subtype, builder_name, state, city, locality, sizes, around_this } = req.body;
        if (!project_name || !property_type || !property_subtype || !builder_name || !state || !city || !locality) {
            return res.status(400).json({ error: 'Missing required property fields' });
        }

        // Get the base directory to strip from the full path
        const baseDir = path.join(__dirname, '..');

        // Transform full paths to relative paths
        const brochure = req.files['brochure'] ? path.relative(baseDir, req.files['brochure'][0].path) : null;
        const price_sheet = req.files['price_sheet'] ? path.relative(baseDir, req.files['price_sheet'][0].path) : null;
        const floor_plans = req.files['floor_plan'] ? req.files['floor_plan'].map(file => path.relative(baseDir, file.path)) : [];

        try {
            await queryAsync('START TRANSACTION');
            const propertyResult = await queryAsync(
                `INSERT INTO property (
                    project_name, property_type, property_subtype, builder_name, 
                    state, city, locality, brochure, price_sheet
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    project_name,
                    property_type,
                    property_subtype,
                    builder_name,
                    state,
                    city,
                    locality,
                    brochure,
                    price_sheet
                ]
            );
            const property_id = propertyResult.insertId;

            let sizesArray;
            try {
                sizesArray = JSON.parse(sizes);
            } catch (error) {
                throw new Error('Invalid sizes JSON format');
            }
            if (Array.isArray(sizesArray) && sizesArray.length > 0) {
                if (sizesArray.length !== floor_plans.length) {
                    throw new Error('Number of floor_plan files must match number of sizes entries');
                }

                for (let i = 0; i < sizesArray.length; i++) {
                    const size = sizesArray[i];
                    if (
                        size.build_up_area &&
                        size.carpet_area &&
                        !isNaN(parseFloat(size.build_up_area)) &&
                        !isNaN(parseFloat(size.carpet_area))
                    ) {
                        await queryAsync(
                            `INSERT INTO sizes (property_id, build_up_area, carpet_area, floor_plan, create_date) 
                             VALUES (?, ?, ?, ?, ?)`,
                            [
                                property_id,
                                parseFloat(size.build_up_area).toString(),
                                parseFloat(size.carpet_area).toString(),
                                floor_plans[i],
                                moment().format('YYYY-MM-DD HH:mm:ss')
                            ]
                        );
                    } else {
                        throw new Error('Invalid build_up_area or carpet_area in sizes');
                    }
                }
            }

            let aroundThisArray;
            try {
                aroundThisArray = JSON.parse(around_this);
            } catch (e) {
                throw new Error('Invalid around_this JSON format');
            }

            if (Array.isArray(aroundThisArray) && aroundThisArray.length > 0) {
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
                                property_id,
                                place.title,
                                parseFloat(place.distance).toString(),
                                moment().format('YYYY-MM-DD HH:mm:ss')
                            ]
                        );
                    } else {
                        throw new Error('Invalid title or distance in around_this');
                    }
                }
            }

            await queryAsync('COMMIT');
            res.status(201).json({
                message: 'Property inserted successfully',
                property_id
            });

        } catch (error) {
            await queryAsync('ROLLBACK');
            res.status(500).json({ error: 'Failed to insert property: ' + error.message });
        }
    });
};

const getPropertyById = async (req, res) => {
    const { id } = req.params;

    try {
        // Fetch property details
        const propertyResult = await queryAsync(
            `SELECT * FROM property WHERE property_id = ?`,
            [id]
        );

        if (propertyResult.length === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }

        // Fetch associated sizes
        const sizesResult = await queryAsync(
            `SELECT * FROM sizes WHERE property_id = ?`,
            [id]
        );

        // Fetch associated around_this
        const aroundThisResult = await queryAsync(
            `SELECT * FROM around_this WHERE property_id = ?`,
            [id]
        );

        // Organize the data
        const property = {
            ...propertyResult[0],
            sizes: sizesResult.map(row => ({
                build_up_area: row.build_up_area,
                carpet_area: row.carpet_area,
                floor_plan: row.floor_plan,
                create_date: row.create_date
            })),
            around_this: aroundThisResult.map(row => ({
                title: row.title,
                distance: row.distance,
                create_date: row.create_date
            }))
        };

        res.status(200).json(property);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch property: ' + error.message });
    }
};

const getAllProperties = async (req, res) => {
    try {
       
        const propertiesResult = await queryAsync(
            `SELECT * FROM property`
        );

        if (propertiesResult.length === 0) {
            return res.status(200).json({ message: 'No properties found', data: [] });
        }

       
        const sizesResult = await queryAsync(
            `SELECT * FROM sizes`
        );
        const aroundThisResult = await queryAsync(
            `SELECT * FROM around_this`
        );

       
        const sizesMap = new Map();
        sizesResult.forEach(row => {
            if (!sizesMap.has(row.property_id)) {
                sizesMap.set(row.property_id, []);
            }
            sizesMap.get(row.property_id).push({
                build_up_area: row.build_up_area,
                carpet_area: row.carpet_area,
                floor_plan: row.floor_plan,
                create_date: row.create_date
            });
        });

        const aroundThisMap = new Map();
        aroundThisResult.forEach(row => {
            if (!aroundThisMap.has(row.property_id)) {
                aroundThisMap.set(row.property_id, []);
            }
            aroundThisMap.get(row.property_id).push({
                title: row.title,
                distance: row.distance,
                create_date: row.create_date
            });
        });

     
        const properties = propertiesResult.map(property => ({
            ...property,
            sizes: sizesMap.get(property.property_id) || [],
            around_this: aroundThisMap.get(property.property_id) || []
        }));

        res.status(200).json({ message: 'Properties fetched successfully', data: properties });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch properties: ' + error.message });
    }
};

const getImage = async (req, res) => {
    const filePath = req.params[0]; 

    const baseDir = path.join(__dirname, '..');
    const fullPath = path.join(baseDir, filePath);

    try {
        if (fs.existsSync(fullPath)) {
            res.sendFile(fullPath);
        } else {
            res.status(404).json({ error: 'Image not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch image: ' + error.message });
    }
};

module.exports = { insertProperty,getPropertyById,getAllProperties,getImage };