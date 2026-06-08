import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const folder = req.uploadFolder || 'halal-ecommerce';
        return {
            folder,
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
            public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')}`,
        };
    },
});

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
 * Upload a single image to Cloudinary
 * @param {string} fieldName — form field name
 * @param {string} folder — optional Cloudinary folder
 */
export const uploadSingle = (fieldName, folder) => (req, res, next) => {
    if (folder) req.uploadFolder = folder;
    upload.single(fieldName)(req, res, next);
};

/**
 * Upload multiple images to Cloudinary
 * @param {string} fieldName — form field name
 * @param {number} maxCount — max number of files
 * @param {string} folder — optional Cloudinary folder
 */
export const uploadMultiple = (fieldName, maxCount = 5, folder) => (req, res, next) => {
    if (folder) req.uploadFolder = folder;
    upload.array(fieldName, maxCount)(req, res, next);
};

export { cloudinary };
export default upload;
