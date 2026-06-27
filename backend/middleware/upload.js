import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

const UPLOAD_BASE_URL = process.env.IMAGE_BASE_URL || null;

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

let _upload;
let _cloudinary = null;

const initCloudinaryUpload = async () => {
    const { v2: cloudinaryV2 } = await import('cloudinary');
    const { CloudinaryStorage } = await import('multer-storage-cloudinary');

    _cloudinary = cloudinaryV2;
    _cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const storage = new CloudinaryStorage({
        cloudinary: _cloudinary,
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

    _upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
};

const initLocalUpload = () => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => { cb(null, uploadDir); },
        filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = path.extname(file.originalname);
            const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
            cb(null, `${name}-${uniqueSuffix}${ext}`);
        },
    });

    _upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
};

if (isCloudinaryConfigured) {
    initCloudinaryUpload();
} else {
    initLocalUpload();
}

export const getFileUrl = (req, file) => {
    if (!file) return null;

    if (isCloudinaryConfigured && file.path) {
        return file.path;
    }

    if (!isCloudinaryConfigured && file.filename) {
        if (UPLOAD_BASE_URL) {
            return `${UPLOAD_BASE_URL.replace(/\/$/, '')}/uploads/${file.filename}`;
        }
        const protocol = req.protocol;
        const host = req.get('host');
        return `${protocol}://${host}/uploads/${file.filename}`;
    }

    return null;
};

export const uploadSingle = (fieldName, folder) => (req, res, next) => {
    if (folder) req.uploadFolder = folder;
    if (!_upload) {
        return res.status(500).json({ success: false, message: 'Upload service not ready' });
    }
    _upload.single(fieldName)(req, res, next);
};

export const uploadMultiple = (fieldName, maxCount = 5, folder) => (req, res, next) => {
    if (folder) req.uploadFolder = folder;
    if (!_upload) {
        return res.status(500).json({ success: false, message: 'Upload service not ready' });
    }
    _upload.array(fieldName, maxCount)(req, res, next);
};

export { _cloudinary as cloudinary };
export default _upload;
