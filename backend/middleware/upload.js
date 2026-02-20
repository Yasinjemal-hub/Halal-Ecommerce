import multer from 'multer';

// Use memory storage (buffers) — suitable for cloud upload (e.g. Cloudinary)
const storage = multer.memoryStorage();

// File filter — images only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
});

/**
 * Upload a single image
 * @param {string} fieldName — form field name
 */
export const uploadSingle = (fieldName) => upload.single(fieldName);

/**
 * Upload multiple images
 * @param {string} fieldName — form field name
 * @param {number} maxCount — max number of files
 */
export const uploadMultiple = (fieldName, maxCount = 5) =>
    upload.array(fieldName, maxCount);

export default upload;
