import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if Cloudinary is configured
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

// Configurable base URL for local uploads (production deployment)
// Falls back to request host in development
const UPLOAD_BASE_URL = process.env.IMAGE_BASE_URL || null;

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

let upload;
let cloudinary = null;

if (isCloudinaryConfigured) {
    // Use Cloudinary storage - dynamic import to avoid loading if not configured
    import('cloudinary').then(({ v2: cloudinaryV2 }) => {
        import('multer-storage-cloudinary').then(({ CloudinaryStorage }) => {
            cloudinary = cloudinaryV2;
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

            upload = multer({
                storage,
                fileFilter,
                limits: { fileSize: 5 * 1024 * 1024 },
            });
        });
    });
} else {
    // Local disk storage fallback
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = path.extname(file.originalname);
            const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
            cb(null, `${name}-${uniqueSuffix}${ext}`);
        },
    });

    upload = multer({
        storage,
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    });
}

/**
 * Get the public URL for an uploaded file
 * Works for both Cloudinary and local storage
 */
export const getFileUrl = (req, file) => {
    if (!file) return null;
    
    if (isCloudinaryConfigured && file.path) {
        // Cloudinary returns full URL in file.path
        return file.path;
    }
    
    if (!isCloudinaryConfigured && file.filename) {
        // Local file - use configured base URL or fall back to request host
        if (UPLOAD_BASE_URL) {
            return `${UPLOAD_BASE_URL.replace(/\/$/, '')}/uploads/${file.filename}`;
        }
        // Fallback to request host (development)
        const protocol = req.protocol;
        const host = req.get('host');
        return `${protocol}://${host}/uploads/${file.filename}`;
    }
    
    return null;
};

/**
 * Upload a single image
 * @param {string} fieldName — form field name
 * @param {string} folder — optional Cloudinary folder
 */
export const uploadSingle = (fieldName, folder) => (req, res, next) => {
    if (folder) req.uploadFolder = folder;
    upload.single(fieldName)(req, res, next);
};

/**
 * Upload multiple images
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