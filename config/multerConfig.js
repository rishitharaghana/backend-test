const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createStorage = (uploadDir) => {
    const fullUploadDir = path.resolve(__dirname, uploadDir);
    if (!fs.existsSync(fullUploadDir)) {
        fs.mkdirSync(fullUploadDir, { recursive: true });
    }
    return multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, fullUploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    });
};

const createFileFilter = (allowedTypes) => {
    return (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes[file.fieldname] && allowedTypes[file.fieldname].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${allowedTypes[file.fieldname] ? allowedTypes[file.fieldname].join(', ') : 'none'}`), false);
        }
    };
};

const createMulterInstance = (uploadDir, allowedTypes = {}, limits = { fileSize: 20 * 1024 * 1024 }) => {
    const storage = createStorage(uploadDir);
    const fileFilter = createFileFilter(allowedTypes);

    return multer({
        storage,
        fileFilter,
        limits
    });
};

module.exports = { createMulterInstance };